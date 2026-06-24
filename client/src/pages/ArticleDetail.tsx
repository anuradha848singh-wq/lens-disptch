import { useState, useMemo } from "react";
import { deriveBias } from "@/lib/bias-utils";
import DOMPurify from "dompurify";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { BiasChip } from "@/components/BiasBar";
import { BiasSpectrumBar } from "@/components/BiasSpectrumBar";
import { PublisherLogo } from "@/components/PublisherLogo";
import { StoryImpactRings } from "@/components/StoryImpactRings";
import { TrendsDonut, CoverageBarChart, MediaBiasDistribution } from "@/components/BiasCharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import {
  Bookmark, BookmarkCheck, Share2, ExternalLink,
  FileText, Search, ChevronRight, CheckCircle2, Clock, Zap
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { type ArticleWithDetails } from "@shared/schema";


import { StoryOrigin, CoverageByCountry, DeepIntelligenceDashboard, StoryTimeline } from "@/components/StoryIntelligence";
import { PerspectiveSlider, type BiasPerspective } from "@/components/PerspectiveSlider";
import { ContextDiffPanel } from "@/components/ContextDiffPanel";
import { ExecutiveBriefing, ForeignGazePanel, MarketImpact, EntityQuoteTracker } from "@/components/PremiumAIFeatures";
import { useEffect } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

function ReadingProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-accent-editorial origin-left z-50"
      style={{ scaleX }}
    />
  );
}
// ── Bias dot ─────────────────────────────────────────────────────────────────
function BiasDot({ bias }: { bias: string | null }) {
  const color = bias === "left" ? "bg-blue-500"
    : bias === "right" ? "bg-red-500"
      : "bg-gray-400";
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${color}`} />;
}

function TrendingTopicsSection({ category, currentId }: { category?: string; currentId?: string }) {
  const [, setLocation] = useLocation();
  const { data: trending = [] } = useQuery({
    queryKey: ["/api/articles/trending", category],
    queryFn: () => api.articles.trending(10),
    staleTime: 60000,
  });

  const filtered = trending
    .filter((a: any) => a.id !== currentId)
    .slice(0, 4);

  if (filtered.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Trending right now</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Top stories gaining sources across the web</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((a: any) => (
          <div key={a.id}
            className="bg-card border border-border hover:border-primary/30 rounded-xl p-4 cursor-pointer transition-colors flex gap-3"
            onClick={() => setLocation(`/article/${a.id}`)}>
            {a.heroImageUrl && !a.heroImageUrl.includes("placeholder") && (
              <img src={a.heroImageUrl} alt={a.title} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" loading="lazy" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <BiasChip bias={(a.bias || "center") as any} size="xs" />
                {(a.sourceCount || 1) > 1 && (
                  <span className="text-xs font-bold text-blue-600">{a.sourceCount} sources</span>
                )}
                {a.storyPhase === "breaking" && (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Breaking</span>
                )}
              </div>
              <h4 className="text-sm font-bold leading-snug text-foreground line-clamp-2">{a.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{a.publisher?.name}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function YourViewpointSection({ relatedArticles, excludeIds = new Set<string>() }: { relatedArticles: any[]; excludeIds?: Set<string> }) {
  const [, setLocation] = useLocation();
  const { data: myBias } = useQuery({
    queryKey: ["/api/my-bias"],
    queryFn: () => fetch("/api/my-bias", { credentials: "include" }).then(r => r.json()),
    retry: false,
  });

  // Filter out articles already shown in "Same story" section above
  const available = relatedArticles.filter(a => !excludeIds.has(a.id));

  // myBias.overallLean does NOT exist in MyBiasStats schema.
  // Derive the user lean from the actual percentage fields.
  const leftPct   = myBias?.proEstablishmentPercent   ?? 0;
  const centerPct = myBias?.neutralPercent ?? 0;
  const rightPct  = myBias?.proOppositionPercent  ?? 0;
  const userLean: "left" | "center" | "right" =
    myBias && (leftPct > 0 || centerPct > 0 || rightPct > 0)
      ? leftPct > rightPct && leftPct > centerPct
        ? "left"
        : rightPct > leftPct && rightPct > centerPct
        ? "right"
        : "center"
      : "center";

  if (!myBias || (leftPct === 0 && centerPct === 0 && rightPct === 0)) {
    return (
      <section className="bg-secondary/30 border border-dashed border-border rounded-2xl p-8 text-center">
        <h3 className="text-base font-bold text-foreground mb-2">Your viewpoint</h3>
        <p className="text-sm text-muted-foreground">
          Log in to see how this story compares to your reading habits.
        </p>
      </section>
    );
  }

  if (!available.length) return null;

  const oppositeBias = userLean === "left" ? "right"
    : userLean === "right" ? "left"
      : null;

  const oppositeArticles = oppositeBias
    ? available.filter(a => deriveBias(a) === oppositeBias)
    : [];

  const myBiasArticles = available.filter(a => deriveBias(a) === userLean);

  if (oppositeArticles.length === 0 && myBiasArticles.length === 0) return null;

  return (
    <section className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-lg font-bold text-foreground mb-1">Your viewpoint</h3>
      <p className="text-xs text-muted-foreground mb-5">
        Based on your reading history, you tend to read{" "}
        <span className={`font-bold ${userLean === "left" ? "text-blue-600" : userLean === "right" ? "text-red-600" : "text-green-600"}`}>
          {userLean}
        </span>-leaning sources.
      </p>

      <div className="space-y-5">
        {myBiasArticles.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              From sources you normally read
            </p>
            <div className="space-y-2">
              {myBiasArticles.slice(0, 2).map(a => (
                <div key={a.id}
                  className="flex items-start gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setLocation(`/article/${a.id}`)}>
                  <PublisherLogo name={a.publisher?.name || "?"} domain={a.publisher?.website} size="xs" />
                  <div>
                    <p className="text-xs font-bold text-foreground line-clamp-2">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.publisher?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {oppositeArticles.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Step outside your bubble — {oppositeBias} sources say
            </p>
            <div className="space-y-2">
              {oppositeArticles.slice(0, 2).map(a => (
                <div key={a.id}
                  className="flex items-start gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setLocation(`/article/${a.id}`)}>
                  <PublisherLogo name={a.publisher?.name || "?"} domain={a.publisher?.website} size="xs" />
                  <div>
                    <p className="text-xs font-bold text-foreground line-clamp-2">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.publisher?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Bias Distribution with publisher columns ──────────────────────────────
function CoverageDetailsCard({ biasStats, sources }: { biasStats: any, sources: any[] }) {
  const { lastUpdated, cp, shannonDiversity } = useMemo(() => {
    const last = sources.reduce((latest, s) => {
      const t = new Date(s.publishedAt || 0).getTime();
      return t > latest ? t : latest;
    }, 0);

    const centerPercentage = Math.round((biasStats.center / (biasStats.total || 1)) * 100);

    const { left, center, right, total } = biasStats;
    if (total === 0) return { lastUpdated: last, cp: centerPercentage, shannonDiversity: 0 };
    let result = 0;
    [left, center, right].forEach(count => {
      if (count > 0) {
        let p = count / total;
        result -= p * Math.log(p);
      }
    });
    const sdi = Number(((result / Math.log(3)) * 100).toFixed(1));

    return { lastUpdated: last, cp: centerPercentage, shannonDiversity: sdi };
  }, [biasStats, sources]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
        <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Coverage Details
        </span>
      </div>
      <div className="p-4 space-y-2.5">
        {[
          { label: "Total News Sources", value: biasStats.total, color: null },
          { label: "Leaning Left", value: biasStats.left, color: "text-blue-600" },
          { label: "Leaning Right", value: biasStats.right, color: "text-red-600" },
          { label: "Center", value: biasStats.center, color: "text-gray-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={`text-sm font-bold ${color || "text-foreground"}`}>{value}</span>
          </div>
        ))}
        {lastUpdated > 0 && (
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">Last Updated</span>
            <span className="text-sm text-foreground font-medium">
              {formatDistanceToNow(new Date(lastUpdated))} ago
            </span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Bias Distribution</span>
          <span className="text-sm font-bold text-foreground">{cp || 0}% Center</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">Shannon Diversity</span>
          <span className={`text-sm font-bold ${shannonDiversity > 70 ? 'text-green-600' : shannonDiversity > 40 ? 'text-amber-600' : 'text-accent-editorial'}`}>
            {shannonDiversity}%
          </span>
        </div>
      </div>
    </div>
  );
}

function BiasDistributionColumns({ sources }: { sources: any[] }) {
  if (!sources.length) return null;

  const { left, center, right, untracked, cp, total } = useMemo(() => {
    const l = sources.filter(s => deriveBias(s) === "left");
    const c = sources.filter(s => deriveBias(s) === "center");
    const r = sources.filter(s => deriveBias(s) === "right");
    const u = sources.filter(s => !s.bias && !s.publisher?.biasRating);

    const totalCount = sources.length || 1;
    const lp = Math.round((l.length / totalCount) * 100);
    const rp = Math.round((r.length / totalCount) * 100);
    const centerPercentage = 100 - lp - rp;

    return { left: l, center: c, right: r, untracked: u, cp: centerPercentage, total: totalCount };
  }, [sources]);

  const MAX_SHOWN = 5;

  const LogoCol = ({ items, color, label }: { items: any[]; color: string; label: string }) => {
    const bg = color === "left" ? "bg-blue-100 text-blue-800"
      : color === "right" ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-700";
    const hdrBg = color === "left" ? "bg-blue-50 text-blue-700"
      : color === "right" ? "bg-red-50 text-red-700"
        : "bg-gray-50 text-gray-700";
    const shown = items.slice(0, MAX_SHOWN);
    const extra = items.length - MAX_SHOWN;
    return (
      <div className="flex flex-col items-center gap-1 flex-1">
        <span className={`text-xs font-bold px-2 py-1 rounded-md w-full text-center ${hdrBg}`}>
          {label}
        </span>
        {shown.map((s, i) => (
          <PublisherLogo key={i}
            name={s.publisher?.name || "?"}
            domain={s.publisher?.website}
            size="sm"
            className="border-2 border-background"
          />
        ))}
        {extra > 0 && (
          <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
            +{extra}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center justify-between">
        <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Bias distribution
        </span>
        <span className="text-sm text-muted-foreground">
          {cp}% of sources are Center
        </span>
      </div>
      <div className="p-4">
        {/* Spectrum bar */}
        <div className="mb-4">
          <BiasSpectrumBar 
            proEstablishmentCount={left.length} 
            neutralCount={center.length} 
            proOppositionCount={right.length} 
            totalStats={total} 
            className="h-2.5" 
          />
        </div>

        {/* Publisher columns */}
        <div className="grid grid-cols-3 gap-2">
          <LogoCol items={left} color="left" label="Left" />
          <LogoCol items={center} color="center" label="Center" />
          <LogoCol items={right} color="right" label="Right" />
        </div>

        {/* Untracked */}
        {untracked.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Untracked bias
            </div>
            <div className="flex flex-wrap gap-1">
              {untracked.slice(0, 6).map((s, i) => (
                <PublisherLogo key={i}
                  name={s.publisher?.name || "?"}
                  domain={s.publisher?.website}
                  size="xs"
                />
              ))}
              {untracked.length > 6 && (
                <div className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                  +{untracked.length - 6}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Who broke this story ──────────────────────────────────────────────────
function WhoBrokeStory({ sources }: { sources: any[] }) {
  if (!sources.length) return null;

  const data = useMemo(() => {
    const sorted = [...sources].sort((a, b) =>
      new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime()
    );
    const first = sorted[0];
    if (!first) return null;

    const bias = first.bias || first.publisher?.biasRating?.toLowerCase() || "center";
    const followTime = sorted.length > 1
      ? Math.round((new Date(sorted[sorted.length - 1].publishedAt).getTime() -
        new Date(sorted[0].publishedAt).getTime()) / (1000 * 60 * 60))
      : null;

    const dominantBias = sources.filter(s =>
      (s.bias || s.publisher?.biasRating || "").toLowerCase().includes("left")).length >
      sources.filter(s =>
        (s.bias || s.publisher?.biasRating || "").toLowerCase().includes("right")).length
      ? "left" : "right";

    const uniqueFollowers = new Set(
      sorted.slice(1).map(a => a.sourceId || a.publisher?.id)
    ).size;

    return { first, bias, followTime, dominantBias, uniqueFollowers };
  }, [sources]);

  if (!data) return null;
  const { first, bias, followTime, dominantBias, uniqueFollowers } = data;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
        <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Who broke this story
        </span>
      </div>
      <div className="flex items-center gap-3 p-4 border-b border-border bg-secondary/20">
        <PublisherLogo
          name={first.publisher?.name || "?"}
          domain={first.publisher?.website}
          size="md"
        />
        <div>
          <div className="text-sm font-bold text-foreground">
            {first.publisher?.name}
          </div>
          <div className="text-xs text-muted-foreground">
            First reported · {formatDistanceToNow(new Date(first.publishedAt || Date.now()))} ago
          </div>
          <BiasChip bias={bias as any} size="xs" />
        </div>
      </div>
      <div className="p-4 text-sm text-muted-foreground leading-relaxed">
        {uniqueFollowers > 0 ? (
          <>
            <span className="font-bold text-foreground">{uniqueFollowers} sources</span>
            {" "}followed within{" "}
            {followTime !== null ? `${followTime} hour${followTime !== 1 ? "s" : ""}` : "a few hours"}.
            Story gained most traction in{" "}
            <span className={`font-bold ${dominantBias === "left" ? "text-blue-600" : "text-red-600"}`}>
              {dominantBias}-leaning
            </span>
            {" "}outlets.
          </>
        ) : (
          "First and only source covering this story so far."
        )}
      </div>
    </div>
  );
}

// ── Geographic coverage ───────────────────────────────────────────────────
function GeographicCoverage({ sources }: { sources: any[] }) {
  if (!sources.length) return null;

  const flags: Record<string, string> = {
    US: "🇺🇸", UK: "🇬🇧", IN: "🇮🇳", AU: "🇦🇺", CA: "🇨🇦",
    DE: "🇩🇪", FR: "🇫🇷", JP: "🇯🇵", SG: "🇸🇬", IL: "🇮🇱",
    QA: "🇶🇦", RU: "🇷🇺", NZ: "🇳🇿", ZA: "🇿🇦", NG: "🇳🇬",
    PK: "🇵🇰", MY: "🇲🇾", TH: "🇹🇭", PH: "🇵🇭", ID: "🇮🇩",
  };

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sources) {
      const c = s.publisher?.country;
      if (!c || c.toLowerCase() === "unknown" || c.toLowerCase() === "global") continue;
      counts[c] = (counts[c] || 0) + 1;
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;

    const max = sorted[0]?.[1] || 1;
    const shown = sorted.slice(0, 5);
    const rest = sorted.slice(5);

    return { sorted, max, shown, rest };
  }, [sources]);

  if (!data) return null;
  const { sorted, max, shown, rest } = data;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center justify-between">
        <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Geographic coverage
        </span>
        <span className="text-xs text-muted-foreground">
          {sources.length} sources worldwide
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div className="text-sm text-muted-foreground mb-1">
          Sources mostly from {sorted[0]?.[0] === "US" ? "United States" : sorted[0]?.[0]} ({sorted[0]?.[1]})
        </div>
        {shown.map(([country, count]) => (
          <div key={country} className="flex items-center gap-2">
            <span className="text-base w-6 text-center flex-shrink-0">
              {flags[country] || "🌍"}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-foreground">{
                  country === "US" ? "United States"
                    : country === "UK" ? "United Kingdom"
                      : country === "IN" ? "India"
                        : country === "AU" ? "Australia"
                          : country === "CA" ? "Canada"
                            : country === "DE" ? "Germany"
                              : country === "FR" ? "France"
                                : country === "JP" ? "Japan"
                                  : country
                }</span>
                <span className="font-bold text-foreground">{count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${count / max > 0.6 ? "bg-blue-500"
                      : count / max > 0.3 ? "bg-green-600"
                        : "bg-gray-400"
                    }`}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        {rest.length > 0 && (
          <div className="text-xs text-blue-600 cursor-pointer pt-1">
            +{rest.length} more countries →
          </div>
        )}
      </div>
    </div>
  );
}

