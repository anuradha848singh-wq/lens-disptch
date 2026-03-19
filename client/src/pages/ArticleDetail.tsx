import { useState, useEffect } from "react";
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
import { ArrowLeft, Bookmark, BookmarkCheck, Share2, Eye, ExternalLink, Lock, BookOpen, X, Sparkles, CheckCircle2, Scale } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { type ArticleWithDetails, type Category } from "@shared/schema";
import { useMemo } from "react";
import AutoPlay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";

// Source counts and bias are now computed dynamically from the /api/sources endpoint

type SourceTab = "all" | "left" | "center" | "right";

function getSummaryPoints(article: ArticleWithDetails, sourcesTotal: number, dominantBias: string) {
  const points = [
    article.excerpt,
    `This story is being reported by ${sourcesTotal} different news organizations across the political spectrum.`,
    `The dominant coverage of this topic is currently ${dominantBias}.`,
    `Sources are being updated in real-time as new reports are published.`,
  ];
  return points;
}

function NarrativeShift({ history }: { history: any[] }) {
  if (!history || history.length < 2) return null;

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 overflow-hidden relative group">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
          Narrative Shift
          <Sparkles className="w-3 h-3 fill-primary text-primary" />
        </h3>
        <span className="text-[9px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">48h Timeline</span>
      </div>
      
      <div className="relative h-24 flex items-end gap-1 px-1">
        {history.map((snapshot, i) => {
          const total = snapshot.left + snapshot.center + snapshot.right || 1;
          const lHeight = (snapshot.left / total) * 100;
          const cHeight = (snapshot.center / total) * 100;
          const rHeight = (snapshot.right / total) * 100;
          
          return (
            <div key={i} className="flex-1 flex flex-col h-full justify-end group/col relative">
              <div className="w-full bg-red-500/80 transition-all duration-500" style={{ height: `${rHeight}%` }} />
              <div className="w-full bg-zinc-400 dark:bg-zinc-600 transition-all duration-500" style={{ height: `${cHeight}%` }} />
              <div className="w-full bg-blue-500/80 transition-all duration-500" style={{ height: `${lHeight}%` }} />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/col:opacity-100 transition-opacity whitespace-nowrap z-20">
                 <span className="text-[8px] bg-popover border px-1 rounded shadow-sm">
                   {format(new Date(snapshot.timestamp), "HH:mm")}
                 </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between mt-2 text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
        <span>Start</span>
        <span>Today</span>
      </div>
      
      <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed italic">
        This timeline tracks how the balance of coverage has shifted as more publishers joined the story. 
      </p>
    </div>
  );
}

export default function ArticleDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sourceTab, setSourceTab] = useState<SourceTab>("all");
  const [visibleCount, setVisibleCount] = useState(8);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [hasTriggeredScrape, setHasTriggeredScrape] = useState(false);

  const { data: article, isLoading } = useQuery({
    queryKey: ["/api/articles", id],
    queryFn: () => api.articles.get(id!),
    enabled: !!id,
  });

  // Auto-trigger reader mode if it's explicitly a "full article" request 
  // or if content already exists
  useEffect(() => {
    if (article?.fullContent) {
      setIsReaderMode(true);
    }
  }, [article?.fullContent]);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  const { data: relatedData } = useQuery<ArticleWithDetails[]>({
    queryKey: ["/api/articles", id, "related"],
    queryFn: () => (api.articles as any).related(id!),
    enabled: !!id,
  });

  // NEW: Topic-based source discovery (the Ground News killer feature)
  const { data: sourceDiscovery, isLoading: isDiscoveringSources } = useQuery<any>({
    queryKey: ["/api/sources", id],
    queryFn: () => (api.articles as any).discoverSources(id!),
    enabled: !!id,
  });

  const { data: allData } = useQuery<ArticleWithDetails[]>({
    queryKey: ["/api/articles/trending"],
    queryFn: () => api.articles.trending(10),
  });

  const { data: fullContentData, isLoading: isScraping, isError: scrapeError } = useQuery<{ fullContent: string }>({
    queryKey: ["/api/articles", id, "full-content"],
    queryFn: () => api.articles.getFullContent(id!),
    enabled: !!id && isReaderMode && (!article?.fullContent),
  });

  const fullArticleHtml = article?.fullContent || fullContentData?.fullContent;

  // NEW: Category Nearby Sections
  const { data: categoryDataResult } = useQuery<{ articles: ArticleWithDetails[]; total: number }>({
    queryKey: ["/api/articles/category", article?.categories?.[0]?.id],
    queryFn: () => (api.articles as any).listByCategory(article!.categories[0].id, 6),
    enabled: !!article?.categories?.[0]?.id,
  });

  // NEW: More from this Publisher
  const { data: publisherDataResult } = useQuery<{ articles: ArticleWithDetails[]; total: number }>({
    queryKey: ["/api/articles/publisher", article?.publisherId],
    queryFn: () => (api.articles as any).listByPublisher(article!.publisherId, 6),
    enabled: !!article?.publisherId,
  });

  // NEW: Blindspot fetching
  const { data: blindspotDataResult } = useQuery<{ leftBlindspot: ArticleWithDetails[]; rightBlindspot: ArticleWithDetails[] }>({
    queryKey: ["/api/blindspot"],
    queryFn: api.blindspot as any,
  });

  const { data: bookmarksData = [] } = useQuery<ArticleWithDetails[]>({
    queryKey: ["/api/bookmarks"],
    queryFn: api.bookmarks.list as any,
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
      if (id) api.articles.share(id, "copy").catch(() => {});
      toast({ title: "Link copied!" });
    } catch { toast({ title: "Share", description: window.location.href }); }
  };

  // ── Source Discovery: use topic-based search results ──
  const discoveredSources = sourceDiscovery?.sources || [];
  const actualRelated = relatedData || [];
  
  // Filter discovered sources based on tab
  const filteredSources = sourceTab === "all" 
    ? discoveredSources 
    : discoveredSources.filter((s: any) => s.bias_label?.toLowerCase() === sourceTab);
  
  // Dynamic source counts from the discovery API
  const sources: { total: number; left: number; center: number; right: number } = {
    total: sourceDiscovery?.total_sources || (article ? 1 + actualRelated.length : 0),
    left: sourceDiscovery?.bias_distribution?.left_count || 0,
    center: sourceDiscovery?.bias_distribution?.center_count || 0,
    right: sourceDiscovery?.bias_distribution?.right_count || 0,
  };
  
  const biasNums = {
    left: sourceDiscovery?.bias_distribution?.left_percent || 0,
    center: sourceDiscovery?.bias_distribution?.center_percent || 0,
    right: sourceDiscovery?.bias_distribution?.right_percent || 0,
  };
  
  // NEW: Refined source and bias extraction for the UI
  const allSources: { 
    id: string; 
    sourceName: string; 
    url: string; 
    bias: string;
    title: string;
    factuality: string;
    publishedAt: string;
  }[] = useMemo(() => {
    const discovered = sourceDiscovery?.sources || [];
    if (discovered.length > 0) {
      return discovered.map((s: any) => ({
        id: s.id || s.publisher_id || Math.random().toString(),
        sourceName: s.source_name || s.name || "Unknown",
        url: s.url || s.website || "#",
        bias: s.bias_label?.toLowerCase() || s.bias || "center",
        title: s.title || "Latest Update",
        factuality: s.factuality_label?.toLowerCase() || s.factuality || "high",
        publishedAt: s.published_at || new Date().toISOString(),
      }));
    }
    
    // Fallback to related articles
    const localSources = article ? [article, ...actualRelated] : actualRelated;
    return localSources.map(a => ({
      id: a.id,
      sourceName: a.publisher?.name || "Unknown",
      url: a.sourceUrl || "#",
      bias: a.bias || "center",
      title: a.title,
      factuality: a.publisher?.factualityRating || "high",
      publishedAt: (a.publishedAt || a.createdAt).toISOString(),
    }));
  }, [sourceDiscovery, article, actualRelated]);

  const biasStats = useMemo(() => {
    if (sourceDiscovery?.bias_distribution) {
      return {
        left: sourceDiscovery.bias_distribution.left_count || 0,
        center: sourceDiscovery.bias_distribution.center_count || 0,
        right: sourceDiscovery.bias_distribution.right_count || 0,
      };
    }
    
    // Calculate from current sources
    return allSources.reduce((acc: any, s: any) => {
      if (s.bias === "left") acc.left++;
      else if (s.bias === "right") acc.right++;
      else acc.center++;
      return acc;
    }, { left: 0, center: 0, right: 0 });
  }, [sourceDiscovery, allSources]);

  const allStoryArticles = allSources;

  const readingTime = useMemo(() => {
    if (!article) return 0;
    const words = (article.bodyHtml || "").split(/\s+/).length + (article.excerpt || "").split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [article]);

  const [emblaRef] = useEmblaCarousel({ loop: true, align: "start" }, [AutoPlay({ delay: 4000 })]);

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
      
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[100] bg-zinc-200 dark:bg-zinc-800">
        <div 
          className="h-full bg-primary transition-all duration-75 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

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
            <div className="text-[11px] text-muted-foreground mb-4 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">Published {formatDistanceToNow(new Date(article.publishedAt || Date.now()), { addSuffix: true })}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {Math.floor(Math.random() * 500) + 100} reading now</span>
              <span>·</span>
              <span>{readingTime} min read</span>
              <span>·</span>
              <span className="text-green-600 font-bold flex items-center gap-1"><div className="w-1 h-1 bg-green-600 rounded-full animate-pulse" /> Auto-fetching sources</span>
              <div className="flex-1" />
              <div className="flex items-center gap-3">
                <button className="hover:text-foreground" title="Share Article"><Share2 className="w-4 h-4" onClick={handleShare} /></button>
                {user && (
                 <button className="hover:text-foreground" onClick={() => bookmarkMutation.mutate()} title="Bookmark">
                   {isBookmarked ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
                 </button>
                )}
                <button onClick={() => window.open(article.sourceUrl || article.slug, "_blank")} title="View Original" className="hover:text-foreground">
                  <ExternalLink className="w-4 h-4 cursor-pointer" />
                </button>
              </div>
            </div>

            {/* NEW: Reader Mode Toggle / Premium Indicator */}
            <div className="mb-6 flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-1.5">
                    Ground Reader Mode <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Read the full story without ads or trackers, extracted by our AI.</p>
                </div>
              </div>
              <Button 
                onClick={() => setIsReaderMode(!isReaderMode)}
                variant={isReaderMode ? "outline" : "default"}
                size="sm"
                className="font-bold text-xs uppercase tracking-widest px-6"
              >
                {isReaderMode ? "Exit Reader" : "Enter Reader"}
              </Button>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold leading-tight mb-4" style={{ fontFamily: "Georgia, serif" }} data-testid="text-article-title">
              {article.title}
            </h1>

            {/* Action bar (Left Center Right toggles) */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex bg-secondary/30 rounded-lg p-1 border border-border/50">
                {(["left", "center", "right"] as const).map((bias) => (
                  <button
                    key={bias}
                    onClick={() => setSourceTab(bias)}
                    className={`px-6 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${
                      sourceTab === bias
                        ? bias === "left" ? "bg-blue-600 text-white shadow-md" : bias === "center" ? "bg-violet-600 text-white shadow-md" : "bg-red-600 text-white shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {bias}
                  </button>
                ))}
                <button
                   onClick={() => setSourceTab("all")}
                   className={`px-6 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${
                     sourceTab === "all" ? "bg-zinc-800 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900" : "text-muted-foreground hover:text-foreground"
                   }`}
                >
                  All
                </button>
              </div>
              <button className="px-5 py-2 text-[11px] font-bold uppercase tracking-wider bg-secondary border border-border/50 hover:bg-secondary/70 rounded-lg flex items-center gap-2 transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                Bias Comparison
              </button>
            </div>

            {/* Article Content / Reader Mode Display */}
            <div className="relative mb-12">
              {isReaderMode ? (
                <div className="bg-card border border-primary/20 rounded-2xl p-8 md:p-12 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="max-w-2xl mx-auto">
                    {isScraping ? (
                      <div className="space-y-4">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/6" />
                        <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
                          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                          <p className="text-sm font-medium text-muted-foreground mt-4">Ground AI is extracting content from <br/><span className="text-foreground font-bold">{article.publisher?.name}</span>...</p>
                        </div>
                      </div>
                    ) : scrapeError ? (
                      <div className="py-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <X className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold">Extraction Failed</h3>
                        <p className="text-sm text-muted-foreground">We couldn't extract the full content from this source. You can still read the original article.</p>
                        <Button variant="outline" onClick={() => window.open(article.sourceUrl || article.slug, "_blank")} className="mt-4">
                           View at {article.publisher?.name} <ExternalLink className="w-3.5 h-3.5 ml-2" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="prose prose-zinc dark:prose-invert max-w-none prose-p:text-[17px] prose-p:leading-[1.7] prose-headings:font-serif"
                        dangerouslySetInnerHTML={{ __html: fullArticleHtml || "" }}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center font-bold" style={{ fontSize: "8px" }}>i</span>
                      Insights by <span className="text-foreground font-bold">NewsPlatform AI</span>
                    </span>
                    <span className="cursor-pointer hover:underline flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Does this summary seem wrong?
                    </span>
                  </div>
                  <ul className="space-y-4 text-[15px] leading-relaxed pl-5 list-disc text-foreground/90 font-medium marker:text-primary">
                    {article.aiInsights && article.aiInsights.length > 0 ? (
                      (article.aiInsights as string[]).map((point, i) => (
                         <li key={i} className="animate-in fade-in slide-in-from-left-2 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                          {point}
                        </li>
                      ))
                    ) : (
                      getSummaryPoints(
                        article,
                        sources.total,
                        sources.left > sources.right && sources.left > sources.center ? "Left-leaning" : 
                        sources.right > sources.left && sources.right > sources.center ? "Right-leaning" : "Centrist"
                      ).map((point, i) => (
                        <li key={i}>{point}</li>
                      ))
                    )}
                  </ul>
                  <div className="mt-8 p-6 bg-secondary/20 rounded-xl border border-border/50 text-center">
                    <p className="text-sm text-muted-foreground mb-4">Click below to read the full story within our premium reader.</p>
                    <a href={article.sourceUrl || "#"} target="_blank" rel="noopener noreferrer">
                      <Button className="font-bold">Read Full Article on Source</Button>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* ── SOURCE LIST (the key Ground News feature) ── */}
            <div className="border-t pt-6">
              <div className="flex items-center gap-8 mb-6">
                <h2 className="text-[22px] font-bold">{sources.total} Articles</h2>
                
                {/* Tabs: All / Left / Center / Right */}
                <div className="flex items-center gap-6">
                  {([
                    { key: "all",    label: `All`,    count: null },
                    { key: "left",   label: `Left`,   count: sources.left   },
                    { key: "center", label: `Center`, count: sources.center },
                    { key: "right",  label: `Right`,  count: sources.right  },
                  ] as const).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setSourceTab(tab.key)}
                      className={`flex items-center gap-1.5 text-[13px] pb-1 border-b-[3px] transition-colors ${
                        sourceTab === tab.key
                          ? tab.key === "left" ? "border-blue-500 font-bold" : tab.key === "center" ? "border-violet-500 font-bold" : tab.key === "right" ? "border-red-500 font-bold" : "border-foreground font-bold"
                          : "border-transparent text-muted-foreground hover:text-foreground font-medium"
                      }`}
                      data-testid={`source-tab-${tab.key}`}
                    >
                      {tab.label}
                      {tab.count !== null && <span className="text-[9px] bg-secondary text-muted-foreground font-bold rounded-full px-1.5 py-0.5">{tab.count}</span>}
                    </button>
                  ))}
                </div>
                
                <div className="flex-1" />
                <div className="flex items-center gap-3">
                  <button className="text-muted-foreground hover:text-foreground"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                  <button className="text-muted-foreground hover:text-foreground"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                </div>
              </div>

              {/* Primary article source */}
              <div className="border border-card-border rounded p-4 mb-3 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PublisherAvatar name={article.publisher?.name ?? "??"} size="xs" />
                    <span className="text-xs font-bold">{article.publisher?.name}</span>
                    {article.publisher?.biasRating && <BiasChip bias={article.publisher.biasRating} size="xs" />}
      {/* Ground AI Insight Engine Section */}
      <section id="ai-insights" className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ground AI Insights</h2>
            <p className="text-sm text-gray-500">Synthesized perspectives from {allSources.length} global sources</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
          <div className="p-8">
            <div className="space-y-4">
              {(article.aiInsights as string[] || []).map((insight, idx) => (
                <div key={idx} className="flex gap-4 group">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 group-hover:scale-150 transition-transform" />
                  <p className="text-gray-700 leading-relaxed text-lg">{insight}</p>
                </div>
              ))}
              {(!article.aiInsights || (article.aiInsights as string[]).length === 0) && (
                <p className="text-gray-500 italic">Waiting for more sources to synthesize insights...</p>
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-purple-100 flex items-center justify-between text-sm text-purple-600 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Balanced Perspective Engine Active
              </span>
              <button className="hover:underline">How this works?</button>
            </div>
          </div>
        </div>
      </section>

      {/* Coverage Distribution */}
      <section className="mb-16">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Scale className="w-5 h-5 text-blue-600" />
          Media Bias Distribution
        </h3>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex h-4 w-full rounded-full overflow-hidden bg-gray-100 mb-6">
            <div 
              style={{ width: `${(biasStats.left / allSources.length) * 100}%` }} 
              className="bg-blue-500 transition-all duration-1000"
              title={`Left: ${biasStats.left}`}
            />
            <div 
              style={{ width: `${(biasStats.center / allSources.length) * 100}%` }} 
              className="bg-gray-400 transition-all duration-1000"
              title={`Center: ${biasStats.center}`}
            />
            <div 
              style={{ width: `${(biasStats.right / allSources.length) * 100}%` }} 
              className="bg-red-500 transition-all duration-1000"
              title={`Right: ${biasStats.right}`}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{Math.round((biasStats.left / allSources.length) * 100)}%</div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Left</div>
            </div>
            <div className="text-center border-x border-gray-100">
              <div className="text-2xl font-bold text-gray-600">{Math.round((biasStats.center / allSources.length) * 100)}%</div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Center</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{Math.round((biasStats.right / allSources.length) * 100)}%</div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Right</div>
            </div>
          </div>
        </div>
      </section>

      {/* Full Source Discovery List */}
      <section id="full-coverage">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Full Coverage</h2>
          <div className="text-sm text-gray-500 font-medium">
            Showing <span className="text-gray-900">{allSources.length}</span> sources
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allSources.map((source, idx) => (
            <a 
              key={source.id} 
              href={source.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="group bg-white p-5 rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                      {(() => {
                        let hostname = "example.com";
                        try {
                          if (source.url && source.url !== "#") {
                            hostname = new URL(source.url).hostname;
                          }
                        } catch (e) {}
                        
                        return (
                          <img 
                            src={`https://www.google.com/s2/favicons?sz=64&domain=${hostname}`} 
                            alt={source.sourceName}
                            className="w-6 h-6"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        );
                      })()}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase text-xs tracking-tight">
                        {source.sourceName}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">
                        {(() => {
                          try {
                            return (source.url && source.url !== "#") ? new URL(source.url).hostname : "source.com";
                          } catch (e) {
                            return "source.com";
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                    source.bias === 'left' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                    source.bias === 'right' ? 'bg-red-50 text-red-600 border border-red-100' :
                    'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}>
                    {source.bias}
                  </div>
                </div>
                <h5 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug mb-4 h-10 group-hover:underline">
                  {source.title}
                </h5>
              </div>
              
              <div className="flex items-center justify-between py-3 border-t border-gray-50 mt-auto">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    source.factuality === 'very_high' || source.factuality === 'high' ? 'bg-green-500' :
                    source.factuality === 'mixed' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                    {source.factuality?.replace('_', ' ') || 'unknown'} Reliability
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                  {formatDistanceToNow(new Date(source.publishedAt), { addSuffix: true })}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold px-1 rounded">Primary</span>
                    {article.publishedAt && <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 mb-2 text-[10px] text-muted-foreground">
                  <span>Ownership: <span className="font-semibold text-foreground">{article.publisher?.ownerName || article.publisher?.name}</span></span>
                  <span>·</span>
                  <span>Factuality: <span className={`font-semibold ${
                    article.publisher?.factualityRating === "very_high" ? "text-green-600" :
                    article.publisher?.factualityRating === "high" ? "text-blue-600" :
                    article.publisher?.factualityRating === "mixed" ? "text-amber-600" :
                    article.publisher?.factualityRating === "low" ? "text-orange-600" :
                    article.publisher?.factualityRating === "very_low" ? "text-red-600" : "text-muted-foreground"
                  }`}>{(article.publisher?.factualityRating || "unknown").replace("_", " ").toUpperCase()}</span></span>
                </div>
                <p className="text-sm font-bold line-clamp-2 mb-1">{article.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{article.excerpt}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="w-32">
                    <BiasBar left={biasNums.left} center={biasNums.center} right={biasNums.right} size="xs" />
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    Read Full Article <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-6 mt-6">
                {isDiscoveringSources ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">Discovering sources across the web...</p>
                  </div>
                ) : filteredSources.length > 0 ? (
                  filteredSources.slice(0, visibleCount).map((source: any) => (
                    <div key={source.id} className="group relative border-b border-border/40 pb-6 last:border-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <PublisherAvatar name={source.source_name ?? "Unknown"} size="xs" />
                          <span className="text-xs font-bold text-foreground/90">{source.source_name || "Unknown Source"}</span>
                          <BiasChip bias={source.bias_label?.toLowerCase() || "center"} size="xs" />
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">{source.factuality || "UNKNOWN"}</span>
                        </div>
                      </div>
                      <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
                        <h4 className="text-lg font-bold leading-tight mb-2 tracking-tight">{source.article_title}</h4>
                        <p className="text-[14px] text-muted-foreground line-clamp-2 leading-relaxed mb-3">{source.snippet}</p>
                      </a>
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span>{source.published_at ? formatDistanceToNow(new Date(source.published_at), { addSuffix: true }) : "recently"}</span>
                          <span>·</span>
                          <span>Similarity: {Math.round((source.similarity || 0) * 100)}%</span>
                        </div>
                        <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          Full Article <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center bg-secondary/20 rounded-xl border border-dashed border-border">
                    <p className="text-sm font-medium text-muted-foreground">No {sourceTab !== "all" ? sourceTab : ""} coverage found for this specific story.</p>
                    <Button variant="ghost" onClick={() => setSourceTab("all")} className="mt-2 text-primary font-bold">View All Coverage</Button>
                  </div>
                )}
              </div>

              {filteredSources.length > visibleCount && (
                <button 
                  onClick={() => setVisibleCount(prev => prev + 12)}
                  className="mt-8 px-6 py-2 text-xs font-bold border border-foreground rounded hover:bg-secondary transition-colors uppercase tracking-widest block mx-auto"
                >
                  Show More coverage ({filteredSources.length - visibleCount} remaining)
                </button>
              )}
            </div>
          </div>

          {/* ── RIGHT: Coverage sidebar ── */}
          <aside className="space-y-4">
            {/* Coverage Details */}
            <div className="bg-[#f0ece1] dark:bg-zinc-900 border border-card-border rounded p-4 text-[11px] font-medium text-foreground pb-5">
              <h3 className="text-xs font-bold mb-3">Coverage Details</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-muted-foreground"><span className="text-zinc-600 dark:text-zinc-400">Total News Sources</span><span className="font-bold text-foreground">{sources.total}</span></div>
                <div className="flex justify-between items-center text-muted-foreground"><span className="bias-left-text">Leaning Left</span><span className="font-bold">{sources.left}</span></div>
                <div className="flex justify-between items-center text-muted-foreground"><span className="bias-right-text">Leaning Right</span><span className="font-bold">{sources.right}</span></div>
                <div className="flex justify-between items-center text-muted-foreground"><span className="bias-center-text">Center</span><span className="font-bold">{sources.center}</span></div>
                <div className="flex justify-between items-center pt-1 mt-1 border-t border-border/30"><span className="text-zinc-600 dark:text-zinc-400">Last Updated</span><span className="font-bold text-foreground">Recently</span></div>
                <div className="flex justify-between items-center"><span className="text-zinc-600 dark:text-zinc-400">Bias Distribution</span><span className="font-bold text-foreground">{biasNums.left}% Left</span></div>
              </div>
            </div>

            {/* Bias Distribution Chart */}
            <div className="bg-[#e4e1d6] dark:bg-zinc-800/50 rounded p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold">Bias Distribution <ExternalLink className="w-3 h-3 inline pb-0.5 opacity-50"/></h3>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <p className="text-[10px] text-muted-foreground mb-4">
                • {sources.total > 0 ? Math.round((sources.left / sources.total) * 100) : 0}% of the sources lean Left
              </p>
              
              <div className="grid grid-cols-3 gap-1.5 mb-2 h-[200px] items-end pb-2 border-b border-border/50">
                <div className="flex flex-col items-center gap-1 relative h-full justify-end">
                  <div className="absolute inset-0 bg-blue-500/10 rounded-t-sm pointer-events-none border-x border-t border-blue-500/20" style={{height: `${Math.max(10, biasNums.left)}%`, top: "auto", bottom: 0}}></div>
                  {allStoryArticles.filter((a: any) => a.bias === "left").slice(0, 5).map((a: any) => (
                    <div key={a.id} className="w-5 h-5 rounded-full bg-blue-600 border border-blue-400 text-[8px] flex items-center justify-center font-bold z-10 text-white shadow-sm overflow-hidden" title={a.publisher?.name}>
                      {a.publisher?.logoUrl ? <img src={a.publisher.logoUrl} alt="" className="w-full h-full object-cover" /> : a.publisher?.name?.[0]}
                    </div>
                  ))}
                  {sources.left > 5 && (
                    <div className="w-5 h-5 rounded-full bg-blue-700 border border-blue-400 text-[7px] flex items-center justify-center font-bold z-10 text-white shadow-sm italic">
                      +{sources.left - 5}
                    </div>
                  )}
                  <span className="text-[9px] font-bold mt-1 text-blue-700 dark:text-blue-400 uppercase">Left</span>
                </div>
                
                <div className="flex flex-col items-center gap-1 relative h-full justify-end">
                  <div className="absolute inset-0 bg-zinc-500/10 rounded-t-sm pointer-events-none border-x border-t border-zinc-500/20" style={{height: `${Math.max(10, biasNums.center)}%`, top: "auto", bottom: 0}}></div>
                  {allStoryArticles.filter((a: any) => a.bias === "center").slice(0, 5).map((a: any) => (
                    <div key={a.id} className="w-5 h-5 rounded-full bg-zinc-600 border border-zinc-400 text-[8px] flex items-center justify-center font-bold z-10 text-white shadow-sm overflow-hidden" title={a.publisher?.name}>
                       {a.publisher?.logoUrl ? <img src={a.publisher.logoUrl} alt="" className="w-full h-full object-cover" /> : a.publisher?.name?.[0]}
                    </div>
                  ))}
                  {sources.center > 5 && (
                    <div className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-400 text-[7px] flex items-center justify-center font-bold z-10 text-white shadow-sm italic">
                      +{sources.center - 5}
                    </div>
                  )}
                  <span className="text-[9px] font-bold mt-1 text-zinc-700 dark:text-zinc-400 uppercase">Center</span>
                </div>

                <div className="flex flex-col items-center gap-1 relative h-full justify-end">
                  <div className="absolute inset-0 bg-red-500/10 rounded-t-sm pointer-events-none border-x border-t border-red-500/20" style={{height: `${Math.max(10, biasNums.right)}%`, top: "auto", bottom: 0}}></div>
                  {allStoryArticles.filter((a: any) => a.bias === "right").slice(0, 5).map((a: any) => (
                    <div key={a.id} className="w-5 h-5 rounded-full bg-red-600 border border-red-400 text-[8px] flex items-center justify-center font-bold z-10 text-white shadow-sm overflow-hidden" title={a.publisher?.name}>
                       {a.publisher?.logoUrl ? <img src={a.publisher.logoUrl} alt="" className="w-full h-full object-cover" /> : a.publisher?.name?.[0]}
                    </div>
                  ))}
                  {sources.right > 5 && (
                    <div className="w-5 h-5 rounded-full bg-red-700 border border-red-400 text-[7px] flex items-center justify-center font-bold z-10 text-white shadow-sm italic">
                      +{sources.right - 5}
                    </div>
                  )}
                  <span className="text-[9px] font-bold mt-1 text-red-700 dark:text-red-400 uppercase">Right</span>
                </div>
              </div>

              <div className="text-[9px] text-muted-foreground mt-4 text-center italic">
                Scanning across {sources.total} global coverage points...
              </div>
            </div>

            {/* Narrative Shift Visualization */}
            <NarrativeShift history={article.biasHistory as any[]} />

            {/* Factuality - PREMIUM */}
            <div className="bg-[#f0ece1] dark:bg-zinc-900 border border-card-border rounded p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold flex items-center gap-1">Factuality <svg className="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></h3>
                <Lock className="w-3 h-3 text-muted-foreground" />
              </div>
              <p className="text-[9px] text-muted-foreground mb-3">To view factuality data please <a href="#" className="underline">Upgrade to Premium</a></p>
              
              <div className="space-y-1.5 opacity-40 blur-[1px]">
                 <div className="h-5 bg-zinc-300 dark:bg-zinc-700 w-full" />
                 <div className="h-5 bg-zinc-300 dark:bg-zinc-700 w-3/4" />
              </div>
            </div>

            {/* Ownership - PREMIUM */}
            <div className="bg-[#f0ece1] dark:bg-zinc-900 border border-card-border rounded p-4">
               <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold flex items-center gap-1">Ownership <svg className="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></h3>
                <Lock className="w-3 h-3 text-muted-foreground" />
              </div>
              <p className="text-[9px] text-muted-foreground mb-3">To view ownership data please <a href="#" className="underline">Upgrade to Vantage</a></p>
              
              <div className="flex gap-1 h-2 rounded overflow-hidden opacity-40 blur-[1px]">
                 <div className="w-[40%] bg-blue-300" />
                 <div className="w-[25%] bg-blue-200" />
                 <div className="w-[20%] bg-red-200" />
                 <div className="w-[15%] bg-stone-300" />
              </div>
            </div>

            {/* Similar News Topics */}
            <div className="bg-card border border-card-border rounded p-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Similar News Topics</h3>
              <div className="space-y-2">
                {(allData ?? []).slice(0, 4).map((a: ArticleWithDetails) => (
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

        {/* ── PHASE 9: DIVERSIFIED DISCOVERY SECTIONS ── */}
        <div className="mt-16 border-t border-border pt-12 space-y-16">
          
          {/* Section 1: Inside the Category (Grid) */}
          {categoryDataResult?.articles && categoryDataResult.articles.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight">Inside {article.categories?.[0]?.name || "this category"}</h2>
                <Button variant="ghost" className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  View Category Feed <ArrowLeft className="w-3 h-3 rotate-180" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryDataResult.articles.filter((a: ArticleWithDetails) => a.id !== id).slice(0, 3).map((a: ArticleWithDetails) => (
                  <StoryCard key={a.id} article={a} variant="standard" />
                ))}
              </div>
            </section>
          )}

          {/* Section 2: The Blindspot (Featured Card) */}
          {blindspotDataResult && (
            <section className="bg-zinc-950 text-white rounded-xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-32 -mt-32" />
              <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-widest mb-4">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                    Recommended Blindspot
                  </div>
                  <h2 className="text-3xl font-bold mb-4 leading-tight">Step outside your bias bubble</h2>
                  <p className="text-zinc-400 text-sm mb-6 max-w-xl">
                    Our AI identified this story being heavily reported by sources you rarely read. 
                    Expand your perspective by exploring this highly-discussed topic among contrasting viewpoints.
                  </p>
                  <Button variant="outline" className="text-white border-white/20 hover:bg-white/10" onClick={() => setLocation(`/article/${blindspotDataResult.leftBlindspot?.[0]?.id || blindspotDataResult.rightBlindspot?.[0]?.id}`)}>
                    Explore Blindspot Feed
                  </Button>
                </div>
                <div className="w-full lg:w-[400px] transform hover:scale-[1.02] transition-transform duration-500">
                  {blindspotDataResult.leftBlindspot?.[0] && (
                    <StoryCard article={blindspotDataResult.leftBlindspot[0]} variant="standard" />
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Section 3: More from Publisher (Horizontal Carousel) */}
          {publisherDataResult?.articles && publisherDataResult.articles.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {article.publisher?.logoUrl && <img src={article.publisher.logoUrl} className="w-6 h-6 rounded-full" alt="" />}
                  <h2 className="text-xl font-bold tracking-tight">More from {article.publisher?.name}</h2>
                </div>
              </div>
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-6">
                  {publisherDataResult.articles.filter((a: ArticleWithDetails) => a.id !== id).map((a: ArticleWithDetails) => (
                    <div key={a.id} className="flex-[0_0_280px] min-w-0">
                      <StoryCard article={a} variant="standard" />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Section 4: Global Perspectives (Text Index) */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-8 border-t border-border/50">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Top in World</h3>
              <div className="space-y-3">
                {(allData ?? []).slice(0, 5).map((a: ArticleWithDetails) => (
                  <a key={a.id} onClick={() => setLocation(`/article/${a.id}`)} className="block group cursor-pointer">
                    <p className="text-xs font-bold leading-snug group-hover:text-primary transition-colors">{a.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">{a.publisher?.name}</span>
                      <BiasChip bias={a.bias} size="xs" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Trending Today</h3>
              <div className="space-y-3">
                {(allData ?? []).slice(5, 10).map((a: ArticleWithDetails) => (
                  <a key={a.id} onClick={() => setLocation(`/article/${a.id}`)} className="block group cursor-pointer">
                    <p className="text-xs font-bold leading-snug group-hover:text-primary transition-colors">{a.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">{a.publisher?.name}</span>
                      <BiasChip bias={a.bias} size="xs" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
            <div className="bg-secondary/20 rounded-xl p-6 border border-border/50">
              <h3 className="text-xs font-black uppercase tracking-widest mb-4">Daily Edition</h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Get more from every story with our personalized briefing. No algorithms, just the facts from all sides.
              </p>
              <div className="flex gap-2">
                <input className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-xs" placeholder="email@example.com" />
                <Button size="sm">Join</Button>
              </div>
            </div>
          </section>

        </div>
      </div>

      <NewsFooter />
    </div>
  );
}
