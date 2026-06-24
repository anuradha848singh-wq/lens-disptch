import { cn } from '@/lib/utils';
import React from "react";
import { Link, useLocation } from "wouter";
import { BiasBar, BiasChip } from "./BiasBar";
import { deriveBias } from "@/lib/bias-utils";
import { BiasSpectrumBar } from "./BiasSpectrumBar";
import { MoodRing } from "./MoodRing";
import { scoreSentiment } from "@/lib/sentiment";
import { type ArticleWithDetails } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Bookmark, BookmarkCheck, ExternalLink, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PublisherLogo } from "./PublisherLogo";
import { motion } from "framer-motion";

function proxyImage(url: string | null | undefined, width = 400): string | null {
  if (!url) return null;
  if (url.includes("unsplash.com") || url.includes("placeholder")) return url;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp&q=80`;
}

function getBias(article: ArticleWithDetails & { proEstablishmentCount?: number; neutralCount?: number; proOppositionCount?: number; totalSources?: number }) {
  // Use real cluster bias counts from the API when available
  const l = article.proEstablishmentCount ?? 0;
  const c = article.neutralCount ?? 0;
  const r = article.proOppositionCount ?? 0;
  const total = l + c + r;

  if (total > 0) {
    return {
      left:   Math.round((l / total) * 100),
      center: Math.round((c / total) * 100),
      right:  Math.round((r / total) * 100),
    };
  }

  // FIX: NO FAKE PERCENTAGES. Return null if no cluster data available.
  return null;
}

function getSourceCount(article: ArticleWithDetails & { totalSources?: number }) {
  return article.totalSources || article.sourceCount || 1;
}

interface StoryCardProps {
  article: ArticleWithDetails;
  variant?: "standard" | "featured" | "list" | "compact" | "slide" | "table-row" | "dense" | "sidebar-digest" | "briefing-side" | "ground-list" | "newspaper-row" | "news-index";
  bookmarkedIds?: Set<string>;
  priority?: boolean;
}

import { BookmarkButton, VelocityBadge, CorrectionBadge, ConfidenceBadge, DivergenceWarning, BlindspotBadge } from "./StoryCardBadges";


function calculateDiversity(article: any): number {
  if (article.shannonDiversity !== undefined && article.shannonDiversity > 0) {
    return article.shannonDiversity;
  }
  const l = article.proEstablishmentCount || 0;
  const c = article.neutralCount || 0;
  const r = article.proOppositionCount || 0;
  const total = l + c + r;
  if (total <= 1) return 0;

  const pl = l / total;
  const pc = c / total;
  const pr = r / total;

  let h = 0;
  if (pl > 0) h -= pl * Math.log(pl);
  if (pc > 0) h -= pc * Math.log(pc);
  if (pr > 0) h -= pr * Math.log(pr);

  return Math.round((h / Math.log(3)) * 100);
}

export const StoryCard = React.memo(function StoryCard({ article, variant = "standard", bookmarkedIds, priority }: StoryCardProps) {
  const [, setLocation] = useLocation();
  const bias = getBias(article);
  const sources = getSourceCount(article);
  const diversityScore = calculateDiversity(article);
  const derivedDiversity = React.useMemo(() => {
    const l = article.proEstablishmentCount   ?? 0;
    const c = article.neutralCount ?? 0;
    const r = article.proOppositionCount  ?? 0;
    const total = l + c + r;
    if (total === 0) return 0;
    const shannon = [l/total, c/total, r/total]
      .filter(p => p > 0)
      .reduce((sum, p) => sum - p * Math.log(p), 0);
    return Math.abs(shannon);
  }, [article.proEstablishmentCount, article.neutralCount, article.proOppositionCount]);
  const timeAgo = article.publishedAt
    ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })
    : "recently";
  const pubAbbr = article.publisher?.name?.slice(0, 2).toUpperCase() ?? "??";
  const sentimentScore = scoreSentiment(article.title);

  const imageUrl = article.heroImageUrl ? (proxyImage(article.heroImageUrl, variant === "featured" ? 800 : 400) || article.heroImageUrl) : null;

  React.useEffect(() => {
    if (!priority || !imageUrl) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = imageUrl;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [priority, imageUrl]);

  /* ── FEATURED (hero card) ────────────────────────────────── */
  if (variant === "featured") {
    return (
      <motion.div 
        className="group relative flex flex-col" 
        data-testid={`story-${article.id}`}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Link href={`/article/${article.id}`}>
             <div className="w-full aspect-[16/9] md:aspect-[2/1] bg-muted overflow-hidden rounded-xl border border-border/50 shadow-sm mb-5 relative">
                {article.heroImageUrl && !article.heroImageUrl.includes("placeholder") ? (
                  <img src={imageUrl || article.heroImageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" loading={priority ? "eager" : "lazy"} {...(priority ? { fetchPriority: "high" } : {})} />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center">
                    <span className="text-6xl font-serif italic text-muted-foreground/40">{pubAbbr}</span>
                  </div>
                )}
                {/* Floating Source Count */}
                <div className="absolute top-4 left-4 bg-background/95 backdrop-blur shadow-sm px-3 py-1.5 rounded flex items-center gap-2 border border-border/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-foreground">{sources} Sources</span>
                </div>
             </div>

             <div className="flex flex-col pr-4">
                <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex-wrap">
                  <PublisherLogo name={article.publisher?.name || "?"} domain={article.publisher?.website} size="xs" />
                  <span className="text-foreground">{article.publisher?.name}</span>
                  <span>·</span>
                  <span>{timeAgo}</span>
                  <VelocityBadge velocity={(article as any).velocity || 0} phase={(article as any).storyPhase || "developing"} />
                  <CorrectionBadge hasCorrection={!!(article as any).hasCorrection} />
                  <BlindspotBadge score={(article as any).blindspotScore} side={(article as any).blindspotSide} />
                </div>
                
                <h2 className="text-2xl md:text-[32px] font-serif font-black leading-[1.1] text-foreground mb-3 group-hover:text-primary transition-colors">
                  {article.title}
                </h2>
                
                <p className="text-[15px] md:text-[17px] text-muted-foreground font-serif leading-relaxed line-clamp-3 mb-5">
                  {article.excerpt || "Full coverage of this developing story continues with updates from multiple world sources."}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <BiasChip bias={(article.bias || "center") as any} size="sm" />
                </div>
             </div>
        </Link>
      </motion.div>
    );
  }

  /* ── LIST (source row in article detail) ─────────────────── */
  if (variant === "list") {
    return (
      <motion.div 
        className="group border-b border-border py-6 px-0 last:border-b-0" 
        data-testid={`story-${article.id}`}
        initial={{ opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3 }}
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <PublisherLogo name={article.publisher?.name ?? "??"} domain={article.publisher?.website} size="xs" />
            <span className="text-[13px] font-bold text-foreground">
              {article.publisher?.name}
            </span>
            <div className="flex items-center gap-1.5 ml-1">
              {(article.publisher as any)?.biasRating && (
                <BiasChip bias={((article.publisher as any).biasRating || "center") as any} size="xs" />
              )}
              {article.publisher?.ownerName && (
                <span className="text-[10px] uppercase font-bold text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm">
                  {article.publisher.ownerName.split(" ")[0]}
                </span>
              )}
              {article.publisher?.factualityRating && (
                <span className={`text-[10px] uppercase font-bold border border-border px-1.5 py-0.5 rounded-sm ${article.publisher.factualityRating === "very_high" ? "text-green-600" : article.publisher.factualityRating === "high" ? "text-blue-600" : article.publisher.factualityRating === "mixed" ? "text-amber-600" : "text-muted-foreground"}`}>
                  {article.publisher.factualityRating.replace("_", " ")}
                </span>
              )}
            </div>
          </div>
          <BookmarkButton article={article} bookmarkedIds={bookmarkedIds} />
        </div>

        {/* Content Body */}
        <Link href={`/article/${article.id}`}>
          <div className="cursor-pointer">
            <h4 className="text-[19px] font-display font-bold leading-[1.3] text-foreground group-hover:text-primary transition-colors mb-2.5 line-clamp-2">
              {article.title}
            </h4>
            <p className="text-sm font-sans text-muted-foreground leading-relaxed line-clamp-3 mb-4">
              {article.excerpt}
            </p>
          </div>
        </Link>

        {/* Bottom Footer Row */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{timeAgo}</span>
            {article.publisher?.country && (
              <>
                <span>·</span>
                <span>
                  {article.publisher.country === 'US' ? 'United States' : article.publisher.country}
                </span>
              </>
            )}
          </div>
          
          <a
            href={article.sourceUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            Read Full Article → <ExternalLink className="w-3 h-3 hidden" />
          </a>
        </div>
      </motion.div>
    );
  }

  /* ── COMPACT (2-column density grid) ────────────────────── */
  if (variant === "compact") {
    return (
      <motion.div
        className="group newspaper-digest-item"
        data-testid={`story-${article.id}`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <Link href={`/article/${article.id}`}>
          <div className="flex gap-4 cursor-pointer py-3 items-center">
            <div className="w-28 h-20 bg-muted flex-shrink-0 overflow-hidden rounded-md border border-border/40">
              {article.heroImageUrl && !article.heroImageUrl.includes("placeholder") ? (
                <img src={proxyImage(article.heroImageUrl, 300) || article.heroImageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <span className="text-lg font-serif italic text-muted-foreground/40">{pubAbbr}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground truncate">{article.publisher?.name}</span>
                <BiasChip bias={(article.bias || "center") as any} size="xs" />
              </div>
              <h4 className="text-[15px] font-serif font-black leading-tight group-hover:text-primary transition-colors line-clamp-2 mb-1.5">{article.title}</h4>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[11px] text-muted-foreground font-bold tracking-tight">{timeAgo}</p>
                {bias && (
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden flex max-w-[80px] bg-muted/50 border border-border/40">
                    <div className="bias-left h-full" style={{ width: `${bias.left}%` }} />
                    <div className="bias-center h-full" style={{ width: `${bias.center}%` }} />
                    <div className="bias-right h-full" style={{ width: `${bias.right}%` }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  /* ── SIDEBAR-DIGEST (ultra high density) ───────────────── */
  if (variant === "sidebar-digest") {
    return (
      <div className="group newspaper-digest-item px-1" data-testid={`story-${article.id}`}>
        <Link href={`/article/${article.id}`}>
          <div className="flex flex-col cursor-pointer">
            <h4 className="newspaper-digest-title group-hover:underline">
              {article.title}
            </h4>
            <div className="newspaper-digest-meta flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <PublisherLogo name={article.publisher?.name ?? "??"} domain={article.publisher?.website} size="xs" />
                <span>{article.publisher?.name}</span>
              </div>
              <span>{timeAgo}</span>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  /* ── GROUND LIST (micro-thumbnail on right) ──────────────────── */
  if (variant === "ground-list") {
    return (
      <div className="group py-2.5 border-b border-border/40 last:border-0" data-testid={`story-${article.id}`}>
        <Link href={`/article/${article.id}`}>
          <div className="flex gap-4 cursor-pointer items-start">
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-1.5 mb-1">
                 <PublisherLogo name={article.publisher?.name ?? "??"} domain={article.publisher?.website} size="xs" />
                 <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground truncate">{article.publisher?.name}</span>
                 <span className="text-xs text-muted-foreground/60">·</span>
                 <span className="text-xs text-muted-foreground/60">{timeAgo}</span>
               </div>
               <h4 className="text-[15px] font-serif font-black leading-[1.2] group-hover:text-primary transition-colors line-clamp-3 mb-1.5">{article.title}</h4>
               <div className="flex items-center gap-2">
                  <BiasChip bias={(article.bias || "center") as any} size="xs" />
                  <div className="h-1 flex-1 bg-border/40 rounded-full overflow-hidden max-w-[60px]">
                     <div className={`h-full bias-${article.bias || "center"}`} style={{ width: '100%' }} />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase">{sources} Sources</span>
               </div>
            </div>
            <div className="w-[80px] h-[60px] bg-muted flex-shrink-0 overflow-hidden rounded-sm">
              {article.heroImageUrl && !article.heroImageUrl.includes("placeholder") ? (
                <img src={proxyImage(article.heroImageUrl, 160) || article.heroImageUrl} alt={article.title} className="w-full h-full object-cover grayscale-[0.1]" />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <span className="text-xs font-serif italic text-muted-foreground/40">{pubAbbr}</span>
                </div>
              )}
            </div>
          </div>
        </Link>
      </div>
    );
  }

  /* ── DENSE (super compact minimal row, max density) ─────────── */
  if (variant === "dense") {
    return (
      <div className="group border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors" data-testid={`story-${article.id}`}>
        <Link href={`/article/${article.id}`}>
          <div className="py-2.5 px-3 flex items-start gap-3 cursor-pointer">
            <div className="flex-shrink-0 flex flex-col items-center gap-1 w-8">
              <PublisherLogo name={article.publisher?.name ?? "??"} domain={article.publisher?.website} size="xs" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1 border-b border-border/40 pb-1">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-tight">{(article as any).publisherNames || article.publisher?.name || article.domain || "Source"}</span>
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
              </div>
              <h4 className="text-[16px] font-serif font-black leading-snug line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h4>
              <div className="flex items-center gap-2 mt-2">
                <BiasChip bias={(article.bias || "center") as any} size="xs" />
                <span className="text-xs font-bold text-muted-foreground">{sources} Perspectives</span>
              </div>

            </div>
          </div>
        </Link>
      </div>
    );
  }

  /* ── SLIDE (for carousels, square-ish, image bg) ─────────────── */
  if (variant === "slide") {
    return (
      <div className="group relative w-[240px] h-[320px] flex-shrink-0 rounded-lg overflow-hidden cursor-pointer" data-testid={`story-${article.id}`}>
        <Link href={`/article/${article.id}`}>
          <div className="absolute inset-0 bg-muted">
            {article.heroImageUrl && !article.heroImageUrl.includes("placeholder") ? (
              <img src={article.heroImageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                <span className="text-4xl font-black text-zinc-600">{pubAbbr}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
          </div>
          <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
            <h3 className="text-[15px] font-bold leading-snug mb-2 line-clamp-3 drop-shadow-md group-hover:text-blue-100 transition-colors">{article.title}</h3>
            <div className="flex items-center gap-2 mb-2">
              <PublisherLogo name={article.publisher?.name || article.domain || "?"} domain={article.publisher?.website} size="xs" />
              <span className="text-xs font-bold text-white/90 drop-shadow-md truncate">{(article as any).publisherNames || article.publisher?.name || article.domain || "Source"}</span>
            </div>
            <div className="flex items-center justify-between">
              <BiasChip bias={(article.bias || "center") as any} size="xs" />
              <span className="text-xs font-semibold text-white/70">{sources} sources</span>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  /* ── TABLE-ROW (deprecating in favor of newspaper-row) ─────────── */
  if (variant === "table-row") {
    return (
      <tr className="group border-b border-border/50 hover:bg-secondary/40 transition-colors cursor-pointer" onClick={() => setLocation(`/article/${article.id}`)} data-testid={`story-${article.id}`}>
        <td className="py-2.5 px-3 min-w-[200px]">
          <h4 className="text-[15px] font-semibold tracking-tight leading-snug line-clamp-2 group-hover:text-accent-editorial transition-colors">{article.title}</h4>
        </td>
        <td className="py-2.5 px-3 w-40">
          <div className="flex items-center gap-2">
            <PublisherLogo name={article.publisher?.name || article.domain || "?"} domain={article.publisher?.website} size="xs" />
            <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground truncate">{(article as any).publisherNames || article.publisher?.name || article.domain || "Source"}</span>
          </div>
        </td>
        <td className="py-2.5 px-3 w-28">
           <BiasChip bias={(article.bias || "center") as any} size="xs" />
        </td>
        <td className="py-2.5 px-3 w-24 text-right">
          <span className={`text-xs font-black uppercase tracking-widest ${sources >= 5 ? "text-blue-600" : sources >= 3 ? "text-foreground" : "text-muted-foreground"}`}>
            {sources} sources
          </span>
        </td>
        <td className="py-2.5 px-3 w-24 text-right hidden sm:table-cell">
           <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </td>
      </tr>
    );
  }

  /* ── NEWSPAPER-ROW (Premium list format) ─────────────────── */
  if (variant === "newspaper-row") {
    const cat = article.categories?.[0]?.slug || "general";
    // Bias spectrum percentages for this cluster
    const rowTotal = (article.proEstablishmentCount || 0) + (article.neutralCount || 0) + (article.proOppositionCount || 0);
    const rowLeftPct   = rowTotal > 0 ? Math.round(((article.proEstablishmentCount   || 0) / rowTotal) * 100) : 0;
    const rowRightPct  = rowTotal > 0 ? Math.round(((article.proOppositionCount  || 0) / rowTotal) * 100) : 0;
    const rowCenterPct = 100 - rowLeftPct - rowRightPct;
    // Mockup specific category coloring
    const categoryColors = {
      bg: cat === "politics" ? "bg-red-50 text-red-600" :
          cat === "world" ? "bg-blue-50 text-blue-600" :
          cat === "tech" ? "bg-green-50 text-green-600" :
          "bg-amber-50 text-amber-600",
      border: cat === "politics" ? "bg-red-600" :
              cat === "world" ? "bg-blue-600" :
              cat === "tech" ? "bg-green-600" :
              "bg-amber-500"
    };

    return (
      <motion.div
        className="group relative bg-white border border-border/60 rounded-xl hover:shadow-md transition-all cursor-pointer p-5 pl-7 flex flex-col justify-between min-h-[160px]"
        onClick={() => setLocation(`/article/${article.id}`)}
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        {/* Left Color Stripe */}
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${categoryColors.border}`} />

        <div className="flex justify-between items-start gap-6">
          <div className="flex-1 min-w-0">
            {/* Top Meta Row */}
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm ${categoryColors.bg}`}>
                {article.categories?.[0]?.name || "General"}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                {(article as any).publisherNames || article.publisher?.name || article.domain || "Source"} 
                <span className="text-muted-foreground/40">·</span> 
                {timeAgo}
              </span>
            </div>

            {/* Title & Excerpt */}
            <h4 className="text-[20px] font-serif font-black leading-snug text-foreground mb-2 group-hover:text-primary transition-colors pr-4">
              {article.title}
            </h4>
            <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2 pr-4 font-sans">
              {article.excerpt || "Comprehensive coverage from multiple balanced perspectives."}
            </p>
          </div>

          {/* Right Column (Bias Data) */}
          <div className="w-32 shrink-0 flex flex-col items-center pt-1">
             <BiasChip bias={(article.bias || "center") as any} size="xs" className="mb-2" />
             
             <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden flex mb-2">
                <div className="bias-left h-full transition-all" style={{ width: `${rowLeftPct}%` }} />
                <div className="bias-center h-full transition-all" style={{ width: `${rowCenterPct}%` }} />
                <div className="bias-right h-full transition-all" style={{ width: `${rowRightPct}%` }} />
             </div>
             
             <div className="flex items-center justify-between w-full">
               <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                 {sources} PERSPECTIVES
               </span>
               <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
             </div>
          </div>
        </div>

        {/* Bottom Bookmark Row */}
        <div className="flex justify-end mt-4">
           <BookmarkButton article={article} bookmarkedIds={bookmarkedIds} />
        </div>
      </motion.div>
    );
  }

  /* ── NEWS-INDEX (Image 1 style) ────────────────────────── */
  if (variant === "news-index") {
    const accentColor = article.bias === "pro_establishment" ? "bg-blue-600" : article.bias === "pro_opposition" ? "bg-red-600" : "bg-slate-400";
    
    return (
      <motion.div
        className="group relative bg-white border border-border/40 hover:border-border/80 transition-all flex h-full min-h-[160px] cursor-pointer overflow-hidden rounded-sm"
        onClick={() => setLocation(`/article/${article.id}`)}
      >
        {/* Left Accent Border */}
        <div className={`w-1 ${accentColor} shrink-0`} />
        
        <div className="flex-1 p-5 flex gap-6">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600">
                  {(article.categories?.[0]?.name || "GENERAL").toUpperCase()}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                  {article.publisher?.name}
                </span>
                <span className="text-[10px] text-muted-foreground/60">• {timeAgo}</span>
             </div>
             
             <h3 className="font-serif text-[19px] font-black leading-tight group-hover:text-primary transition-colors line-clamp-2 mb-2">
                {article.title}
             </h3>
             
             {article.excerpt && (
                <p className="text-[13px] text-muted-foreground leading-snug line-clamp-2 font-sans font-medium opacity-80">
                   {article.excerpt}
                </p>
             )}
          </div>
          
          {/* Right Indicator Area */}
          <div className="w-32 flex flex-col items-center justify-center border-l border-border/20 pl-4 gap-2">
             <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                {(article.bias || "center").toUpperCase()}
             </span>
             
             <div className="h-1.5 w-full bg-secondary/30 rounded-full overflow-hidden flex">
                <div className="bg-blue-600 h-full" style={{ width: `${Math.round((article.proEstablishmentCount || 0) / (sources || 1) * 100)}%` }} />
                <div className="bg-slate-400 h-full" style={{ width: `${Math.round((article.neutralCount || 0) / (sources || 1) * 100)}%` }} />
                <div className="bg-red-600 h-full" style={{ width: `${Math.round((article.proOppositionCount || 0) / (sources || 1) * 100)}%` }} />
             </div>
             
             <span className="text-[10px] font-bold text-foreground/70 uppercase whitespace-nowrap">
                {sources} PERSPECTIVES
             </span>
             
             <div className="mt-2 text-muted-foreground/30 group-hover:text-primary transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
             </div>
          </div>
        </div>
        
        {/* Bookmark Icon Overlay */}
        <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
           <BookmarkButton article={article} bookmarkedIds={bookmarkedIds} />
        </div>
      </motion.div>
    );
  }

  /* ── STANDARD (main grid card) ────────────────────────── */
  const isDiversityPick = (article as any).isDiversityPick;
  
  return (
    <motion.div
      className={cn(
        "group bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col cursor-pointer h-full relative",
        isDiversityPick ? "border-purple-500/50 dark:border-purple-400/50 ring-1 ring-purple-500/20" : "border-border/50"
      )}
      onClick={() => setLocation(`/article/${article.id}`)}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {isDiversityPick && (
        <div className="absolute top-0 right-0 z-10 bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg shadow-sm">
          Outside Your Bubble
        </div>
      )}
      {/* Image with Floating Badge */}
      <div className="aspect-[16/10] bg-muted overflow-hidden relative">
        {article.heroImageUrl && !article.heroImageUrl.includes("placeholder") ? (
          <img
            src={imageUrl || article.heroImageUrl}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading={priority ? "eager" : "lazy"}
            {...(priority ? { fetchPriority: "high" } : {})}
          />
        ) : (
          <div className="w-full h-full bg-secondary/30 flex items-center justify-center font-serif italic text-muted-foreground/30 text-4xl">
            {pubAbbr}
          </div>
        )}
        
        {/* Floating Source Badge */}
        {sources > 1 && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[9px] font-black px-2 py-1 rounded-sm tracking-widest uppercase flex items-center gap-1.5 border border-white/10 z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            {sources} SOURCES
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="p-4 flex flex-col flex-1 relative">
        {/* Meta Row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest text-red-600">
            {(article.categories?.[0]?.name || "GENERAL").toUpperCase()}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
            {article.publisher?.name}
          </span>
          <span className="text-[10px] text-muted-foreground/60">• {timeAgo}</span>
        </div>

        {/* Title */}
        <h3 className="font-serif text-[17px] font-black leading-tight group-hover:text-primary transition-colors line-clamp-3 mb-4" style={{ minHeight: "4.5rem" }}>
          {article.title}
        </h3>

        {derivedDiversity > 0 || diversityScore > 0 ? (
          <div className="mt-2 space-y-1 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-black">Coverage Mix</span>
              <span className="text-[10px] font-bold text-muted-foreground">{Math.round((derivedDiversity / Math.log(3)) * 100) || diversityScore}% diverse</span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
              {(() => {
                const total = (article.proEstablishmentCount || 0) + (article.neutralCount || 0) + (article.proOppositionCount || 0);
                if (total === 0) return null;
                const lPct = Math.round(((article.proEstablishmentCount || 0) / total) * 100);
                const cPct = Math.round(((article.neutralCount || 0) / total) * 100);
                const rPct = 100 - lPct - cPct;
                return (
                  <>
                    <div className="bias-left h-full transition-all" style={{ width: `${lPct}%` }} />
                    <div className="bias-center h-full transition-all" style={{ width: `${cPct}%` }} />
                    <div className="bias-right h-full transition-all" style={{ width: `${rPct}%` }} />
                  </>
                );
              })()}
            </div>
            <div className="flex justify-between text-[9px] font-bold">
              <span className="bias-left-text">{article.proEstablishmentCount || 0}L</span>
              <span className="text-muted-foreground">{article.neutralCount || 0}C</span>
              <span className="bias-right-text">{article.proOppositionCount || 0}R</span>
            </div>
          </div>
        ) : (
          <div className="h-1 w-full bg-secondary/30 rounded-full overflow-hidden flex mt-2 mb-3">
             <div className={`h-full bias-${article.bias || "center"}`} style={{ width: "100%" }} />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-1 border-t border-border/20">
           <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{sources} {sources === 1 ? 'Perspective' : 'Perspectives'}</span>
           {/* Bookmark Icon */}
           <div className="text-muted-foreground/40 hover:text-primary transition-colors p-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
           </div>
        </div>
      </div>
    </motion.div>
  );
});
