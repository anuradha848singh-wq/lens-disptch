import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TopBanner } from "@/components/TopBanner";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { StoryCard } from "@/components/StoryCard";
import { BiasChip } from "@/components/BiasBar";
import { Skeleton } from "@/components/ui/skeleton";
import { type ArticleWithDetails } from "@shared/schema";
import { Eye } from "lucide-react";

export default function BlindspotPage() {
  const { data: leftData, isLoading: loadingLeft } = useQuery({
    queryKey: ["/api/articles", { bias: "left", limit: 6 }],
    queryFn: () => api.articles.list({ bias: "left", limit: 6 }),
  });

  const { data: rightData, isLoading: loadingRight } = useQuery({
    queryKey: ["/api/articles", { bias: "right", limit: 6 }],
    queryFn: () => api.articles.list({ bias: "right", limit: 6 }),
  });

  const leftArticles = leftData?.articles ?? [];
  const rightArticles = rightData?.articles ?? [];

  return (
    <div className="min-h-screen bg-background">
      <TopBanner />
      <MainNav onSearch={() => {}} searchQuery="" />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-foreground text-background px-3 py-1.5 rounded-full text-sm font-semibold mb-4">
            <Eye className="w-4 h-4" />
            Blindspot Feed
          </div>
          <h1 className="text-3xl font-bold mb-3">Stories You Might Be Missing</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            The Blindspot identifies stories disproportionately covered by one side of the political spectrum.
            Left-leaning sources may not report on stories covered by right-leaning sources, and vice versa.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Blindspot */}
          <div>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b">
              <BiasChip bias="left" />
              <div>
                <h2 className="font-bold text-sm">Left Blindspot</h2>
                <p className="text-xs text-muted-foreground">Stories covered primarily by left-leaning sources</p>
              </div>
            </div>
            {loadingLeft ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-20 h-16 flex-shrink-0 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-card-border rounded-md p-4">
                {leftArticles.map((article: ArticleWithDetails) => (
                  <StoryCard key={article.id} article={article} variant="list" />
                ))}
                {leftArticles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No left-bias stories found</p>
                )}
              </div>
            )}
          </div>

          {/* Right Blindspot */}
          <div>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b">
              <BiasChip bias="right" />
              <div>
                <h2 className="font-bold text-sm">Right Blindspot</h2>
                <p className="text-xs text-muted-foreground">Stories covered primarily by right-leaning sources</p>
              </div>
            </div>
            {loadingRight ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-20 h-16 flex-shrink-0 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-card-border rounded-md p-4">
                {rightArticles.map((article: ArticleWithDetails) => (
                  <StoryCard key={article.id} article={article} variant="list" />
                ))}
                {rightArticles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No right-bias stories found</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center bg-card border border-card-border rounded-md p-8">
          <h3 className="text-lg font-bold mb-2">Get the Blindspot Report Newsletter</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Receive a weekly digest of stories being ignored by sources you trust.
          </p>
          <div className="flex gap-2 max-w-sm mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
              data-testid="input-blindspot-email"
            />
            <button
              className="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-md hover-elevate active-elevate-2"
              data-testid="button-blindspot-subscribe"
            >
              Subscribe
            </button>
          </div>
        </div>
      </main>

      <NewsFooter />
    </div>
  );
}
