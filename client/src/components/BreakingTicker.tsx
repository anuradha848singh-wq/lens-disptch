import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { type ArticleWithDetails } from "@shared/schema";

export function BreakingTicker() {
  const { data } = useQuery({
    queryKey: ["/api/articles", { limit: 10 }],
    queryFn: () => api.articles.list({ limit: 10 }),
  });

  const articles = data?.articles ?? [];
  if (articles.length === 0) return null;
  const items = [...articles, ...articles];

  return (
    <div className="border-b bg-zinc-900 text-white h-8 flex items-center overflow-hidden" data-testid="breaking-ticker">
      <div className="bg-primary px-3 h-full flex items-center font-black text-[10px] uppercase tracking-[0.15em] flex-shrink-0 text-white">
        Breaking
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap">
          {items.map((a: ArticleWithDetails, i: number) => (
            <span key={`${a.id}-${i}`} className="inline-flex items-center text-xs px-5 text-zinc-300 gap-4">
              <span>{a.title}</span>
              <span className="text-zinc-600">|</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
