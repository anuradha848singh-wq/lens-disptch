import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { type ArticleWithDetails } from "@shared/schema";

export function BreakingTicker() {
  const { data } = useQuery({
    queryKey: ["/api/articles", { limit: 10, status: "published" }],
    queryFn: () => api.articles.list({ limit: 10, status: "published" }),
  });

  const articles = data?.articles ?? [];
  if (articles.length === 0) return null;

  const items = [...articles, ...articles];

  return (
    <div className="border-b bg-red-600 text-white h-9 flex items-center overflow-hidden" data-testid="breaking-ticker">
      <div className="bg-white text-red-600 px-3 h-full flex items-center font-bold text-xs uppercase tracking-widest flex-shrink-0 border-r border-red-500">
        Breaking
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap">
          {items.map((a, i) => (
            <span key={`${a.id}-${i}`} className="inline-flex items-center gap-4 text-xs px-4">
              <span>{a.title}</span>
              <span className="text-red-200 text-[10px]">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
