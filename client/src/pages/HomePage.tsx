import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
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

type ArticleWithMetadata = ArticleWithDetails & {
  category?: string;
  proEstablishmentCount?: number;
  neutralCount?: number;
  proOppositionCount?: number;
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
  const [lastFirstArticleId, setLastFirstArticleId] = useState<string | null>(null);

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

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: [isForYou ? "/api/articles/for-you" : "/api/homepage", searchQuery, selectedCategorySlug, countryCode],
    queryFn: ({ pageParam = 0 }) => 
      isForYou 
        ? api.articles.forYou(40, pageParam) 
        : api.articles.homepage(40, pageParam, searchQuery, selectedCategorySlug, countryCode),
    getNextPageParam: (lastPage, allPages) => lastPage.length === 40 ? allPages.length * 40 : undefined,
    initialPageParam: 0,
    staleTime: 30000, // 30s cache to prevent huge re-fetches
    refetchInterval: 90000, // 90s visible-tab polling
    refetchIntervalInBackground: false, // pauses when tab hidden
  });

  const allArticles = useMemo(() => {
    return data?.pages.flat() || [];
  }, [data]) as ArticleWithMetadata[];

  // Trigger non-disruptive breaking news toast when tab is active and new articles arrive
  const currentFirstArticleId = allArticles[0]?.id;
  useEffect(() => {
    if (currentFirstArticleId && !lastFirstArticleId) {
      setLastFirstArticleId(currentFirstArticleId);
    } else if (currentFirstArticleId && lastFirstArticleId && currentFirstArticleId !== lastFirstArticleId) {
      toast({
        title: "⚡ Breaking News Updates",
        description: "New stories have just been aggregated. Click to refresh the feed.",
        duration: 8000,
        onClick: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/homepage"] });
          setLastFirstArticleId(currentFirstArticleId);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
      setLastFirstArticleId(currentFirstArticleId);
    }
  }, [currentFirstArticleId, lastFirstArticleId, queryClient, toast]);


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
        <CategoryStrip selectedCategoryId={null} onSelect={() => {}} onSearch={urlState.setSearch} />
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="flex flex-col xl:grid xl:grid-cols-[240px_minmax(0,1fr)_300px] gap-6 xl:gap-8">
            <div className="hidden xl:block space-y-4">
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


  if (!isLoading && allArticles.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <BreakingTicker />
        <MainNav onSearch={urlState.setSearch} />
        <CategoryStrip selectedCategoryId={null} onSelect={() => {}} onSearch={urlState.setSearch} />
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
    <div className="min-h-screen bg-background text-foreground selection:bg-accent-editorial/20">
      <BreakingTicker />
      <MainNav onSearch={urlState.setSearch} searchQuery={searchQuery} />
      <CategoryStrip
        selectedCategoryId={selectedCategoryId}
        onSelect={(id, topic) => {
          urlState.setCategoryId(id, null);
          setSelectedTopic(topic || null);
        }}
        onSearch={(q) => {
          urlState.setSearch(q);
          setSelectedTopic(null);
        }}
      />


      <div className="w-full max-w-[1800px] mx-auto px-2 md:px-4 py-4">
        <div className="flex flex-col xl:grid xl:grid-cols-[200px_minmax(0,1fr)_280px] gap-4 xl:gap-6 items-start">

          {/* LEFT SIDEBAR (Daily Briefing) */}
          <aside className="hidden xl:block w-full sticky top-20">
            <SectionErrorBoundary fallbackMessage="Could not load Daily Briefing">
              <DailyBriefingSidebar articles={briefingSidebarArticles} />
            </SectionErrorBoundary>
          </aside>


          {/* MAIN COLUMN */}
          <main className="min-w-0 w-full overflow-hidden flex flex-col gap-4">

            {isForYou && (
              <div className="self-start px-3 py-1 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 rounded-full text-xs font-black uppercase tracking-wider mb-2 animate-fade-in shadow-sm border border-red-200/50">
                ✨ Personalised for you
              </div>
            )}

            {/* Edition Banner — only show when a region is active */}
            {countryCode && countryCode !== "GLOBAL" && countryCode !== "US" && (
              <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-accent-editorial/10 to-transparent border border-accent-editorial/20 rounded-lg mb-1 animate-fade-in">
                <span className="text-lg leading-none">
                  {countryCode === "UK" ? "🇬🇧" : countryCode === "IN" ? "🇮🇳" : countryCode === "AU" ? "🇦🇺" : countryCode === "CA" ? "🇨🇦" : countryCode === "DE" ? "🇩🇪" : countryCode === "FR" ? "🇫🇷" : countryCode === "JP" ? "🇯🇵" : "🌍"}
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-accent-editorial">
                    {countryCode === "UK" ? "United Kingdom" : countryCode === "IN" ? "India" : countryCode === "AU" ? "Australia" : countryCode === "CA" ? "Canada" : countryCode === "DE" ? "Germany" : countryCode === "FR" ? "France" : countryCode === "JP" ? "Japan" : countryCode} Edition
                  </span>
                  <p className="text-[10px] text-muted-foreground">Showing news prioritised for this region</p>
                </div>
                <button
                  onClick={() => setCountryCode("GLOBAL")}
                  className="ml-auto text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  World →
                </button>
              </div>
            )}

            {/* Hero Zone */}
            <EditorialHero articles={heroArticles} />



            {/* MAIN FEED SECTION */}
            <section className="mt-2">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4 pb-2 border-b border-border/40">
                <div className="flex items-center gap-4 w-full">
                  <h2 className="text-[18px] font-sans font-bold tracking-tight shrink-0 uppercase">MAIN FEED</h2>
                  <div className="flex items-center gap-1 cursor-pointer mr-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">LATEST</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground rotate-90" />
                  </div>
                  
                  {/* Dynamic perspectives counter banner */}
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary/80 rounded-full border border-border/40 hover:bg-secondary transition-all">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground">
                      {uniquePerspectivesCount} Perspectives
                    </span>
                  </div>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground shrink-0 border border-border/50 px-3 py-1.5 rounded-sm">
                  <Filter className="w-3 h-3" /> FILTERS
                </button>
              </div>

              {/* Feed Grid:
                  - key changes on filter switch → re-runs stagger animation
                  - initial/animate only fire on mount+key-change
                  - Individual cards use viewport once=true so they don't re-animate on refetch
              */}
              <div
                key={selectedCategoryId || selectedTopic || "all"}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {categoryArticles.slice(0, 36).map((a, index) => (
                  <StoryCardErrorBoundary key={a.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.035, ease: "easeOut" }}
                      style={{ willChange: "opacity, transform" }}
                    >
                      <StoryCard article={a} variant="standard" priority={index === 0} />
                    </motion.div>
                  </StoryCardErrorBoundary>
                ))}
              </div>

              {hasNextPage && (
                <div className="mt-12 flex justify-center border-t border-border/40 pt-8">
                  <button 
                    onClick={() => fetchNextPage()} 
                    disabled={isFetchingNextPage}
                    className="text-[11px] font-black uppercase tracking-widest text-foreground hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {isFetchingNextPage ? "LOADING..." : "LOAD MORE STORIES"} <ChevronRight className="w-3 h-3 rotate-90 inline-block ml-1" />
                  </button>
                </div>
              )}
            </section>

            {/* News Index Section */}
            <section className="mt-8 border-t-4 border-foreground pt-8">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide pb-2">
                  <h2 className="text-2xl font-serif font-black tracking-tight shrink-0 uppercase mr-4">THE NEWS INDEX</h2>
                  <button onClick={() => setIndexTab('all')} className={`pb-2 text-[13px] font-bold uppercase whitespace-nowrap ${indexTab === 'all' ? 'text-foreground border-b-2 border-red-600' : 'text-muted-foreground hover:text-foreground'}`}>ALL</button>
                  {(categories as Category[]).map(cat => (
                    <button 
                      key={cat.id} 
                      onClick={() => setIndexTab(cat.slug || cat.name.toLowerCase())} 
                      className={`pb-2 text-[13px] font-bold uppercase whitespace-nowrap ${indexTab === (cat.slug || cat.name.toLowerCase()) ? 'text-foreground border-b-2 border-red-600' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 border border-border rounded shadow-sm bg-white cursor-pointer hover:bg-secondary transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{uniquePerspectivesCount} Perspectives</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 {indexArticles.map(a => (
                  <StoryCardErrorBoundary key={a.id}>
                    <StoryCard article={a} variant="news-index" />
                  </StoryCardErrorBoundary>
                ))}

                {/* News. Balanced. Always. Promo Box */}
                <div className="bg-[#F6F1EA] rounded-sm border border-border/40 p-8 flex flex-col justify-between relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-serif font-black leading-tight mb-2">
                      News. Balanced.<br />
                      <span className="text-red-600">Always.</span>
                    </h3>
                    <p className="text-[13px] text-muted-foreground font-medium leading-relaxed max-w-[240px] mb-6">
                      We analyze multiple sources to bring you balanced perspectives on the stories that matter.
                    </p>
                    <button className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-[0.2em] px-8 py-3 rounded-sm transition-all shadow-md active:scale-95">
                      SUBSCRIBE NOW
                    </button>
                  </div>
                  
                  {/* Decorative background newspaper icon */}
                  <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-4 translate-y-4 rotate-12">
                     <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>
                  </div>
                </div>
              </div>
            </section>
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="w-full xl:w-[280px] xl:min-w-[280px] space-y-4 flex flex-col shrink-0 sticky top-20">
            <SectionErrorBoundary fallbackMessage="Could not load Trending">
              <TrendingTopicsWidget articles={allArticles} />
            </SectionErrorBoundary>
            <SectionErrorBoundary fallbackMessage="Could not load Latest Updates">
              <LatestUpdatesWidget articles={allArticles} />
            </SectionErrorBoundary>

            {/* Factuality CTA Card */}
            <Link href="/factuality">
              <div className="border border-border/60 rounded-xl p-4 hover:border-accent-editorial/40 hover:shadow-sm transition-all cursor-pointer bg-gradient-to-br from-secondary/20 to-transparent group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-accent-editorial/10 flex items-center justify-center">
                    <span className="text-sm">⚖️</span>
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-accent-editorial">Factuality Index</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-snug mb-3">
                  See which publishers score highest for accuracy, corrections, and transparency.
                </p>
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground group-hover:text-accent-editorial transition-colors">
                  View Ratings →
                </span>
              </div>
            </Link>

            <SectionErrorBoundary fallbackMessage="Could not load Polarizing Feed">
              <PolarizingWidget articles={allArticles} />
            </SectionErrorBoundary>
          </aside>
        </div>
      </div>

      <NewsFooter />
    </div>
  );
}
