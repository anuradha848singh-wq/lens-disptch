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

  let breaking = (homepageClusters as any[] || []).filter((c: any) => c.storyPhase === 'breaking');
  
  // Fall back to top articles if no stories are currently marked as 'breaking'
  if (breaking.length === 0) {
    breaking = (homepageClusters as any[] || []).slice(0, 6);
  }
  
  if (breaking.length === 0) return null;

  const items = [...breaking, ...breaking];

  return (
    <div className="border-b-[1.5px] border-dashed border-hairline-dashed bg-ink text-paper h-10 flex items-center overflow-hidden" data-testid="breaking-ticker">
      <div className="bg-wire-red px-5 h-full flex items-center gap-2 font-mono font-bold text-[10px] uppercase tracking-[0.2em] flex-shrink-0 text-white italic">
        <Radio className="w-3.5 h-3.5 animate-pulse text-white fill-white" />
        WIRE ALERT
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap items-center">
          {items.map((a: ArticleWithDetails, i: number) => (
            <Link key={`${a.id}-${i}`} href={`/article/${a.id}`}>
              <span className="inline-flex items-center text-[13px] font-mono uppercase px-8 text-paper/85 gap-4 cursor-pointer hover:text-lens-cyan transition-colors">
                <span className="line-clamp-1 max-w-[500px]">{a.title}</span>
                <span className="text-lens-cyan font-bold font-sans">•</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
