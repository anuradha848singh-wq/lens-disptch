import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TopBanner } from "@/components/TopBanner";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { StoryCard } from "@/components/StoryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { type ArticleWithDetails } from "@shared/schema";

export default function BookmarksPage() {
  const { user } = useAuth();
  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["/api/bookmarks"],
    queryFn: api.bookmarks.list,
    enabled: !!user,
  });

  const bookmarkedIds = new Set((bookmarks as ArticleWithDetails[]).map((a: ArticleWithDetails) => a.id));

  return (
    <div className="min-h-screen bg-background">
      <TopBanner />
      <MainNav onSearch={() => {}} searchQuery="" />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Saved Stories</h1>
        </div>

        {!user ? (
          <div className="text-center py-16">
            <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold">Sign in to view your bookmarks</p>
            <p className="text-muted-foreground text-sm mt-2">Save stories to read them later</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-card-border rounded-md overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (bookmarks as ArticleWithDetails[]).length === 0 ? (
          <div className="text-center py-16">
            <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold">No saved stories yet</p>
            <p className="text-muted-foreground text-sm mt-2">Click the bookmark icon on any article to save it here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(bookmarks as ArticleWithDetails[]).map((article: ArticleWithDetails) => (
              <StoryCard key={article.id} article={article} variant="standard" bookmarkedIds={bookmarkedIds} />
            ))}
          </div>
        )}
      </main>

      <NewsFooter />
    </div>
  );
}
