import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { StoryCard } from "@/components/StoryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, SortAsc, Clock, AlignLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { type ArticleWithDetails } from "@shared/schema";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";

function SkeletonCard() {
  return (
    <div className="bg-white border border-border p-4 space-y-3 animate-pulse">
      <Skeleton className="aspect-video w-full rounded-sm" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-4/5" />
    </div>
  );
}

export default function BookmarksPage() {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<"newest" | "bias" | "sources">("newest");

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["/api/bookmarks"],
    queryFn: api.bookmarks.list,
    enabled: !!user,
  });


  const sorted = useMemo(() => {
    const arr = [...(bookmarks as ArticleWithDetails[])];
    if (sortBy === "newest") return arr.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
    if (sortBy === "sources") return arr.sort((a, b) => (b.sourceCount || 0) - (a.sourceCount || 0));
    if (sortBy === "bias") return arr.sort((a, b) => (a.bias || "center").localeCompare(b.bias || "center"));
    return arr;
  }, [bookmarks, sortBy]);

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      <MainNav onSearch={() => {}} searchQuery="" />

      <main className="flex-1 max-w-[1400px] mx-auto px-4 py-10 w-full">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-primary">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-background" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black tracking-tight">Saved Stories</h1>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                {isLoading ? "Loading…" : `${sorted.length} article${sorted.length !== 1 ? "s" : ""} saved`}
              </p>
            </div>
          </div>

          {/* Sort controls */}
          {sorted.length > 0 && (
            <div className="flex items-center gap-1 bg-white border border-border rounded-sm overflow-hidden">
              {([
                { key: "newest", label: "Newest", icon: Clock },
                { key: "sources", label: "Sources", icon: SortAsc },
                { key: "bias", label: "Bias", icon: AlignLeft },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                    sortBy === key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {!user ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
              <Bookmark className="w-9 h-9 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-display font-black mb-2">Sign In to View Bookmarks</h2>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Create a free account to save stories and access them across all your devices.
            </p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
              <Bookmark className="w-9 h-9 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-display font-black mb-2">No Saved Stories Yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
              Click the bookmark icon on any article to save it here for later reading.
            </p>
            <a href="/" className="px-6 py-2.5 bg-foreground text-background text-xs font-black uppercase tracking-widest hover:bg-accent-editorial transition-colors">
              Browse Stories →
            </a>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.07 } }
            }}
          >
            {sorted.map((article: ArticleWithDetails) => (
              <motion.div
                key={article.id}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              >
                <StoryCard article={article} variant="standard" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      <NewsFooter />
    </div>
  );
}
