"use client";

type KeywordPillsProps = {
  keywords: string[];
  onSelect: (keyword: string) => void;
  loading?: boolean;
};

export default function KeywordPills({ keywords, onSelect, loading }: KeywordPillsProps) {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-24 rounded-full shimmer-loading" />
        ))}
      </div>
    );
  }

  if (keywords.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <span className="text-xs text-white/38 self-center mr-1">Suggestions:</span>
      {keywords.map((keyword) => (
        <button
          key={keyword}
          onClick={() => onSelect(keyword)}
          className="text-xs px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-white/60 hover:text-white/90 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-150 ease-in-out"
        >
          {keyword}
        </button>
      ))}
    </div>
  );
}
