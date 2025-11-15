import { useEffect, useState } from "react";

interface BreakingNewsItem {
  id: string;
  text: string;
}

interface BreakingNewsTickerProps {
  items: BreakingNewsItem[];
}

export function BreakingNewsTicker({ items }: BreakingNewsTickerProps) {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="bg-destructive text-destructive-foreground h-12 flex items-center overflow-hidden sticky top-0 z-50" data-testid="breaking-news-ticker">
      <div className="bg-destructive-foreground text-destructive px-4 h-full flex items-center font-bold text-sm">
        BREAKING
      </div>
      <div
        className="flex-1 overflow-hidden relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className={`flex gap-8 ${isPaused ? "" : "animate-scroll"}`}>
          {[...items, ...items].map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="flex items-center gap-8 whitespace-nowrap">
              <span className="text-sm font-medium">{item.text}</span>
              <span className="text-destructive-foreground/50">•</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
