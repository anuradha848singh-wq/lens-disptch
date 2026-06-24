import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { type ArticleWithDetails } from "@shared/schema";
import { Radio } from "lucide-react";

export function BreakingTicker() {
  const { data: homepageClusters } = useQuery({
    queryKey: ["/api/homepage"],
    queryFn: () => api.articles.homepage(),
  });

  const breaking = (homepageClusters as any[] || []).filter((c: any) => c.storyPhase === 'breaking');
  if (breaking.length === 0) return null;

  const items = [...breaking, ...breaking];

  return (
    <div className="border-b bg-zinc-950 text-white h-9 flex items-center overflow-hidden" data-testid="breaking-ticker">
      <div className="bg-red-600 px-4 h-full flex items-center gap-2 font-black text-[11px] uppercase tracking-[0.2em] flex-shrink-0 text-white italic">
        <Radio className="w-3 h-3 animate-pulse" />
        LIVE
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap">
          {items.map((a: ArticleWithDetails, i: number) => (
            <Link key={`${a.id}-${i}`} href={`/article/${a.id}`}>
              <span className="inline-flex items-center text-sm px-6 text-zinc-300 gap-4 font-medium cursor-pointer hover:text-white transition-colors">
                <span className="line-clamp-1 max-w-[400px]">{a.title}</span>
                <span className="text-zinc-600 font-black">•</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
