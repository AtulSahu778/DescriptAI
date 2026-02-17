"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { toast } from "@/components/toaster";

type BulkJob = {
    id: string;
    status: string;
    total_items: number;
    processed_items: number;
    failed_items: number;
    error_message: string | null;
};

type ItemStatus = "pending" | "processing" | "success" | "failed";

type ExtractedData = {
    productName: string;
    category: string;
    features: string;
    audience: string;
};

type ItemResult = {
    extracted: ExtractedData;
    descriptions: {
        seo: string;
        emotional: string;
        short: string;
    };
} | null;

type UploadedImage = {
    file: File;
    preview: string;
};

const MAX_IMAGES = 5;

export default function BulkImagesPage() {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [uploading, setUploading] = useState(false);
    const [job, setJob] = useState<BulkJob | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [itemStatuses, setItemStatuses] = useState<ItemStatus[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [itemResults, setItemResults] = useState<ItemResult[]>([]);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const pauseRef = useRef(false);
    const abortRef = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addImages = (files: FileList | File[]) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
        const newImages: UploadedImage[] = [];

        for (const file of Array.from(files)) {
            if (!allowedTypes.includes(file.type)) {
                toast(`${file.name}: unsupported format. Use JPEG, PNG, or WebP.`, "error");
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast(`${file.name}: must be under 10MB`, "error");
                continue;
            }
            newImages.push({ file, preview: URL.createObjectURL(file) });
        }

        const total = images.length + newImages.length;
        if (total > MAX_IMAGES) {
            toast(`Maximum ${MAX_IMAGES} images per upload. You tried to add ${total}.`, "error");
            // Only add what fits
            const canAdd = MAX_IMAGES - images.length;
            if (canAdd > 0) {
                setImages((prev) => [...prev, ...newImages.slice(0, canAdd)]);
                toast(`Added ${canAdd} of ${newImages.length} images`);
            }
            return;
        }

        if (newImages.length > 0) {
            setImages((prev) => [...prev, ...newImages]);
            toast(`${newImages.length} image${newImages.length > 1 ? "s" : ""} added`);
        }
    };

    const removeImage = (idx: number) => {
        setImages((prev) => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[idx].preview);
            updated.splice(idx, 1);
            return updated;
        });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) addImages(e.dataTransfer.files);
    };

    const processItems = async (jobId: string, imagesToProcess: UploadedImage[]) => {
        let failedCount = 0;

        for (let i = 0; i < imagesToProcess.length; i++) {
            if (abortRef.current) break;

            while (pauseRef.current && !abortRef.current) {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            if (abortRef.current) break;

            setItemStatuses((prev) => {
                const next = [...prev];
                next[i] = "processing";
                return next;
            });

            let success = false;
            let retries = 0;
            const maxRetries = 3;

            while (retries < maxRetries && !success) {
                try {
                    const formData = new FormData();
                    formData.append("image", imagesToProcess[i].file);
                    formData.append("jobId", jobId);
                    formData.append("index", String(i));

                    const res = await fetch("/api/bulk/process-image-chunk", {
                        method: "POST",
                        body: formData,
                    });

                    const data = await res.json();

                    if (res.ok && data.success) {
                        success = true;
                        setItemStatuses((prev) => {
                            const next = [...prev];
                            next[i] = "success";
                            return next;
                        });
                        setItemResults((prev) => {
                            const next = [...prev];
                            next[i] = {
                                extracted: data.extracted,
                                descriptions: data.result,
                            };
                            return next;
                        });
                    } else if (res.status === 429) {
                        retries++;
                        await new Promise((resolve) => setTimeout(resolve, 5000));
                    } else {
                        break;
                    }
                } catch {
                    retries++;
                    if (retries < maxRetries) {
                        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retries)));
                    }
                }
            }

            if (!success) {
                failedCount++;
                setItemStatuses((prev) => {
                    const next = [...prev];
                    next[i] = "failed";
                    return next;
                });
            }

            setJob((prev) =>
                prev
                    ? {
                        ...prev,
                        processed_items: i + 1,
                        failed_items: failedCount,
                    }
                    : null
            );

            // 7s delay between images to stay within Gemini 10 RPM
            if (i < imagesToProcess.length - 1 && !abortRef.current) {
                await new Promise((resolve) => setTimeout(resolve, 7000));
            }
        }

        const finalStatus = abortRef.current
            ? "failed"
            : failedCount === imagesToProcess.length
                ? "failed"
                : "completed";

        setJob((prev) =>
            prev
                ? {
                    ...prev,
                    status: finalStatus,
                    error_message:
                        failedCount > 0 ? `${failedCount} images failed to process` : null,
                }
                : null
        );

        await fetch(`/api/bulk/status/${jobId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: finalStatus }),
        }).catch(() => { });

        if (finalStatus === "completed") {
            toast(`Bulk generation complete! ${imagesToProcess.length - failedCount} succeeded.`);
        } else if (abortRef.current) {
            toast("Bulk generation cancelled", "error");
        } else {
            toast("Bulk generation finished with errors", "error");
        }
    };

    const handleUpload = async () => {
        if (images.length === 0) return;
        setUploading(true);
        pauseRef.current = false;
        abortRef.current = false;
        setIsPaused(false);

        try {
            const res = await fetch("/api/bulk/upload-images", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemCount: images.length }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast(data.error || "Upload failed", "error");
                setUploading(false);
                return;
            }

            setItemStatuses(new Array(images.length).fill("pending"));
            setItemResults(new Array(images.length).fill(null));

            const newJob: BulkJob = {
                id: data.jobId,
                status: "processing",
                total_items: images.length,
                processed_items: 0,
                failed_items: 0,
                error_message: null,
            };
            setJob(newJob);
            setUploading(false);

            processItems(data.jobId, images);
        } catch {
            toast("Something went wrong", "error");
            setUploading(false);
        }
    };

    const handlePauseResume = () => {
        if (isPaused) {
            pauseRef.current = false;
            setIsPaused(false);
        } else {
            pauseRef.current = true;
            setIsPaused(true);
        }
    };

    const handleCancel = () => {
        abortRef.current = true;
        pauseRef.current = false;
        setIsPaused(false);
    };

    const progressPercent = job
        ? Math.round((job.processed_items / Math.max(job.total_items, 1)) * 100)
        : 0;

    const isProcessing = job?.status === "processing";

    return (
        <div className="animate-fade-in">
            <div className="mb-10">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tightest text-white/90 mb-2">Bulk image generate</h1>
                <p className="text-white/60">Upload up to {MAX_IMAGES} product images and generate descriptions for all of them at once.</p>
            </div>

            {/* Dropzone */}
            {!job && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-150 ease-in-out cursor-pointer ${dragOver
                            ? "border-white/40 bg-white/5"
                            : "border-white/10 hover:border-white/20"
                        }`}
                >
                    <svg className="w-10 h-10 text-white/38 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    <p className="text-sm text-white/90 mb-1">
                        {images.length > 0 ? `${images.length} / ${MAX_IMAGES} images selected` : "Drop product images here"}
                    </p>
                    <p className="text-xs text-white/38 mb-4">or click to browse — max {MAX_IMAGES} images, 10MB each</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={(e) => {
                            if (e.target.files) addImages(e.target.files);
                            e.target.value = "";
                        }}
                        className="hidden"
                    />
                    <span className="inline-block text-sm font-medium text-white/60 hover:text-white/90 bg-white/[0.04] border border-white/10 hover:border-white/20 px-4 py-2 rounded-lg transition-all duration-150">
                        Browse files
                    </span>
                </div>
            )}

            {/* Preview grid */}
            {images.length > 0 && !job && (
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-white/90">{images.length} image{images.length > 1 ? "s" : ""} selected</h3>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => { images.forEach((img) => URL.revokeObjectURL(img.preview)); setImages([]); }}
                                className="text-xs text-white/60 hover:text-white/90 transition-colors duration-150"
                            >
                                Clear all
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="bg-white text-black font-semibold px-5 py-2 text-sm rounded-full hover:bg-white/90 transition-all duration-150 disabled:opacity-50 active:scale-[0.98]"
                            >
                                {uploading ? "Starting..." : `Generate all (${images.length} credit${images.length > 1 ? "s" : ""})`}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {images.map((img, i) => (
                            <div key={i} className="relative group aspect-square">
                                <Image
                                    src={img.preview}
                                    alt={`Product ${i + 1}`}
                                    fill
                                    unoptimized
                                    className="object-cover rounded-lg border border-white/10"
                                />
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                                    className="absolute -top-1.5 -right-1.5 bg-white/10 hover:bg-red-500/80 rounded-full p-1 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white/80 rounded px-1.5 py-0.5">
                                    {i + 1}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Progress */}
            {job && (
                <div className="mt-6">
                    <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-white/90">
                                {isPaused
                                    ? "Paused"
                                    : isProcessing
                                        ? "Processing..."
                                        : job.status === "completed"
                                            ? "Complete"
                                            : "Failed"}
                            </h3>
                            <span className="text-sm text-white/60">
                                {job.processed_items} / {job.total_items}
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-white/5 rounded-full h-2 mb-4">
                            <div
                                className={`h-2 rounded-full transition-all duration-500 ${job.status === "failed"
                                        ? "bg-red-500"
                                        : job.status === "completed"
                                            ? "bg-emerald-500"
                                            : isPaused
                                                ? "bg-yellow-500"
                                                : "bg-indigo-500"
                                    }`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>

                        <div className="flex items-center gap-4 text-xs text-white/60">
                            <span>Succeeded: {job.processed_items - job.failed_items}</span>
                            {job.failed_items > 0 && (
                                <span className="text-red-400">Failed: {job.failed_items}</span>
                            )}
                        </div>

                        {/* Per-item status indicators */}
                        {itemStatuses.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {itemStatuses.map((status, i) => (
                                    <div
                                        key={i}
                                        title={`Image ${i + 1}: ${status}`}
                                        className={`w-3 h-3 rounded-sm transition-colors duration-150 ${status === "success"
                                                ? "bg-emerald-500"
                                                : status === "failed"
                                                    ? "bg-red-500"
                                                    : status === "processing"
                                                        ? "bg-indigo-500 animate-pulse"
                                                        : "bg-white/10"
                                            }`}
                                    />
                                ))}
                            </div>
                        )}

                        {job.error_message && (
                            <p className="mt-3 text-xs text-red-400">{job.error_message}</p>
                        )}

                        {/* Pause/Resume and Cancel controls */}
                        {isProcessing && (
                            <div className="mt-4 flex items-center gap-3">
                                <button
                                    onClick={handlePauseResume}
                                    className="text-sm text-white/60 hover:text-white/90 bg-white/[0.04] border border-white/10 hover:border-white/20 px-4 py-1.5 rounded-lg transition-all duration-150"
                                >
                                    {isPaused ? "Resume" : "Pause"}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="text-sm text-red-400 hover:text-red-300 bg-white/[0.04] border border-white/10 hover:border-red-500/30 px-4 py-1.5 rounded-lg transition-all duration-150"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {(job.status === "completed" || job.status === "failed") && (
                            <button
                                onClick={() => {
                                    setJob(null);
                                    images.forEach((img) => URL.revokeObjectURL(img.preview));
                                    setImages([]);
                                    setItemStatuses([]);
                                    setItemResults([]);
                                    setExpandedIdx(null);
                                }}
                                className="mt-4 text-sm text-white/60 hover:text-white/90 transition-colors duration-150"
                            >
                                Upload more images
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Results output */}
            {job && itemResults.some((r) => r !== null) && (
                <div className="mt-6">
                    <h3 className="text-sm font-medium text-white/90 mb-4">
                        Generated Descriptions ({itemResults.filter((r) => r !== null).length})
                    </h3>
                    <div className="space-y-3">
                        {images.map((img, i) => {
                            const result = itemResults[i];
                            if (!result) return null;
                            const isExpanded = expandedIdx === i;
                            return (
                                <div
                                    key={i}
                                    className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-all duration-150 ease-in-out"
                                >
                                    <button
                                        onClick={() => setExpandedIdx(isExpanded ? null : i)}
                                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.03] transition-colors duration-150 text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 border border-white/10">
                                                <Image
                                                    src={img.preview}
                                                    alt={result.extracted.productName}
                                                    fill
                                                    unoptimized
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div>
                                                <span className="font-medium text-sm text-white/90">
                                                    {result.extracted.productName}
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {result.extracted.category && (
                                                        <span className="text-xs bg-white/[0.06] px-2 py-0.5 rounded-full text-white/60">
                                                            {result.extracted.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <svg
                                            className={`w-4 h-4 text-white/60 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                    </button>

                                    {isExpanded && (
                                        <div className="px-6 pb-6 space-y-4 border-t border-white/10 pt-4 animate-fade-in">
                                            {/* Extracted data summary */}
                                            <div className="bg-white/[0.02] rounded-lg p-3 text-xs text-white/50 space-y-1">
                                                <p><span className="text-white/70">Features:</span> {result.extracted.features}</p>
                                                <p><span className="text-white/70">Audience:</span> {result.extracted.audience}</p>
                                            </div>
                                            {[
                                                { label: "SEO-Optimized", text: result.descriptions.seo },
                                                { label: "Emotionally Compelling", text: result.descriptions.emotional },
                                                { label: "Short-Form", text: result.descriptions.short },
                                            ].map(({ label, text }) => (
                                                <div key={label} className="bg-white/[0.04] rounded-lg p-4 group">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-medium text-white/90">{label}</span>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(text);
                                                                toast("Copied!");
                                                            }}
                                                            className="text-xs text-white/60 hover:text-white/90 transition-colors duration-150"
                                                        >
                                                            Copy
                                                        </button>
                                                    </div>
                                                    <p className="text-sm text-white/60 leading-relaxed">{text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
