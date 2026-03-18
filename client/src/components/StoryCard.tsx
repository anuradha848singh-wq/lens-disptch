import { useState } from "react";
import { Link } from "wouter";
import { BiasBar, BiasChip } from "./BiasBar";
import { type ArticleWithDetails } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Bookmark, BookmarkCheck, Eye } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function getBiasNumbers(article: ArticleWithDetails) {
  if (article.bias === "left") return { left: 65, center: 25, right: 10 };
  if (article.bias === "right") return { left: 10, center: 25, right: 65 };
  return { left: 20, center: 60, right: 20 };
}

interface StoryCardProps {
  article: ArticleWithDetails;
  variant?: "standard" | "featured" | "list";
  bookmarkedIds?: Set<string>;
}

export function StoryCard({ article, variant = "standard", bookmarkedIds }: StoryCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isBookmarked = bookmarkedIds?.has(article.id) ?? false;
  const bias = getBiasNumbers(article);
  const publisherInitials = article.publisher?.name?.slice(0, 2).toUpperCase() ?? "??";
  const timeAgo = article.publishedAt
    ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })
    : "just now";

  const bookmarkMutation = useMutation({
    mutationFn: () => isBookmarked
      ? api.bookmarks.remove(article.id)
      : api.bookmarks.add(article.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      toast({ title: isBookmarked ? "Removed from bookmarks" : "Bookmarked!" });
    },
  });

  if (variant === "featured") {
    return (
      <div className="group" data-testid={`story-${article.id}`}>
        <Link href={`/article/${article.id}`}>
          <div className="relative overflow-hidden rounded-md cursor-pointer">
            <div className="aspect-video bg-muted overflow-hidden">
              {article.heroImageUrl && article.heroImageUrl !== "/api/placeholder/1200/600" ? (
                <img
                  src={article.heroImageUrl}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
                  <span className="text-4xl font-black text-muted-foreground/30">{publisherInitials}</span>
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <BiasChip bias={article.bias} />
                {article.categories?.[0] && (
                  <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded text-white/90">
                    {article.categories[0].name}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold leading-snug line-clamp-3">{article.title}</h2>
              <p className="text-sm text-white/80 mt-1 line-clamp-2">{article.excerpt}</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/90">{article.publisher?.name}</span>
                  <span className="text-white/50 text-xs">•</span>
                  <span className="text-xs text-white/70">{timeAgo}</span>
                </div>
                {article.viewCount !== undefined && (
                  <div className="flex items-center gap-1 text-xs text-white/60">
                    <Eye className="w-3 h-3" />
                    <span>{article.viewCount}</span>
                  </div>
                )}
              </div>
              <div className="mt-2">
                <BiasBar left={bias.left} center={bias.center} right={bias.right} size="sm" />
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div
        className="flex gap-3 py-3 border-b last:border-b-0 hover:bg-muted/30 -mx-4 px-4 rounded-md transition-colors cursor-pointer group"
        data-testid={`story-${article.id}`}
      >
        <Link href={`/article/${article.id}`} className="flex gap-3 flex-1 min-w-0">
          <div className="w-20 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
            {article.heroImageUrl && article.heroImageUrl !== "/api/placeholder/1200/600" ? (
              <img src={article.heroImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <span className="text-sm font-black text-muted-foreground/40">{publisherInitials}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {article.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-muted-foreground font-medium">{article.publisher?.name}</span>
              <span className="text-muted-foreground/40 text-xs">•</span>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
              <BiasChip bias={article.bias} />
            </div>
            <div className="mt-2 max-w-xs">
              <BiasBar left={bias.left} center={bias.center} right={bias.right} size="sm" />
            </div>
          </div>
        </Link>
        {user && (
          <button
            onClick={() => bookmarkMutation.mutate()}
            className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors hover-elevate active-elevate-2 rounded self-start mt-0.5"
            data-testid={`button-bookmark-${article.id}`}
          >
            {isBookmarked
              ? <BookmarkCheck className="w-4 h-4 text-primary" />
              : <Bookmark className="w-4 h-4" />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="group border border-card-border rounded-md bg-card overflow-hidden hover-elevate active-elevate-2 transition-all cursor-pointer"
      data-testid={`story-${article.id}`}
    >
      <Link href={`/article/${article.id}`}>
        <div className="aspect-video bg-muted overflow-hidden">
          {article.heroImageUrl && article.heroImageUrl !== "/api/placeholder/1200/600" ? (
            <img
              src={article.heroImageUrl}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-secondary">
              <span className="text-3xl font-black text-muted-foreground/30">{publisherInitials}</span>
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <BiasChip bias={article.bias} />
            {article.categories?.[0] && (
              <span className="text-xs text-muted-foreground">{article.categories[0].name}</span>
            )}
          </div>
          <h3 className="font-bold text-sm leading-snug line-clamp-3 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{article.excerpt}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="font-medium truncate">{article.publisher?.name}</span>
            <span className="flex-shrink-0">·</span>
            <span className="flex-shrink-0">{timeAgo}</span>
          </div>
          <div className="mt-2">
            <BiasBar left={bias.left} center={bias.center} right={bias.right} showPercentages size="sm" />
          </div>
        </div>
      </Link>
      {user && (
        <div className="px-3 pb-3">
          <button
            onClick={(e) => { e.preventDefault(); bookmarkMutation.mutate(); }}
            className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            data-testid={`button-bookmark-${article.id}`}
          >
            {isBookmarked
              ? <><BookmarkCheck className="w-3.5 h-3.5 text-primary" /> Saved</>
              : <><Bookmark className="w-3.5 h-3.5" /> Save</>}
          </button>
        </div>
      )}
    </div>
  );
}
