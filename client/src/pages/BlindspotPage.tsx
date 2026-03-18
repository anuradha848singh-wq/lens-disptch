import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { StoryCard } from "@/components/StoryCard";
import { BiasChip } from "@/components/BiasBar";
import { Skeleton } from "@/components/ui/skeleton";
import { type ArticleWithDetails } from "@shared/schema";
import { Eye, AlertCircle } from "lucide-react";

function SkeletonCard() {
  return (
    <div className="bg-card border border-card-border rounded overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function BlindspotPage() {
  const { data: leftData, isLoading: loadingLeft } = useQuery({
    queryKey: ["/api/articles", { bias: "left", limit: 6 }],
    queryFn: () => api.articles.list({ bias: "left", limit: 6 }),
  });
  const { data: rightData, isLoading: loadingRight } = useQuery({
    queryKey: ["/api/articles", { bias: "right", limit: 6 }],
    queryFn: () => api.articles.list({ bias: "right", limit: 6 }),
  });

  const leftArticles: ArticleWithDetails[] = leftData?.articles ?? [];
  const rightArticles: ArticleWithDetails[] = rightData?.articles ?? [];

  return (
    <div className="min-h-screen bg-background">
      <MainNav onSearch={() => {}} searchQuery="" />

      <div className="max-w-[1400px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
              <Eye className="w-4 h-4 text-white dark:text-zinc-900" />
            </div>
            <h1 className="text-2xl font-bold">Blindspot</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            The Blindspot identifies stories that are disproportionately covered by one side of the political spectrum.
            These are stories that left-leaning sources may be missing from right-leaning coverage, and vice versa —
            helping you see what you might be missing based on your media diet.
          </p>
        </div>

        {/* Info banner */}
        <div className="border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 rounded p-3 mb-6 flex gap-3 items-start">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            <span className="font-bold">Note:</span> Stories in this demo are seeded with sample data. In a fully deployed version,
            real blindspot detection uses clustering algorithms to find stories covered predominantly by one political side.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Blindspot */}
          <div>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b">
              <BiasChip bias="left" />
              <div>
                <h2 className="text-sm font-bold">Left Blindspot</h2>
                <p className="text-xs text-muted-foreground">Stories mostly covered by left-leaning sources</p>
              </div>
              <span className="ml-auto text-xs font-bold text-muted-foreground">
                {leftArticles.length} stories
              </span>
            </div>
            {loadingLeft ? (
              <div className="grid grid-cols-1 gap-4">
                {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : leftArticles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No left-leaning stories found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {leftArticles.map((a) => (
                  <StoryCard key={a.id} article={a} variant="standard" />
                ))}
              </div>
            )}
          </div>

          {/* Right Blindspot */}
          <div>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b">
              <BiasChip bias="right" />
              <div>
                <h2 className="text-sm font-bold">Right Blindspot</h2>
                <p className="text-xs text-muted-foreground">Stories mostly covered by right-leaning sources</p>
              </div>
              <span className="ml-auto text-xs font-bold text-muted-foreground">
                {rightArticles.length} stories
              </span>
            </div>
            {loadingRight ? (
              <div className="grid grid-cols-1 gap-4">
                {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : rightArticles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No right-leaning stories found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {rightArticles.map((a) => (
                  <StoryCard key={a.id} article={a} variant="standard" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <NewsFooter />
    </div>
  );
}
