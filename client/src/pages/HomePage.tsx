import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useInfiniteQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { PremiumLoader } from "@/components/ui/PremiumLoader";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { MainNav } from "@/components/MainNav";
import { BreakingTicker } from "@/components/BreakingTicker";
import { StoryCard } from "@/components/StoryCard";
import { NewsFooter } from "@/components/NewsFooter";
import { Skeleton } from "@/components/ui/skeleton";
import { type ArticleWithDetails, type Category } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { EditorialHero } from "@/components/EditorialHero";
import { BlindspotFeed } from "@/components/BlindspotFeed";
import { LatestUpdatesWidget, PolarizingWidget, TrendingTopicsWidget } from "@/components/SidebarWidgets";
import { TopicHeatCalendar } from "@/components/TopicHeatCalendar";
import { DailyBriefingSidebar } from "@/components/DailyBriefingSidebar";
import { Filter, ChevronRight } from "lucide-react";
import { CategoryStrip } from "@/components/CategoryStrip";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { StoryCardErrorBoundary } from "@/components/StoryCardErrorBoundary";
import { AuthModal } from "@/components/AuthModal";
import { useCountryProfile } from "@/hooks/useCountryProfile";
import { useUrlState } from "@/hooks/useUrlState";
import { Aperture, DispatchCard, OffTheWire, WireTicker } from "@/components/DispatchPrimitives";
import { proxyImage } from "@/lib/image-utils";

type ArticleWithMetadata = ArticleWithDetails & {
  category?: string;
  proEstablishmentCount?: number;
  neutralCount?: number;
  proOppositionCount?: number;
  totalSources?: number;
  shannonDiversity?: number;
  heroImageUrl?: string;
};


function SkeletonCard() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="aspect-[16/10] bg-muted animate-shimmer" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-muted rounded animate-shimmer w-1/3" />
        <div className="h-5 bg-muted rounded animate-shimmer" />
        <div className="h-5 bg-muted rounded animate-shimmer w-4/5" />
        <div className="flex gap-2 pt-1">
          <div className="h-3 bg-muted rounded animate-shimmer w-16" />
          <div className="h-3 bg-muted rounded animate-shimmer w-12" />
        </div>
      </div>
    </div>
  );
}


