import { type ArticleWithDetails } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "@/lib/api";

type ArticleWithClusterCounts = ArticleWithDetails & {
  proEstablishmentCount?: number;
  neutralCount?: number;
  proOppositionCount?: number;
};

// ─── Trending Topics Widget ──────────────────────────────────────────────────
export function TrendingTopicsWidget({ articles }: { articles?: ArticleWithDetails[] }) {
  const [, setLocation] = useLocation();

  const { data: trendingData = [], isLoading } = useQuery({
    queryKey: ["/api/tags/trending"],
    queryFn: () => fetch("/api/tags/trending").then(r => r.json()),
    staleTime: 60000,
  });

  // Prefer real trending data; fall back to articles prop
  const topics: any[] = Array.isArray(trendingData) && trendingData.length > 0
    ? (trendingData as any[]).slice(0, 4)
    : (articles || []).slice(0, 4);

  return (
    <div className="bg-[#151515] rounded-xl text-white overflow-hidden shadow-md">
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-[11px] font-black uppercase tracking-[.2em] flex items-center gap-2 text-white/90">
          Trending Topics
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </h2>
      </div>

      <div className="divide-y divide-white/10">
        {isLoading && topics.length === 0 ? (
          <div className="p-5 space-y-4 animate-pulse">
            {[80, 65, 55].map((w, i) => (
              <div key={i} className="flex gap-4 items-start py-2">
                <div className="w-6 h-6 bg-white/10 rounded flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-11/12" />
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : topics.length === 0 ? (
          <div className="p-4 text-xs text-white/40 text-center py-8">Loading trending stories…</div>
        ) : (
          topics.map((t: any, i: number) => {
            const isApiData = !!t.name;
            const rightOnly = !isApiData && (t.proOppositionCount || 0) === 0 && (t.proEstablishmentCount || 0) >= 2;
            const leftOnly  = !isApiData && (t.proEstablishmentCount || 0) === 0 && (t.proOppositionCount || 0) >= 2;
            return (
              <div
                key={t.id || t.name || i}
                className="p-4 flex gap-4 hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => !isApiData && t.id && setLocation(`/article/${t.id}`)}
              >
                <span className="text-white font-serif font-black text-lg pt-0.5 min-w-[12px]">{i + 1}</span>
                <div>
                  <h3 className="font-serif text-[15px] leading-snug mb-2 font-bold text-white/90 line-clamp-2">
                    {t.name || t.title || t.headline}
                  </h3>
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/50">
                    {rightOnly && (
                      <span className="text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-sm">RIGHT ONLY</span>
                    )}
                    {leftOnly && (
                      <span className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-sm">LEFT ONLY</span>
                    )}
                    <span>{t.mentions ? `${t.mentions} MENTIONS` : `${t.sourceCount || 1} SOURCES`}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-white/10 flex justify-center">
        <button
          onClick={() => setLocation("/blindspot")}
          className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors flex items-center justify-center gap-1 w-full"
        >
          FULL BLINDSPOT REPORT <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Reading Habit / Perspective Diet Widget ─────────────────────────────────
export function ReadingHabitWidget() {
  const { data: myBias } = useQuery({
    queryKey: ["/api/my-bias"],
    queryFn: () => fetch("/api/my-bias", { credentials: "include" }).then(r => r.ok ? r.json() : null),
    retry: false,
    staleTime: 60000,
  });

  // Derive lean from actual MyBiasStats fields — `overallLean` does NOT exist in the schema
  const leftPct   = myBias?.proEstablishmentPercent   ?? 0;
  const centerPct = myBias?.neutralPercent ?? 0;
  const rightPct  = myBias?.proOppositionPercent  ?? 0;

  const hasReads = leftPct > 0 || centerPct > 0 || rightPct > 0;

  if (myBias && myBias.totalRead === 0) {
    return (
      <div className="bg-white border border-border/60 rounded-xl overflow-hidden p-5 shadow-sm">
        <h2 className="text-[11px] font-black uppercase tracking-[.2em] flex items-center gap-2 mb-4 text-foreground">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Your Perspective Diet
        </h2>
        <div className="text-center p-4 bg-secondary/30 rounded-lg border border-border/40 my-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-muted-foreground/60 mb-2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Read <strong>5 stories</strong> to unlock your personalized perspective diet.
          </p>
        </div>
      </div>
    );
  }

  const lean: "left" | "center" | "right" | null = myBias && hasReads
    ? leftPct > rightPct && leftPct > centerPct
      ? "left"
      : rightPct > leftPct && rightPct > centerPct
      ? "right"
      : "center"
    : null;

  // `shannonDiversity` is the correct field (0–100 normalized diversity score)
  const balanceScore = myBias?.shannonDiversity ?? null;

  return (
    <div className="bg-white border border-border/60 rounded-xl overflow-hidden p-5 shadow-sm">
      <h2 className="text-[11px] font-black uppercase tracking-[.2em] flex items-center gap-2 mb-4 text-foreground">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Your Perspective Diet
      </h2>

      {lean ? (
        <div className="space-y-4">
          <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
            <span>
              Mainly:{" "}
              <span className={lean === "left" ? "text-blue-600" : lean === "right" ? "text-red-600" : "text-foreground"}>
                {lean.charAt(0).toUpperCase() + lean.slice(1)}-Leaning
              </span>
            </span>
            {balanceScore !== null && <span>{balanceScore}% Balanced</span>}
          </div>
          <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden flex">
            <div className="bg-blue-600 h-full transition-all" style={{ width: `${leftPct}%` }} />
            <div className="bg-slate-400 h-full transition-all" style={{ width: `${centerPct}%` }} />
            <div className="bg-red-600 h-full transition-all" style={{ width: `${rightPct}%` }} />
          </div>
          <p className="text-[13px] text-muted-foreground leading-snug mb-5 font-sans">
            You read mostly <strong>{lean}</strong> sources. Try the <strong>Blindspot Feed</strong> to balance your diet.
          </p>
          <Link href="/my-bias">
            <button className="w-full py-3 bg-[#151515] hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded transition-colors shadow-sm flex items-center justify-center gap-2">
              Detailed Analysis <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden flex mb-2">
            <div className="bg-blue-600 w-[20%] h-full" />
            <div className="bg-slate-400 w-[45%] h-full" />
            <div className="bg-red-600 w-[35%] h-full" />
          </div>
          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-4">
            <span>Coverage</span>
            <span>Today</span>
          </div>
          <p className="text-[13px] text-muted-foreground leading-snug mb-5 font-sans">
            {myBias 
              ? "Read more articles to unlock your personalized perspective diet."
              : "Log in to track your reading bias across left, center, and right sources."}
          </p>
          <Link href="/">
            <button className="w-full py-3 bg-[#151515] hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded transition-colors shadow-sm flex items-center justify-center gap-2">
              START READING <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Coverage Stats Widget ───────────────────────────────────────────────────
export function CoverageStatsWidget({ articles }: { articles: ArticleWithClusterCounts[] }) {
  const { data: systemStats } = useQuery({
    queryKey: ["/api/system/stats"],
    queryFn: () => fetch("/api/system/stats").then(r => r.json()),
  });

  const stats = useMemo(() => {
    if (systemStats) {
      return {
        articleCount: systemStats.totalArticles || 0,
        sourceCount: systemStats.totalPublishers || 0,
        countryCount: systemStats.totalCountries || 0,
        biasEventsCount: systemStats.totalBiasEvents || 0,
      };
    }
    const publisherSet = new Set(articles.map(a => a.publisher?.name).filter(Boolean));
    const countrySet   = new Set(articles.map(a => (a.publisher as any)?.country).filter(Boolean));
    return {
      articleCount: articles.length || 60,
      sourceCount:  publisherSet.size || 34,
      countryCount: countrySet.size  || 2,
      biasEventsCount: 3165,
    };
  }, [articles, systemStats]);

  return (
    <div className="bg-white border border-border/60 shadow-sm rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <h2 className="text-[11px] font-black uppercase tracking-[.2em] text-foreground">Live Transparency</h2>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-border/40">
        <div className="p-5 flex flex-col justify-center">
          <span className="text-[28px] font-black font-serif leading-none mb-1 text-foreground">{stats.articleCount.toLocaleString()}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Verified Reports</span>
        </div>
        <div className="p-5 flex flex-col justify-center">
          <span className="text-[28px] font-black font-serif leading-none mb-1 text-foreground">{stats.sourceCount.toLocaleString()}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Global Sources</span>
        </div>
        <div className="p-5 flex flex-col justify-center">
          <span className="text-[28px] font-black font-serif leading-none mb-1 text-foreground">{stats.countryCount.toLocaleString()}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Countries</span>
        </div>
        <div className="p-5 flex flex-col justify-center">
          <span className="text-[28px] font-black font-serif leading-none mb-1 text-foreground">{stats.biasEventsCount.toLocaleString()}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Bias Tracked</span>
        </div>
      </div>
    </div>
  );
}

// ─── Most Polarizing Widget ──────────────────────────────────────────────────
export function PolarizingWidget({ articles }: { articles: ArticleWithClusterCounts[] }) {
  const [, setLocation] = useLocation();

  const { data: polarizingData, isLoading } = useQuery({
    queryKey: ["/api/articles/polarizing"],
    queryFn: () => fetch("/api/articles/polarizing").then(r => r.json()),
  });

  const polarizingFallback = [...articles]
    .filter(a => (a.proEstablishmentCount || 0) >= 2 && (a.proOppositionCount || 0) >= 2)
    .sort((a, b) => ((b.proEstablishmentCount || 0) + (b.proOppositionCount || 0)) - ((a.proEstablishmentCount || 0) + (a.proOppositionCount || 0)))
    .slice(0, 1)[0];

  const polarizing = polarizingData || polarizingFallback;

  if (!polarizing && isLoading) {
    return (
      <div className="bg-[#B91C1C] rounded-xl text-white overflow-hidden shadow-md p-6 animate-pulse">
        <div className="h-3 w-28 bg-white/20 rounded mb-4 animate-pulse" />
        <div className="space-y-2 mb-8">
          <div className="h-6 w-11/12 bg-white/20 rounded animate-pulse" />
          <div className="h-6 w-3/4 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-80">
          <div className="h-3 w-24 bg-white/20 rounded animate-pulse" />
          <div className="h-4 w-4 bg-white/20 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const title       = polarizing?.headline || polarizing?.title || "DeSantis Signs Bill Renaming Palm Beach International Airport for Fallen Airman";
  const sourceCount = polarizing?.sourceCount || 5;
  const bias        = polarizing?.bias || "right";

  return (
    <div
      className="bg-[#B91C1C] rounded-xl text-white overflow-hidden shadow-md p-6 relative group cursor-pointer hover:bg-red-800 transition-colors"
      onClick={() => polarizing?.id && setLocation(`/compare/${polarizing.id}`)}
    >
      <h2 className="text-[10px] font-black uppercase tracking-[.2em] flex items-center gap-2 mb-4 opacity-90">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        Most Polarizing Today
      </h2>

      <h3 className="font-serif text-[22px] font-bold leading-tight pr-6 mb-8 text-white/95 line-clamp-3">
        {title}
      </h3>

      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-80">
        <span>{bias.toUpperCase()} · {sourceCount} SOURCES</span>
        <ChevronRight className="w-4 h-4" />
      </div>

      {/* Decorative accent */}
      <div className="absolute -right-4 -bottom-4 opacity-10">
        <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>
    </div>
  );
}

// ─── Latest Updates Widget ─────────────────────────────────────────────────────
export function LatestUpdatesWidget({ articles }: { articles: ArticleWithDetails[] }) {
  const [, setLocation] = useLocation();

  // Show 6 dense articles that aren't in the very top hero
  const latest = articles.slice(4, 10);

  if (latest.length === 0) return null;

  return (
    <div className="bg-white border border-border/60 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border/40 flex items-center justify-between">
        <h2 className="text-[11px] font-black uppercase tracking-[.2em] flex items-center gap-2 text-foreground">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Latest Updates
        </h2>
      </div>

      <div className="divide-y divide-border/40">
        {latest.map((article, i) => (
          <div
            key={article.id || i}
            className="p-4 flex gap-3 hover:bg-secondary/40 cursor-pointer transition-colors group"
            onClick={() => article.id && setLocation(`/article/${article.id}`)}
          >
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                <span className="text-red-600 font-bold">{article.publisher?.name || "News"}</span>
                <span>•</span>
                <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}</span>
              </div>
              <h3 className="font-serif text-[14px] leading-snug font-bold text-foreground group-hover:text-red-600 transition-colors line-clamp-2">
                {article.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
