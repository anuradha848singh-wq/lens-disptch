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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import {
  Bookmark, BookmarkCheck, Share2, ExternalLink,
  FileText, Search, ChevronRight, CheckCircle2, Clock, Zap, Lock, EyeOff
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { type ArticleWithDetails } from "@shared/schema";


import { StoryOrigin, CoverageByCountry, DeepIntelligenceDashboard, StoryTimeline } from "@/components/StoryIntelligence";
import { CommentsSection } from "@/components/CommentsSection";
import { PerspectiveSlider, type BiasPerspective } from "@/components/PerspectiveSlider";
import { ContextDiffPanel } from "@/components/ContextDiffPanel";
import { useCountryProfile } from "@/hooks/useCountryProfile";
import { ExecutiveBriefing, ForeignGazePanel, MarketImpact, EntityQuoteTracker } from "@/components/PremiumAIFeatures";
import { useEffect } from "react";
import { motion, useScroll, useSpring, AnimatePresence } from "framer-motion";
import { SharePanel } from "@/components/SharePanel";

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {filtered.map((a: any) => (
          <div key={a.id}
            className="bg-card border border-border hover:border-primary/30 rounded-xl p-3 cursor-pointer transition-colors flex gap-3"
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
      <section className="bg-gradient-to-br from-secondary/50 to-background border border-border/80 shadow-sm rounded-2xl p-10 text-center relative overflow-hidden transition-all duration-300 hover:shadow-md group">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-50 dark:opacity-10 group-hover:opacity-100 transition-opacity duration-500" />
        <h3 className="text-xl font-serif font-black text-foreground mb-3 relative">Your viewpoint</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto relative leading-relaxed">
          Log in to uncover how this story aligns with your personal reading habits and discover your blindspots.
        </p>
        <Button onClick={() => setLocation("/")} className="relative bg-foreground hover:bg-foreground/90 text-background rounded-full font-bold px-8 shadow-md active:scale-95 transition-all">
          Sign In / Create Account
        </Button>
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
  const [showMoreAnalytics, setShowMoreAnalytics] = useState(false);
  const [activePerspective, setActivePerspective] = useState<BiasPerspective | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────
  const { data: fullPack, isLoading } = useQuery({
    queryKey: ["/api/articles", id, "full"],
    queryFn: () => api.articles.getFull(id!),
    enabled: !!id,
    staleTime: 60000,
  });

  const { data: omissions } = useQuery({
    queryKey: ["/api/articles", id, "omissions"],
    queryFn: () => fetch(`/api/articles/${id}/omissions`).then(r => r.json()),
    enabled: !!id,
    staleTime: 60000,
  });

  const { profile } = useCountryProfile();

  const article = fullPack?.article;
  const clusterData = fullPack?.cluster;
  const deepIntelligence = fullPack?.deepIntelligence;
  const relatedRaw = fullPack?.related || [];
  const similarRaw = fullPack?.similar || [];
  const publisherData = fullPack?.publisherArticles;
  const multiLensScores = fullPack?.multiLensScores || [];

  const [lensMarket, setLensMarket] = useState<string>("US");

  useEffect(() => {
    if (profile && lensMarket === "US") {
      setLensMarket(profile.countryCode);
    }
  }, [profile]);

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

  // ── Personalization Tracking ─────────────────────────────────────────────
  useEffect(() => {
    if (!article?.clusterId || !user?.id) return;
    
    const startTime = Date.now();
    
    // Track click immediately
    fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clusterId: article.clusterId, action: "click", durationMs: 0 })
    }).catch(e => console.error("Failed to track click", e));

    // Track read time on unmount
    return () => {
      const durationMs = Date.now() - startTime;
      if (durationMs > 2000) { // Only track if they stayed at least 2 seconds
        // Use sendBeacon for reliable unmount sending (fallback to fetch if unavailable)
        const payload = JSON.stringify({ clusterId: article.clusterId, action: "read", durationMs });
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon("/api/interactions", blob);
        } else {
          fetch("/api/interactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true
          }).catch(() => {});
        }
      }
    };
  }, [article?.clusterId, user?.id]);

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
    <div className="min-h-screen bg-[#fcfaf6] dark:bg-zinc-950 text-foreground">
      <ReadingProgressBar />
      <MainNav />

      <main className="w-full max-w-[1800px] mx-auto px-2 md:px-4 pt-4 pb-12">

        <div className="flex flex-col xl:grid xl:grid-cols-[260px_minmax(0,1fr)_300px] gap-6 xl:gap-8 items-start">

          {/* ── LEFT SIDEBAR (Other Sources) ── */}
          <aside className="hidden xl:block w-full sticky top-20 border-r border-border/50 pr-4">
            <div className="pb-4">
              <h3 className="text-[14px] font-serif font-black text-foreground mb-4 px-1 uppercase tracking-widest">Other Sources</h3>
              <div className="flex flex-col">
                {similarRaw.filter(a => a.id !== activeArticle?.id).length > 0 ? (
                  similarRaw.filter(a => a.id !== activeArticle?.id).map(a => (
                    <div 
                      key={a.id} 
                      className="py-3 px-2 border-b border-border/40 hover:bg-secondary/30 cursor-pointer transition-colors group"
                      onClick={() => setLocation(`/article/${a.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-600">
                          {a.publisher?.name || "News Source"}
                        </span>
                        <span className="text-muted-foreground/40 text-[10px]">•</span>
                        <span className="text-[10px] text-muted-foreground font-bold">
                          {formatDistanceToNow(new Date(a.publishedAt || Date.now()), { addSuffix: true })}
                        </span>
                      </div>
                      <h4 className="text-[14px] font-serif font-bold text-foreground group-hover:text-blue-600 transition-colors leading-snug">
                        {a.title}
                      </h4>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic px-2">No other sources found for this story yet.</p>
                )}
              </div>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <div
            className="min-w-0"
          >

            {/* ── GROUND NEWS STYLE HEADER ── */}
            <div className="mb-6 flex flex-col gap-4">
              
              {/* Meta String & Social Icons */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  <span>Published {formatDistanceToNow(new Date(activeArticle?.publishedAt || Date.now()), { addSuffix: true })}</span>
                  <span className="text-[8px]">•</span>
                  <span>{activeArticle?.categories?.[0]?.name || "World News"}</span>
                  <span className="text-[8px]">•</span>
                  <span>updated {formatDistanceToNow(new Date(activeArticle?.publishedAt || Date.now()), { addSuffix: true })}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Real Share Panel */}
                  {id && activeArticle?.title && (
                    <SharePanel
                      articleId={id}
                      title={activeArticle.title}
                      url={typeof window !== "undefined" ? window.location.href : ""}
                    />
                  )}
                  <button
                    onClick={() => user ? bookmarkMutation.mutate() : toast({ title: "Sign in to bookmark" })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border border-border/60 hover:bg-secondary/60 hover:border-border transition-all ${
                      isBookmarked ? "text-accent-editorial border-accent-editorial/50 bg-accent-editorial/5" : "text-muted-foreground"
                    }`}
                    aria-label={isBookmarked ? "Remove bookmark" : "Bookmark article"}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                    {isBookmarked ? "Saved" : "Save"}
                  </button>
                  <a
                    href={activeArticle?.sourceUrl || activeArticle?.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border border-border/60 hover:bg-secondary/60 hover:border-border transition-all text-muted-foreground hover:text-foreground"
                    aria-label="Read original article"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Source
                  </a>
                </div>
              </div>

              {/* Title */}
              <h1 className="font-serif text-[38px] md:text-[48px] font-black leading-[1.1] tracking-tight text-foreground text-pretty mb-2">
                {activeArticle?.title}
              </h1>
  
              {/* Perspective Switcher */}
              <div className="flex items-center flex-wrap gap-2 mt-2 mb-2">
                <div className="flex items-center bg-[#e4e5e0] dark:bg-zinc-800 rounded-md p-0.5 border border-border/50">
                  <button onClick={() => setActivePerspective("left")} className={`px-5 py-1 text-[11px] font-bold rounded-sm transition-colors ${activePerspective === "left" ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-black/5"}`}>Left</button>
                  <button onClick={() => setActivePerspective("center")} className={`px-5 py-1 text-[11px] font-bold rounded-sm transition-colors ${activePerspective === "center" ? "bg-gray-500 text-white" : "text-muted-foreground hover:bg-black/5"}`}>Center</button>
                  <button onClick={() => setActivePerspective("right")} className={`px-5 py-1 text-[11px] font-bold rounded-sm transition-colors ${activePerspective === "right" ? "bg-red-600 text-white" : "text-muted-foreground hover:bg-black/5"}`}>Right</button>
                </div>
                
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#e4e5e0] dark:bg-zinc-800 border border-border/50 text-[11px] font-bold text-muted-foreground hover:bg-black/5 transition-colors" onClick={() => article?.clusterId && setLocation(`/compare/${article.clusterId}`)}>
                  <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center text-[8px]">i</span> Bias Comparison
                </button>
              </div>

              {/* LENS TRUTH AI INSIGHTS */}
              {clusterData && (clusterData.summary || (clusterData.aiSummary && (Array.isArray(clusterData.aiSummary) ? clusterData.aiSummary.length > 0 : Object.keys(clusterData.aiSummary).length > 0))) && (
                <div className="mb-6 flex flex-col gap-4">
                  
                  {clusterData.summary && (
                    <div className="font-sans text-[16px] text-foreground leading-relaxed">
                      {clusterData.summary}
                    </div>
                  )}

                  {/* Render Legacy String Array or New Object Format */}
                  {Array.isArray(clusterData.aiSummary) ? (
                    <ul className="list-disc list-outside ml-5 space-y-2 mt-2">
                      {clusterData.aiSummary?.map((point: string, i: number) => (
                        <li key={i} className="font-sans text-[16px] text-foreground leading-snug">
                          {point.trim()}
                        </li>
                      ))}
                    </ul>
                  ) : clusterData.aiSummary && typeof clusterData.aiSummary === 'object' && (
                    <div className="flex flex-col gap-3 mt-2">
                      {/* Left Perspective */}
                      {clusterData.aiSummary.left && (
                        <div className="p-4 rounded-md border-l-4 border-blue-500 bg-blue-500/5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-sm">Left Perspective</span>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">
                            {clusterData.aiSummary.left}
                          </p>
                        </div>
                      )}
                      
                      {/* Center Perspective */}
                      {clusterData.aiSummary.center && (
                        <div className="p-4 rounded-md border-l-4 border-purple-500 bg-purple-500/5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-sm">Center Perspective</span>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">
                            {clusterData.aiSummary.center}
                          </p>
                        </div>
                      )}
                      
                      {/* Right Perspective */}
                      {clusterData.aiSummary.right && (
                        <div className="p-4 rounded-md border-l-4 border-red-500 bg-red-500/5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-sm">Right Perspective</span>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">
                            {clusterData.aiSummary.right}
                          </p>
                        </div>
                      )}

                      {/* Synthesis */}
                      {clusterData.aiSummary.synthesis && (
                        <div className="mt-2 p-4 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-border/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-500">The Ground Truth</span>
                          </div>
                          <p className="text-[15px] font-medium text-foreground leading-relaxed">
                            {clusterData.aiSummary.synthesis}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between border-t border-border/50 mt-2 pt-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center text-[8px]">i</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Insights by Lens Truth</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground cursor-pointer hover:text-foreground">
                      <Zap className="w-3 h-3" />
                      <span className="text-[10px] font-bold">Does this summary seem wrong?</span>
                    </div>
                  </div>
                </div>
              )}

              {/* WHAT THIS ARTICLE LEFT OUT */}
              {omissions && omissions.length > 0 && (
                <div className="mb-6 p-5 rounded-xl border border-orange-200 bg-orange-50/50 dark:border-orange-900/30 dark:bg-orange-900/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-500">
                      <EyeOff className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase tracking-widest">What This Article Left Out</h3>
                    </div>
                    <span className="w-4 h-4 rounded-full border border-orange-200 dark:border-orange-900/50 flex items-center justify-center text-[10px] text-orange-500 cursor-help" title="These are people, places, and organizations mentioned by other news sources covering this exact story, but entirely omitted by this article.">i</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {omissions.map((omission: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white dark:bg-black/20 rounded-md border border-border shadow-sm">
                        <div className="font-bold text-sm text-foreground mb-1">{omission.entity}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Mentioned by: <span className="text-foreground">{omission.mentionedBy.join(", ")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          {/* Publisher row */}
          <div className="flex items-center gap-4 mb-6 py-3 border-b border-border transition-all duration-500">
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
                onClick={() => navigator.clipboard.writeText(window.location.href).then(() => toast({ title: "Link copied!" })).catch(() => {})}
                aria-label="Copy link"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Summary box */}
          <div className="relative overflow-hidden rounded-xl mb-6 bg-card/80 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/60 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-background/50 to-secondary/20 pointer-events-none" />
            <div className="relative bg-secondary/30 px-5 py-3 border-b border-border/50 flex items-center gap-3 flex-wrap">
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
                  <p className="font-serif text-[18px] text-foreground leading-[1.75]">
                    {point.trim()}{point.endsWith(".") ? "" : "."}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Read full article button */}
          {!showFullArticle ? (
            <div className="flex justify-center mb-6 py-2 border-y border-dashed border-border/50">
              <Button
                size="lg"
                className="rounded-full bg-[#7a1a1a] hover:bg-[#5a1414] shadow-md transition-all active:scale-95 text-white font-bold text-sm px-8 gap-2"
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
          <div className="mb-10 p-6 md:p-8 bg-card border border-border prose prose-zinc dark:prose-invert max-w-none">
            <div className="flex justify-between items-center mb-6 pb-4 border-b-4 border-double border-border/50">
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

        {/* Filter bar removed to avoid duplication */}

        <div className="space-y-10">


            {/* ── SECTION 1: Coverage by Bias ── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-serif font-black text-foreground">Coverage by Bias</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    How different perspectives are reporting this story
                  </p>
                </div>
                {article?.clusterId && (
                  <span className="text-xs font-bold text-blue-600 cursor-pointer hover:underline"
                    onClick={() => setLocation(`/compare/${article.clusterId}`)}>
                    See all sources
                  </span>
                )}
              </div>

              {/* Context Diff Panel */}
              <ContextDiffPanel activeArticle={activeArticle!} clusterArticles={allSources} />

              <Tabs defaultValue="all" className="w-full mt-10">
                <div className="flex flex-wrap items-center justify-between border-b border-border/80 mb-2 pb-3">
                  <div className="flex items-center gap-4 md:gap-8">
                    <span className="font-bold text-[18px] text-foreground">{allSources.length} Articles</span>
                    <TabsList className="bg-transparent border-none p-0 h-auto gap-4 flex w-auto">
                      <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-1 text-[13px] font-bold text-muted-foreground data-[state=active]:text-foreground">All</TabsTrigger>
                      <TabsTrigger value="left" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-1 text-[13px] font-bold text-muted-foreground data-[state=active]:text-foreground">Left <span className="ml-1 text-[10px] opacity-70">{biasStats.left}</span></TabsTrigger>
                      <TabsTrigger value="center" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-1 text-[13px] font-bold text-muted-foreground data-[state=active]:text-foreground">Center <span className="ml-1 text-[10px] opacity-70">{biasStats.center}</span></TabsTrigger>
                      <TabsTrigger value="right" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-1 text-[13px] font-bold text-muted-foreground data-[state=active]:text-foreground">Right <span className="ml-1 text-[10px] opacity-70">{biasStats.right}</span></TabsTrigger>
                    </TabsList>
                  </div>
                  <div className="flex gap-4 text-foreground/70">
                    <Search className="w-4 h-4 cursor-pointer hover:text-foreground transition-colors" />
                    <svg className="w-4 h-4 cursor-pointer hover:text-foreground transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                  </div>
                </div>
                
                {["all", "left", "center", "right"].map(tabBias => {
                  const items = tabBias === "all" ? allSources : allSources.filter(a => deriveBias(a) === tabBias);
                  
                  const uniqueGrid: { article: any, extra: number, pid: string | null }[] = [];
                  const pubCounts = new Map<string, number>();

                  for (const a of items) {
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
                    <TabsContent key={tabBias} value={tabBias} className="m-0 outline-none">
                      {uniqueGrid.length > 0 ? (
                        <div className="flex flex-col">
                          {uniqueGrid.slice(0, 10).map(({ article: source, extra }) => (
                            <div key={source.id}
                              className="flex flex-col py-4 border-b border-border/40 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                              onClick={() => setLocation(`/article/${source.id}`)}>
                              
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <PublisherLogo name={source.publisher?.name || "?"} domain={source.publisher?.website} size="xs" />
                                  <span className="text-[12px] font-bold text-foreground">
                                    {source.publisher?.name}
                                  </span>
                                  {source.isPremium && <span className="text-muted-foreground text-[10px] font-bold ml-1">$</span>}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <div className="hidden sm:flex items-center gap-1 bg-[#e4e5e0] dark:bg-zinc-800 border border-border/50 rounded-sm text-[9px] font-bold text-foreground px-1.5 py-0.5">
                                    Ownership <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                                  </div>
                                  <div className="hidden sm:flex items-center gap-1 bg-[#e4e5e0] dark:bg-zinc-800 border border-border/50 rounded-sm text-[9px] font-bold text-foreground px-1.5 py-0.5">
                                    Factuality <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                                  </div>
                                  <div className={`rounded-sm text-[9px] font-bold px-1.5 py-0.5 border ${deriveBias(source) === 'left' ? 'text-blue-600 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : deriveBias(source) === 'right' ? 'text-red-600 border-red-600 bg-red-50/50 dark:bg-red-900/20' : 'text-gray-600 border-gray-600 bg-gray-50/50 dark:bg-gray-800/50'}`}>
                                    {deriveBias(source) === 'left' ? 'Lean Left' : deriveBias(source) === 'right' ? 'Lean Right' : 'Center'}
                                  </div>
                                  <div className="text-muted-foreground font-black ml-2 -mt-1 tracking-widest leading-none">...</div>
                                </div>
                              </div>

                              <h4 className="text-[16px] md:text-[18px] font-serif font-black leading-tight text-foreground group-hover:text-blue-600 transition-colors line-clamp-2 pr-4 mb-2 flex items-start gap-1">
                                <span className="text-lg leading-none font-sans font-light shrink-0 mt-0.5 opacity-60">↗</span>
                                {source.title}
                              </h4>
                              
                              <span className="text-[11px] font-bold text-muted-foreground">
                                {formatDistanceToNow(new Date(source.publishedAt || Date.now()), { addSuffix: true })}
                                {extra > 0 && <span className="ml-2 px-1.5 py-0.5 bg-secondary rounded">+{extra} more</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center border-t border-dashed border-border/50">
                          <p className="text-muted-foreground text-[13px] font-bold">No coverage from this perspective.</p>
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>

              <div className="flex justify-center pt-5">
                <Button variant="outline"
                  className="rounded-full font-bold text-sm px-8 border-2 border-border hover:border-primary/50"
                  onClick={() => article?.clusterId ? setLocation(`/compare/${article.clusterId}`) : setLocation("/")}>
                  Show me full coverage <ChevronRight className="w-3 h-3 ml-1" />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
            <section className="border-t border-border pt-6 mt-6">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {publisherArticles.length > 0 ? (
                  publisherArticles.map(pubArt => (
                    <div
                      key={pubArt.id}
                      className="group cursor-pointer flex flex-col hover:-translate-y-1 transition-all duration-300"
                      onClick={() => setLocation(`/article/${pubArt.id}`)}
                    >
                      <div className="aspect-[16/10] rounded-lg bg-secondary mb-3 overflow-hidden border border-border shadow-sm group-hover:shadow-md transition-shadow relative">
                        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] pointer-events-none z-10 rounded-lg" />
                        {pubArt.heroImageUrl && !pubArt.heroImageUrl.includes("placeholder") ? (
                          <img
                            src={pubArt.heroImageUrl}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
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

            {/* ── SECTION 4: Deep Analytics ── */}
            <section className="border-t border-border pt-8 mt-8">
              <div className="mb-6">
                <h3 className="text-2xl font-serif font-black text-foreground">Deep Analytics</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI-powered intelligence and deep dives into this story
                </p>
              </div>
              <div className="flex flex-col gap-4">
                {article.clusterId && <ForeignGazePanel clusterId={article.clusterId} />}
                {article.clusterId && profile?.enabledFeatures.includes('market_impact') && <MarketImpact clusterId={article.clusterId} />}
                {article.clusterId && <EntityQuoteTracker clusterId={article.clusterId} />}
                <DeepIntelligenceDashboard data={deepIntelligence} isLoading={isLoading} />
              </div>
            </section>

          </div>{/* /end space-y-10 */}
        </div>{/* /main content min-w-0 */}

          {/* ── RIGHT SIDEBAR ── */}
          <motion.aside
            className="w-full lg:w-[340px] shrink-0 lg:sticky lg:top-4 bg-transparent lg:pl-6 lg:border-l border-border/50"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            {/* ── GROUND NEWS: COVERAGE DETAILS ── */}
            <div className="border-b border-border/50 pb-4">
              <div className="px-1 py-2">
                <h3 className="text-[14px] font-serif font-black text-foreground mb-3">Coverage Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Total News Sources</span>
                    <span className="font-bold">{displaySourceCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Leaning Left</span>
                    <span className="font-bold">{biasStats.left}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Leaning Right</span>
                    <span className="font-bold">{biasStats.right}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Center</span>
                    <span className="font-bold">{biasStats.center}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-bold">{formatDistanceToNow(new Date(activeArticle?.publishedAt || Date.now()), { addSuffix: true })}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Bias Distribution</span>
                    <span className="font-bold">
                      {Math.round((Math.max(biasStats.left, biasStats.center, biasStats.right) / (biasStats.total || 1)) * 100)}% {
                        Math.max(biasStats.left, biasStats.center, biasStats.right) === biasStats.center ? "Center" :
                        Math.max(biasStats.left, biasStats.center, biasStats.right) === biasStats.left ? "Left" : "Right"
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── MULTI-LENS MODE: BIAS DISTRIBUTION ── */}
            <div className="border-b border-border/50 pb-6 pt-4">
              <div className="px-1">
                <div className="flex items-center justify-between mb-3 text-foreground transition-colors">
                  <h3 className="text-[14px] font-serif font-black flex items-center gap-2">
                    Multi-Lens Scoring 
                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-sans tracking-widest uppercase">Beta</span>
                  </h3>
                </div>

                {multiLensScores.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {["US", "UK", "IN"].map((market) => (
                        <button
                          key={market}
                          onClick={() => setLensMarket(market)}
                          disabled={!multiLensScores.some(s => s.countryCode === market)}
                          className={`px-3 py-1 text-[11px] font-bold rounded-sm border ${
                            lensMarket === market
                              ? "bg-foreground text-background border-foreground"
                              : multiLensScores.some(s => s.countryCode === market)
                              ? "bg-secondary text-foreground border-border hover:bg-secondary/80"
                              : "bg-background text-muted-foreground border-border opacity-50 cursor-not-allowed"
                          }`}
                        >
                          {market}
                        </button>
                      ))}
                    </div>

                    {(() => {
                      const activeScore = multiLensScores.find(s => s.countryCode === lensMarket);
                      if (!activeScore) return <p className="text-xs text-muted-foreground">Score unavailable for {lensMarket}.</p>;
                      
                      const model = activeScore.biasModel || "SPECTRUM";
                      const scoreData = activeScore.scoreData as Record<string, number>;
                      
                      if (model === "QUADRANT_UK") {
                        return (
                          <div className="space-y-3 mt-2">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">UK Political Compass</p>
                            <div className="flex justify-between text-xs font-medium">
                              <span>Left-wing</span>
                              <span className="font-bold">{scoreData.left_wing || 0}</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium">
                              <span>Right-wing</span>
                              <span className="font-bold">{scoreData.right_wing || 0}</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium">
                              <span>Centrist</span>
                              <span className="font-bold">{scoreData.centrist || 0}</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium border-t border-border/50 pt-2 mt-2">
                              <span>Eurosceptic</span>
                              <span className="font-bold">{scoreData.eurosceptic || 0}</span>
                            </div>
                          </div>
                        );
                      } else if (model === "MULTIFACET_IN") {
                        return (
                          <div className="space-y-3 mt-2">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">India Multifacet Lens</p>
                            <div className="flex justify-between text-xs font-medium">
                              <span>Pro-Gov (NDA)</span>
                              <span className="font-bold">{scoreData.pro_gov || 0}</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium">
                              <span>Opposition (INDIA)</span>
                              <span className="font-bold">{scoreData.opposition || 0}</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium border-t border-border/50 pt-2 mt-2">
                              <span>Regional</span>
                              <span className="font-bold">{scoreData.regional || 0}</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium">
                              <span>Non-aligned</span>
                              <span className="font-bold">{scoreData.non_aligned || 0}</span>
                            </div>
                          </div>
                        );
                      } else {
                        // Standard Spectrum
                        const total = (scoreData.left || 0) + (scoreData.center || 0) + (scoreData.right || 0);
                        const lp = total > 0 ? Math.round(((scoreData.left || 0) / total) * 100) : 0;
                        const cp = total > 0 ? Math.round(((scoreData.center || 0) / total) * 100) : 0;
                        const rp = total > 0 ? Math.round(((scoreData.right || 0) / total) * 100) : 0;

                        return (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Standard Spectrum</p>
                            <div className="h-4 flex items-center w-full rounded-sm overflow-hidden mb-3">
                               <div className="h-full bg-blue-400/80 flex items-center justify-center text-[8px] font-bold text-white transition-all" style={{ width: `${lp}%` }}>
                                 {lp > 10 ? `L ${lp}%` : ""}
                               </div>
                               <div className="h-full bg-gray-300/80 flex items-center justify-center text-[8px] font-bold text-gray-700 transition-all" style={{ width: `${cp}%` }}>
                                 {cp > 10 ? `C ${cp}%` : ""}
                               </div>
                               <div className="h-full bg-red-400/80 flex items-center justify-center text-[8px] font-bold text-white transition-all" style={{ width: `${rp}%` }}>
                                 {rp > 10 ? `R ${rp}%` : ""}
                               </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div><span className="font-bold">{scoreData.left || 0}</span> Left</div>
                              <div><span className="font-bold">{scoreData.center || 0}</span> Center</div>
                              <div><span className="font-bold">{scoreData.right || 0}</span> Right</div>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </>
                ) : (
                  <div className="space-y-3 mt-4 mb-2">
                    <div className="animate-shimmer w-3/4 h-3 rounded-sm" />
                    <div className="animate-shimmer w-full h-2 rounded-sm" />
                    <div className="animate-shimmer w-5/6 h-2 rounded-sm" />
                  </div>
                )}
              </div>
            </div>

            {/* ── GROUND NEWS: FACTUALITY ── */}
            <div className="border-b border-border/50 pb-4 pt-4">
              <div className="px-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-serif font-black text-foreground flex items-center gap-1">Factuality <span className="text-[9px] font-sans text-muted-foreground border border-border rounded-full w-3 h-3 flex items-center justify-center">i</span></h3>
                  <Lock className="w-3 h-3 text-muted-foreground" />
                </div>
                <p className="text-[9px] text-muted-foreground mb-3">To view factuality data please <span className="underline cursor-pointer">Upgrade to Premium</span></p>
                <div className="w-full h-3 bg-gray-300 dark:bg-gray-800 rounded-sm mb-1" />
                <div className="w-2/3 h-2 bg-gray-300 dark:bg-gray-800 rounded-sm" />
              </div>
            </div>

            {/* ── GROUND NEWS: OWNERSHIP ── */}
            <div className="border-b border-border/50 pb-4 pt-4">
              <div className="px-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-serif font-black text-foreground flex items-center gap-1">Ownership <span className="text-[9px] font-sans text-muted-foreground border border-border rounded-full w-3 h-3 flex items-center justify-center">i</span></h3>
                  <Lock className="w-3 h-3 text-muted-foreground" />
                </div>
                <p className="text-[9px] text-muted-foreground mb-3">To view ownership data please <span className="underline cursor-pointer">Upgrade to Premium</span></p>
                <div className="w-full h-2 bg-gray-300 dark:bg-gray-800 rounded-sm mb-1 flex overflow-hidden">
                   <div className="h-full bg-blue-300 w-1/4" />
                   <div className="h-full bg-green-300 w-1/4" />
                   <div className="h-full bg-amber-300 w-1/4" />
                   <div className="h-full bg-red-300 w-1/4" />
                </div>
              </div>
            </div>

            {/* ── GROUND NEWS: WHO BROKE THE STORY ── */}
            <div className="border-b border-border/50 pb-4 pt-4 px-1">
               <StoryOrigin publisher={deepIntelligence?.origin?.publisher} publishedAt={deepIntelligence?.origin?.publishedAt} />
            </div>

            {/* ── GROUND NEWS: SIMILAR NEWS TOPICS ── */}
            <div className="border-b border-border/50 py-4 px-1">
               <h3 className="text-[14px] font-serif font-black text-foreground mb-4">Similar News Topics</h3>
               <div className="space-y-3">
                 <div className="flex items-center justify-between text-[11px] font-bold border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-secondary overflow-hidden"><img src="https://images.unsplash.com/photo-1505672678657-cc7037095e60?w=100&q=80" className="object-cover" /></div> Earthquake</div>
                    <span className="text-xl font-light">+</span>
                 </div>
                 <div className="flex items-center justify-between text-[11px] font-bold border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-secondary overflow-hidden"><img src="https://images.unsplash.com/photo-1518623489648-a173ef7824f3?w=100&q=80" className="object-cover" /></div> Latin America</div>
                    <span className="text-xl font-light">+</span>
                 </div>
                 <div className="flex items-center justify-between text-[11px] font-bold border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-secondary overflow-hidden"><img src="https://images.unsplash.com/photo-1542382156909-92f754ef2eb9?w=100&q=80" className="object-cover" /></div> Natural Disasters</div>
                    <span className="text-xl font-light">+</span>
                 </div>
                 <div className="flex items-center justify-between text-[11px] font-bold border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-secondary overflow-hidden"><img src="https://images.unsplash.com/photo-1534088568595-a066f410cbda?w=100&q=80" className="object-cover" /></div> Venezuela</div>
                    <span className="text-xl font-light">+</span>
                 </div>
                 <div className="flex justify-center pt-2">
                    <button className="border border-border rounded px-4 py-1 text-[10px] font-bold bg-background">Show All</button>
                 </div>
               </div>
            </div>
          </motion.aside>
        </div>{/* /grid */}
        
        {/* Comments Section */}
        {article.clusterId && (
          <div className="mt-12">
            <CommentsSection clusterId={article.clusterId} />
          </div>
        )}
      </main>

      <NewsFooter />
    </div>
  );
}
