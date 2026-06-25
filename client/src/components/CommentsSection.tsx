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
    <section className="border-t border-border pt-6 mt-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-bold text-foreground">
          Discussion ({comments.length})
        </h3>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={isAuthenticated ? "Share your perspective..." : "Log in to join the discussion..."}
          disabled={isSubmitting}
          className="mb-3 min-h-[100px]"
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {isAuthenticated ? "Posting as your username" : "Posting anonymously"}
          </span>
          <Button 
            type="submit" 
            disabled={!newComment.trim() || isSubmitting}
            className="bg-accent-interactive hover:bg-accent-interactive/90"
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : topLevelComments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No comments yet. Be the first to share your perspective!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevelComments.map((comment) => (
            <div key={comment.id} className="border-b border-border pb-4 last:border-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-foreground">
                  {comment.displayHandle || "Anonymous"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : ""}
                </span>
              </div>
              
              <p className="text-sm text-foreground mb-3 leading-relaxed">
                {comment.content}
              </p>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleVote(comment.id, 1)}
                  className={`flex items-center gap-1 text-xs font-bold transition-colors ${
                    comment.userVote === 1 ? "text-green-600" : "text-muted-foreground hover:text-green-600"
                  }`}
                  disabled={!isAuthenticated}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{comment.upvotes || 0}</span>
                </button>
                
                <button
                  onClick={() => handleVote(comment.id, -1)}
                  className={`flex items-center gap-1 text-xs font-bold transition-colors ${
                    comment.userVote === -1 ? "text-red-600" : "text-muted-foreground hover:text-red-600"
                  }`}
                  disabled={!isAuthenticated}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>{comment.downvotes || 0}</span>
                </button>
                
                {!isAuthenticated && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Log in to vote
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}