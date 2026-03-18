import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TopBanner } from "@/components/TopBanner";
import { MainNav } from "@/components/MainNav";
import { CategoryStrip } from "@/components/CategoryStrip";
import { BreakingTicker } from "@/components/BreakingTicker";
import { StoryCard } from "@/components/StoryCard";
import { CoveredMostBy, TrendingTopics, SuggestSourceWidget, BlindspotSignup } from "@/components/SidebarWidgets";
import { NewsFooter } from "@/components/NewsFooter";
import { Skeleton } from "@/components/ui/skeleton";
import { type ArticleWithDetails } from "@shared/schema";

function ArticleSkeleton() {
  return (
    <div className="border border-card-border rounded-md bg-card overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [biasFilter, setBiasFilter] = useState<"left" | "center" | "right" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/articles", { category: categoryId, bias: biasFilter, search: searchQuery, limit: 24 }],
    queryFn: () => api.articles.list({
      limit: 24,
      ...(categoryId && { category: categoryId }),
      ...(biasFilter && { bias: biasFilter }),
      ...(searchQuery && { search: searchQuery }),
    }),
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ["/api/bookmarks"],
    queryFn: api.bookmarks.list,
    retry: false,
  });

  const bookmarkedIds = new Set((bookmarks as ArticleWithDetails[]).map((a: ArticleWithDetails) => a.id));
  const articles: ArticleWithDetails[] = data?.articles ?? [];
  const featured = articles[0];
  const topStories = articles.slice(1, 5);
  const mainFeed = articles.slice(5);

  return (
    <div className="min-h-screen bg-background">
      <TopBanner />
      <BreakingTicker />
      <MainNav onSearch={setSearchQuery} searchQuery={searchQuery} />
      <CategoryStrip
        selectedCategoryId={categoryId}
        onSelect={(id) => setCategoryId(id)}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          <div>
            {/* Bias filter pills */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-muted-foreground font-medium">Bias:</span>
              {([null, "left", "center", "right"] as const).map((b) => (
                <button
                  key={String(b)}
                  onClick={() => setBiasFilter(b)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    biasFilter === b
                      ? b === "left"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : b === "center"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                        : b === "right"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        : "bg-secondary text-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground hover-elevate"
                  }`}
                  data-testid={`bias-filter-${b ?? "all"}`}
                >
                  {b === null ? "All" : b.charAt(0).toUpperCase() + b.slice(1)}
                </button>
              ))}
              {data && (
                <span className="ml-auto text-xs text-muted-foreground">{data.total} stories</span>
              )}
            </div>

            {/* Featured + Top 4 grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {[...Array(6)].map((_, i) => <ArticleSkeleton key={i} />)}
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-lg font-semibold">No stories found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {featured && (
                    <div className="md:col-span-2">
                      <StoryCard article={featured} variant="featured" bookmarkedIds={bookmarkedIds} />
                    </div>
                  )}
                  <div className="space-y-4">
                    {topStories.slice(0, 2).map((a) => (
                      <StoryCard key={a.id} article={a} variant="standard" bookmarkedIds={bookmarkedIds} />
                    ))}
                  </div>
                </div>

                {/* Main article grid */}
                {mainFeed.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-base font-bold">Latest Stories</h2>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {mainFeed.map((a) => (
                        <StoryCard key={a.id} article={a} variant="standard" bookmarkedIds={bookmarkedIds} />
                      ))}
                    </div>
                  </div>
                )}

                {/* List view of additional stories */}
                {topStories.slice(2).length > 0 && (
                  <div className="mt-8 bg-card border border-card-border rounded-md p-4">
                    <h3 className="text-sm font-bold mb-2">More Stories</h3>
                    {topStories.slice(2).map((a) => (
                      <StoryCard key={a.id} article={a} variant="list" bookmarkedIds={bookmarkedIds} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block space-y-4">
            <CoveredMostBy />
            <TrendingTopics />
            <BlindspotSignup />
            <SuggestSourceWidget />
          </aside>
        </div>
      </main>

      <NewsFooter />
    </div>
  );
}
