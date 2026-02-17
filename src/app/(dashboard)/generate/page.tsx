"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { toast } from "@/components/toaster";
import KeywordPills from "@/components/keyword-pills";
import { parseGenerateStream } from "@/lib/stream-parser";

type Descriptions = {
  seo: string;
  emotional: string;
  short: string;
} | null;

type BrandVoice = {
  id: string;
  name: string;
  is_default: boolean;
};

export default function GeneratePage() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("professional");
  const [voiceId, setVoiceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Descriptions>(null);

  // Image upload
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Brand voices
  const [voices, setVoices] = useState<BrandVoice[]>([]);

  // Keyword suggestions
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);

  // Fetch brand voices on mount
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const res = await fetch("/api/voices");
        if (res.ok) {
          const data = await res.json();
          setVoices(data);
          // Set default voice
          const defaultVoice = data.find((v: BrandVoice) => v.is_default);
          if (defaultVoice) setVoiceId(defaultVoice.id);
        }
      } catch { /* ignore */ }
    };
    fetchVoices();
  }, []);

  // Debounced keyword suggestions
  const fetchKeywords = useCallback(async (query: string) => {
    if (query.length < 3) {
      setKeywords([]);
      return;
    }
    setKeywordsLoading(true);
    try {
      const res = await fetch(`/api/keywords/suggest?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setKeywords(data);
      }
    } catch { /* ignore */ } finally {
      setKeywordsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchKeywords(productName);
    }, 500);
    return () => clearTimeout(timer);
  }, [productName, fetchKeywords]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, features, audience, tone, voiceId: voiceId || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Generation failed" }));
        toast(data.error || "Generation failed", "error");
        return;
      }

      const data = await parseGenerateStream(res);
      setResults(data);
      toast("Descriptions generated!");
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast(`${label} copied!`);
  };

  const handleRegenerate = () => {
    if (productName) {
      handleGenerate({ preventDefault: () => { } } as React.FormEvent);
    }
  };

  const handleKeywordSelect = (keyword: string) => {
    setFeatures((prev) => prev ? `${prev}, ${keyword}` : keyword);
  };

  const handleImageUpload = async (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!allowedTypes.includes(file.type)) {
      toast("Unsupported format. Use JPEG, PNG, or WebP.", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast("Image must be under 10MB", "error");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Analyze
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/analyze-image", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Analysis failed" }));
        toast(data.error || "Analysis failed", "error");
        return;
      }
      const data = await res.json();
      if (data.productName) setProductName(data.productName);
      if (data.category) setCategory(data.category);
      if (data.features) setFeatures(data.features);
      if (data.audience) setAudience(data.audience);
      toast("Image analyzed — fields auto-filled!");
    } catch {
      toast("Failed to analyze image", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Clear autofilled fields
    setProductName("");
    setCategory("");
    setFeatures("");
    setAudience("");
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tightest text-white/90 mb-2">
          Create product copy
        </h1>
        <p className="text-white/60 text-sm sm:text-base">
          Fill in the details and we&apos;ll write three publish-ready descriptions.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleGenerate} className="space-y-6 mb-12">
        {/* Image Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/90">
            Product Image <span className="text-white/40 font-normal">(optional — auto-fills fields)</span>
          </label>
          {!imagePreview ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-white/15 rounded-lg p-8 text-center cursor-pointer hover:border-white/30 hover:bg-white/[0.02] transition-all duration-150"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
              <svg className="w-8 h-8 mx-auto mb-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <p className="text-sm text-white/50">
                Drop a product image here or <span className="text-white/80 underline underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-white/30 mt-1">JPEG, PNG, WebP up to 10MB</p>
            </div>
          ) : (
            <div className="relative inline-block">
              <Image
                src={imagePreview}
                alt="Product preview"
                width={128}
                height={128}
                unoptimized
                className="h-32 w-32 object-cover rounded-lg border border-white/10"
              />
              {analyzing && (
                <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
              {!analyzing && (
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 bg-white/10 hover:bg-white/20 rounded-full p-1 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="productName" className="block text-sm font-medium text-white/90">
              Product Name <span className="text-red-400">*</span>
            </label>
            <input
              id="productName"
              type="text"
              placeholder="e.g., Organic Cotton T-Shirt"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
              className="input-base"
            />
            <KeywordPills
              keywords={keywords}
              onSelect={handleKeywordSelect}
              loading={keywordsLoading}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium text-white/90">
              Category
            </label>
            <input
              id="category"
              type="text"
              placeholder="e.g. Electronics, Fashion, Home"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-base"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="features" className="block text-sm font-medium text-white/90">
            Key Features
          </label>
          <textarea
            id="features"
            placeholder="What makes this product special? (materials, tech, benefits)"
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            rows={3}
            className="input-base resize-none"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="audience" className="block text-sm font-medium text-white/90">
              Target Audience
            </label>
            <input
              id="audience"
              type="text"
              placeholder="Who is this for? (e.g., eco-conscious millennials)"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="input-base"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="tone" className="block text-sm font-medium text-white/90">
              Tone
            </label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="input-base cursor-pointer"
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="luxury">Luxury</option>
              <option value="playful">Playful</option>
              <option value="technical">Technical</option>
            </select>
          </div>
        </div>

        {/* Brand Voice selector */}
        {voices.length > 0 && (
          <div className="space-y-2">
            <label htmlFor="voice" className="block text-sm font-medium text-white/90">
              Brand Voice
            </label>
            <select
              id="voice"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="input-base cursor-pointer"
            >
              <option value="">No brand voice</option>
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.is_default ? "(Default)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-white text-black font-semibold px-6 py-3 text-sm rounded-full hover:bg-white/90 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/10 active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Writing your descriptions...
            </span>
          ) : (
            "Generate descriptions"
          )}
        </button>
      </form>

      {/* Loading Shimmer */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-lg p-6">
              <div className="h-4 w-24 rounded-md shimmer-loading mb-4" />
              <div className="space-y-2.5">
                <div className="h-3 rounded-md w-full shimmer-loading" />
                <div className="h-3 rounded-md w-5/6 shimmer-loading" />
                <div className="h-3 rounded-md w-4/6 shimmer-loading" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white/90 tracking-tightest">
              Your descriptions
            </h2>
            <button
              onClick={handleRegenerate}
              className="text-sm text-white/60 hover:text-white/90 transition-colors duration-150 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Regenerate all
            </button>
          </div>

          {([
            { key: "seo" as const, label: "SEO-Optimized", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" },
            { key: "emotional" as const, label: "Emotionally Compelling", icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
            { key: "short" as const, label: "Short-Form", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
          ]).map(({ key, label, icon }) => (
            <div key={key} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-lg p-6 hover-reveal-actions group hover:border-white/20 transition-all duration-150 ease-in-out">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                  </svg>
                  <span className="text-sm font-medium text-white/90">{label}</span>
                </div>
                <div className="action-buttons flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(results[key], label)}
                    className="text-xs font-medium text-white/60 hover:text-white/90 flex items-center gap-1 transition-colors duration-150 px-2 py-1 rounded-md hover:bg-white/5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </div>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">
                {results[key]}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
