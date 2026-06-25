/**
 * useOptimisticBookmark — Zero-latency bookmark interactions.
 *
 * Pattern: Instant UI update → silent background API call → rollback on failure.
 * Result: Bookmark icon flips immediately with a pop animation. User never waits.
 *
 * Also: Persists bookmark IDs to localStorage so the icon state is correct
 * before the /api/bookmarks network response arrives on page load.
 */
import { useCallback, useEffect, useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

const LS_KEY = "dispatch_bookmarks";

// ── LocalStorage helpers ─────────────────────────────────────────────────
function loadLocalBookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch (_) {}
  return new Set();
}

function saveLocalBookmarks(ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
  } catch (_) {}
}

// ── Singleton local state (shared across all card instances) ─────────────
// We use module-level state so every StoryCard on the page reflects the same
// bookmark state without needing a React context or global store.
let _localBookmarks: Set<string> = loadLocalBookmarks();
const _listeners: Set<() => void> = new Set();

function notifyListeners() {
  _listeners.forEach(fn => fn());
}

function addLocalBookmark(id: string) {
  _localBookmarks = new Set([..._localBookmarks, id]);
  saveLocalBookmarks(_localBookmarks);
  notifyListeners();
}

function removeLocalBookmark(id: string) {
  _localBookmarks = new Set([..._localBookmarks].filter(x => x !== id));
  saveLocalBookmarks(_localBookmarks);
  notifyListeners();
}

// ── Hook ─────────────────────────────────────────────────────────────────
export function useOptimisticBookmark(articleId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Subscribe to module-level bookmark state so all cards update together
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const notify = () => forceUpdate(n => n + 1);
    _listeners.add(notify);
    return () => { _listeners.delete(notify); };
  }, []);

  // Sync server bookmarks into local state when they load
  useEffect(() => {
    const serverData = queryClient.getQueryData<{ id: string }[]>(["/api/bookmarks"]);
    if (serverData) {
      serverData.forEach(b => addLocalBookmark(b.id));
    }
  }, [queryClient]);

  const isBookmarked = _localBookmarks.has(articleId);

  const { mutate: toggleBookmark, isPending } = useMutation({
    mutationFn: async (nextState: boolean) => {
      if (nextState) {
        return api.bookmarks.add(articleId);
      } else {
        return api.bookmarks.remove(articleId);
      }
    },
    onMutate: async (nextState: boolean) => {
      // 1. Cancel any in-flight bookmark queries
      await queryClient.cancelQueries({ queryKey: ["/api/bookmarks"] });

      // 2. Optimistic update — instant UI flip
      if (nextState) {
        addLocalBookmark(articleId);
      } else {
        removeLocalBookmark(articleId);
      }

      // 3. Save snapshot for rollback
      const previousBookmarks = queryClient.getQueryData(["/api/bookmarks"]);
      return { previousBookmarks, previousState: !nextState };
    },
    onError: (_err, nextState, context) => {
      // Rollback the optimistic update
      if (context?.previousState) {
        addLocalBookmark(articleId);
      } else {
        removeLocalBookmark(articleId);
      }
      toast({
        title: "Bookmark failed",
        description: "Could not save your bookmark. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (_, nextState) => {
      // Invalidate the server bookmark list in background
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
    },
  });

  const toggle = useCallback(() => {
    if (!user) {
      toast({
        title: "Sign in to bookmark",
        description: "Create a free account to save stories for later.",
      });
      return;
    }
    toggleBookmark(!isBookmarked);
  }, [user, isBookmarked, toggleBookmark, toast]);

  return { isBookmarked, toggle, isPending };
}

// ── Read-state tracking (no server round-trip) ───────────────────────────
const READ_KEY = "dispatch_read_ids";

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch (_) {}
  return new Set();
}

let _readIds: Set<string> = loadReadIds();

export function markArticleRead(articleId: string) {
  _readIds = new Set([..._readIds, articleId]);
  try {
    // Keep max 1000 IDs to avoid unbounded storage growth
    const arr = [..._readIds].slice(-1000);
    localStorage.setItem(READ_KEY, JSON.stringify(arr));
  } catch (_) {}
}

export function isArticleRead(articleId: string): boolean {
  return _readIds.has(articleId);
}
