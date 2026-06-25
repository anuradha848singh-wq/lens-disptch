import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
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
import { BiasSpectrumStrip } from "@/components/BiasSpectrumStrip";
import { ReadingHabitWidget, CoverageStatsWidget, PolarizingWidget, TrendingTopicsWidget } from "@/components/SidebarWidgets";
import { TopicHeatCalendar } from "@/components/TopicHeatCalendar";
import { DailyBriefingSidebar } from "@/components/DailyBriefingSidebar";
import { Filter, ChevronRight } from "lucide-react";
import { CategoryStrip } from "@/components/CategoryStrip";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { StoryCardErrorBoundary } from "@/components/StoryCardErrorBoundary";

type ArticleWithMetadata = ArticleWithDetails & {
  category?: string;
  proEstablishmentCount?: number;
  neutralCount?: number;
  proOppositionCount?: number;
};

function SkeletonCard() {
  return (
    <div className="bg-white border border-border p-4 space-y-3 animate-pulse">
      <Skeleton className="aspect-video w-full rounded-sm" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-4/5" />
      <div className="flex gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [indexLimit, setIndexLimit] = useState(8);
  const [indexTab, setIndexTab] = useState("all");

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
    queryKey: [isForYou ? "/api/articles/for-you" : "/api/homepage", searchQuery, selectedCategorySlug],
    queryFn: ({ pageParam = 0 }) => 
      isForYou 
        ? api.articles.forYou(20, pageParam) 
        : api.articles.homepage(20, pageParam, searchQuery, selectedCategorySlug),
    getNextPageParam: (lastPage, allPages) => lastPage.length === 20 ? allPages.length * 20 : undefined,
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
        title: "ΓÜí Breaking News Updates",
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


  const heroArticles = useMemo(() => allArticles.slice(0, 4), [allArticles]);
  const blindspotArticles = useMemo(() => allArticles, [allArticles]);

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
      return filtered.slice(0, 12);
    }

    // Priority 2: Category ID ΓÇö filter by pre-grouped map lookup
    if (selectedCategoryId) {
      const preFiltered = groupedArticlesByCategory.get(selectedCategoryId);
      if (preFiltered && preFiltered.length >= 3) {
        return preFiltered.slice(0, 12);
      }
    }

    // Default: latest 12 articles
    return allArticles.slice(0, 12);
  }, [allArticles, selectedCategoryId, selectedTopic, groupedArticlesByCategory]);

  const indexArticles = useMemo(() => {
    // Show a different slice for the index at the bottom
    let subset = allArticles.slice(12, 28);
    if (indexTab !== "all") {
      subset = subset.filter(a => (a.categories || []).some((c: any) => c.slug === indexTab || c.name.toLowerCase() === indexTab));
    }
    return subset;
  }, [allArticles, indexTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F6F1]">
        <BreakingTicker />
        <MainNav onSearch={setSearchQuery} />
        <CategoryStrip selectedCategoryId={null} onSelect={() => {}} onSearch={setSearchQuery} />
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="flex flex-col xl:grid xl:grid-cols-[220px_minmax(0,1fr)_320px] gap-6 xl:gap-10">
            <div className="hidden xl:block space-y-4">
              {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
            </div>
            <div className="space-y-6">
              <div className="h-[380px] bg-muted animate-pulse rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-muted animate-pulse rounded" />
              <div className="h-24 bg-muted animate-pulse rounded" />
              <div className="h-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && allArticles.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F6F1]">
        <BreakingTicker />
        <MainNav onSearch={setSearchQuery} />
        <CategoryStrip selectedCategoryId={null} onSelect={() => {}} onSearch={setSearchQuery} />
        <div className="max-w-[1400px] mx-auto px-4 py-24 text-center">
          <div className="max-w-lg mx-auto">
            <div className="text-6xl mb-6">≡ƒô░</div>
            <h2 className="text-2xl font-display font-black mb-3">The Newsroom is Warming Up</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              No articles have been ingested yet. The pipeline fetches news every 15 minutes automatically.
              If you just launched the server, please ensure Docker is running with{" "}
              <code className="bg-secondary px-1 py-0.5 rounded text-xs font-mono">docker compose up -d</code>{" "}
              then run <code className="bg-secondary px-1 py-0.5 rounded text-xs font-mono">npm run dev</code>.
            </p>
            <a href="/admin" className="inline-block px-6 py-2.5 bg-foreground text-background text-xs font-black uppercase tracking-widest hover:bg-accent-editorial transition-colors">
              Open Admin Panel ΓåÆ
            </a>
          </div>
        </div>
        <NewsFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1] text-foreground selection:bg-accent-editorial/20">
      <BreakingTicker />
      <MainNav onSearch={setSearchQuery} searchQuery={searchQuery} />
      <CategoryStrip
        selectedCategoryId={selectedCategoryId}
        onSelect={(id, topic) => {
          setSelectedCategoryId(id);
          setSelectedTopic(topic || null);
        }}
        onSearch={(q) => {
          setSearchQuery(q);
          setSelectedTopic(null);
        }}
      />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex flex-col xl:grid xl:grid-cols-[260px_minmax(0,1fr)_320px] gap-6 xl:gap-10 items-start">

          {/* LEFT SIDEBAR (Daily Briefing) */}
          <aside className="hidden xl:block w-full sticky top-20">
            <SectionErrorBoundary fallbackMessage="Could not load Daily Briefing">
              <DailyBriefingSidebar articles={allArticles.slice(0, 9)} />
            </SectionErrorBoundary>
          </aside>

          {/* MAIN COLUMN */}
          <main className="min-w-0 w-full overflow-hidden flex flex-col gap-6">

            {isForYou && (
              <div className="self-start px-3 py-1 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 rounded-full text-xs font-black uppercase tracking-wider mb-2 animate-fade-in shadow-sm border border-red-200/50">
                Γ£¿ Personalised for you
              </div>
            )}

            {/* Top Navigation Tabs */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
              <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide border-b border-border/40 pb-2 w-full xl:w-auto flex-1 px-1">
                <button
                  onClick={() => { setSelectedCategoryId(null); setSelectedTopic(null); }}
                  className={`pb-3 text-[14px] font-bold transition-all whitespace-nowrap relative ${!selectedCategoryId && !selectedTopic ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  ALL
                  {!selectedCategoryId && !selectedTopic && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-red-600 rounded-t-full" />
                  )}
                </button>
                {(categories as Category[]).slice(0, 6).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategoryId(cat.id); setSelectedTopic(null); }}
                    className={`pb-3 text-[14px] font-bold transition-all whitespace-nowrap uppercase relative ${selectedCategoryId === cat.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {cat.name}
                    {selectedCategoryId === cat.id && (
                      <span className="absolute bottom-0 left-0 w-full h-[2px] bg-red-600 rounded-t-full" />
                    )}
                  </button>
                ))}
                <button className="pb-3 text-[14px] font-bold text-muted-foreground hover:text-foreground whitespace-nowrap flex items-center gap-1 uppercase">
                  OPINION
                </button>
                <button className="pb-3 text-[14px] font-bold text-muted-foreground hover:text-foreground whitespace-nowrap flex items-center gap-1 uppercase">
                  MORE <ChevronRight className="w-3 h-3 rotate-90" />
                </button>
              </div>
              
              {/* 6 PERSPECTIVES Dropdown */}
              <div className="shrink-0 flex items-center gap-4 px-4 py-2 rounded-md cursor-pointer hover:bg-secondary/50 transition-colors self-start xl:self-auto pb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                <div className="text-[11px] font-black uppercase tracking-widest leading-none text-foreground flex items-center gap-2">
                  6 Perspectives <ChevronRight className="w-3 h-3 text-foreground rotate-90" />
                </div>
              </div>
            </div>

            {/* Hero Zone */}
            <EditorialHero articles={heroArticles} />

            {/* Bias Spectrum Strip */}
            <BiasSpectrumStrip articles={allArticles} />

            {/* MAIN FEED SECTION */}
            <section className="mt-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 pb-2 border-b border-border/40">
                <div className="flex items-center gap-3 w-full">
                  <h2 className="text-[18px] font-sans font-bold tracking-tight shrink-0 uppercase">MAIN FEED</h2>
                  <div className="flex items-center gap-1 cursor-pointer">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">LATEST</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground rotate-90" />
                  </div>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground shrink-0 border border-border/50 px-3 py-1.5 rounded-sm">
                  <Filter className="w-3 h-3" /> FILTERS
                </button>
              </div>

              {/* Responsive Grid - 4 Columns */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
                }}
              >
                {categoryArticles.slice(0, 12).map((a, index) => (
                  <StoryCardErrorBoundary key={a.id}>
                    <StoryCard article={a} variant="standard" priority={index === 0} />
                  </StoryCardErrorBoundary>
                ))}
              </motion.div>

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

            {/* News Index Section (from Image 1) - At the end of the line */}
            <section className="mt-16 border-t-4 border-foreground pt-12">
              <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide pb-2">
                  <h2 className="text-2xl font-serif font-black tracking-tight shrink-0 uppercase mr-4">THE NEWS INDEX</h2>
                  <button onClick={() => setIndexTab('all')} className={`pb-2 text-[13px] font-bold uppercase whitespace-nowrap ${indexTab === 'all' ? 'text-foreground border-b-2 border-red-600' : 'text-muted-foreground hover:text-foreground'}`}>ALL</button>
                  <button onClick={() => setIndexTab('general')} className={`pb-2 text-[13px] font-bold uppercase whitespace-nowrap ${indexTab === 'general' ? 'text-foreground border-b-2 border-red-600' : 'text-muted-foreground hover:text-foreground'}`}>GENERAL</button>
                  <button onClick={() => setIndexTab('world')} className={`pb-2 text-[13px] font-bold uppercase whitespace-nowrap ${indexTab === 'world' ? 'text-foreground border-b-2 border-red-600' : 'text-muted-foreground hover:text-foreground'}`}>WORLD</button>
                  <button onClick={() => setIndexTab('politics')} className={`pb-2 text-[13px] font-bold uppercase whitespace-nowrap ${indexTab === 'politics' ? 'text-foreground border-b-2 border-red-600' : 'text-muted-foreground hover:text-foreground'}`}>POLITICS</button>
                  <button onClick={() => setIndexTab('business')} className={`pb-2 text-[13px] font-bold uppercase whitespace-nowrap ${indexTab === 'business' ? 'text-foreground border-b-2 border-red-600' : 'text-muted-foreground hover:text-foreground'}`}>BUSINESS</button>
                </div>
                <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 border border-border rounded shadow-sm bg-white cursor-pointer hover:bg-secondary transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground">6 Perspectives</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <aside className="w-full xl:w-[320px] xl:min-w-[320px] space-y-6 flex flex-col shrink-0 sticky top-20">
            <SectionErrorBoundary fallbackMessage="Could not load Trending">
              <TrendingTopicsWidget articles={allArticles} />
            </SectionErrorBoundary>
            <SectionErrorBoundary fallbackMessage="Could not load Reading Habits">
              <ReadingHabitWidget />
            </SectionErrorBoundary>
            <SectionErrorBoundary fallbackMessage="Could not load Stats">
              <CoverageStatsWidget articles={allArticles} />
            </SectionErrorBoundary>
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
