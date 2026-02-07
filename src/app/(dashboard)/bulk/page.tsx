"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "@/components/toaster";
import Papa from "papaparse";

type BulkItem = {
  productName: string;
  category?: string;
  features?: string;
  audience?: string;
  tone?: string;
};

type BulkJob = {
  id: string;
  status: string;
  total_items: number;
  processed_items: number;
  failed_items: number;
  error_message: string | null;
};

type ItemStatus = "pending" | "processing" | "success" | "failed";

type ItemResult = {
  seo: string;
  emotional: string;
  short: string;
} | null;

export default function BulkPage() {
  const [items, setItems] = useState<BulkItem[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<BulkJob | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [itemStatuses, setItemStatuses] = useState<ItemStatus[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [itemResults, setItemResults] = useState<ItemResult[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const pauseRef = useRef(false);
  const abortRef = useRef(false);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast("Please upload a CSV file", "error");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: BulkItem[] = [];
        for (const row of results.data as Record<string, string>[]) {
          const productName = row["product_name"] || row["productName"] || row["name"] || row["Product Name"] || "";
          if (!productName.trim()) continue;

          parsed.push({
            productName: productName.trim(),
            category: (row["category"] || row["Category"] || "").trim() || undefined,
            features: (row["features"] || row["Features"] || row["key_features"] || "").trim() || undefined,
            audience: (row["audience"] || row["Audience"] || row["target_audience"] || "").trim() || undefined,
            tone: (row["tone"] || row["Tone"] || "").trim() || undefined,
          });
        }

        if (parsed.length === 0) {
          toast("No valid products found in CSV. Ensure a 'product_name' column exists.", "error");
          return;
        }

        if (parsed.length > 100) {
          toast("Maximum 100 items per upload. File has " + parsed.length + " items.", "error");
          return;
        }

        setItems(parsed);
        setFileName(file.name);
        toast(`${parsed.length} products loaded from CSV`);
      },
      error: () => {
        toast("Failed to parse CSV file", "error");
      },
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const processItems = async (jobId: string, itemsToProcess: BulkItem[]) => {
    let failedCount = 0;

    for (let i = 0; i < itemsToProcess.length; i++) {
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
          const res = await fetch("/api/bulk/process-chunk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId,
              item: itemsToProcess[i],
              index: i,
            }),
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
                next[i] = data.result;
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

      if (i < itemsToProcess.length - 1 && !abortRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const finalStatus = abortRef.current
      ? "failed"
      : failedCount === itemsToProcess.length
        ? "failed"
        : "completed";

    setJob((prev) =>
      prev
        ? {
            ...prev,
            status: finalStatus,
            error_message:
              failedCount > 0 ? `${failedCount} items failed to process` : null,
          }
        : null
    );

    await fetch(`/api/bulk/status/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: finalStatus }),
    }).catch(() => {});

    if (finalStatus === "completed") {
      toast(
        `Bulk generation complete! ${itemsToProcess.length - failedCount} succeeded.`
      );
    } else if (abortRef.current) {
      toast("Bulk generation cancelled", "error");
    } else {
      toast("Bulk generation finished with errors", "error");
    }
  };

  const handleUpload = async () => {
    if (items.length === 0) return;
    setUploading(true);
    pauseRef.current = false;
    abortRef.current = false;
    setIsPaused(false);

    try {
      const res = await fetch("/api/bulk/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Upload failed", "error");
        setUploading(false);
        return;
      }

        setItemStatuses(new Array(items.length).fill("pending"));
        setItemResults(new Array(items.length).fill(null));

      const newJob: BulkJob = {
        id: data.jobId,
        status: "processing",
        total_items: items.length,
        processed_items: 0,
        failed_items: 0,
        error_message: null,
      };
      setJob(newJob);
      setUploading(false);

      processItems(data.jobId, items);
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

  const downloadTemplate = () => {
    const csv = "product_name,category,features,audience,tone\nExample Product,Electronics,\"Feature 1, Feature 2\",Young adults,professional";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "descriptai-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const progressPercent = job
    ? Math.round((job.processed_items / Math.max(job.total_items, 1)) * 100)
    : 0;

  const isProcessing = job?.status === "processing";

  return (
    <div className="animate-fade-in">
      <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tightest text-white/90 mb-2">Bulk generate</h1>
          <p className="text-white/60">Upload a CSV with your products and generate descriptions for all of them at once.</p>
      </div>

      {/* Template download */}
      <div className="mb-6">
        <button
          onClick={downloadTemplate}
          className="text-sm text-white/60 hover:text-white/90 transition-colors duration-150 flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
              Download CSV template
        </button>
      </div>

      {/* Dropzone */}
      {!job && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-150 ease-in-out ${
            dragOver
              ? "border-white/40 bg-white/5"
              : "border-white/10 hover:border-white/20"
          }`}
        >
          <svg className="w-10 h-10 text-white/38 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
            <p className="text-sm text-white/90 mb-1">
              {fileName ? fileName : "Drop your CSV here"}
            </p>
            <p className="text-xs text-white/38 mb-4">or click to browse — max 100 products per file</p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
            id="csv-input"
          />
          <label
            htmlFor="csv-input"
            className="inline-block text-sm font-medium text-white/60 hover:text-white/90 bg-white/[0.04] border border-white/10 hover:border-white/20 px-4 py-2 rounded-lg cursor-pointer transition-all duration-150"
          >
            Browse files
          </label>
        </div>
      )}

      {/* Preview loaded items */}
      {items.length > 0 && !job && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white/90">{items.length} products loaded</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setItems([]); setFileName(""); }}
                className="text-xs text-white/60 hover:text-white/90 transition-colors duration-150"
              >
                Clear
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-white text-black font-semibold px-5 py-2 text-sm rounded-full hover:bg-white/90 transition-all duration-150 disabled:opacity-50 active:scale-[0.98]"
              >
                {uploading ? "Starting..." : `Generate all (${items.length} credits)`}
              </button>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Tone</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 10).map((item, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-4 py-3 text-white/38">{i + 1}</td>
                      <td className="px-4 py-3 text-white/90">{item.productName}</td>
                      <td className="px-4 py-3 text-white/60">{item.category || "-"}</td>
                      <td className="px-4 py-3 text-white/60">{item.tone || "professional"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {items.length > 10 && (
              <div className="px-4 py-2 text-xs text-white/38 border-t border-white/5">
                ...and {items.length - 10} more
              </div>
            )}
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
                className={`h-2 rounded-full transition-all duration-500 ${
                  job.status === "failed"
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
            {itemStatuses.length > 0 && itemStatuses.length <= 50 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {itemStatuses.map((status, i) => (
                  <div
                    key={i}
                    title={`${items[i]?.productName || `Item ${i + 1}`}: ${status}`}
                    className={`w-3 h-3 rounded-sm transition-colors duration-150 ${
                      status === "success"
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
                    setItems([]);
                    setFileName("");
                    setItemStatuses([]);
                    setItemResults([]);
                    setExpandedIdx(null);
                  }}
                className="mt-4 text-sm text-white/60 hover:text-white/90 transition-colors duration-150"
              >
                Upload another file
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
              {items.map((item, i) => {
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
                      <div>
                        <span className="font-medium text-sm text-white/90">
                          {item.productName}
                        </span>
                        <div className="flex items-center gap-2 mt-1.5">
                          {item.category && (
                            <span className="text-xs bg-white/[0.06] px-2 py-0.5 rounded-full text-white/60">
                              {item.category}
                            </span>
                          )}
                          <span className="text-xs text-white/60">
                            {item.tone || "professional"}
                          </span>
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
                        {[
                          { label: "SEO-Optimized", text: result.seo },
                          { label: "Emotionally Compelling", text: result.emotional },
                          { label: "Short-Form", text: result.short },
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
