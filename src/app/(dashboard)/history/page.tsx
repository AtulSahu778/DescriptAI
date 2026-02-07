"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/toaster";

type Description = {
  id: string;
  product_name: string;
  category: string | null;
  tone: string;
  seo_description: string;
  emotional_description: string;
  short_description: string;
  created_at: string;
};

export default function HistoryPage() {
  const [items, setItems] = useState<Description[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("descriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast("Failed to load history", "error");
      } else {
        setItems(data || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Copied!");
  };

  const deleteItem = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("descriptions").delete().eq("id", id);
    if (error) {
      toast("Failed to delete", "error");
    } else {
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast("Deleted");
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tightest text-white/90 mb-2">
            History
          </h1>
          <p className="text-white/60">
            Your previously generated descriptions.
          </p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-lg p-6">
              <div className="h-4 w-40 rounded-md shimmer-loading mb-3" />
              <div className="h-3 w-24 rounded-md shimmer-loading" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tightest text-white/90 mb-2">
          History
        </h1>
        <p className="text-white/60">
          Your previously generated descriptions.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.04] flex items-center justify-center">
            <svg className="w-8 h-8 text-white/38" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-white/90 mb-1">No descriptions yet</p>
          <p className="text-sm text-white/60">
            Generate your first product description to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-all duration-150 ease-in-out">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.03] transition-colors duration-150 text-left"
                >
                  <div>
                    <span className="font-medium text-sm text-white/90">{item.product_name}</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      {item.category && (
                        <span className="text-xs bg-white/[0.06] px-2 py-0.5 rounded-full text-white/60">
                          {item.category}
                        </span>
                      )}
                      <span className="text-xs text-white/38">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-white/60 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 space-y-4 border-t border-white/10 pt-4 animate-fade-in">
                    {([
                      { label: "SEO-Optimized", text: item.seo_description, icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" },
                      { label: "Emotionally Compelling", text: item.emotional_description, icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
                      { label: "Short-Form", text: item.short_description, icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
                    ]).map(({ label, text, icon }) => (
                      <div key={label} className="bg-white/[0.04] rounded-lg p-4 hover-reveal-actions group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                            </svg>
                            <span className="text-xs font-medium text-white/90">{label}</span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(text)}
                            className="action-buttons text-xs text-white/60 hover:text-white/90 transition-colors duration-150"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-sm text-white/60 leading-relaxed">{text}</p>
                      </div>
                    ))}
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors duration-150 flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
