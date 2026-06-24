import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { api } from "@/lib/api";
import { StoryCard } from "@/components/StoryCard";
import { CommentsSection } from "@/components/CommentsSection";
import { CommunityRating } from "@/components/CommunityRating";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Scale, Clock, LayoutGrid, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { type ArticleWithDetails } from "@shared/schema";

export default function ComparePage() {
  const { clusterId } = useParams();
  const [view, setView] = useState<"bias" | "timeline">("bias");
  
  const { data: cluster, isLoading: isLoadingCluster } = useQuery({
    queryKey: ["/api/clusters", clusterId],
    queryFn: () => api.clusters.get(clusterId!),
    enabled: !!clusterId,
  });

  const { data: comparison, isLoading: isLoadingCompare } = useQuery({
    queryKey: ["/api/clusters", clusterId, "compare"],
    queryFn: () => api.clusters.compare(clusterId!),
    enabled: !!clusterId && view === "bias",
  });

  const { data: timeline, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ["/api/clusters", clusterId, "timeline"],
    queryFn: () => api.clusters.timeline(clusterId!),
    enabled: !!clusterId && view === "timeline",
  });

  const isLoading = isLoadingCluster || (view === "bias" ? isLoadingCompare : isLoadingTimeline);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <Skeleton className="h-32 w-full mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[400px] w-full" />)}
        </div>
      </div>
    );
  }

  if (!cluster) return null;

  return (
    <div className="min-h-screen bg-[#fcfaf7] dark:bg-zinc-950 font-serif">
      {/* Premium Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back to Dispatch
            </button>
          </Link>
          
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            <button 
              onClick={() => setView("bias")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                view === "bias" ? "bg-white dark:bg-zinc-700 shadow-sm text-primary" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Scale className="w-3.5 h-3.5" /> Media Bias
            </button>
            <button 
              onClick={() => setView("timeline")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                view === "timeline" ? "bg-white dark:bg-zinc-700 shadow-sm text-primary" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Clock className="w-3.5 h-3.5" /> Timeline
            </button>
          </div>

          <div className="w-32 flex justify-end">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Info className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Story Header */}
        <header className="max-w-4xl mx-auto mb-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-block px-3 py-1 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded mb-6">
            In-Depth Coverage
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 text-zinc-900 dark:text-zinc-50">
            {cluster.headline}
          </h1>
          {cluster.summary && (
            <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto italic">
              {cluster.summary}
            </p>
          )}
        </header>

        <AnimatePresence mode="wait">
          {view === "bias" && comparison ? (
            <motion.div 
              key="bias-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-10"
            >
              {/* PRO-OPPOSITION */}
              <BiasColumn 
                title="Pro-Opposition Bias" 
                color="red" 
                articles={(comparison as any).pro_opposition || []} 
                description="Outlets emphasizing criticisms of government policy, highlighting opposition perspectives, and focusing on policy failures."
              />

              {/* NEUTRAL / REGIONAL */}
              <BiasColumn 
                title="Neutral / Regional" 
                color="zinc" 
                articles={(comparison as any).neutral || []} 
                description="Outlets aiming for neutral reporting, or regional media focusing on local implications over national partisan narratives."
              />

              {/* PRO-ESTABLISHMENT */}
              <BiasColumn 
                title="Pro-Establishment Bias" 
                color="blue" 
                articles={(comparison as any).pro_establishment || []} 
                description="Outlets frequently highlighting government achievements, supporting major national policies, and favoring incumbent narratives."
              />
            </motion.div>
          ) : timeline ? (
            <motion.div 
              key="timeline-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="relative pl-8 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-12 py-4">
                {timeline.map((article, idx) => (
                  <TimelineEntry key={article.id} article={article} isFirst={idx === 0} />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="max-w-4xl mx-auto mt-12 space-y-8">
        <CommunityRating clusterId={clusterId!} />
        <CommentsSection clusterId={clusterId!} />
      </div>
    </div>
  );
}

function BiasColumn({ title, color, articles, description }: { title: string, color: "blue" | "zinc" | "red", articles: ArticleWithDetails[], description: string }) {
  const colorMap = {
    blue: "border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/10",
    zinc: "border-zinc-400 text-zinc-600 bg-zinc-50 dark:bg-zinc-800/20",
    red: "border-red-600 text-red-600 bg-red-50 dark:bg-red-900/10",
  };

  return (
    <section className="space-y-8">
      <div className={cn("p-5 rounded-lg border-l-4 shadow-sm", colorMap[color])}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-black uppercase tracking-widest">{title}</h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800">
            {articles.length} Sources
          </span>
        </div>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed italic">
          {description}
        </p>
      </div>

      <div className="space-y-6">
        {articles.map(article => (
          <StoryCard key={article.id} article={article} variant="dense" />
        ))}
        {articles.length === 0 && (
          <div className="p-12 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-center text-zinc-400 text-sm italic">
            No sources matched this category.
          </div>
        )}
      </div>
    </section>
  );
}

function TimelineEntry({ article, isFirst }: { article: ArticleWithDetails, isFirst: boolean }) {
  const pubDate = article.publishedAt ? new Date(article.publishedAt) : new Date(article.createdAt);
  
  return (
    <div className="relative group">
      {/* Node indicator */}
      <div className={cn(
        "absolute -left-[41px] top-1.5 w-4 h-4 rounded-full border-4 border-[#fcfaf7] dark:border-zinc-950 transition-all duration-300 group-hover:scale-125",
        isFirst ? "bg-primary" : "bg-zinc-300 dark:bg-zinc-700 group-hover:bg-primary"
      )} />
      
      <div className="space-y-3">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <time className="text-sm font-black text-primary font-mono">
              {format(pubDate, "MMM d, h:mm a")}
            </time>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              {article.publisher?.name || article.domain}
            </span>
          </div>
          {isFirst && (
            <span className="text-[10px] font-black uppercase tracking-tighter bg-primary/10 text-primary px-2 py-0.5 rounded">
              Breaking Coverage
            </span>
          )}
        </header>
        
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
          <Link href={`/article/${article.id}`}>
            <h3 className="text-xl font-bold leading-tight mb-3 cursor-pointer hover:text-primary transition-colors">
              {article.title}
            </h3>
          </Link>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed line-clamp-2">
            {article.excerpt}
          </p>
          
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <span className="text-[10px] font-bold text-zinc-400 uppercase">
                 Bias: <span className="text-foreground">{article.bias || "Center"}</span>
               </span>
               <span className="text-[10px] font-bold text-zinc-400 uppercase">
                 Factuality: <span className="text-green-600">High</span>
               </span>
             </div>
             <Link href={`/article/${article.id}`}>
                <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                  Read Detail
                </button>
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
