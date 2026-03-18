import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { BiasBar, BiasChip, PublisherAvatar, CoverageDetails } from "@/components/BiasBar";
import { StoryCard } from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Bookmark, BookmarkCheck, Share2, Eye, ExternalLink, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { type ArticleWithDetails } from "@shared/schema";

function getSourceCounts(bias: string) {
  if (bias === "left")   return { total: 47, left: 33, center: 9,  right: 5 };
  if (bias === "right")  return { total: 31, left: 4,  center: 8,  right: 19 };
  return                        { total: 24, left: 8,  center: 12, right: 4 };
}

function getBias(bias: string) {
  if (bias === "left")  return { left: 65, center: 25, right: 10 };
  if (bias === "right") return { left: 10, center: 25, right: 65 };
  return                       { left: 20, center: 60, right: 20 };
}

type SourceTab = "all" | "left" | "center" | "right";

export default function ArticleDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sourceTab, setSourceTab] = useState<SourceTab>("all");

  const { data: article, isLoading } = useQuery({
    queryKey: ["/api/articles", id],
    queryFn: () => api.articles.get(id!),
    enabled: !!id,
  });

  const { data: allData } = useQuery({
    queryKey: ["/api/articles", { limit: 20 }],
    queryFn: () => api.articles.list({ limit: 20 }),
  });

  const { data: bookmarksData = [] } = useQuery({
    queryKey: ["/api/bookmarks"],
    queryFn: api.bookmarks.list,
    retry: false,
  });

  const bookmarkedIds = new Set((bookmarksData as ArticleWithDetails[]).map((a: ArticleWithDetails) => a.id));
  const isBookmarked = id ? bookmarkedIds.has(id) : false;

  const bookmarkMutation = useMutation({
    mutationFn: () => isBookmarked ? api.bookmarks.remove(id!) : api.bookmarks.add(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      toast({ title: isBookmarked ? "Removed from bookmarks" : "Saved to bookmarks" });
    },
  });

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied!" });
    } catch { toast({ title: "Share", description: window.location.href }); }
  };

  // Related = all other articles (simulating multi-source story coverage)
  const related = (allData?.articles ?? []).filter((a) => a.id !== id);
  const sameBias = related.filter((a) => article && a.bias === article.bias);
  const filteredSources = sourceTab === "all" ? related : related.filter((a) => a.bias === sourceTab);
  const sources = getSourceCounts(article?.bias ?? "center");
  const biasNums = getBias(article?.bias ?? "center");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav onSearch={() => {}} searchQuery="" />
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <Skeleton className="h-5 w-24 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-80 w-full rounded" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-64 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav onSearch={() => {}} searchQuery="" />
        <div className="text-center py-20">
          <p className="text-xl font-bold">Article not found</p>
          <Button className="mt-4" onClick={() => setLocation("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav onSearch={() => {}} searchQuery="" />

      <div className="max-w-[1400px] mx-auto px-4 py-5">
        {/* Back button */}
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 font-medium"
          data-testid="button-back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

          {/* ── LEFT: Article content + source list ── */}
          <div>
            {/* Meta */}
            <div className="text-xs text-muted-foreground mb-2 flex flex-wrap items-center gap-2">
              {article.categories?.map((c) => (
                <span key={c.id} className="font-bold uppercase tracking-wider text-foreground">{c.name}</span>
              ))}
              {article.categories?.length > 0 && <span>·</span>}
              <span>
                {article.publishedAt
                  ? `${format(new Date(article.publishedAt), "EEEE, MMMM d, yyyy")} · Updated ${formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}`
                  : "Recently published"
                }
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold leading-tight mb-4" style={{ fontFamily: "Georgia, serif" }} data-testid="text-article-title">
              {article.title}
            </h1>

            {/* Action bar */}
            <div className="flex flex-wrap items-center gap-3 pb-4 mb-4 border-b">
              <div className="flex items-center gap-2">
                <BiasChip bias={article.bias} />
                <span className="text-xs text-muted-foreground">Bias Comparison</span>
              </div>
              <div className="flex-1" />
              {user && (
                <button
                  onClick={() => bookmarkMutation.mutate()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  data-testid="button-bookmark"
                >
                  {isBookmarked ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
                  {isBookmarked ? "Saved" : "Save"}
                </button>
              )}
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4" />Share
              </button>
              {article.viewCount !== undefined && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="w-3.5 h-3.5" />{article.viewCount}
                </span>
              )}
            </div>

            {/* GROUND AI Insights box */}
            <div className="border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 rounded p-3 mb-5 text-xs">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-[8px] font-black text-white">AI</span>
                </div>
                <span className="font-bold text-blue-700 dark:text-blue-400">Insights by Ground AI</span>
                <span className="ml-auto text-muted-foreground cursor-pointer hover:underline">Does this summary seem wrong?</span>
              </div>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex gap-2"><span className="text-blue-500 flex-shrink-0">•</span><span>{article.excerpt}</span></li>
                <li className="flex gap-2"><span className="text-blue-500 flex-shrink-0">•</span><span>This story is covered by sources across the political spectrum, with varying emphasis on different aspects.</span></li>
                <li className="flex gap-2"><span className="text-blue-500 flex-shrink-0">•</span><span>Ground News identifies this as a {article.bias}-leaning story based on source analysis.</span></li>
              </ul>
            </div>

            {/* Hero image */}
            {article.heroImageUrl && !article.heroImageUrl.includes("placeholder") && (
              <div className="mb-5 rounded overflow-hidden">
                <img src={article.heroImageUrl} alt={article.title} className="w-full max-h-[450px] object-cover" />
              </div>
            )}

            {/* Article body */}
            <div
              className="prose prose-sm dark:prose-invert max-w-none mb-8 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
              data-testid="article-content"
            />

            {/* Tags */}
            {article.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8 pt-4 border-t">
                {article.tags.map((tag) => (
                  <span key={tag.id} className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded font-medium">
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* ── SOURCE LIST (the key Ground News feature) ── */}
            <div className="border-t pt-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold">
                  {sources.total} Articles{" "}
                  <span className="text-sm font-normal text-muted-foreground">covering this story</span>
                </h2>
                <div className="flex items-center gap-2">
                  <button className="text-xs text-muted-foreground hover:text-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  <button className="text-xs text-muted-foreground hover:text-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Tabs: All / Left / Center / Right */}
              <div className="flex border-b border-border mb-4">
                {([
                  { key: "all",    label: `All`,    count: sources.total },
                  { key: "left",   label: `Left`,   count: sources.left   },
                  { key: "center", label: `Center`, count: sources.center },
                  { key: "right",  label: `Right`,  count: sources.right  },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSourceTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                      sourceTab === tab.key
                        ? tab.key === "left" ? "border-blue-500 text-blue-600" : tab.key === "center" ? "border-violet-500 text-violet-600" : tab.key === "right" ? "border-red-500 text-red-600" : "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`source-tab-${tab.key}`}
                  >
                    {tab.label}
                    <span className="text-[10px] bg-secondary rounded-full px-1.5">{tab.count}</span>
                  </button>
                ))}
              </div>

              {/* Primary article source */}
              <div className="border border-card-border rounded p-4 mb-3 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PublisherAvatar name={article.publisher?.name ?? "??"} size="xs" />
                    <span className="text-xs font-bold">{article.publisher?.name}</span>
                    {article.publisher?.biasRating && <BiasChip bias={article.publisher.biasRating} size="xs" />}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold px-1 rounded">Primary</span>
                    {article.publishedAt && <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 mb-2 text-[10px] text-muted-foreground">
                  <span>Ownership: <span className="font-semibold text-foreground">{article.publisher?.name}</span></span>
                  <span>·</span>
                  <span>Factuality: <span className="font-semibold text-blue-600">High</span></span>
                </div>
                <p className="text-sm font-bold line-clamp-2 mb-1">{article.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{article.excerpt}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="w-32">
                    <BiasBar {...getBias(article.bias)} size="xs" />
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    Read Full Article <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </span>
                </div>
              </div>

              {/* Other sources */}
              <div className="divide-y divide-border">
                {filteredSources.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No sources with this bias filter</p>
                ) : (
                  filteredSources.slice(0, 6).map((source) => (
                    <StoryCard key={source.id} article={source} variant="list" bookmarkedIds={bookmarkedIds} />
                  ))
                )}
              </div>

              {filteredSources.length > 6 && (
                <button className="w-full mt-4 py-2.5 text-xs font-semibold border border-border rounded hover:bg-secondary transition-colors">
                  More articles
                </button>
              )}
            </div>
          </div>

          {/* ── RIGHT: Coverage sidebar ── */}
          <aside className="space-y-4">
            {/* Coverage Details */}
            <CoverageDetails
              total={sources.total}
              left={sources.left}
              center={sources.center}
              right={sources.right}
            />

            {/* Publisher logos grid */}
            <div className="bg-card border border-card-border rounded p-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Sources Covering This</h3>
              <div className="flex flex-wrap gap-1.5">
                {(allData?.articles ?? []).slice(0, 12).map((a) => (
                  <div key={a.id} title={a.publisher?.name}>
                    <PublisherAvatar name={a.publisher?.name ?? "??"} size="sm" />
                  </div>
                ))}
                {sources.total > 12 && (
                  <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                    +{sources.total - 12}
                  </div>
                )}
              </div>
            </div>

            {/* Factuality (premium teaser) */}
            <div className="bg-card border border-card-border rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Factuality</h3>
                <Lock className="w-3 h-3 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                To view factuality data, please{" "}
                <span className="text-primary font-semibold cursor-pointer hover:underline">Upgrade to Premium</span>
              </p>
              <div className="h-8 bg-muted rounded blur-sm" />
            </div>

            {/* Ownership (premium teaser) */}
            <div className="bg-card border border-card-border rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ownership</h3>
                <Lock className="w-3 h-3 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                To view ownership data, please{" "}
                <span className="text-primary font-semibold cursor-pointer hover:underline">Upgrade to Premium</span>
              </p>
              <div className="h-8 bg-muted rounded blur-sm" />
            </div>

            {/* Similar News Topics */}
            <div className="bg-card border border-card-border rounded p-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Similar News Topics</h3>
              <div className="space-y-2">
                {(allData?.articles ?? []).slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${
                        a.bias === "left" ? "bg-blue-500" : a.bias === "right" ? "bg-red-500" : "bg-violet-500"
                      }`}>
                        {a.publisher?.name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold line-clamp-1">{a.categories?.[0]?.name ?? "News"}</p>
                        <p className="text-[10px] text-muted-foreground">{a.publisher?.name}</p>
                      </div>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground ml-2 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button className="w-full mt-3 py-2 text-xs font-semibold border border-border rounded hover:bg-secondary transition-colors">
                Show All
              </button>
            </div>
          </aside>
        </div>
      </div>

      <NewsFooter />
    </div>
  );
}