// ── Similar news topics ───────────────────────────────────────────────────
function SimilarTopics({ article }: { article: any }) {
  const [, setLocation] = useLocation();
  const { data: trending = [] } = useQuery({
    queryKey: ["/api/articles/trending"],
    queryFn: () => api.articles.trending(20),
    staleTime: 60000,
  });

  const categoryColors = [
    "bg-blue-500", "bg-green-600", "bg-purple-600",
    "bg-amber-600", "bg-red-600", "bg-teal-600",
  ];

  // Build real source counts per category from trending data
  const catCountMap = useMemo(() => {
    const m = new Map<string, number>();
    (trending as any[]).forEach(t =>
      (t.categories || []).forEach((c: any) => m.set(c.slug, (m.get(c.slug) || 0) + 1))
    );
    return m;
  }, [trending]);

  // Primary: article's own categories. Fallback: fill from trending when article has none
  const articleCats: any[] = article?.categories || [];
  const topicMap = new Map<string, { name: string; slug: string; count: number; color: string; initials: string }>();

  articleCats.forEach((c: any, i: number) => {
    topicMap.set(c.slug, {
      name: c.name, slug: c.slug,
      count: catCountMap.get(c.slug) || 1,
      color: categoryColors[i % categoryColors.length],
      initials: c.name.slice(0, 2).toUpperCase(),
    });
  });

  if (topicMap.size < 3) {
    (trending as any[]).forEach(t =>
      (t.categories || []).forEach((c: any) => {
        if (!topicMap.has(c.slug) && topicMap.size < 6) {
          topicMap.set(c.slug, {
            name: c.name, slug: c.slug,
            count: catCountMap.get(c.slug) || 1,
            color: categoryColors[topicMap.size % categoryColors.length],
            initials: c.name.slice(0, 2).toUpperCase(),
          });
        }
      })
    );
  }

  const [showAll, setShowAll] = useState(false);
  const topicList = Array.from(topicMap.values()).slice(0, showAll ? 20 : 6);
  if (!topicList.length) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
        <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Similar news topics
        </span>
      </div>
      {topicList.map((topic, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-secondary/30 transition-colors"
          onClick={() => setLocation(`/?category=${topic.slug}`)}
        >
          <div className={`w-9 h-9 rounded-lg ${topic.color} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
            {topic.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-foreground">{topic.name}</div>
            <div className="text-xs text-muted-foreground">{topic.count} sources</div>
          </div>
        </div>
      ))}
      {!showAll && topicMap.size > 6 && (
        <div className="px-4 py-2.5 text-center border-t border-border bg-secondary/10">
          <button 
            onClick={() => setShowAll(true)}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            Show all topics →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Similar Articles Section ───────────────────────────────────────────────
function SimilarArticlesSection({ articles, currentId }: { articles: any[]; currentId?: string }) {
  const [, setLocation] = useLocation();
  const filtered = articles.filter(a => a.id !== currentId).slice(0, 6);
  if (filtered.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Similar articles</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Same event covered by different sources
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((a: any) => (
          <div
            key={a.id}
            className="bg-card border border-border hover:border-primary/30 rounded-xl p-4 cursor-pointer transition-colors flex gap-3"
            onClick={() => setLocation(`/article/${a.id}`)}
          >
            {a.heroImageUrl && !a.heroImageUrl.includes("placeholder") && (
              <img
                src={a.heroImageUrl}
                alt={a.title}
                className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                loading="lazy"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <BiasChip bias={(a.bias || "center") as any} size="xs" />
                <span className="text-xs font-bold text-muted-foreground truncate">
                  {a.publisher?.name}
                </span>
              </div>
              <h4 className="text-sm font-bold leading-snug text-foreground line-clamp-2">
                {a.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(a.publishedAt || Date.now()))} ago
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ArticleDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("All");
  const [sourceSearch, setSourceSearch] = useState("");
  const [showFullArticle, setShowFullArticle] = useState(false);
  const [activePerspective, setActivePerspective] = useState<BiasPerspective | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────
  const { data: fullPack, isLoading } = useQuery({
    queryKey: ["/api/articles", id, "full"],
    queryFn: () => api.articles.getFull(id!),
    enabled: !!id,
    staleTime: 60000,
  });

  const article = fullPack?.article;
  const clusterData = fullPack?.cluster;
  const deepIntelligence = fullPack?.deepIntelligence;
  const relatedRaw = fullPack?.related || [];
  const similarRaw = fullPack?.similar || [];
  const publisherData = fullPack?.publisherArticles;

  // Exclude articles from same cluster — show genuinely different stories
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const publisherArticles = (publisherData?.articles || [])
    .filter(a => a.clusterId !== article?.clusterId)
    .filter(a => a.id !== article?.id)
    .filter(a => (Date.now() - new Date(a.publishedAt || Date.now()).getTime()) < SEVEN_DAYS)
    .slice(0, 3);


  // ── Derived data ──────────────────────────────────────────────────────────
  // allSources = current article + same-cluster articles (similarRaw).
  // Used by sidebar: Bias Distribution, Who Broke Story, Geographic Coverage.
  const allSources = useMemo(() => {
    if (!article) return [];
    const self: ArticleWithDetails = article;
    return [self, ...similarRaw.filter(r => r.id !== self.id)];
  }, [article, similarRaw]);

  const biasStats = useMemo(() => {
    const counts = { left: 0, center: 0, right: 0, total: allSources.length };
    for (const s of allSources) {
      const b = deriveBias(s);
      if (b === "left") counts.left++;
      else if (b === "right") counts.right++;
      else counts.center++;
    }
    return counts;
  }, [allSources]);

  // filterCounts: tab counts from similarRaw (same cluster = same event, different sources)
  const filterCounts = useMemo(() => {
    const counts = { left: 0, center: 0, right: 0 };
    for (const a of similarRaw) {
      const b = deriveBias(a);
      counts[b]++;
    }
    return counts;
  }, [similarRaw]);

  // Source count — prefer cluster's sourceCount, fall back to computed
  // Source count — synchronized across all components
  const displaySourceCount = Math.max(article?.sourceCount || 1, allSources.length);

  // Filter + search: operates on similarRaw (same cluster = same event, different sources)
  const filteredRelated = useMemo(() => {
    let list = similarRaw;
    if (activeFilter !== "All") {
      list = list.filter(a => deriveBias(a) === activeFilter.toLowerCase());
    }
    if (sourceSearch.trim()) {
      const q = sourceSearch.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.publisher?.name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [similarRaw, activeFilter, sourceSearch]);

  // Sources for MediaBiasDistribution component
  const sourcesForChart = useMemo(() => allSources.map(a => ({
    id: a.id,
    source_name: a.publisher?.name || "Unknown",
    article_title: a.title,
    published_at: a.publishedAt?.toString() || "",
    bias_label: ((a.bias || "center").toUpperCase()) as any,
    factuality: a.publisher?.factualityRating || "unknown",
    snippet: a.excerpt || "",
    source_url: a.sourceUrl || a.url || "#",
    similarity: 1,
    publisher_id: a.sourceId || "",
    hero_image: a.heroImageUrl,
  })), [allSources]);

  const getCategoryImage = (category: string) => {
    const fallbacks: Record<string, string> = {
      politics: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=1200&q=80",
      technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
      business: "https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=1200&q=80",
      health: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=80",
      sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80",
      world: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=1200&q=80",
    };
    return fallbacks[category.toLowerCase()] || fallbacks.politics;
  };

  // ── Bookmarks ────────────────────────────────────────────────────────────
  const { data: isBookmarked = false } = useQuery<ArticleWithDetails[], Error, boolean>({
    queryKey: ["/api/bookmarks"],
    queryFn: api.bookmarks.list as any,
    enabled: !!user,
    select: (bookmarks) => bookmarks.some((a) => a.id === id),
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => isBookmarked ? api.bookmarks.remove(id!) : api.bookmarks.add(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      toast({ title: isBookmarked ? "Removed from bookmarks" : "Saved to bookmarks" });
    },
  });

  // ── Analytics Tracking ───────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const trackView = async () => {
      try {
        await fetch(`/api/articles/${id}/view`, { method: "POST" });
      } catch (e) {
        console.error("Failed to track view", e);
      }
    };
    trackView();
  }, [id]);
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied to clipboard" });
    } catch {
      toast({ title: "Share link", description: window.location.href });
    }
  };

  // ── Summary ──────────────────────────────────────────────────────────────
  const aiInsights = (article?.aiInsights as string[]) || [];
  // Strip boilerplate lines from AI summaries (Bug 9)
  const BAD_PREFIXES = ["read more", "read article", "click here", "subscribe", "sign up", "for more", "visit"];
  const currentYear = new Date().getFullYear();
  const summaryPoints = (
    aiInsights.length > 0
      ? aiInsights
      : article?.excerpt
        ? article.excerpt.split(". ").filter(s => s.length > 6)
        : []
  ).filter(p => !BAD_PREFIXES.some(bad => p.toLowerCase().trim().startsWith(bad)))
   .filter(p => {
     const yMatches = p.match(/\b(19|20)\d{2}\b/g);
     if (!yMatches) return true;
     return yMatches.every(yr => parseInt(yr) >= currentYear - 1);
   })
    .slice(0, 4);
    
  // Is article less than 30 mins old?
  const isRecent = article?.publishedAt && (Date.now() - new Date(article.publishedAt).getTime() < 30 * 60 * 1000);

  // ── Perspective Switching Logic ───────────────────────────────────────────────
  const availableBiases = useMemo(() => {
    const biases = new Set<BiasPerspective>();
    allSources.forEach(s => {
      const b = deriveBias(s);
      if (b === "left" || b === "center" || b === "right") biases.add(b);
    });
    return biases;
  }, [allSources]);

  useEffect(() => {
    if (article && !activePerspective) {
      const b = deriveBias(article);
      if (b === "left" || b === "center" || b === "right") setActivePerspective(b);
      else if (availableBiases.has("center")) setActivePerspective("center");
      else if (availableBiases.size > 0) setActivePerspective(Array.from(availableBiases)[0]);
    }
  }, [article, activePerspective, availableBiases]);

  const activeArticle = useMemo(() => {
    if (!activePerspective) return article;
    if (article && deriveBias(article) === activePerspective) return article;
    const found = similarRaw.find(a => deriveBias(a) === activePerspective);
    return found || article;
  }, [activePerspective, article, similarRaw]);

  const activeSummaryPoints = useMemo(() => {
    const target = activeArticle;
    if (!target) return [];
    const points = (target.aiInsights && target.aiInsights.length > 0
      ? target.aiInsights
      : target.excerpt
        ? target.excerpt.split(". ").filter(s => s.length > 6)
        : []
    ).filter(p => !BAD_PREFIXES.some(bad => p.toLowerCase().trim().startsWith(bad)))
     .filter(p => {
       const yMatches = p.match(/\b(19|20)\d{2}\b/g);
       if (!yMatches) return true;
       return yMatches.every(yr => parseInt(yr) >= currentYear - 1);
     })
     .slice(0, 4);
    return points;
  }, [activeArticle, currentYear]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="max-w-[1300px] mx-auto px-4 md:px-6 pt-10">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-5 w-1/4 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_320px] gap-10">
            <Skeleton className="hidden lg:block h-[400px] w-full rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-14 w-3/4" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-[300px] w-full rounded-xl" />
              <Skeleton className="h-[200px] w-full rounded-xl" />
            </div>
            <Skeleton className="hidden lg:block h-[600px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background pt-24 text-center">
        <h2 className="text-2xl font-bold text-foreground">Article not found</h2>
        <Button onClick={() => setLocation("/")} className="mt-4">Return home</Button>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ReadingProgressBar />
      <MainNav />

      <main className="max-w-[1400px] mx-auto px-4 md:px-8 pt-8 pb-24">

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 items-start">

          {/* ── MAIN CONTENT ── */}
          <div
            className="min-w-0"
          >

            {/* ── ARTICLE HEADER ── */}
            <div className="mb-8 pb-8 border-b border-border">
              <div className="flex items-center gap-3 mb-6 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-all duration-500">
                 <span>{activeArticle?.categories?.[0]?.name || "World News"}</span>
                 <span>·</span>
                 <span>{formatDistanceToNow(new Date(activeArticle?.publishedAt || Date.now()), { addSuffix: true })}</span>
              </div>
              <h1 className="font-display text-[44px] font-bold leading-[1.1] tracking-tight text-foreground mb-4 transition-all duration-500">
                {activeArticle?.title}
              </h1>

              {/* Perspective Slider */}
              <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                <PerspectiveSlider
                  activeBias={activePerspective || "center"}
                  onChange={setActivePerspective}
                  availableBiases={availableBiases}
                />
                
                <button className="px-4 py-2 rounded-full border border-border text-sm font-bold text-muted-foreground hover:bg-secondary transition-colors shrink-0" onClick={() => article?.clusterId && setLocation(`/compare/${article.clusterId}`)}>
                  Open Bias Comparison
                </button>
              </div>
            </div>
          {displaySourceCount > 1 && (
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Covered by {displaySourceCount} {displaySourceCount === 1 ? 'source' : 'sources'}
              </span>
              {article.storyPhase === "breaking" && (
                <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                  Breaking
                </span>
              )}
              {article.storyPhase === "developing" && (
                <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                  Developing
                </span>
              )}
            </div>
          )}

          {/* Hero image — stabilized with fallback (Phase 2 hardening) */}
          <div className="w-full overflow-hidden mb-8 rounded-xl relative transition-all duration-500" style={{ aspectRatio: "16/9", maxHeight: "420px" }}>
            <img
              key={activeArticle?.id}
              src={
                (activeArticle?.heroImageUrl && !activeArticle.heroImageUrl.includes("placeholder") && !["election", "vote", "ballot"].some(w => activeArticle.heroImageUrl!.toLowerCase().includes(w)))
                  ? activeArticle.heroImageUrl
                  : getCategoryImage(activeArticle?.categories?.[0]?.slug || "world")
              }
              alt={activeArticle?.title}
              width={1200}
              height={514}
              className="w-full h-full object-cover transition-opacity duration-500"
              loading="eager"
            />
          </div>

          {/* Balanced AI Synthesis (Llama-3.1 Powered Story Neutral Summary) */}
          {clusterData && (clusterData.summary || (clusterData.aiSummary && clusterData.aiSummary.length > 0)) && (
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 border-2 border-purple-500/10 rounded-2xl p-6 md:p-8 mb-8 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-500/10 rounded-xl">
                  <Zap className="w-5 h-5 text-purple-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-purple-900">Balanced AI Synthesis</h3>
                  <p className="text-[10px] font-bold text-purple-600/70">Perspective-Neutral Summary & Consensus</p>
                </div>
                <div className="ml-auto">
                  <span className="inline-flex items-center bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-black px-2.5 py-0.5 rounded-full">
                    Llama-3.1 Live
                  </span>
                </div>
              </div>

              {clusterData.summary && (
                <p className="font-serif text-[17px] leading-[1.8] text-foreground font-medium mb-6">
                  {clusterData.summary}
                </p>
              )}

              {clusterData.aiSummary && clusterData.aiSummary.length > 0 && (
                <div className="space-y-3.5 border-t border-purple-500/10 pt-5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 mb-2">Key Takeaways</h4>
                  {clusterData.aiSummary.map((point: string, i: number) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0 animate-pulse" />
                      <p className="font-sans text-[14px] text-muted-foreground leading-[1.6]">
                        {point.trim()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {article.clusterId && <ExecutiveBriefing clusterId={article.clusterId} />}
          
          <StoryOrigin publisher={deepIntelligence?.origin?.publisher} publishedAt={deepIntelligence?.origin?.publishedAt} />
          
          {article.clusterId && <ForeignGazePanel clusterId={article.clusterId} />}
          
          <DeepIntelligenceDashboard data={deepIntelligence} isLoading={isLoading} />

          <div className="flex lg:hidden items-center gap-3 mb-6 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
              {displaySourceCount} {displaySourceCount === 1 ? "source" : "sources"}
            </span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
              Left {biasStats.left}
            </span>
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              Center {biasStats.center}
            </span>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
              Right {biasStats.right}
            </span>
          </div>


          {/* Publisher row */}
          <div className="flex items-center gap-4 mb-8 py-4 border-b border-border transition-all duration-500">
            <PublisherLogo name={activeArticle?.publisher?.name || "?"} domain={activeArticle?.publisher?.website} size="md" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{activeArticle?.publisher?.name}</span>
                {activeArticle?.publisher?.biasRating && (
                  <BiasChip bias={(activeArticle.publisher.biasRating || "center") as any} size="xs" />
                )}
                <span className="text-sm text-muted-foreground">
                  updated {formatDistanceToNow(new Date(activeArticle?.publishedAt || Date.now()), { addSuffix: true })}
                </span>
              </div>

              <a
                href={activeArticle?.sourceUrl || activeArticle?.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold mt-0.5"
              >
                Read article on {activeArticle?.publisher?.name} <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => bookmarkMutation.mutate()}
              >
                {isBookmarked
                  ? <BookmarkCheck className="w-4 h-4 text-blue-600" />
                  : <Bookmark className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Summary box */}
          <div className="bg-card border border-border rounded-xl overflow-hidden mb-6 transition-all duration-500">
            <div className="bg-secondary/40 px-5 py-3 border-b border-border flex items-center gap-3 flex-wrap">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-black text-foreground shrink-0 uppercase tracking-widest">{activeArticle?.publisher?.name || "The Lens Dispatch"}</span>
              {activeArticle && <BiasChip bias={deriveBias(activeArticle)} size="xs" />}
            </div>
            <div className="p-6 space-y-4">
              {activeSummaryPoints.length === 0 ? (
                (activeArticle?.id === article?.id && isRecent) ? (
                  <div className="flex items-center gap-3 text-muted-foreground py-2">
                    <div className="w-4 h-4 border-2 border-border border-t-purple-400 rounded-full animate-spin" />
                    <span className="text-sm">Summary being generated...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-muted-foreground py-2">
                    <span className="text-sm">No detailed summary available for this perspective.</span>
                  </div>
                )
              ) : activeSummaryPoints.map((point, i) => (
                <div key={i} className="flex gap-4 items-start py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                  <p className="font-serif text-[16px] text-foreground leading-[1.75]">
                    {point.trim()}{point.endsWith(".") ? "" : "."}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Read full article button */}
          {!showFullArticle ? (
            <div className="flex justify-center mb-10 py-2 border-y border-dashed border-border">
              <Button
                size="lg"
                className="rounded-full bg-[#af2b2b] hover:bg-[#8e2323] text-white font-bold text-sm px-8 gap-2"
                onClick={() => {
                  if (activeArticle?.sourceUrl || activeArticle?.url) {
                    window.open(activeArticle.sourceUrl || activeArticle.url, "_blank", "noreferrer");
                  } else {
                    setShowFullArticle(true);
                  }
                }}
              >
                Read full article on {activeArticle?.publisher?.name}
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          ) : (
          <div className="mb-12 p-10 bg-card border border-border prose prose-zinc dark:prose-invert max-w-none">
            <div className="flex justify-between items-center mb-8 pb-4 border-b-4 border-double border-border/50">
              <h3 className="text-2xl font-serif font-bold text-foreground">Full Article · {activeArticle?.publisher?.name}</h3>
              <Button variant="ghost" size="sm" className="font-bold uppercase tracking-widest text-xs" onClick={() => setShowFullArticle(false)}>Close View</Button>
            </div>
            <div
              className="font-serif text-[18px] md:text-[20px] leading-[1.8] text-foreground space-y-6 transition-all duration-500"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  activeArticle?.fullContent || activeArticle?.bodyHtml ||
                  "<p>The full narrative for this story from " + activeArticle?.publisher?.name + " is restricted. Please use the link below to access the original document.</p>"
                )
              }}
            />
          </div>
          )}

        {/* ── STICKY FILTER BAR ── */}
        <div className="sticky top-0 z-40 bg-background/98 backdrop-blur-sm py-4 border-y border-border mb-10 flex items-center justify-between gap-6 px-2">
          <div className="flex items-center gap-3">
            <span className="text-[28px] font-bold text-foreground leading-none">{displaySourceCount}</span>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Total Perspectives
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-secondary/40 p-1 rounded-full border border-border">
            {(["All", "Left", "Center", "Right"] as const).map(f => {
              const activeColors = {
                All: "bg-foreground text-background",
                Left: "bg-blue-600 text-white",
                Center: "bg-gray-500 text-white",
                Right: "bg-red-600 text-white",
              };
              const count = f === "All" ? similarRaw.length
                : f === "Left" ? filterCounts.left
                  : f === "Center" ? filterCounts.center
                    : filterCounts.right;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                    activeFilter === f ? activeColors[f] : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {f} {f !== "All" && count > 0 && <span className="opacity-70 ml-0.5">{count}</span>}
                </button>
              );
            })}
          </div>


          <div className="relative shrink-0 hidden sm:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sources..."
              value={sourceSearch}
              onChange={e => setSourceSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 rounded-full border border-border text-xs w-56 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="flex flex-col lg:flex-row gap-12 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="flex-1 min-w-0 lg:border-r border-border lg:pr-14 space-y-16">


            {/* ── SECTION 1: Same story different angle ── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Same story, different angle</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    How {displaySourceCount} {displaySourceCount === 1 ? "source is" : "sources are"} covering this
                  </p>
                </div>
                {article?.clusterId && (
                  <span className="text-xs font-bold text-blue-600 cursor-pointer hover:underline"
                    onClick={() => setLocation(`/compare/${article.clusterId}`)}>
                    See all sources
                  </span>
                )}
              </div>

              {/* Framing comparison — show AI analysis or headline comparison */}
              {(clusterData?.aiFramingDiff || (biasStats.left > 0 && biasStats.right > 0)) && (() => {
                const leftArt = relatedRaw.find(a => deriveBias(a) === "left");
                const rightArt = relatedRaw.find(a => deriveBias(a) === "right");
                
                return (
                  <div className="bg-card border border-border rounded-xl p-6 mb-6">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                       Journalistic Framing Analysis
                    </p>
                    
                    {clusterData?.aiFramingDiff ? (
                      <div className="mb-6 p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900 rounded-lg">
                        <p className="font-serif text-[15px] italic text-foreground leading-relaxed">
                          "{clusterData.aiFramingDiff}"
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                           <div className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center text-[8px] text-white font-bold">AI</div>
                           <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">FLAN-T5 Synthesis</span>
                        </div>
                      </div>
                    ) : null}

                    {leftArt && rightArt && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-xl p-4 border-l-4 border-blue-500">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Left headline · {leftArt.publisher?.name}</span>
                          <p className="text-[13px] font-bold text-foreground mt-1.5 leading-snug">{leftArt.title}</p>
                        </div>
                        <div className="bg-red-50/50 dark:bg-red-950/20 rounded-xl p-4 border-l-4 border-red-500">
                          <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Right headline · {rightArt.publisher?.name}</span>
                          <p className="text-[13px] font-bold text-foreground mt-1.5 leading-snug">{rightArt.title}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Coverage gap warning */}
              {biasStats.right === 0 && biasStats.total > 2 && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
                  <span className="text-amber-500 text-lg mt-0.5">⚠</span>
                  <div>
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Right-leaning sources are not covering this story</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">This may be a blindspot. Check the Blindspot feed for stories your sources are missing.</p>
                  </div>
                </div>
              )}
              {biasStats.left === 0 && biasStats.total > 2 && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
                  <span className="text-blue-500 text-lg mt-0.5">⚠</span>
                  <div>
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-300">Left-leaning sources are not covering this story</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">This may be a blindspot on the left. Check the Blindspot feed.</p>
                  </div>
                </div>
              )}

              {/* Context Diff Panel */}
              <ContextDiffPanel activeArticle={activeArticle!} clusterArticles={relatedRaw} />

              {filteredRelated.length > 0 ? (() => {
                const uniqueGrid: { article: any, extra: number, pid: string | null }[] = [];
                const pubCounts = new Map<string, number>();

                for (const a of filteredRelated) {
                  const pid = a.sourceId || a.publisher?.id || a.publisher?.name;
                  if (!pid) {
                    uniqueGrid.push({ article: a, extra: 0, pid: null });
                    continue;
                  }
                  if (!pubCounts.has(pid)) {
                    pubCounts.set(pid, 1);
                    uniqueGrid.push({ article: a, extra: 0, pid });
                  } else {
                    pubCounts.set(pid, pubCounts.get(pid)! + 1);
                    const match = uniqueGrid.find(u => u.pid === pid);
                    if (match) match.extra++;
                  }
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {uniqueGrid.slice(0, 6).map(({ article: source, extra }) => (
                      <div key={source.id}
                        className="bg-card border border-border hover:border-primary/40 transition-colors rounded-xl p-5 flex flex-col justify-between cursor-pointer relative"
                        onClick={() => setLocation(`/article/${source.id}`)}>
                        {extra > 0 && (
                          <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-black px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 shadow-sm z-10">
                            +{extra} MORE
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <PublisherLogo name={source.publisher?.name || "?"} domain={source.publisher?.website} size="xs" />
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight truncate max-w-[140px]">
                              {source.publisher?.name}
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                              <BiasChip bias={(source.bias || "center") as any} size="xs" />
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                {source.publisher?.ownership && (
                                  <span 
                                    className="border border-border rounded px-1.5 py-0.5 hover:text-blue-600 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`https://mediabiasfactcheck.com/?s=${encodeURIComponent(source.publisher?.name || "")}`, "_blank");
                                    }}
                                  >
                                    Ownership ↗
                                  </span>
                                )}
                                {source.publisher?.factualityRating && (
                                  <span 
                                    className="border border-border rounded px-1.5 py-0.5 hover:text-blue-600 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`https://mediabiasfactcheck.com/?s=${encodeURIComponent(source.publisher?.name || "")}`, "_blank");
                                    }}
                                  >
                                    Factuality ↗
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <h4 className="text-sm font-bold leading-snug text-foreground mb-1.5 line-clamp-2 hover:text-blue-600 transition-colors">
                            {source.title}
                          </h4>
                          {source.excerpt && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {source.excerpt}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mt-3 pt-3 border-t border-border">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(source.publishedAt || Date.now()))} ago
                          </span>
                          <span className="flex items-center gap-1 text-blue-600 cursor-pointer">
                            Read article <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })() : (
                <div className="bg-card border border-border rounded-xl py-10 text-center">
                  <p className="text-muted-foreground text-sm">No other sources found for this filter yet.</p>
                </div>
              )}

              <div className="flex justify-center pt-5">
                <Button variant="outline"
                  className="rounded-full font-bold text-sm px-8 border-2 border-border hover:border-primary/50"
                  onClick={() => article?.clusterId ? setLocation(`/compare/${article.clusterId}`) : setLocation("/")}>
                  Show me coverage in balance <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </section>

            {/* ── SECTION 2: Trending on this topic ── */}
            <TrendingTopicsSection category={article?.categories?.[0]?.slug} currentId={article?.id} />

            {/* ── SECTION 3: Your viewpoint (uses similarRaw for bias-matched picks) ── */}
            <YourViewpointSection
              relatedArticles={similarRaw}
              excludeIds={new Set(filteredRelated.slice(0, 6).map((a: any) => a.id))}
            />

            {/* ── Related articles (different event, same category) ── always shown */}
            {(() => {
              const shownIds = new Set(filteredRelated.slice(0, 6).map((a: any) => a.id));
              const trueRelated = relatedRaw.filter(a => !shownIds.has(a.id));
              
              if (trueRelated.length === 0) return null;
              
              return (
                <section>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-foreground">Related articles</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Other stories on the same topic
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trueRelated.slice(0, 4).map((a: any) => (
                      <div
                        key={a.id}
                        className="bg-card border border-border hover:border-primary/30 rounded-xl p-4 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/article/${a.id}`)}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <BiasChip bias={(a.bias || "center") as any} size="xs" />
                          <span className="text-xs font-bold text-muted-foreground truncate">
                            {a.publisher?.name}
                          </span>
                        </div>
                        <h4 className="text-[15px] font-semibold leading-snug text-foreground line-clamp-2">
                          {a.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(a.publishedAt || Date.now()))} ago
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}

            {/* Inside Publisher */}
            <section className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-foreground">
                  Inside {article.publisher?.name || "Publisher"}
                </h3>
                <span
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                  onClick={() => setLocation("/publishers")}
                >
                  See more from {article.publisher?.name} <ChevronRight className="w-3 h-3" />
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {publisherArticles.length > 0 ? (
                  publisherArticles.map(pubArt => (
                    <div
                      key={pubArt.id}
                      className="group cursor-pointer flex flex-col"
                      onClick={() => setLocation(`/article/${pubArt.id}`)}
                    >
                      <div className="aspect-[16/10] rounded-lg bg-secondary mb-3 overflow-hidden border border-border">
                        {pubArt.heroImageUrl && !pubArt.heroImageUrl.includes("placeholder") ? (
                          <img
                            src={pubArt.heroImageUrl}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            alt={article.title}
                            loading="lazy"
                          />
                        ) : (
                          <div className={`w-full h-full flex flex-col justify-center p-4 bg-background border-l-[6px] ${
                            (pubArt.bias === "pro_establishment" || (pubArt.publisher?.biasRating?.toLowerCase().includes("pro_establishment"))) ? "border-blue-500/30" :
                            (pubArt.bias === "pro_opposition" || (pubArt.publisher?.biasRating?.toLowerCase().includes("pro_opposition"))) ? "border-red-500/30" :
                            "border-muted/40"
                          }`}>
                            <div className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/40 mb-2">
                              Full Coverage Report
                            </div>
                            <h4 className="text-[11px] font-bold leading-tight line-clamp-3 text-foreground/50">
                              {pubArt.title}
                            </h4>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <BiasChip
                          bias={(pubArt.bias ||
                            (pubArt.publisher?.biasRating?.toLowerCase().includes("left") ? "left"
                              : pubArt.publisher?.biasRating?.toLowerCase().includes("right") ? "right"
                                : "center")) as any}
                          size="xs"
                        />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          {pubArt.categories?.[0]?.name || "General"}
                        </span>
                      </div>
                      <h4 className="text-[15px] font-semibold leading-snug text-foreground group-hover:text-blue-600 transition-colors line-clamp-3">
                        {pubArt.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-2 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-500" />
                        Updated {formatDistanceToNow(new Date(pubArt.publishedAt || Date.now()))} ago
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm italic col-span-3">
                    No recent articles from this publisher yet.
                  </p>
                )}
              </div>
            </section>
          </div>{/* /left col inner */}
          </div>{/* /left column */}
        </div>{/* /two-column layout */}

          {/* ── RIGHT SIDEBAR ── */}
          <motion.aside
            className="space-y-6 lg:sticky lg:top-20"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            
            {/* Coverage Details (Moved to top right) */}
            <CoverageDetailsCard biasStats={biasStats} sources={allSources} />

            {article.clusterId && (
              <>
                <MarketImpact clusterId={article.clusterId} />
                <EntityQuoteTracker clusterId={article.clusterId} />
              </>
            )}

            <div className="bg-card border border-border rounded-2xl p-6">
              <TrendsDonut 
                left={biasStats.left}
                center={biasStats.center}
                right={biasStats.right}
                total={displaySourceCount}
                onCompareClick={() => article?.clusterId && setLocation(`/compare/${article.clusterId}`)}
              />
              
              <MediaBiasDistribution 
                sources={sourcesForChart}
                onAllSourcesClick={() => article?.clusterId && setLocation(`/compare/${article.clusterId}`)}
              />
            </div>
            
            {/* Step outside bias bubble CTA (Moved to sidebar) */}

            {/* Story Impact Profiles — using synchronized count */}
            {article.clusterId && <StoryImpactRings clusterId={article.clusterId} sourceCount={displaySourceCount} />}

            {/* Who broke this story */}
            <WhoBrokeStory sources={allSources} />

            {/* Similar topics */}
            <SimilarTopics article={article} />

            {/* Story timeline (Lineage) */}
            <StoryTimeline clusterId={article.clusterId || ""} />

            {/* Geographic coverage */}
            {article.clusterId && <GeographicCoverage sources={allSources} />}
          </motion.aside>
        </div>{/* /grid */}
      </main>

      <NewsFooter />
    </div>
  );
}
