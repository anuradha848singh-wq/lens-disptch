import { Link } from "wouter";
import { BiasBar, BiasChip, PublisherAvatar } from "./BiasBar";
import { type ArticleWithDetails } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function getBias(article: ArticleWithDetails) {
  if (article.bias === "left")   return { left: 65, center: 25, right: 10 };
  if (article.bias === "right")  return { left: 10, center: 25, right: 65 };
  return { left: 20, center: 60, right: 20 };
}

function getSourceCount(bias: string) {
  if (bias === "left")   return { total: 47, left: 33, center: 9, right: 5 };
  if (bias === "right")  return { total: 31, left: 4, center: 8, right: 19 };
  return { total: 24, left: 8, center: 12, right: 4 };
}

interface StoryCardProps {
  article: ArticleWithDetails;
  variant?: "standard" | "featured" | "list" | "compact";
  bookmarkedIds?: Set<string>;
}

function BookmarkButton({ article, bookmarkedIds }: { article: ArticleWithDetails; bookmarkedIds?: Set<string> }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isBookmarked = bookmarkedIds?.has(article.id) ?? false;

  const bookmarkMutation = useMutation({
    mutationFn: () => isBookmarked ? api.bookmarks.remove(article.id) : api.bookmarks.add(article.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      toast({ title: isBookmarked ? "Removed from bookmarks" : "Saved!" });
    },
  });

  if (!user) return null;
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); bookmarkMutation.mutate(); }}
      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
      data-testid={`button-bookmark-${article.id}`}
    >
      {isBookmarked ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
    </button>
  );
}

export function StoryCard({ article, variant = "standard", bookmarkedIds }: StoryCardProps) {
  const bias = getBias(article);
  const sources = getSourceCount(article.bias);
  const timeAgo = article.publishedAt
    ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })
    : "recently";
  const pubAbbr = article.publisher?.name?.slice(0, 2).toUpperCase() ?? "??";

  /* ── FEATURED (hero card) ────────────────────────────────── */
  if (variant === "featured") {
    return (
      <div className="group" data-testid={`story-${article.id}`}>
        <Link href={`/article/${article.id}`}>
          <div className="relative rounded overflow-hidden cursor-pointer">
            <div className="aspect-[16/9] bg-muted">
              {article.heroImageUrl && !article.heroImageUrl.includes("placeholder") ? (
                <img src={article.heroImageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center">
                  <span className="text-5xl font-black text-zinc-400/50 dark:text-zinc-500/50">{pubAbbr}</span>
                </div>
              )}
            </div>
            {/* gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <BiasChip bias={article.bias} />
                {article.categories?.[0] && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                    {article.categories[0].name}
                  </span>
                )}
                <span className="text-[10px] text-white/70 ml-auto">{sources.total} sources</span>
              </div>
              <h2 className="text-xl font-bold leading-snug line-clamp-3 mb-2">{article.title}</h2>
              <div className="flex items-center gap-2 text-xs text-white/70 mb-3">
                <span className="font-semibold text-white/90">{article.publisher?.name}</span>
                <span>·</span>
                <span>{timeAgo}</span>
              </div>
              <BiasBar left={bias.left} center={bias.center} right={bias.right} size="sm" />
            </div>
          </div>
        </Link>
      </div>
    );
  }

  /* ── LIST (source row in article detail) ─────────────────── */
  if (variant === "list") {
    return (
      <div className="group border-b border-border last:border-b-0" data-testid={`story-${article.id}`}>
        <div className="py-4 px-0">
          {/* Publisher header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <PublisherAvatar name={article.publisher?.name ?? "??"} size="xs" />
              <div>
                <span className="text-xs font-bold">{article.publisher?.name}</span>
                {article.publisher?.biasRating && (
                  <span className="ml-1.5"><BiasChip bias={article.publisher.biasRating} size="xs" /></span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
              <BookmarkButton article={article} bookmarkedIds={bookmarkedIds} />
            </div>
          </div>

          {/* Factuality / Ownership tags */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-muted-foreground">Ownership: <span className="font-medium text-foreground">{article.publisher?.name}</span></span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">Factuality: <span className="font-medium text-blue-600">High</span></span>
          </div>

          <Link href={`/article/${article.id}`}>
            <h4 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary cursor-pointer transition-colors mb-1">
              {article.title}
            </h4>
            <p className="text-xs text-muted-foreground line-clamp-2">{article.excerpt}</p>
          </Link>

          <div className="mt-2 flex items-center justify-between">
            <div className="w-32">
              <BiasBar left={bias.left} center={bias.center} right={bias.right} size="xs" />
            </div>
            <a
              href={article.publisher?.website ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              Read Full Article <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ── COMPACT (sidebar or small grid) ────────────────────── */
  if (variant === "compact") {
    return (
      <div className="group" data-testid={`story-${article.id}`}>
        <Link href={`/article/${article.id}`}>
          <div className="flex gap-2.5 cursor-pointer">
            <div className="w-16 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
              {article.heroImageUrl && !article.heroImageUrl.includes("placeholder") ? (
                <img src={article.heroImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center">
                  <span className="text-xs font-black text-zinc-400/60">{pubAbbr}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h4>
              <div className="flex items-center gap-1.5 mt-1">
                <BiasChip bias={article.bias} size="xs" />
                <span className="text-[10px] text-muted-foreground">{sources.total} sources</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  /* ── STANDARD (main grid card) ──────────────────────────── */
  return (
    <div
      className="group bg-card border border-card-border rounded overflow-hidden cursor-pointer hover:border-border transition-all"
      data-testid={`story-${article.id}`}
    >
      <Link href={`/article/${article.id}`}>
        {/* Image */}
        <div className="aspect-[16/9] bg-muted overflow-hidden">
          {article.heroImageUrl && !article.heroImageUrl.includes("placeholder") ? (
            <img
              src={article.heroImageUrl}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center">
              <span className="text-3xl font-black text-zinc-300 dark:text-zinc-600">{pubAbbr}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-3">
          {/* Category + source count */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              {article.categories?.[0] && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {article.categories[0].name}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">{sources.total} sources</span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold leading-snug line-clamp-3 group-hover:text-primary transition-colors mb-2">
            {article.title}
          </h3>

          {/* Bias bar */}
          <div className="mb-2.5">
            <BiasBar left={bias.left} center={bias.center} right={bias.right} size="sm" />
            <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider mt-0.5">
              <span className="bias-left-text">L {bias.left}%</span>
              <span className="bias-center-text">C {bias.center}%</span>
              <span className="bias-right-text">R {bias.right}%</span>
            </div>
          </div>

          {/* Publisher row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <PublisherAvatar name={article.publisher?.name ?? "??"} size="xs" />
              <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[100px]">{article.publisher?.name}</span>
              <BiasChip bias={article.bias} size="xs" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
              <BookmarkButton article={article} bookmarkedIds={bookmarkedIds} />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
