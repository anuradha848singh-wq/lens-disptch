import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MainNav } from "@/components/MainNav";
import { BreakingTicker } from "@/components/BreakingTicker";
import { StoryCard } from "@/components/StoryCard";
import { NewsFooter } from "@/components/NewsFooter";
import { Skeleton } from "@/components/ui/skeleton";
import { type ArticleWithDetails, type Category } from "@shared/schema";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { EditorialHero } from "@/components/EditorialHero";
import { BlindspotFeed } from "@/components/BlindspotFeed";
import { BiasSpectrumStrip } from "@/components/BiasSpectrumStrip";
import { ReadingHabitWidget, CoverageStatsWidget, PolarizingWidget } from "@/components/SidebarWidgets";
import { TopicHeatCalendar } from "@/components/TopicHeatCalendar";
import { DailyBriefingSidebar } from "@/components/DailyBriefingSidebar";
import { ChevronRight, Filter } from "lucide-react";

type ArticleWithMetadata = ArticleWithDetails & {
  category?: string;
  leftCount?: number;
  centerCount?: number;
  rightCount?: number;
};

function SkeletonCard() {
  return (
    <div className="bg-white border border-border p-4 space-y-3">
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

  // 1. Fetching all clusters for the homepage
  const { data, isLoading } = useQuery({
    queryKey: ["/api/homepage", { search: searchQuery }],
    queryFn: () => api.articles.homepage(200),
  });

  const allArticles = (data || []) as ArticleWithMetadata[];

  // 2. Fetching categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: api.categories.list,
  });

  // 3. Derived Slices
  const heroArticles = useMemo(() => allArticles.slice(0, 3), [allArticles]);
  const secondaryArticles = useMemo(() => allArticles.slice(3, 10), [allArticles]);
  const blindspotArticles = useMemo(() => allArticles, [allArticles]);

  const categoryArticles = useMemo(() => {
    if (!selectedCategoryId) return allArticles.slice(10, 22);
    const cat = categories.find(c => c.id === selectedCategoryId);
    if (!cat) return allArticles.slice(10, 22);
    return allArticles.filter(a => a.category === cat.slug).slice(0, 12);
  }, [allArticles, selectedCategoryId, categories]);

  const indexArticles = useMemo(() => allArticles.slice(22, 60), [allArticles]);

  const bookmarkedIds = new Set(); // Use actual bookmark logic if needed

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F6F1]">
        <BreakingTicker />
        <MainNav onSearch={setSearchQuery} />
        <div className="max-w-[1500px] mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1] text-foreground selection:bg-accent-editorial/20">
      <BreakingTicker />
      <MainNav onSearch={setSearchQuery} searchQuery={searchQuery} />

      <div className="max-w-[1536px] mx-auto px-4 py-8">
        <div className="flex flex-col xl:grid xl:grid-cols-[280px_1fr_320px] gap-8 lg:gap-10">

          {/* LEFT SIDEBAR (Daily Briefing) */}
          <aside className="hidden xl:block w-full">
            <DailyBriefingSidebar articles={allArticles.slice(0, 9)} />
          </aside>

          {/* MAIN COLUMN (CENTER) */}
          <main className="min-w-0">

            {/* Phase 1: Editorial Hero Zone */}
            <EditorialHero articles={heroArticles} bookmarkedIds={bookmarkedIds as any} />

            {/* Phase 2: Bias Spectrum Strip */}
            <BiasSpectrumStrip articles={allArticles} />

            {/* Phase 3: Secondary Feed (Category Tabs) */}
            <section className="mb-12">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 pb-2 border-b-2 border-primary">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-display font-black uppercase tracking-tight">Main Feed</h2>
                  <div className="h-6 w-px bg-border hidden md:block" />
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 no-scrollbar">
                    <button
                      onClick={() => setSelectedCategoryId(null)}
                      className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all rounded ${!selectedCategoryId ? 'bg-foreground text-background' : 'hover:bg-secondary text-muted-foreground'}`}
                    >
                      Latest
                    </button>
                    {categories.slice(0, 6).map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all rounded whitespace-nowrap ${selectedCategoryId === cat.id ? 'bg-accent-editorial text-white' : 'hover:bg-secondary text-muted-foreground'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground">
                  <Filter className="w-3 h-3" /> Filters
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryArticles.map(a => (
                  <StoryCard key={a.id} article={a} variant="standard" />
                ))}
              </div>
            </section>

            {/* Phase 5: The Daily News Index (Premium Rows) */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-display font-black uppercase tracking-tight">The News Index</h2>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{indexArticles.length} Stories Today</span>
              </div>
              <div className="bg-white border border-border shadow-sm rounded-sm overflow-hidden divide-y divide-border/30">
                {indexArticles.map(a => (
                  <StoryCard key={a.id} article={a} variant="newspaper-row" />
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <button className="px-8 py-3 border-2 border-foreground text-[12px] font-black uppercase tracking-[.2em] hover:bg-foreground hover:text-background transition-all">
                  Load More From Archive
                </button>
              </div>
            </section>

          </main>

          {/* SIDEBAR (RIGHT) */}
          <aside className="w-full space-y-8">

            {/* Widget: Blindspot Feed */}
            <BlindspotFeed articles={blindspotArticles} />

            {/* Widget 1: Personal Lean */}
            <ReadingHabitWidget />

            {/* Widget 2: Coverage Stats */}
            <CoverageStatsWidget articles={allArticles} />

            {/* Widget 3: Most Polarizing */}
            <PolarizingWidget articles={allArticles} />

            {/* Native Components Integration */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest">Trending Topics</h3>
              </div>
              <TopicHeatCalendar categorySlug="all" />
            </div>

            <div className="sticky top-24">
              {/* Newsletter CTA Style */}
              <div className="bg-white border border-border p-6 shadow-sm overflow-hidden relative">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent-editorial/5 rounded-full" />
                <h4 className="font-display text-xl font-bold leading-tight mb-4">The Balanced Brief.</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Join 45,000+ readers who get our daily bias-balanced intelligence report directly in their inbox.
                </p>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="Email address"
                    className="w-full h-10 px-4 text-xs border border-border bg-secondary/10 rounded-sm focus:outline-none focus:ring-1 focus:ring-accent-editorial"
                  />
                  <button className="w-full py-3 bg-accent-editorial text-white text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-all rounded-sm">
                    Join The Dispatch
                  </button>
                </div>
              </div>
            </div>

          </aside>
        </div>
      </div>

      <NewsFooter />
    </div>
  );
}
