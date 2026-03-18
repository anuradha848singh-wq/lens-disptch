import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TopBanner } from "@/components/TopBanner";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { BiasBar, BiasChip, BiasLabel } from "@/components/BiasBar";
import { StoryCard } from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";
import { ArrowLeft, Bookmark, BookmarkCheck, Share2, Eye, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { type ArticleWithDetails } from "@shared/schema";

function getBiasNumbers(bias: string) {
  if (bias === "left") return { left: 65, center: 25, right: 10 };
  if (bias === "right") return { left: 10, center: 25, right: 65 };
  return { left: 20, center: 60, right: 20 };
}

export default function ArticleDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: article, isLoading } = useQuery({
    queryKey: ["/api/articles", id],
    queryFn: () => api.articles.get(id!),
    enabled: !!id,
  });

  const { data: relatedData } = useQuery({
    queryKey: ["/api/articles", { limit: 3 }],
    queryFn: () => api.articles.list({ limit: 6 }),
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ["/api/bookmarks"],
    queryFn: api.bookmarks.list,
    retry: false,
  });

  const bookmarkedIds = new Set((bookmarks as ArticleWithDetails[]).map((a: ArticleWithDetails) => a.id));
  const isBookmarked = id ? bookmarkedIds.has(id) : false;

  const bookmarkMutation = useMutation({
    mutationFn: () => isBookmarked
      ? api.bookmarks.remove(id!)
      : api.bookmarks.add(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      toast({ title: isBookmarked ? "Removed from bookmarks" : "Saved to bookmarks" });
    },
  });

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied to clipboard" });
    } catch {
      toast({ title: "Share", description: window.location.href });
    }
  };

  const related = (relatedData?.articles ?? []).filter((a) => a.id !== id).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <TopBanner />
      <MainNav onSearch={() => {}} searchQuery="" />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 hover-elevate active-elevate-2 p-1 rounded-md -ml-1"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to feed
        </button>

        {isLoading ? (
          <div className="max-w-4xl mx-auto space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-72 w-full rounded-md" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : !article ? (
          <div className="text-center py-16">
            <p className="text-xl font-bold">Article not found</p>
            <Button className="mt-4" onClick={() => setLocation("/")}>Go Home</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            <article>
              {/* Article header */}
              <div className="mb-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <BiasChip bias={article.bias} />
                  {article.categories?.map((c) => (
                    <span key={c.id} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md">
                      {c.name}
                    </span>
                  ))}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4" data-testid="text-article-title">
                  {article.title}
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed mb-4">{article.excerpt}</p>

                {/* Meta bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                        {article.publisher?.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{article.publisher?.name}</p>
                        {article.publisher?.website && (
                          <a
                            href={article.publisher.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                          >
                            {article.publisher.website.replace(/https?:\/\//, "")}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">{article.author?.displayName}</p>
                      {article.publishedAt && (
                        <p className="text-xs">
                          {format(new Date(article.publishedAt), "MMM d, yyyy")}
                          {" · "}
                          {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {article.viewCount !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{article.viewCount} views</span>
                      </div>
                    )}
                    {user && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => bookmarkMutation.mutate()}
                        className="h-8"
                        data-testid="button-bookmark"
                      >
                        {isBookmarked
                          ? <><BookmarkCheck className="w-3.5 h-3.5 mr-1.5 text-primary" />Saved</>
                          : <><Bookmark className="w-3.5 h-3.5 mr-1.5" />Save</>}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShare}
                      className="h-8"
                      data-testid="button-share"
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1.5" />Share
                    </Button>
                  </div>
                </div>
              </div>

              {/* Hero image */}
              {article.heroImageUrl && article.heroImageUrl !== "/api/placeholder/1200/600" && (
                <div className="mb-6 rounded-md overflow-hidden">
                  <img
                    src={article.heroImageUrl}
                    alt={article.title}
                    className="w-full max-h-[500px] object-cover"
                  />
                </div>
              )}

              {/* Article body */}
              <div
                className="prose prose-base dark:prose-invert max-w-none mb-8 prose-headings:font-bold prose-p:text-foreground/90 prose-p:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
                data-testid="article-content"
              />

              {/* Tags */}
              {article.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6 pt-4 border-t">
                  <span className="text-sm font-medium text-muted-foreground mr-2">Tags:</span>
                  {article.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-2.5 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-md"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </article>

            {/* Sidebar */}
            <aside className="space-y-4">
              {/* Bias breakdown */}
              <div className="bg-card border border-card-border rounded-md p-4">
                <h3 className="text-sm font-bold mb-3">Political Bias Breakdown</h3>
                <BiasBar
                  {...getBiasNumbers(article.bias)}
                  showLabels
                  showPercentages
                  size="lg"
                />
                <p className="text-xs text-muted-foreground mt-3">
                  Based on the publication's editorial position. Left = liberal, Center = centrist, Right = conservative.
                </p>
              </div>

              {/* Publisher info */}
              <div className="bg-card border border-card-border rounded-md p-4">
                <h3 className="text-sm font-bold mb-3">Source</h3>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center font-bold text-muted-foreground flex-shrink-0">
                    {article.publisher?.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{article.publisher?.name}</p>
                    {article.publisher?.description && (
                      <p className="text-xs text-muted-foreground mt-1">{article.publisher.description}</p>
                    )}
                    {article.publisher?.biasRating && (
                      <div className="mt-1.5">
                        <BiasChip bias={article.publisher.biasRating} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Related articles */}
        {related.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-lg font-bold">More Stories</h2>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map((a) => (
                <StoryCard key={a.id} article={a} variant="standard" />
              ))}
            </div>
          </div>
        )}
      </main>

      <NewsFooter />
    </div>
  );
}
