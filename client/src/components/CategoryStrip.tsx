import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { type Category } from "@shared/schema";

interface CategoryStripProps {
  selectedCategoryId: string | null;
  onSelect: (id: string | null, name: string | null) => void;
}

export function CategoryStrip({ selectedCategoryId, onSelect }: CategoryStripProps) {
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: api.categories.list,
  });

  return (
    <div className="border-b bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
          <button
            onClick={() => onSelect(null, null)}
            className={`flex-shrink-0 px-3 py-1 text-sm rounded-md transition-colors ${
              selectedCategoryId === null
                ? "font-semibold text-foreground bg-secondary"
                : "text-muted-foreground hover:text-foreground hover-elevate"
            }`}
            data-testid="category-all"
          >
            All
          </button>
          {categories.map((cat: Category) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id, cat.name)}
              className={`flex-shrink-0 px-3 py-1 text-sm rounded-md transition-colors ${
                selectedCategoryId === cat.id
                  ? "font-semibold text-foreground bg-secondary"
                  : "text-muted-foreground hover:text-foreground hover-elevate"
              }`}
              data-testid={`category-${cat.slug}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
