import { useState, useEffect } from "react";
import { Link } from "wouter";
import { type ArticleWithDetails } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { PublisherLogo } from "./PublisherLogo";
import { proxyImage, gradientFallback } from "@/lib/image-utils";
import { formatDistanceToNow } from "date-fns";

interface EditorialHeroProps {
  articles: ArticleWithDetails[];
  bookmarkedIds?: Set<string>;
}

function HeroSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
      <div className="lg:col-span-8 bg-muted min-h-[460px] rounded-xl animate-shimmer" />
      <div className="lg:col-span-4 flex flex-col gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 min-h-[130px] rounded-xl border border-border overflow-hidden">
            <div className="h-full bg-muted animate-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EditorialHero({ articles, bookmarkedIds }: EditorialHeroProps) {
  if (!articles || articles.length === 0) return <HeroSkeleton />;

  // Dynamically allocate articles:
  // Show up to 5 articles in the slider, and the next up to 3 articles as side stories.
  const sliderCount = Math.min(5, Math.max(1, articles.length - 3));
  const sliderArticles = articles.slice(0, sliderCount);
  const sideStories = articles.slice(sliderArticles.length, sliderArticles.length + 3);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const currentArticle = sliderArticles[activeIndex] || sliderArticles[0];

  // Preload first hero image for LCP optimization
  const firstImageUrl = articles[0]?.heroImageUrl
    ? (proxyImage(articles[0].heroImageUrl, 1200) || articles[0].heroImageUrl)
    : undefined;

  useEffect(() => {
    if (!firstImageUrl) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = firstImageUrl;
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, [firstImageUrl]);

  // Autoplay functionality
  useEffect(() => {
    if (sliderArticles.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % sliderArticles.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [sliderArticles.length, isHovered]);

  const activeImageUrl = currentArticle?.heroImageUrl
    ? (proxyImage(currentArticle.heroImageUrl, 1200) || currentArticle.heroImageUrl)
    : undefined;

  const currentArticleTimeAgo = currentArticle?.publishedAt
    ? formatDistanceToNow(new Date(currentArticle.publishedAt), { addSuffix: true })
    : "recently";

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.12 } }
      }}
    >
      {/* ── Main Hero Story (Carousel) — 8 columns ─────────────────────────── */}
      <div
        className="lg:col-span-8 group relative flex flex-col overflow-hidden rounded-xl shadow-md hover:shadow-2xl transition-shadow duration-300 bg-black min-h-[460px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link
          href={`/article/${currentArticle.id}`}
          className="absolute inset-0 cursor-pointer flex flex-col justify-end text-white z-10"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 w-full h-full"
              role="article"
            >
              {activeImageUrl ? (
                <img
                  src={activeImageUrl}
                  alt={currentArticle.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.025] transition-transform duration-700 opacity-85"
                  loading="eager"
                  fetchPriority="high"
                />
              ) : (
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{ background: gradientFallback(currentArticle.id) }}
                />
              )}

              {/* Layered gradient for strong text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/5" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />

              {/* Content Overlay */}
              <div className="absolute inset-0 p-7 md:p-10 flex flex-col justify-end text-white z-10">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <Badge className="bg-accent-editorial hover:bg-accent-editorial text-white font-black px-3 py-1 rounded-sm border-none text-[9px] tracking-[.2em] uppercase shadow-sm">
                    TOP STORY
                  </Badge>
                  {currentArticle.categories?.[0]?.name && (
                    <Badge variant="outline" className="border-white/30 text-white/80 bg-white/10 backdrop-blur-sm text-[9px] font-black uppercase tracking-widest">
                      {currentArticle.categories[0].name}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2 text-[11px] font-bold text-white/80 uppercase tracking-widest">
                    <PublisherLogo name={currentArticle.publisher?.name ?? "??"} domain={currentArticle.publisher?.website} size="xs" />
                    <span>{currentArticle.publisher?.name}</span>
                    <span className="text-white/40">·</span>
                    <span className="text-white/60">{currentArticleTimeAgo}</span>
                  </div>
                </div>

                <h2 className="font-serif text-2xl md:text-[38px] font-black leading-[1.1] tracking-tight mb-3 group-hover:text-red-50 transition-colors line-clamp-3 drop-shadow-sm">
                  {currentArticle.title}
                </h2>

                {currentArticle.excerpt && (
                  <p className="text-base text-white/75 font-sans leading-relaxed line-clamp-2 max-w-2xl mb-8">
                    {currentArticle.excerpt}
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </Link>

        {/* Carousel controls - Dots indicator */}
        {sliderArticles.length > 1 && (
          <div className="absolute bottom-6 left-7 md:left-10 z-20 flex items-center gap-1.5">
            {sliderArticles.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === activeIndex 
                    ? "w-8 bg-accent-editorial" 
                    : "w-2 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Carousel controls - Arrow navigation buttons (fade in on hover) */}
        {sliderArticles.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveIndex((prev) => (prev - 1 + sliderArticles.length) % sliderArticles.length);
              }}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full border border-white/25 flex items-center justify-center text-white/70 bg-black/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 cursor-pointer"
              aria-label="Previous slide"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveIndex((prev) => (prev + 1) % sliderArticles.length);
              }}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full border border-white/25 flex items-center justify-center text-white/70 bg-black/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 cursor-pointer"
              aria-label="Next slide"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── Side Stories — 4 columns ─────────────────────────────── */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        {sideStories.map((a) => {
          const timeAgo = a.publishedAt
            ? formatDistanceToNow(new Date(a.publishedAt), { addSuffix: true })
            : "recently";
          const thumbUrl = a.heroImageUrl ? proxyImage(a.heroImageUrl, 160) : null;

          return (
            <Link key={a.id} href={`/article/${a.id}`} className="flex-1 min-h-0">
              <motion.div
                className="h-full glass-card p-4 group cursor-pointer flex gap-4 min-h-[130px]"
                variants={{
                  hidden: { opacity: 0, x: 16 },
                  show: { opacity: 1, x: 0, transition: { duration: 0.35 } }
                }}
              >
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {a.categories?.[0]?.name && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-accent-editorial">
                          {a.categories[0].name}
                        </span>
                      )}
                      <span className="text-[9px] text-muted-foreground/60">· {timeAgo}</span>
                    </div>
                    <h3 className="font-serif text-[15px] font-bold leading-snug group-hover:text-primary transition-colors line-clamp-3">
                      {a.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <PublisherLogo name={a.publisher?.name || "Source"} domain={a.publisher?.website} size="xs" />
                    <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground truncate">
                      {a.publisher?.name}
                    </span>
                  </div>
                </div>

                {thumbUrl && (
                  <div className="w-[88px] h-[70px] bg-muted rounded-lg overflow-hidden flex-shrink-0 relative self-center">
                    <img
                      src={thumbUrl}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      alt={a.title}
                      loading="lazy"
                    />
                  </div>
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
