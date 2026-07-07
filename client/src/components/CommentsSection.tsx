/**
 * CommentsSection Component
 * 
 * Displays and manages comments on article/cluster pages.
 * - Anonymous posting allowed
 * - Voting requires authentication
 * - Shows vote counts
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp, ThumbsDown, MessageSquare, AlertCircle } from "lucide-react";

interface Comment {
  id: string;
  clusterId: string;
  content: string;
  displayHandle: string;
  parentId: string | null;
  createdAt: string;
  upvotes?: number;
  downvotes?: number;
  voteScore?: number;
  replyCount?: number;
  userVote?: number;
}

interface CommentsSectionProps {
  clusterId: string;
}

export function CommentsSection({ clusterId }: CommentsSectionProps) {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch comments
  const { data: commentsData, isLoading } = useQuery({
    queryKey: ["/api/social/clusters", clusterId, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/social/clusters/${clusterId}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
  });

  // Post comment mutation
  const postMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/social/clusters/${clusterId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, isAnonymous: !isAuthenticated }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to post comment");
      }
      return response.json();
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/social/clusters", clusterId, "comments"] });
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ commentId, value }: { commentId: string; value: 1 | -1 }) => {
      const response = await fetch(`/api/social/comments/${commentId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value }),
      });
      if (!response.ok) throw new Error("Failed to vote");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/clusters", clusterId, "comments"] });
    },
  });

  const comments: Comment[] = commentsData || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await postMutation.mutateAsync(newComment);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = (commentId: string, value: 1 | -1) => {
    if (!isAuthenticated) {
      alert("Please log in to vote on comments");
      return;
    }
    voteMutation.mutate({ commentId, value });
  };

  // Top-level comments only (no replies in this simple version)
  const topLevelComments = comments.filter(c => !c.parentId);

  return (
    <section className="border-t-[1.5px] border-dashed border-hairline-dashed pt-8 mt-12 mb-12">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b-[1.5px] border-hairline text-eyebrow text-ink tracking-[0.2em]">
        <MessageSquare className="w-5 h-5 text-ink-muted" />
        <h3 className="uppercase">
          PUBLIC SENSOR · DOSSIER LOGS ({comments.length})
        </h3>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-12">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={isAuthenticated ? "TRANSMIT INTELLIGENCE..." : "LOG IN TO TRANSMIT..."}
          disabled={isSubmitting}
          className="mb-4 min-h-[120px] bg-card-surface border-[1.5px] border-dashed border-hairline-dashed rounded-none font-serif text-[16px] resize-none focus-visible:ring-1 focus-visible:ring-lens-cyan text-ink"
        />
        <div className="flex justify-between items-center">
          <span className="text-mono-metadata text-ink-muted uppercase tracking-[0.2em]">
            {isAuthenticated ? "SECURE TRANSMISSION" : "ANONYMOUS TRANSMISSION"}
          </span>
          <Button 
            type="submit" 
            disabled={!newComment.trim() || isSubmitting}
            className="rounded-none bg-signal-yellow hover:bg-signal-yellow/90 text-black font-mono font-bold text-[11px] tracking-widest uppercase px-8 h-10"
          >
            {isSubmitting ? "TRANSMITTING..." : "TRANSMIT LOG"}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-none" />
          <Skeleton className="h-24 w-full rounded-none" />
        </div>
      ) : topLevelComments.length === 0 ? (
        <div className="text-center py-12 border-[1.5px] border-dashed border-hairline-dashed bg-card-surface">
          <MessageSquare className="w-8 h-8 mx-auto mb-4 text-ink-muted opacity-50" />
          <p className="text-mono-metadata text-ink-muted uppercase tracking-[0.2em]">NO LOGS RECORDED. BE THE FIRST TO TRANSMIT.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {topLevelComments.map((comment) => (
            <div key={comment.id} className="border-b-[1.5px] border-dashed border-hairline-dashed pb-6 last:border-0 relative">
              <div className="absolute -left-[2px] top-2 w-[1.5px] h-full bg-lens-cyan opacity-20" />
              <div className="pl-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-[11px] font-bold text-ink uppercase tracking-widest bg-paper border-[1.5px] border-hairline px-2 py-0.5">
                    {comment.displayHandle || "ANONYMOUS"}
                  </span>
                  <span className="text-mono-metadata text-ink-muted uppercase">
                    {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : ""}
                  </span>
                </div>
                
                <p className="font-serif text-[18px] text-ink mb-4 leading-[1.6]">
                  {comment.content}
                </p>
                
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => handleVote(comment.id, 1)}
                    className={`flex items-center gap-1.5 text-mono-metadata transition-colors ${
                      comment.userVote === 1 ? "text-lens-cyan" : "text-ink-muted hover:text-lens-cyan"
                    }`}
                    disabled={!isAuthenticated}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{comment.upvotes || 0}</span>
                  </button>
                  
                  <button
                    onClick={() => handleVote(comment.id, -1)}
                    className={`flex items-center gap-1.5 text-mono-metadata transition-colors ${
                      comment.userVote === -1 ? "text-wire-red" : "text-ink-muted hover:text-wire-red"
                    }`}
                    disabled={!isAuthenticated}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    <span>{comment.downvotes || 0}</span>
                  </button>
                  
                  {!isAuthenticated && (
                    <span className="text-mono-metadata text-ink-muted/50 flex items-center gap-1.5 ml-auto">
                      <AlertCircle className="w-3 h-3" />
                      SECURE LOGIN REQUIRED TO VERIFY
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}