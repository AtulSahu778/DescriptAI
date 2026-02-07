"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/toaster";

type BrandVoice = {
  id: string;
  name: string;
  tone_adjectives: string[];
  writing_samples: string[];
  is_default: boolean;
  created_at: string;
};

export default function VoicesPage() {
  const [voices, setVoices] = useState<BrandVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [adjectives, setAdjectives] = useState("");
  const [sample1, setSample1] = useState("");
  const [sample2, setSample2] = useState("");
  const [sample3, setSample3] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchVoices = async () => {
    try {
      const res = await fetch("/api/voices");
      if (res.ok) {
        setVoices(await res.json());
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchVoices(); }, []);

  const resetForm = () => {
    setName("");
    setAdjectives("");
    setSample1("");
    setSample2("");
    setSample3("");
    setIsDefault(false);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (voice: BrandVoice) => {
    setName(voice.name);
    setAdjectives(voice.tone_adjectives.join(", "));
    setSample1(voice.writing_samples[0] || "");
    setSample2(voice.writing_samples[1] || "");
    setSample3(voice.writing_samples[2] || "");
    setIsDefault(voice.is_default);
    setEditingId(voice.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const body = {
      id: editingId || undefined,
      name,
      tone_adjectives: adjectives.split(",").map((s) => s.trim()).filter(Boolean),
      writing_samples: [sample1, sample2, sample3].filter(Boolean),
      is_default: isDefault,
    };

    try {
      const res = await fetch("/api/voices", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast(editingId ? "Voice updated!" : "Voice created!");
        resetForm();
        fetchVoices();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to save", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/voices?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Voice deleted");
        setVoices((prev) => prev.filter((v) => v.id !== id));
      }
    } catch {
      toast("Failed to delete", "error");
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tightest text-white/90 mb-2">Brand Voices</h1>
          <p className="text-white/60">Create and manage your brand voice profiles.</p>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white/[0.03] border border-white/10 rounded-lg p-6">
              <div className="h-5 w-40 rounded-md shimmer-loading mb-3" />
              <div className="h-3 w-60 rounded-md shimmer-loading" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tightest text-white/90 mb-2">Brand Voices</h1>
          <p className="text-white/60">Create and manage your brand voice profiles.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-white text-black font-semibold px-4 py-2 text-sm rounded-full hover:bg-white/90 transition-all duration-150 active:scale-[0.98]"
          >
            + New Voice
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-lg p-6 mb-8 space-y-4">
          <h3 className="text-sm font-medium text-white/90 mb-2">
            {editingId ? "Edit Brand Voice" : "Create Brand Voice"}
          </h3>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Premium Tech Brand"
              className="input-base"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">Tone Adjectives</label>
            <input
              type="text"
              value={adjectives}
              onChange={(e) => setAdjectives(e.target.value)}
              placeholder="e.g. Witty, Luxury, Minimalist (comma-separated)"
              className="input-base"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">Writing Samples</label>
            <p className="text-xs text-white/38">Provide 1-3 examples of your brand&apos;s writing style.</p>
            <textarea
              value={sample1}
              onChange={(e) => setSample1(e.target.value)}
              placeholder="Sample 1"
              rows={2}
              className="input-base resize-none"
            />
            <textarea
              value={sample2}
              onChange={(e) => setSample2(e.target.value)}
              placeholder="Sample 2 (optional)"
              rows={2}
              className="input-base resize-none"
            />
            <textarea
              value={sample3}
              onChange={(e) => setSample3(e.target.value)}
              placeholder="Sample 3 (optional)"
              rows={2}
              className="input-base resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-white/10 bg-[#111111] text-white"
            />
            <span className="text-sm text-white/60">Set as default voice</span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-white text-black font-semibold px-5 py-2 text-sm rounded-full hover:bg-white/90 transition-all duration-150 disabled:opacity-50 active:scale-[0.98]"
            >
              {saving ? "Saving..." : editingId ? "Update Voice" : "Create Voice"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-white/60 hover:text-white/90 transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Voice list */}
      {voices.length === 0 && !showForm ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.04] flex items-center justify-center">
            <svg className="w-8 h-8 text-white/38" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-white/90 mb-1">No brand voices yet</p>
          <p className="text-sm text-white/60">Create a brand voice to customize generated descriptions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {voices.map((voice) => (
            <div key={voice.id} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-white/20 transition-all duration-150 ease-in-out">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium text-white/90">{voice.name}</h3>
                    {voice.is_default && (
                      <span className="text-[10px] font-medium uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  {voice.tone_adjectives.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {voice.tone_adjectives.map((adj) => (
                        <span key={adj} className="text-xs px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-white/60">
                          {adj}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-white/38">
                    {voice.writing_samples.length} writing sample{voice.writing_samples.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(voice)}
                    className="text-xs text-white/60 hover:text-white/90 transition-colors duration-150 px-2 py-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(voice.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors duration-150 px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
