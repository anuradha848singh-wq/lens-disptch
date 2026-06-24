import { Bookmark, BookmarkCheck } from "lucide-react";
import { type ArticleWithDetails } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function BookmarkButton({ article, bookmarkedIds }: { article: ArticleWithDetails; bookmarkedIds?: Set<string> }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: isSelfBookmarked } = useQuery<ArticleWithDetails[], Error, boolean>({
    queryKey: ["/api/bookmarks"],
    queryFn: api.bookmarks.list as any,
    enabled: !!user,
    select: (bookmarks) => bookmarks.some((a) => a.id === article.id),
  });

  const isBookmarked = isSelfBookmarked ?? (bookmarkedIds?.has(article.id)) ?? false;

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

export function VelocityBadge({ velocity, phase }: { velocity: number; phase: string }) {
  if (phase === "breaking") {
    return (
      <div className="flex items-center gap-1 bg-red-600 text-white text-xs font-black uppercase px-2 py-0.5 rounded animate-pulse">
        <span className="w-1.5 h-1.5 bg-white rounded-full" />
        Breaking
      </div>
    );
  }
  if (phase === "developing") {
    return (
      <div className="flex items-center gap-1 bg-amber-500 text-white text-xs font-black uppercase px-2 py-0.5 rounded">
        <span className="w-1.5 h-1.5 bg-white rounded-full" />
        Developing
      </div>
    );
  }
  if (phase === "analysis") {
    return (
      <div className="bg-blue-600 text-white text-xs font-black uppercase px-2 py-0.5 rounded">
        Analysis
      </div>
    );
  }
  return null;
}

export function CorrectionBadge({ hasCorrection }: { hasCorrection: boolean }) {
  if (!hasCorrection) return null;
  return (
    <div className="flex items-center gap-1 bg-amber-500 text-white text-xs font-black uppercase px-2 py-0.5 rounded shadow-sm">
      Correction Issued
    </div>
  );
}

export function ConfidenceBadge({ confidence, label }: { confidence?: number; label?: string }) {
  if (!label) return null;
  
  const colors = {
    confirmed: "bg-emerald-600 text-white",
    developing: "bg-blue-600 text-white",
    disputed: "bg-red-600 text-white animate-pulse"
  };

  const icons = {
    confirmed: "✓",
    developing: "•",
    disputed: "!"
  };

  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider ${colors[label as keyof typeof colors] || colors.developing}`}>
      <span className="font-bold">{icons[label as keyof typeof icons] || icons.developing}</span>
      {displayLabel}
    </div>
  );
}

export function DivergenceWarning({ score }: { score?: number }) {
  if (!score || score < 60) return null;
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 text-amber-400 border border-amber-400/30 text-xs font-black uppercase tracking-tight">
      ⚠️ High Narrative Divergence
    </div>
  );
}

export function BlindspotBadge({ score, side }: { score?: number; side?: string | null }) {
  if (!score || score < 60 || !side) return null;
  
  const displaySide = side.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <div className="flex items-center gap-1 bg-purple-600/90 text-white text-xs font-black uppercase px-2 py-0.5 rounded shadow-sm border border-purple-400/30">
      <span className="opacity-90">👀</span> {displaySide} Blindspot
    </div>
  );
}
