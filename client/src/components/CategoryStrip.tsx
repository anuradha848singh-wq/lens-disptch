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
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: api.categories.list,
  });

  const { data: trendingTags = [] } = useQuery({
    queryKey: ["/api/tags/trending", 8],
    queryFn: () => fetch("/api/tags/trending?limit=8").then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const topicsToShow = Array.isArray(trendingTags) && trendingTags.length > 0
    ? trendingTags.map((t: any) => ({ label: t.name, tag: t.name.replace(/\s+/g, '') }))
    : POPULAR_TOPICS;

  return (
    <div className="border-b border-border bg-background py-1">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1 text-[11px] font-bold uppercase tracking-widest font-sans">
          {/* All button */}
          <button
            onClick={() => onSelect(null, null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-sm transition-all font-black ${
              selectedCategoryId === null
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            }`}
            data-testid="category-all"
          >
            All
          </button>

          {/* Category buttons with icons */}
          {(categories as Category[]).map((cat: Category) => {
            const icon = CATEGORY_ICONS[cat.slug?.toLowerCase() || ""] || "📰";
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id, null)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-sm transition-all font-black ${
                  selectedCategoryId === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                }`}
                data-testid={`category-${cat.slug}`}
              >
                <span className="text-[12px]">{icon}</span>
                {cat.name}
              </button>
            );
          })}

          {/* Divider */}
          <div className="flex-shrink-0 w-px h-5 bg-border mx-2" />

          {/* Popular Topics label */}
          <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-[.2em] text-muted-foreground/60 px-1 whitespace-nowrap">
            Popular:
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
              className="flex-shrink-0 px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all font-medium italic lowercase rounded-sm"
            >
              #{topic.tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
