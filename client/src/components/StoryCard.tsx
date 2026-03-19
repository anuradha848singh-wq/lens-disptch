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

function getSourceCount(article: ArticleWithDetails) {
  return article.sourceCount || 1;
}

interface StoryCardProps {
  article: ArticleWithDetails;
  variant?: "standard" | "featured" | "list" | "compact" | "slide" | "table-row" | "dense";
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
  const sources = getSourceCount(article);
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
                <span className="text-[10px] text-white/70 ml-auto">{sources} sources</span>
              </div>
              <h2 className="text-xl font-bold leading-snug line-clamp-3 mb-2">{article.title}</h2>
              <div className="flex items-center gap-2 text-xs text-white/70 mb-3">
                <a 
                  href={article.sourceUrl || "#"} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="font-semibold text-white/90 hover:text-white flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {article.publisher?.name} <ExternalLink className="w-3 h-3" />
                </a>
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
            <span className="text-[10px] text-muted-foreground">Ownership: <span className="font-medium text-foreground">{article.publisher?.ownerName || article.publisher?.name}</span></span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">Factuality: <span className={`font-medium ${
              article.publisher?.factualityRating === "very_high" ? "text-green-600" :
              article.publisher?.factualityRating === "high" ? "text-blue-600" :
              article.publisher?.factualityRating === "mixed" ? "text-amber-600" : "text-muted-foreground"
            }`}>{(article.publisher?.factualityRating || "N/A").replace("_", " ").toUpperCase()}</span></span>
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
              href={article.sourceUrl || "#"}
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
                <span className="text-[10px] text-muted-foreground">{sources} sources</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  /* ── DENSE (super compact minimal row, max density) ─────────── */
  if (variant === "dense") {
    return (
      <div className="group border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors" data-testid={`story-${article.id}`}>
        <Link href={`/article/${article.id}`}>
          <div className="py-2.5 px-3 flex items-start gap-3 cursor-pointer">
            <div className="flex-shrink-0 flex flex-col items-center gap-1 w-8">
              <PublisherAvatar name={article.publisher?.name ?? "??"} size="xs" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground truncate mr-2">{article.publisher?.name}</span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo}</span>
              </div>
              <h4 className="text-[13px] font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h4>
              <div className="flex items-center gap-2 mt-1.5">
                <BiasChip bias={article.bias} size="xs" />
                <span className="text-[10px] font-semibold text-muted-foreground">{sources} sources</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  /* ── SLIDE (for carousels, square-ish, image bg) ─────────────── */
  if (variant === "slide") {
    return (
      <div className="group relative w-[240px] h-[320px] flex-shrink-0 rounded-lg overflow-hidden cursor-pointer" data-testid={`story-${article.id}`}>
        <Link href={`/article/${article.id}`}>
          <div className="absolute inset-0 bg-muted">
            {article.heroImageUrl && !article.heroImageUrl.includes("placeholder") ? (
              <img src={article.heroImageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                <span className="text-4xl font-black text-zinc-600">{pubAbbr}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
          </div>
          <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
            <h3 className="text-[15px] font-bold leading-snug mb-2 line-clamp-3 drop-shadow-md group-hover:text-blue-100 transition-colors">{article.title}</h3>
            <div className="flex items-center gap-2 mb-2">
              <PublisherAvatar name={article.publisher?.name ?? "??"} size="xs" />
              <span className="text-xs font-bold text-white/90 drop-shadow-md truncate">{article.publisher?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <BiasChip bias={article.bias} size="xs" />
              <span className="text-[10px] font-semibold text-white/70">{sources} sources</span>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  /* ── TABLE-ROW (for ultra dense text table view) ─────────────── */
  if (variant === "table-row") {
    return (
      <tr className="group border-b border-border/50 hover:bg-secondary/40 transition-colors cursor-pointer" onClick={() => window.location.href=`/article/${article.id}`} data-testid={`story-${article.id}`}>
        <td className="py-2.5 px-3 min-w-[200px]">
          <h4 className="text-[13px] font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h4>
        </td>
        <td className="py-2.5 px-3 w-40">
          <div className="flex items-center gap-2">
            <PublisherAvatar name={article.publisher?.name ?? "??"} size="xs" />
            <span className="text-[11px] font-semibold truncate text-muted-foreground">{article.publisher?.name}</span>
          </div>
        </td>
        <td className="py-2.5 px-3 w-28">
           <BiasChip bias={article.bias} size="xs" />
        </td>
        <td className="py-2.5 px-3 w-24 text-right">
          <span className="text-[11px] font-bold text-muted-foreground">{sources} sources</span>
        </td>
        <td className="py-2.5 px-3 w-24 text-right hidden sm:table-cell">
           <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
        </td>
      </tr>
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
            <span className="text-[10px] font-semibold text-muted-foreground">{sources} sources</span>
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
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <PublisherAvatar name={article.publisher?.name ?? "??"} size="xs" />
              <a 
                href={article.sourceUrl || "#"} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[11px] font-medium text-muted-foreground hover:text-primary truncate flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {article.publisher?.name} <ExternalLink className="w-2.5 h-2.5" />
              </a>
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
