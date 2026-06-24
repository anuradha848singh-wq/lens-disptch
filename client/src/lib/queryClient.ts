import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000, // 1 minute
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Stale-While-Revalidate Query Cache Persistence
if (typeof window !== "undefined") {
  // Load cached queries on boot
  try {
    const cachedData = localStorage.getItem("dispatch_news_cache");
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          if (item.queryKey && item.data) {
            queryClient.setQueryData(item.queryKey, item.data);
          }
        });
      }
    }
  } catch (e) {
    console.error("[QueryCache] Failed to restore news cache:", e);
  }

  // Subscribe to changes to persist whitelisted endpoints
  const whitelist = ["/api/homepage", "/api/categories", "/api/blindspots", "/api/trending"];
  
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "success") {
      const queries = queryClient.getQueryCache().getAll();
      const toSave = queries
        .filter(q => {
          if (q.state.status !== "success") return false;
          const firstKey = Array.isArray(q.queryKey) ? q.queryKey[0] : null;
          return typeof firstKey === "string" && whitelist.includes(firstKey);
        })
        .map(q => ({
          queryKey: q.queryKey,
          data: q.state.data
        }));

      try {
        localStorage.setItem("dispatch_news_cache", JSON.stringify(toSave));
      } catch (e) {
        console.warn("[QueryCache] Storage limit reached, failed to persist:", e);
      }
    }
  });
}

