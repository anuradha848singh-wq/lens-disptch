import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { type ArticleWithDetails } from "@shared/schema";
import { BiasSpectrumBar } from "./BiasSpectrumBar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { PublisherLogo } from "./PublisherLogo";

function proxyImage(url: string | null | undefined, width = 400): string | null {
  if (!url) return null;
  if (url.includes("unsplash.com") || url.includes("placeholder")) return url;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp&q=80`;
}

interface EditorialHeroProps {
  articles: ArticleWithDetails[];
  bookmarkedIds?: Set<string>;
}

function HeroSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 animate-pulse">
      <div className="lg:col-span-8 bg-muted min-h-[420px] rounded-lg" />
      <div className="lg:col-span-4 flex flex-col gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 bg-muted rounded-sm min-h-[100px]" />
        ))}
      </div>
    </div>
  );
}

export function EditorialHero({ articles, bookmarkedIds }: EditorialHeroProps) {
  const [, setLocation] = useLocation();

  // Graceful fallback: show skeleton instead of null when not enough articles
  if (!articles || articles.length === 0) return <HeroSkeleton />;

  // Work with whatever we have (min 1 article)
  const main = articles[0];
  const sideStories = articles.slice(1, 4);

  const pubAbbr = main.publisher?.name?.slice(0, 2).toUpperCase() ?? "??";

  const heroImageUrl = main?.heroImageUrl ? (proxyImage(main.heroImageUrl, 1200) || main.heroImageUrl) : undefined;

  useEffect(() => {
    if (!heroImageUrl) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = heroImageUrl;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [heroImageUrl]);

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.15 } }
      }}
    >
      {/* Main Hero Story — 8 columns */}
        <Link href={`/article/${main.id}`} className="lg:col-span-8 group relative flex flex-col overflow-hidden rounded-xl shadow-sm hover:shadow-xl transition-all border border-border bg-black min-h-[460px] cursor-pointer">
          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.98 },
              show: { opacity: 1, scale: 1, transition: { duration: 0.6 } }
            }}
            role="article"
          >
            {main.heroImageUrl ? (
              <img
                src={heroImageUrl}
                alt={main.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 opacity-80"
                loading="eager"
                fetchPriority="high"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center font-display italic text-6xl text-zinc-700">
                {pubAbbr}
              </div>
            )}
            {/* Dark Gradient Overlay for Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 text-white z-10 flex flex-col justify-end h-full">
              <div className="flex items-center gap-4 mb-4">
                <Badge className="bg-red-600 hover:bg-red-700 text-white font-black px-3 py-1 rounded-sm border-none text-[10px] tracking-widest uppercase">
                  TOP STORY
                </Badge>
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest">
                  <PublisherLogo name={main.publisher?.name ?? "??"} domain={main.publisher?.website} size="xs" />
                  <span>{main.publisher?.name}</span>
                  <span className="text-white/40">·</span>
                  <span className="text-white/70">7 MIN READ</span>
                </div>
              </div>
              
              <h2 className="font-serif text-3xl md:text-[40px] font-black leading-[1.1] tracking-tight mb-4 group-hover:text-red-50 transition-colors line-clamp-3">
                {main.title}
              </h2>
              
              {main.excerpt && (
                <p className="text-base md:text-lg text-white/80 font-sans leading-relaxed line-clamp-2 max-w-2xl mb-8">
                  {main.excerpt}
                </p>
              )}

              {/* Pagination Indicators */}
              <div className="flex items-center gap-2 mt-auto">
                <div className="h-1 w-6 bg-red-600 rounded-full" />
                <div className="h-1 w-6 bg-white/30 rounded-full" />
                <div className="h-1 w-6 bg-white/30 rounded-full" />
                <div className="h-1 w-6 bg-white/30 rounded-full" />
              </div>
            </div>

            {/* Right Arrow Button Overlay */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 z-10 group-hover:translate-x-2 transition-transform duration-300">
              <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors backdrop-blur-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            </div>
          </motion.div>
        </Link>

      {/* Side Stories — 4 columns */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        {sideStories.map((a) => (
          <Link key={a.id} href={`/article/${a.id}`} className="flex-1 min-h-0">
            <motion.div
              className="h-full bg-white border border-border/60 rounded-xl overflow-hidden p-4 group hover:shadow-md transition-all cursor-pointer flex gap-4"
              variants={{
                hidden: { opacity: 0, x: 20 },
                show: { opacity: 1, x: 0 }
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <PublisherLogo name={a.publisher?.name || "Source"} domain={a.publisher?.website} size="xs" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">
                    {a.publisher?.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">• 7m ago</span>
                </div>
                <h3 className="font-serif text-[16px] font-bold leading-tight group-hover:text-primary transition-colors line-clamp-3">
                  {a.title}
                </h3>
              </div>
              
              {a.heroImageUrl && !a.heroImageUrl.includes("placeholder") && (
                <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0 relative">
                  <img 
                    src={proxyImage(a.heroImageUrl, 160) || a.heroImageUrl} 
                    className="w-full h-full object-cover" 
                    alt={a.title} 
                  />
                  <div className="absolute top-1 right-1">
                    <div className="w-5 h-5 bg-white/90 rounded border border-border/50 flex items-center justify-center text-foreground/70">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
