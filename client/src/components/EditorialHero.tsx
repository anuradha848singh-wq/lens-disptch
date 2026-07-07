import { Link } from "wouter";
import { type ArticleWithDetails } from "@shared/schema";
import { motion } from "framer-motion";
import { proxyImage } from "@/lib/image-utils";
import { formatDistanceToNow, format } from "date-fns";
import { Aperture } from "./Aperture";

interface EditorialHeroProps {
  articles: ArticleWithDetails[];
}

function HeroSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 border border-[var(--hairline)]">
      <div className="lg:col-span-2 bg-muted min-h-[460px] animate-shimmer" />
      <div className="lg:col-span-1 flex flex-col gap-4 p-4 border-l border-dashed border-[var(--hairline-dashed)]">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 min-h-[100px]">
            <div className="h-full bg-muted animate-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EditorialHero({ articles }: EditorialHeroProps) {
  if (!articles || articles.length === 0) return <HeroSkeleton />;

  const featureArticle = articles[0];
  const wireArticles = articles.slice(1, 6);

  const activeImageUrl = featureArticle?.heroImageUrl
    ? (proxyImage(featureArticle.heroImageUrl, 1200) || featureArticle.heroImageUrl)
    : undefined;

  // Compute diversity and sources for aperture
  const sources = (featureArticle as any).totalSources || 1;
  const diversityScore = (featureArticle as any).shannonDiversity || 0;
  
  const l = featureArticle.proOppositionCount || 0;
  const c = featureArticle.neutralCount || 0;
  const r = featureArticle.proEstablishmentCount || 0;
  const apertureSources: any[] = [];
  for(let i=0; i<l; i++) apertureSources.push({lean: "left"});
  for(let i=0; i<c; i++) apertureSources.push({lean: "center"});
  for(let i=0; i<r; i++) apertureSources.push({lean: "right"});
  if (apertureSources.length === 0) {
    apertureSources.push({lean: "center"});
  }

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-3 bg-[var(--card-surface)] border border-[var(--hairline)] mb-6"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* ── Main Hero Story (Left: 2 columns) ─────────────────────────── */}
      <div className="lg:col-span-2 relative flex flex-col overflow-hidden">
        <Link
          href={`/article/${featureArticle.id}`}
          className="cursor-pointer flex flex-col h-full group"
        >
          {/* Top Image + Aperture Overlay */}
          <div className="relative w-full aspect-[16/9] md:aspect-[2/1] bg-[var(--paper)] overflow-hidden shrink-0">
            {activeImageUrl ? (
              <img
                src={activeImageUrl}
                alt={featureArticle.title}
                className="w-full h-full object-cover grayscale-[15%]  transition-all duration-700"
                loading="eager"
                fetchPriority="high"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-newsreader italic text-[var(--ink-muted)] text-4xl">
                {featureArticle.publisher?.name || "Dispatch"}
              </div>
            )}
            
            <div className="absolute top-4 left-4 z-10 flex items-center justify-center bg-[var(--card-surface)] border border-[var(--hairline)] p-2 shadow-md">
              <Aperture sources={apertureSources} diversityScore={diversityScore} size="feature" />
            </div>
          </div>
          
          {/* Divider */}
          <div className="w-full border-t border-dashed border-[var(--hairline-dashed)]" />

          {/* Content Block */}
          <div className="p-5 md:p-6 lg:p-8 flex flex-col flex-1 bg-[var(--card-surface)]">
            <div className="text-eyebrow text-[var(--ink-muted)] mb-3 flex items-center gap-2">
              <span className="font-bold text-[var(--ink)]">TOP DISPATCH</span>
              <span>·</span>
              <span>{Math.round(diversityScore)}% DIVERSE</span>
            </div>
            
            <h2 className="text-hero-headline text-[var(--ink)]  transition-colors mb-4 line-clamp-3">
              {featureArticle.title}
            </h2>
            
            <p className="text-dek text-[var(--ink-muted)] line-clamp-3 max-w-3xl">
              {featureArticle.excerpt || "Full coverage of this developing story continues with updates from multiple world sources."}
            </p>
          </div>
        </Link>
      </div>

      {/* ── WIRE FEED (Right: 1 column) ─────────────────────────────── */}
      <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-dashed border-[var(--hairline-dashed)] flex flex-col bg-[var(--card-surface)]">
        <div className="p-4 border-b border-[var(--hairline)]">
          <h3 className="font-plex-mono text-[13px] font-bold tracking-widest uppercase text-[var(--ink)]">
            Wire Feed
          </h3>
        </div>
        
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
          {wireArticles.map((article, idx) => (
            <Link key={article.id} href={`/article/${article.id}`}>
              <div className="p-4 cursor-pointer group  transition-colors border-b border-dashed border-[var(--hairline-dashed)] last:border-none">
                <div className="text-mono-metadata text-[var(--ink-muted)] mb-1.5 flex items-center justify-between">
                  <span>{format(new Date(article.publishedAt || Date.now()), 'HH:mm')} {(article.publisher?.country === "IN" ? "IST" : "UTC")}</span>
                  <span className="text-[9px] uppercase tracking-wider">{article.publisher?.name}</span>
                </div>
                <h4 className="font-public-sans text-[15px] font-semibold leading-[1.4] text-[var(--ink)]  transition-colors line-clamp-3">
                  {article.title}
                </h4>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
