import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Clock, Shield, BookOpen, ChevronRight, TrendingUp } from "lucide-react";
import { BiasChip } from "@/components/BiasBar";
import { motion } from "framer-motion";
import type { ArticleWithDetails, ReadingHistoryEntry } from "@shared/schema";

export default function ReadingHistoryPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: history, isLoading } = useQuery<(ReadingHistoryEntry & { article: ArticleWithDetails })[]>({
    queryKey: ["reading-history"],
    queryFn: () => api.history(50),
    enabled: !!user,
  });

  // Bias breakdown summary
  const biasSummary = useMemo(() => {
    if (!history || history.length === 0) return null;
    const counts = { left: 0, center: 0, right: 0 };
    for (const e of history) {
      const b = (e.article.bias as string) || "center";
      if (b in counts) counts[b as keyof typeof counts]++;
    }
    const total = history.length || 1;
    return {
      leftPct: Math.round((counts.left / total) * 100),
      centerPct: Math.round((counts.center / total) * 100),
      rightPct: Math.round((counts.right / total) * 100),
      dominant: counts.left > counts.right ? "left" : counts.right > counts.left ? "right" : "center",
    };
  }, [history]);

  const formatTimeAgo = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
        <MainNav onSearch={setSearchQuery} searchQuery={searchQuery} />
        <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-4">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
            <Shield className="w-9 h-9 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-display font-black mb-2">Reading History</h1>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm leading-relaxed">
            Sign in to track your reading history and discover your perspective tendencies.
          </p>
          <Link href="/">
            <button className="px-6 py-2.5 bg-foreground text-background text-xs font-black uppercase tracking-widest hover:bg-accent-editorial transition-colors">
              Browse Stories →
            </button>
          </Link>
        </div>
        <NewsFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      <MainNav onSearch={setSearchQuery} searchQuery={searchQuery} />

      <div className="flex-1 max-w-4xl mx-auto px-4 py-10 w-full">

        {/* Page Header */}
        <div className="mb-8 pb-4 border-b-2 border-primary">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
              <Clock className="w-5 h-5 text-background" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black tracking-tight">Reading History</h1>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                {history?.length ?? "…"} articles read
              </p>
            </div>
          </div>
        </div>

        {/* Bias Breakdown Summary */}
        {biasSummary && (
          <motion.div
            className="bg-white border border-border p-5 rounded-sm mb-8 shadow-sm"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-3.5 h-3.5 text-accent-editorial" />
              <h2 className="text-xs font-black uppercase tracking-widest">Your Reading Bias Profile</h2>
            </div>
            <div className="h-2.5 w-full bg-secondary/30 rounded-full overflow-hidden flex mb-3">
              <div className="bias-left h-full transition-all" style={{ width: `${biasSummary.leftPct}%` }} />
              <div className="bias-center h-full transition-all" style={{ width: `${biasSummary.centerPct}%` }} />
              <div className="bias-right h-full transition-all" style={{ width: `${biasSummary.rightPct}%` }} />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
              <span className="text-blue-600">Left {biasSummary.leftPct}%</span>
              <span>Center {biasSummary.centerPct}%</span>
              <span className="text-red-600">Right {biasSummary.rightPct}%</span>
            </div>
            {biasSummary.dominant !== "center" && (
              <p className="text-xs text-muted-foreground mt-3 bg-secondary/20 p-2 border border-border/40">
                You tend to read <strong>{biasSummary.dominant}-leaning</strong> sources.{" "}
                <Link href="/blindspot"><span className="text-accent-editorial font-bold cursor-pointer hover:underline">Explore your Blindspot →</span></Link>
              </p>
            )}
          </motion.div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-white border border-border animate-pulse rounded-sm" />
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <div className="bg-white border border-border rounded-sm p-16 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-40" />
            <h2 className="text-xl font-display font-black mb-2">No Reading History Yet</h2>
            <p className="text-muted-foreground text-sm mb-6">Start reading articles to build your history and discover your bias profile.</p>
            <Link href="/">
              <span className="px-6 py-2.5 bg-foreground text-background text-xs font-black uppercase tracking-widest hover:bg-accent-editorial transition-colors cursor-pointer inline-block">
                Browse Articles →
              </span>
            </Link>
          </div>
        ) : (
          <motion.div
            className="space-y-2"
            initial="hidden"
            animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }}
          >
            {history.map((entry, i) => (
              <motion.div
                key={entry.article.id || i}
                variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
              >
                <Link href={`/article/${entry.article.id}`}>
                  <div className="bg-white border border-border hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group p-4">
                    <div className="flex gap-4">
                      {entry.article.heroImageUrl && (
                        <img
                          src={entry.article.heroImageUrl}
                          alt=""
                          loading="lazy"
                          className="w-20 h-16 rounded-sm object-cover flex-shrink-0 grayscale-[0.1] group-hover:grayscale-0 transition-all"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-bold text-sm line-clamp-2 group-hover:text-accent-editorial transition-colors mb-1.5">
                          {entry.article.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="font-bold uppercase tracking-tight">{entry.article.publisher?.name}</span>
                          <span>·</span>
                          {entry.article.bias && (
                            <BiasChip bias={entry.article.bias as any} size="xs" />
                          )}
                          <span>·</span>
                          <span>{formatTimeAgo(entry.readAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-accent-editorial transition-colors flex-shrink-0 mt-2" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <NewsFooter />
    </div>
  );
}
