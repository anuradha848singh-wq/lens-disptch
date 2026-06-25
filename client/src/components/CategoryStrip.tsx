import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { type Category } from "@shared/schema";

interface CategoryStripProps {
  selectedCategoryId: string | null;
  onSelect: (id: string | null, name?: string | null) => void;
  onSearch?: (q: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  politics: "🏛️",
  world: "🌍",
  business: "💼",
  technology: "⚡",
  health: "🏥",
  science: "🔬",
  sports: "⚽",
  entertainment: "🎬",
  environment: "🌱",
  opinion: "💬",
};

const POPULAR_TOPICS = [
  { label: "AI Regulation", tag: "AIRegulation" },
  { label: "Climate Summit", tag: "ClimateSummit" },
  { label: "Tech Antitrust", tag: "TechAntitrust" },
  { label: "Inflation", tag: "Inflation" },
  { label: "Immigration", tag: "Immigration" },
  { label: "Defense Budget", tag: "DefenseBudget" },
  { label: "Healthcare Reform", tag: "HealthcareReform" },
  { label: "Election 2026", tag: "Election2026" },
];

export function CategoryStrip({ selectedCategoryId, onSelect, onSearch }: CategoryStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: api.categories.list,
    staleTime: Infinity,   // Categories almost never change — never re-fetch
    gcTime: 60 * 60 * 1000,
  });

  const { data: trendingTags = [] } = useQuery({
    queryKey: ["/api/tags/trending", 8],
    queryFn: () => fetch("/api/tags/trending?limit=8").then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const topicsToShow = (Array.isArray(trendingTags) && trendingTags.length > 0
    ? trendingTags.map((t: any) => ({ label: t.name, tag: t.name.replace(/\s+/g, '') }))
    : POPULAR_TOPICS).filter(t => t.tag.length > 0).slice(0, 5);

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-[112px] z-40 py-0.5">
      <div className="max-w-[1400px] mx-auto px-4">
        {/*
          scroll-fade-right: CSS mask-image adds a gradient fade on the right
          edge so users can see there's more content to scroll.
        */}
        <div
          ref={scrollRef}
          className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide py-0.5 scroll-fade-right"
          role="tablist"
          aria-label="News categories"
        >
          {/* All button */}
          <button
            role="tab"
            aria-selected={selectedCategoryId === null}
            aria-current={selectedCategoryId === null ? "true" : undefined}
            onClick={() => onSelect(null, null)}
            className={`
              flex-shrink-0 relative px-3.5 py-2 text-[11px] font-black uppercase tracking-widest
              transition-all duration-200 rounded-t-sm
              ${selectedCategoryId === null
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              }
            `}
            data-testid="category-all"
          >
            All
            {/* Animated underline indicator */}
            <span
              className={`
                absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full
                bg-accent-editorial transition-all duration-300
                ${selectedCategoryId === null ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"}
              `}
            />
          </button>

          {/* Category buttons with icons */}
          {(categories as Category[]).map((cat: Category) => {
            const icon = CATEGORY_ICONS[cat.slug?.toLowerCase() || ""] || "📰";
            const isActive = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? "true" : undefined}
                onClick={() => onSelect(cat.id, null)}
                className={`
                  flex-shrink-0 relative flex items-center gap-1.5 px-3.5 py-2
                  text-[11px] font-black uppercase tracking-widest
                  transition-all duration-200 rounded-t-sm
                  ${isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                  }
                `}
                data-testid={`category-${cat.slug}`}
              >
                <span className="text-[12px]">{icon}</span>
                {cat.name}
                {/* Animated underline indicator */}
                <span
                  className={`
                    absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full
                    bg-accent-editorial transition-all duration-300 origin-left
                    ${isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"}
                  `}
                />
              </button>
            );
          })}

          {/* Divider */}
          <div className="flex-shrink-0 w-px h-4 bg-border mx-2 opacity-60" aria-hidden="true" />

          {/* Popular Topics label */}
          <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-[.2em] text-muted-foreground/50 px-1 whitespace-nowrap" aria-hidden="true">
            Trending:
          </span>

          {/* Topic hashtags */}
          {topicsToShow.map((topic) => (
            <button
              key={topic.tag}
              onClick={() => {
                if (onSearch) {
                  onSearch(topic.label);
                } else {
                  onSelect(null, topic.label);
                }
              }}
              className="
                flex-shrink-0 px-3 py-1.5 text-[10px]
                text-muted-foreground hover:text-accent-editorial hover:bg-accent-editorial/5
                transition-all duration-150 font-medium italic lowercase rounded-sm
              "
            >
              #{topic.tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
