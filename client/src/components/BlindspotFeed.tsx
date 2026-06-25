import { Link } from "wouter";
import { type ArticleWithDetails } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Eye } from "lucide-react";

type ArticleWithClusterCounts = ArticleWithDetails & {
  proEstablishmentCount?: number;
  neutralCount?: number;
  proOppositionCount?: number;
};

interface BlindspotFeedProps {
  articles: ArticleWithClusterCounts[];
}

export function BlindspotFeed({ articles }: BlindspotFeedProps) {
  // Logic: Filter stories where one side is missing coverage
  const leftOnly = articles.filter(a => (a.proOppositionCount || 0) > 0 && (a.proEstablishmentCount || 0) === 0).slice(0, 3);
  const rightOnly = articles.filter(a => (a.proEstablishmentCount || 0) > 0 && (a.proOppositionCount || 0) === 0).slice(0, 3);

  if (leftOnly.length === 0 && rightOnly.length === 0) {
    return (
      <div className="bg-zinc-950 text-white border border-zinc-800 rounded-sm shadow-xl overflow-hidden">
        <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-accent-editorial flex items-center justify-center text-white">
            <Eye className="w-3 h-3" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-widest text-white leading-none">The Blindspot</h2>
        </div>
        <div className="p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-2">
            <Eye className="w-5 h-5 text-zinc-400" />
          </div>
          <p className="text-xs font-bold text-zinc-300 leading-relaxed">
            No coverage gaps detected — all sides are covering the major stories.
          </p>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Blindspot surfaces stories only one political side covers. Check back as more articles are ingested.
          </p>
        </div>
        <Link href="/blindspot">
          <button className="w-full py-3 bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-1 border-t border-zinc-800">
            Full Blindspot Report <ChevronRight className="w-3 h-3" />
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 text-white border border-zinc-800 rounded-sm shadow-xl overflow-hidden">
      <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-accent-editorial flex items-center justify-center text-white">
            <Eye className="w-3 h-3" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-widest text-white leading-none">
            The Blindspot
          </h2>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-zinc-800">
        
        {/* Left Side Blindspot */}
        {leftOnly.length > 0 && (
          <div className="p-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3 flex items-center gap-2 bg-blue-500/10 w-fit px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 rounded-full bias-left" />
              Left Only
            </h3>
            <div className="space-y-4">
              {leftOnly.map(a => (
                <Link key={a.id} href={`/article/${a.id}`}>
                  <div className="group cursor-pointer block hover:bg-zinc-900/50 -mx-2 px-2 py-1 transition-colors rounded">
                    <h4 className="text-[13px] font-display font-bold leading-tight group-hover:text-blue-400 transition-colors mb-1.5 line-clamp-2">
                      {a.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-tight text-zinc-500">
                      <span>{a.sourceCount || 1} sources</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Right Side Blindspot */}
        {rightOnly.length > 0 && (
          <div className="p-4 bg-zinc-900/20">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-3 flex items-center gap-2 bg-red-500/10 w-fit px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 rounded-full bias-right" />
              Right Only
            </h3>
            <div className="space-y-4">
              {rightOnly.map(a => (
                <Link key={a.id} href={`/article/${a.id}`}>
                  <div className="group cursor-pointer block hover:bg-zinc-900/50 -mx-2 px-2 py-1 transition-colors rounded">
                    <h4 className="text-[13px] font-display font-bold leading-tight group-hover:text-red-400 transition-colors mb-1.5 line-clamp-2">
                      {a.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-tight text-zinc-500">
                      <span>{a.sourceCount || 1} sources</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
      <Link href="/blindspot">
        <button className="w-full py-3 bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-1 border-t border-zinc-800">
          Full Blindspot Report <ChevronRight className="w-3 h-3" />
        </button>
      </Link>
    </div>
  );
}