export default function HomePage() {
  const { user } = useAuth();
  // ── URL-synced state (survives F5 and browser history) ──────────────────
  const urlState = useUrlState();
  const selectedCategoryId = urlState.categoryId;
  const searchQuery = urlState.search;

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [indexLimit, setIndexLimit] = useState(8);
  const [indexTab, setIndexTab] = useState("all");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { countryCode, setCountryCode } = useCountryProfile();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [location] = useLocation();
  const isForYou = location === "/for-you";


  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: api.categories.list,
  });

  const selectedCategorySlug = useMemo(() => {
    if (!selectedCategoryId) return "";
    const cat = (categories as Category[]).find(c => c.id === selectedCategoryId);
    return cat ? cat.slug : "";
  }, [selectedCategoryId, categories]);

  const { data, isLoading, isFetching, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: [isForYou ? "/api/articles/for-you" : "/api/homepage", searchQuery, selectedCategorySlug, countryCode],
    queryFn: ({ pageParam = 0 }) => 
      isForYou 
        ? api.articles.forYou(40, pageParam) 
        : api.articles.homepage(40, pageParam, searchQuery, selectedCategorySlug, countryCode),
    getNextPageParam: (lastPage, allPages) => lastPage.length === 40 ? allPages.length * 40 : undefined,
    initialPageParam: 0,
    staleTime: 30000, // 30s cache to prevent huge re-fetches
    placeholderData: keepPreviousData,
  });

  const allArticles = useMemo(() => {
    const fetched = data?.pages.flat() || [];
    return fetched as ArticleWithMetadata[];
  }, [data]);

  // Lightweight polling to detect new stories without triggering a layout shift
  const { data: latestData } = useQuery({
    queryKey: ["/api/homepage-latest", searchQuery, selectedCategorySlug, countryCode],
    queryFn: () => 
      isForYou 
        ? api.articles.forYou(1, 0) 
        : api.articles.homepage(1, 0, searchQuery, selectedCategorySlug, countryCode),
    refetchInterval: 60000, // Check every 60s
    refetchIntervalInBackground: false,
  });

  // Trigger non-disruptive breaking news toast when tab is active and new articles arrive
  const currentFirstArticleId = allArticles[0]?.id;
  const latestFirstArticleId = latestData?.[0]?.id;
  useEffect(() => {
    // If the polling query detects a newer article than what's currently rendered
    if (latestFirstArticleId && currentFirstArticleId && latestFirstArticleId !== currentFirstArticleId) {
      toast({
        title: "⚡ Breaking News Updates",
        description: "New stories have just been aggregated. Click to refresh the feed.",
        duration: 8000,
        onClick: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/homepage"] });
          queryClient.invalidateQueries({ queryKey: ["/api/articles/for-you"] });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    }
  }, [latestFirstArticleId, currentFirstArticleId, queryClient, toast]);


  const heroArticles = useMemo(() => allArticles.slice(0, 8), [allArticles]);
  const blindspotArticles = useMemo(() => allArticles, [allArticles]);
  // Memoized slice for sidebar — avoids re-slicing on every parent render
  const briefingSidebarArticles = useMemo(() => allArticles.slice(0, 9), [allArticles]);


  const groupedArticlesByCategory = useMemo(() => {
    const map = new Map<string, ArticleWithMetadata[]>();
    
    (categories as Category[]).forEach((cat) => {
      const filtered = allArticles.filter((a) =>
        (a.categories || []).some((c: any) => c.slug === cat.slug || c.id === cat.id)
      );
      map.set(cat.id, filtered);
    });

    return map;
  }, [allArticles, categories]);

  const categoryArticles = useMemo(() => {
    // Priority 1: Raw Topic String from CategoryStrip hashtags
    if (selectedTopic) {
      const q = selectedTopic.toLowerCase();
      const filtered = allArticles.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.categories || []).some((c: any) => c.name.toLowerCase().includes(q))
      );
      return filtered.slice(0, 18);
    }

    // Priority 2: Category ID — filter by pre-grouped map lookup
    if (selectedCategoryId) {
      const preFiltered = groupedArticlesByCategory.get(selectedCategoryId);
      if (preFiltered && preFiltered.length >= 3) {
        return preFiltered.slice(0, 36);
      }
    }

    // Default: latest 36 articles
    return allArticles.slice(0, 36);
  }, [allArticles, selectedCategoryId, selectedTopic, groupedArticlesByCategory]);

  const indexArticles = useMemo(() => {
    // Show a different slice for the index at the bottom
    let subset = allArticles.slice(24, 40);
    if (indexTab !== "all") {
      subset = subset.filter(a => (a.categories || []).some((c: any) => c.slug === indexTab || c.name.toLowerCase() === indexTab));
    }
    return subset;
  }, [allArticles, indexTab]);

  const uniquePerspectivesCount = useMemo(() => {
    return new Set(categoryArticles.map(a => a.sourceId)).size;
  }, [categoryArticles]);

  if (isForYou && !user) {
    return (
      <div className="min-h-screen bg-background">
        <BreakingTicker />
        <MainNav onSearch={urlState.setSearch} />
        <div className="max-w-[1400px] mx-auto px-4 py-24 text-center">
          <div className="max-w-2xl mx-auto glass-card p-12 shadow-sm animate-fade-in-up">
            <div className="text-6xl mb-6">✨</div>
            <h2 className="text-3xl font-display font-black mb-4">Unlock Your Personalised Feed</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-lg mx-auto">
              Sign in to discover stories tailored to your reading habits, uncover your political blindspots, and break out of the echo chamber.
            </p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="inline-block px-8 py-4 bg-accent-editorial text-white text-sm font-black uppercase tracking-widest hover:opacity-90 transition-opacity rounded-full shadow-lg"
            >
              Sign In / Create Account
            </button>
          </div>
        </div>
        <NewsFooter />
        <AuthModal open={isAuthOpen} onOpenChange={setIsAuthOpen} />
      </div>
    );
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <BreakingTicker />
        <MainNav onSearch={urlState.setSearch} />
        <div className="max-w-[1800px] mx-auto px-4 py-8">
          <div className="flex flex-col lg:grid lg:grid-cols-[180px_minmax(0,1fr)_260px] gap-4 lg:gap-6">
            <div className="hidden lg:block space-y-4">
              {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted animate-shimmer rounded" />)}
            </div>
            <div className="space-y-6">
              <div className="h-[460px] bg-muted animate-shimmer rounded-xl" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-muted animate-shimmer rounded" />
              <div className="h-24 bg-muted animate-shimmer rounded" />
              <div className="h-24 bg-muted animate-shimmer rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }


  const hasActiveFilters = searchQuery || selectedCategoryId || selectedTopic || (countryCode && countryCode !== "GLOBAL");

  if (!isLoading && allArticles.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="min-h-screen bg-background">
          <BreakingTicker />
          <MainNav onSearch={urlState.setSearch} />
          <div className="max-w-[1400px] mx-auto px-4 py-24 text-center">
            <div className="max-w-lg mx-auto animate-fade-in-up">
              <div className="text-6xl mb-6">🌍</div>
              <h2 className="text-2xl font-display font-black mb-3">No articles found</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                We couldn't find any articles for this specific edition or topic. The newsroom is constantly gathering updates.
              </p>
              <button
                onClick={() => {
                  urlState.setSearch("");
                  urlState.setCategoryId(null, null);
                  setSelectedTopic(null);
                  setCountryCode("GLOBAL");
                }}
                className="inline-block px-6 py-2.5 bg-foreground text-background text-xs font-black uppercase tracking-widest hover:bg-accent-editorial transition-colors"
              >
                Return to Global Feed
              </button>
            </div>
          </div>
          <NewsFooter />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background">
        <BreakingTicker />
        <MainNav onSearch={urlState.setSearch} />
        <div className="max-w-[1400px] mx-auto px-4 py-24 text-center">
          <div className="max-w-lg mx-auto animate-fade-in-up">
            <div className="text-6xl mb-6">📰</div>
            <h2 className="text-2xl font-display font-black mb-3">The Newsroom is Warming Up</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              No articles have been ingested yet. The pipeline fetches news every 15 minutes automatically.
              If you just launched the server, please ensure Docker is running with{" "}
              <code className="bg-secondary px-1 py-0.5 rounded text-xs font-mono">docker compose up -d</code>{" "}
              then run <code className="bg-secondary px-1 py-0.5 rounded text-xs font-mono">npm run dev</code>.
            </p>
            <Link href="/admin" className="inline-block px-6 py-2.5 bg-foreground text-background text-xs font-black uppercase tracking-widest hover:bg-accent-editorial transition-colors">
              Manage Sources &amp; AI
            </Link>
          </div>
        </div>
        <NewsFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      <BreakingTicker />
      <MainNav onSearch={urlState.setSearch} searchQuery={searchQuery} />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
          
          <main className="min-w-0 w-full flex flex-col gap-8">
            {/* Hero + Wire Rail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 border border-border">
              {/* Left Column: Top 2 Featured Dispatches Side-by-Side */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-dashed divide-hairline-dashed bg-card">
                
                {/* Featured Dispatch 1 */}
                {heroArticles[0] && (
                  <div className="p-6 flex flex-col justify-between min-h-[420px] group">
                    <div>
                      <div className="mb-4">
                        <Aperture sources={Array(heroArticles[0]?.totalSources || 5).fill({lean: 'unrated'})} diversityScore={heroArticles[0]?.shannonDiversity || 60} size="feature" />
                      </div>
                      <div className="text-eyebrow text-muted-foreground mb-2 tracking-widest uppercase">FEATURED DISPATCH &middot; {Math.round(heroArticles[0]?.shannonDiversity || 60)}% DIVERSE</div>
                      <Link href={`/article/${heroArticles[0]?.id || ''}`}>
                        <h2 className="font-serif text-[22px] font-black text-ink leading-tight mb-4 cursor-pointer hover:text-signal-yellow transition-colors line-clamp-3">{heroArticles[0]?.title}</h2>
                      </Link>
                    </div>
                    
                    <div className="mt-6">
                      {heroArticles[0]?.heroImageUrl ? (
                        <img src={proxyImage(heroArticles[0].heroImageUrl, 400) || undefined} className="w-full h-44 object-cover border-[1.5px] border-dashed border-hairline-dashed" />
                      ) : (
                        <div className="w-full h-44 border-[1.5px] border-dashed border-hairline-dashed relative bg-card-surface select-none font-mono flex flex-col items-center justify-center p-4">
                          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:16px_16px]" />
                          <div className="absolute top-2 left-2 text-[9px] text-ink-muted/50 tracking-widest uppercase">DISPATCH TELEMETRY</div>
                          <div className="absolute bottom-2 right-2 text-[9px] text-ink-muted/50 tracking-widest">LENS-TRUTH.01</div>
                          <div className="w-8 h-8 border border-dashed border-ink-muted/40 flex items-center justify-center text-ink-muted/60 text-sm">
                            +
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Featured Dispatch 2 */}
                {heroArticles[1] && (
                  <div className="p-6 flex flex-col justify-between min-h-[420px] group">
                    <div>
                      <div className="mb-4">
                        <Aperture sources={Array(heroArticles[1]?.totalSources || 5).fill({lean: 'unrated'})} diversityScore={heroArticles[1]?.shannonDiversity || 60} size="feature" />
                      </div>
                      <div className="text-eyebrow text-muted-foreground mb-2 tracking-widest uppercase">SECONDARY DISPATCH &middot; {Math.round(heroArticles[1]?.shannonDiversity || 60)}% DIVERSE</div>
                      <Link href={`/article/${heroArticles[1]?.id || ''}`}>
                        <h2 className="font-serif text-[22px] font-black text-ink leading-tight mb-4 cursor-pointer hover:text-signal-yellow transition-colors line-clamp-3">{heroArticles[1]?.title}</h2>
                      </Link>
                    </div>
                    
                    <div className="mt-6">
                      {heroArticles[1]?.heroImageUrl ? (
                        <img src={proxyImage(heroArticles[1].heroImageUrl, 400) || undefined} className="w-full h-44 object-cover border-[1.5px] border-dashed border-hairline-dashed" />
                      ) : (
                        <div className="w-full h-44 border-[1.5px] border-dashed border-hairline-dashed relative bg-card-surface select-none font-mono flex flex-col items-center justify-center p-4">
                          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:16px_16px]" />
                          <div className="absolute top-2 left-2 text-[9px] text-ink-muted/50 tracking-widest uppercase">DISPATCH TELEMETRY</div>
                          <div className="absolute bottom-2 right-2 text-[9px] text-ink-muted/50 tracking-widest">LENS-TRUTH.02</div>
                          <div className="w-8 h-8 border border-dashed border-ink-muted/40 flex items-center justify-center text-ink-muted/60 text-sm">
                            +
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Wire Feed */}
              <div className="lg:col-span-1 flex flex-col border-t lg:border-t-0 lg:border-l border-dashed border-hairline-dashed bg-card-surface">
                <div className="p-4 border-b border-border text-eyebrow tracking-widest text-ink">WIRE FEED</div>
                <div className="flex flex-col flex-1 overflow-y-auto max-h-[420px]">
                  {heroArticles.slice(2, 8).map((a, i) => (
                    <Link key={a.id} href={`/article/${a.id}`}>
                      <div className="p-4 border-b-[1.5px] border-dashed border-hairline-dashed last:border-b-0 hover:bg-muted cursor-pointer">
                        <div className="text-mono-metadata text-muted-foreground mb-2 uppercase">{new Date(a.publishedAt || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} IST</div>
                        <div className="text-dek text-ink line-clamp-2">{a.title}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Bento Grid */}
            <div className="flex items-center justify-between border-b-[1.5px] border-dashed border-hairline-dashed pb-2">
              <h2 className="text-eyebrow text-ink tracking-widest">LATEST DISPATCHES</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-border border border-border">
              {categoryArticles.slice(8, 38).map((a, i) => {
                const isWide = (a.totalSources || 0) >= 5;
                return (
                  <Link key={a.id} href={`/article/${a.id}`}>
                    <div className={cn("h-full bg-card", isWide ? 'md:col-span-2' : '')}>
                      <DispatchCard 
                        variant={isWide ? 'wide' : 'standard'}
                        image={proxyImage(a.heroImageUrl, 400) || undefined}
                        sourceCount={a.totalSources || 1}
                        eyebrow={`${a.categories?.[0]?.name || 'GENERAL'} · ${a.publisher?.name || 'SOURCE'} · ${new Date(a.publishedAt || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                        headline={a.title}
                        dek={a.excerpt || undefined}
                        diversityPct={a.shannonDiversity || 0}
                        className="h-full border-none"
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
            
            {/* Category Showcases (Different Parts & Shapes) */}
            {(categories as Category[]).slice(0, 4).map((cat) => {
              const catArticles = groupedArticlesByCategory.get(cat.id) || [];
              const uniqueArticles = catArticles.filter(a => !heroArticles.slice(0, 8).some(h => h.id === a.id));
              if (uniqueArticles.length === 0) return null;

              return (
                <div key={cat.id} className="mt-8 border border-border bg-card">
                  <div className="p-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                    <h3 className="text-eyebrow text-ink tracking-widest font-black uppercase">{cat.name} COVERAGE</h3>
                    <button 
                      onClick={() => urlState.setCategoryId(cat.id, cat.slug)}
                      className="text-[10px] uppercase font-bold tracking-widest cursor-pointer hover:underline bg-transparent border-none p-0"
                    >
                      View All &rarr;
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                    {uniqueArticles.slice(0, 3).map((a) => (
                      <Link key={a.id} href={`/article/${a.id}`}>
                        <div className="p-4 hover:bg-muted/50 cursor-pointer flex flex-col justify-between h-[280px]">
                          <div>
                            <div className="text-[9px] font-bold text-muted-foreground mb-1 uppercase">
                              {a.publisher?.name || 'SOURCE'} &middot; {new Date(a.publishedAt || '').toLocaleDateString()}
                            </div>
                            <h4 className="font-serif text-[15px] font-black text-ink leading-snug line-clamp-3 mb-2">
                              {a.title}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-3">{a.excerpt || (a as any).description}</p>
                          </div>
                          {a.heroImageUrl && (
                            <img src={proxyImage(a.heroImageUrl, 200) || undefined} className="w-full h-24 object-cover mt-3 border border-border" />
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}

            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <button 
                  onClick={() => fetchNextPage()} 
                  disabled={isFetchingNextPage}
                  className="px-6 py-3 border border-border bg-card hover:bg-muted text-eyebrow tracking-widest transition-colors"
                >
                  {isFetchingNextPage ? <PremiumLoader size="sm" /> : "LOAD MORE DISPATCHES"}
                </button>
              </div>
            )}
          </main>
          
          <aside className="w-full lg:w-[300px] flex flex-col gap-8">
            <WireTicker 
              title="WIRE / TRENDING TODAY" 
              items={allArticles.slice(0, 10).map((a, i) => ({ rank: i + 1, headline: a.title }))} 
            />
            {/* Most polarizing highlight */}
            <div className="border border-wire-red bg-card-surface p-4 relative">
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-wire-red" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-wire-red" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-wire-red" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-wire-red" />
              <div className="text-eyebrow text-ink mb-4 tracking-widest">MOST POLARIZING TODAY</div>
              <Link href={`/article/${allArticles.find(a => a.bias === 'pro_opposition' || a.bias === 'pro_establishment')?.id || allArticles[0]?.id}`}>
                <div className="cursor-pointer">
                  <div className="text-card-headline text-wire-red mb-2">{allArticles.find(a => a.bias === 'pro_opposition' || a.bias === 'pro_establishment')?.title || allArticles[0]?.title}</div>
                  <div className="text-mono-metadata text-muted-foreground uppercase">HIGHLY CONTESTED</div>
                </div>
              </Link>
            </div>
            <BlindspotFeed articles={allArticles} />
          </aside>
        </div>
      </div>
      <NewsFooter />
    </div>
  );
}
