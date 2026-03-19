import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { useState } from "react";
import { Link } from "wouter";
import { Clock, Shield, BookOpen, ChevronRight } from "lucide-react";
import type { ArticleWithDetails, ReadingHistoryEntry } from "@shared/schema";

export default function ReadingHistoryPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: history, isLoading } = useQuery<(ReadingHistoryEntry & { article: ArticleWithDetails })[]>({
    queryKey: ["reading-history"],
    queryFn: () => api.history(50),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav onSearch={setSearchQuery} searchQuery={searchQuery} />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-3xl font-bold mb-2">Reading History</h1>
          <p className="text-muted-foreground mb-6">Sign in to see your reading history</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background">
      <MainNav onSearch={setSearchQuery} searchQuery={searchQuery} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            Reading History
          </h1>
          <p className="text-muted-foreground mt-1">
            Articles you've recently read
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <div className="bg-muted rounded-xl p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No reading history yet</h2>
            <p className="text-muted-foreground mb-4">Start reading articles to build your history</p>
            <Link href="/">
              <span className="text-primary font-medium hover:underline cursor-pointer">Browse articles →</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry, i) => (
              <Link key={entry.id || i} href={`/article/${entry.article.id}`}>
                <div className="bg-card border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex gap-4">
                    {entry.article.heroImageUrl && (
                      <img 
                        src={entry.article.heroImageUrl} 
                        alt="" 
                        className="w-20 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {entry.article.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span className="font-medium">{entry.article.publisher?.name}</span>
                        <span>·</span>
                        {entry.article.bias && (
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                            entry.article.bias === "left" ? "bg-blue-500/10 text-blue-500" :
                            entry.article.bias === "center" ? "bg-violet-500/10 text-violet-500" :
                            "bg-red-500/10 text-red-500"
                          }`}>
                            {entry.article.bias.toUpperCase()}
                          </span>
                        )}
                        <span>·</span>
                        <span>{formatTimeAgo(entry.readAt)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-2" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
