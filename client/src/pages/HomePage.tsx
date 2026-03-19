import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MainNav } from "@/components/MainNav";
import { CategoryStrip } from "@/components/CategoryStrip";
import { BreakingTicker } from "@/components/BreakingTicker";
import { StoryCard } from "@/components/StoryCard";
import { NewsFooter } from "@/components/NewsFooter";
import { Skeleton } from "@/components/ui/skeleton";
import { type ArticleWithDetails } from "@shared/schema";
import { BiasBar } from "@/components/BiasBar";
import { TrendingUp, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

function SkeletonCard() {
  return (
    <div className="bg-card border border-card-border rounded overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>
  );
}

function TrendingPanel({ articles }: { articles: ArticleWithDetails[] }) {
  if (!articles.length) return null;
  return (
    <div className="bg-card border border-card-border rounded p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-xs font-black uppercase tracking-widest">Trending</h3>
      </div>
      <div className="space-y-3">
        {articles.slice(0, 6).map((a, i) => (
          <Link href={`/article/${a.id}`} key={a.id}>
            <div className="flex gap-2.5 cursor-pointer group">
              <span className="text-lg font-black text-muted-foreground/30 w-5 flex-shrink-0 leading-none mt-0.5">
                {i + 1}
              </span>
              <div>
                <p className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">{a.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{a.publisher?.name}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BiasFilterBar({ bias, onChange, total }: { bias: string | null; onChange: (b: string | null) => void; total: number }) {
  const filters = [
    { key: null, label: "All" },
    { key: "left", label: "Left" },
    { key: "center", label: "Center" },
    { key: "right", label: "Right" },
  ] as const;

  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Coverage:</span>
      <div className="flex items-center border border-border rounded overflow-hidden">
        {filters.map((f) => (
          <button
            key={String(f.key)}
            onClick={() => onChange(f.key)}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors border-r border-border last:border-r-0 ${
              bias === f.key
                ? f.key === "left" ? "bg-blue-500 text-white" : f.key === "center" ? "bg-violet-500 text-white" : f.key === "right" ? "bg-red-500 text-white" : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
            data-testid={`bias-filter-${f.key ?? "all"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{total} stories</span>
    </div>
  );
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [biasFilter, setBiasFilter] = useState<string | null>(null);

  const [emblaRef] = useEmblaCarousel({ loop: true, align: "start", dragFree: true }, [Autoplay({ delay: 5000, stopOnInteraction: true })]);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/articles", { category: categoryId, bias: biasFilter, search: searchQuery, limit: 40 }],
    queryFn: () => api.articles.list({
      limit: 40,
      ...(categoryId && { category: categoryId }),
      ...(biasFilter && { bias: biasFilter }),
      ...(searchQuery && { search: searchQuery }),
    }),
  });

  const { data: bookmarksData = [] } = useQuery({
    queryKey: ["/api/bookmarks"],
    queryFn: api.bookmarks.list,
    retry: false,
  });

  const bookmarkedIds = new Set((bookmarksData as ArticleWithDetails[]).map((a: ArticleWithDetails) => a.id));
  const articles: ArticleWithDetails[] = data?.articles ?? [];
  
  // Create the high-density partition
  const featured = articles[0];
  const sideList = articles.slice(1, 5);
  const slideWindow = articles.slice(5, 12);
  const denseGrid = articles.slice(12, 18);
  const tableRows = articles.slice(18, 30);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <BreakingTicker />
      <MainNav onSearch={setSearchQuery} searchQuery={searchQuery} />
      <CategoryStrip selectedCategoryId={categoryId} onSelect={(id) => setCategoryId(id)} />

      <div className="max-w-[1500px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8">

          {/* Main content */}
          <main className="min-w-0">
            <BiasFilterBar bias={biasFilter} onChange={setBiasFilter} total={data?.total ?? 0} />

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground bg-secondary/20 rounded-xl border border-border">
                <p className="text-xl font-bold">No stories match your filters</p>
                <button onClick={() => { setBiasFilter(null); setCategoryId(null); setSearchQuery(""); }} className="text-sm text-primary mt-3 hover:underline">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. Ultra Dense Hero Grid (1 Featured + 4 Side Lists) */}
                {featured && (
                  <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] gap-4">
                    <StoryCard article={featured} variant="featured" bookmarkedIds={bookmarkedIds} />
                    <div className="flex flex-col border border-border rounded-lg bg-card overflow-hidden">
                      <div className="bg-secondary/40 px-4 py-2.5 border-b border-border text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Top Coverage
                      </div>
                      <div className="flex flex-col flex-1">
                        {sideList.map((a) => (
                           <StoryCard key={a.id} article={a} variant="dense" bookmarkedIds={bookmarkedIds} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Sliding Window (Carousel) */}
                {slideWindow.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 py-1">
                      <h2 className="text-xs font-black uppercase tracking-widest text-foreground whitespace-nowrap">Trending Now</h2>
                      <div className="flex-1 h-px bg-border text-gradient-to-r" />
                    </div>
                    <div className="overflow-hidden" ref={emblaRef}>
                      <div className="flex gap-4">
                        {slideWindow.map((a) => (
                          <StoryCard key={a.id} article={a} variant="slide" bookmarkedIds={bookmarkedIds} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Denser Grid (Compact variants) */}
                {denseGrid.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 py-1">
                      <h2 className="text-xs font-black uppercase tracking-widest text-foreground whitespace-nowrap">For You</h2>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {denseGrid.map((a) => (
                        <div key={a.id} className="bg-card border border-border rounded p-3 hover:border-primary/50 transition-colors">
                          <StoryCard article={a} variant="compact" bookmarkedIds={bookmarkedIds} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Table Format (Ultra Dense) */}
                {tableRows.length > 0 && (
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center gap-3 py-1">
                      <h2 className="text-xs font-black uppercase tracking-widest text-foreground whitespace-nowrap">News Index</h2>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="border border-border rounded bg-card overflow-hidden overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-secondary/40 border-b border-border">
                          <tr>
                            <th className="py-2 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Story</th>
                            <th className="py-2 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Primary Source</th>
                            <th className="py-2 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-28">Bias</th>
                            <th className="py-2 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Coverage</th>
                            <th className="py-2 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right hidden sm:table-cell">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableRows.map((a) => (
                             <StoryCard key={a.id} article={a} variant="table-row" bookmarkedIds={bookmarkedIds} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="hidden xl:block space-y-4">
            {/* Overall bias stats */}
            {data && data.articles.length > 0 && (
              <div className="bg-card border border-card-border rounded p-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Coverage Overview</h3>
                <div className="space-y-2 mb-3">
                  {[
                    { label: "Total Stories", value: data.total },
                    { label: "Leaning Left", value: data.articles.filter((a: ArticleWithDetails) => a.bias === "left").length, color: "bias-left-text" },
                    { label: "Center", value: data.articles.filter((a: ArticleWithDetails) => a.bias === "center").length, color: "bias-center-text" },
                    { label: "Leaning Right", value: data.articles.filter((a: ArticleWithDetails) => a.bias === "right").length, color: "bias-right-text" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className={`font-bold ${row.color ?? ""}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <BiasBar
                  left={data.articles.filter((a: ArticleWithDetails) => a.bias === "left").length * 10}
                  center={data.articles.filter((a: ArticleWithDetails) => a.bias === "center").length * 10}
                  right={data.articles.filter((a: ArticleWithDetails) => a.bias === "right").length * 10}
                  size="md"
                />
              </div>
            )}

            <TrendingPanel articles={articles.slice(0, 6)} />

            {/* Publishers */}
            <PublishersSidebar />

            {/* Blindspot CTA */}
            <div className="bg-zinc-900 text-white rounded p-4">
              <div className="text-xs font-black uppercase tracking-widest mb-2 text-zinc-400">Blindspot</div>
              <p className="text-sm font-bold mb-2">Stories you might be missing</p>
              <p className="text-xs text-zinc-400 mb-3">
                See what the other side of the aisle is covering that your preferred sources aren't.
              </p>
              <Link href="/blindspot">
                <button className="w-full text-xs font-bold border border-zinc-600 rounded py-2 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1">
                  View Blindspot Feed <ChevronRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <NewsFooter />
    </div>
  );
}

function PublishersSidebar() {
  const { data: publishers = [] } = useQuery({
    queryKey: ["/api/publishers"],
    queryFn: api.publishers.list,
  });

  if (!publishers.length) return null;

  return (
    <div className="bg-card border border-card-border rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Publishers</h3>
        <Link href="/publishers">
          <span className="text-[10px] text-primary font-semibold cursor-pointer hover:underline">See all</span>
        </Link>
      </div>
      <div className="space-y-2">
        {publishers.slice(0, 5).map((pub: any) => (
          <div key={pub.id} className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-[9px] font-black text-muted-foreground flex-shrink-0">
              {pub.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-xs font-medium flex-1 truncate">{pub.name}</span>
            {pub.biasRating && (
              <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${
                pub.biasRating === "left" ? "bias-left-bg bias-left-text" :
                pub.biasRating === "right" ? "bias-right-bg bias-right-text" :
                "bias-center-bg bias-center-text"
              }`}>{pub.biasRating}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
