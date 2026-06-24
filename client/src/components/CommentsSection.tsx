import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MessageSquare, ThumbsUp, ThumbsDown, CornerDownRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";

export function CommentsSection({ clusterId }: { clusterId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", clusterId],
    queryFn: () => api.social.getComments(clusterId),
  });

  const postMutation = useMutation({
    mutationFn: (data: { content: string; parentId: string | null; isAnonymous: boolean }) =>
      api.social.postComment(clusterId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", clusterId] });
      setNewComment("");
      setReplyTo(null);
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({ commentId, value }: { commentId: string; value: number }) =>
      api.social.voteComment(commentId, value),
    onMutate: async ({ commentId, value }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", clusterId] });
      const previousComments = queryClient.getQueryData<any[]>(["comments", clusterId]);

      // Optimistic update
      queryClient.setQueryData(["comments", clusterId], (old: any[]) =>
        old?.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              upvotes: value === 1 ? c.upvotes + 1 : c.upvotes,
              downvotes: value === -1 ? c.downvotes + 1 : c.downvotes,
            };
          }
          return c;
        })
      );

      return { previousComments };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(["comments", clusterId], context.previousComments);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    postMutation.mutate({ content: newComment, parentId: replyTo, isAnonymous });
  };

  const topLevelComments = comments.filter((c: any) => !c.parentId);
  const getReplies = (parentId: string) => comments.filter((c: any) => c.parentId === parentId);

  if (isLoading) {
    return <div className="animate-pulse flex space-x-4">Loading comments...</div>;
  }

  const CommentCard = ({ comment, isReply = false }: { comment: any; isReply?: boolean }) => {
    const replies = getReplies(comment.id);
    
    return (
      <div className={`flex flex-col gap-2 ${isReply ? "ml-12 border-l-2 border-muted pl-4 mt-4" : "mt-6"}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-border">
              {comment.user?.avatarUrl && !comment.isAnonymous ? (
                <AvatarImage src={comment.user.avatarUrl} />
              ) : (
                <AvatarFallback>{comment.isAnonymous ? "A" : comment.user?.displayName?.charAt(0) || "U"}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                {comment.isAnonymous ? "Anonymous Reader" : (comment.user?.displayName || "Unknown User")}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        <p className="text-sm text-foreground mt-2 leading-relaxed whitespace-pre-wrap">{comment.content}</p>

        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1 bg-muted/50 rounded-full px-2 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-primary/20 hover:text-primary transition-colors"
              onClick={() => voteMutation.mutate({ commentId: comment.id, value: 1 })}
              disabled={!user}
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <span className="text-xs font-medium min-w-[12px] text-center">
              {comment.upvotes - comment.downvotes}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors"
              onClick={() => voteMutation.mutate({ commentId: comment.id, value: -1 })}
              disabled={!user}
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
            disabled={!user}
          >
            <CornerDownRight className="h-3 w-3 mr-1" /> Reply
          </Button>
        </div>

        {replyTo === comment.id && (
          <div className="mt-4 ml-2">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 relative">
              <Textarea
                placeholder="Write a reply..."
                className="resize-none bg-background border-muted min-h-[80px]"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch id="anon-reply" checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                  <Label htmlFor="anon-reply" className="text-xs text-muted-foreground">Post anonymously</Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" type="button" onClick={() => setReplyTo(null)}>Cancel</Button>
                  <Button size="sm" type="submit" disabled={postMutation.isPending || !newComment.trim()}>
                    Reply
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {replies.length > 0 && (
          <div className="flex flex-col gap-2">
            {replies.map(reply => (
              <CommentCard key={reply.id} comment={reply} isReply={true} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full mt-8 rounded-xl border border-border bg-card/40 p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold tracking-tight">Community Discussion</h3>
        <span className="ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
          {comments.length}
        </span>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-8 flex flex-col gap-3">
          <Textarea
            placeholder={replyTo ? "Finish your reply below..." : "What are your thoughts on this story?"}
            className="resize-none bg-background focus-visible:ring-primary min-h-[100px]"
            value={replyTo ? "" : newComment}
            onChange={(e) => !replyTo && setNewComment(e.target.value)}
            disabled={!!replyTo}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch id="anonymous" checked={isAnonymous} onCheckedChange={setIsAnonymous} disabled={!!replyTo} />
              <Label htmlFor="anonymous" className="text-sm text-muted-foreground cursor-pointer">
                Post anonymously
              </Label>
            </div>
            <Button type="submit" disabled={postMutation.isPending || !!replyTo || !newComment.trim()}>
              {postMutation.isPending ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 border border-dashed border-muted rounded-lg bg-muted/20 text-center">
          <p className="text-sm text-muted-foreground">Sign in to join the discussion.</p>
        </div>
      )}

      <div className="flex flex-col gap-4 divide-y divide-border/50">
        {topLevelComments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No comments yet. Be the first to share your perspective!
          </p>
        ) : (
          topLevelComments.map(comment => (
            <CommentCard key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
}
