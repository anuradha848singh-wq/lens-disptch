import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { type Category } from "@shared/schema";

interface CategoryStripProps {
  selectedCategoryId: string | null;
  onSelect: (id: string | null, name: string | null) => void;
}

const TRENDING_TOPICS = [
  "AI Regulation", "Climate Summit", "Tech Antitrust", "Inflation",
  "Immigration", "Defense Budget", "Healthcare Reform", "Election 2026",
];

export function CategoryStrip({ selectedCategoryId, onSelect }: CategoryStripProps) {
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: api.categories.list,
  });

  return (
    <div className="border-b bg-background">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1.5">
          <button
            onClick={() => onSelect(null, null)}
            className={`flex-shrink-0 px-3 py-1 text-xs font-semibold rounded transition-colors ${
              selectedCategoryId === null
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            data-testid="category-all"
          >
            All
          </button>
          {(categories as Category[]).map((cat: Category) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id, cat.name)}
              className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded transition-colors ${
                selectedCategoryId === cat.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              data-testid={`category-${cat.slug}`}
            >
              {cat.name}
            </button>
          ))}
          <div className="flex-shrink-0 w-px h-4 bg-border mx-1" />
          {TRENDING_TOPICS.map((topic) => (
            <button
              key={topic}
              className="flex-shrink-0 px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
