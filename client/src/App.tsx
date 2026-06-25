import React, { useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/auth-context";
import { CookieConsent } from "@/components/CookieConsent";
import { CountryProfileProvider } from "@/hooks/useCountryProfile";
import { initClientLogger, logComponentError, flushClientLogs } from "@/lib/logger";

const HomePage = lazy(() => import("@/pages/HomePage"));
const ArticleDetail = lazy(() => import("@/pages/ArticleDetail"));
const EditorDashboard = lazy(() => import("@/pages/EditorDashboard"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const BookmarksPage = lazy(() => import("@/pages/BookmarksPage"));
const PublishersPage = lazy(() => import("@/pages/PublishersPage"));
const BlindspotPage = lazy(() => import("@/pages/BlindspotPage"));
const MyBiasPage = lazy(() => import("@/pages/MyBiasPage"));
const ReadingHistoryPage = lazy(() => import("@/pages/ReadingHistoryPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ComparePage = lazy(() => import("@/pages/ComparePage"));
const SystemDashboard = lazy(() => import("@/pages/SystemDashboard"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const FactualityPage = lazy(() => import("@/pages/FactualityPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const NotFound = lazy(() => import("@/pages/not-found"));

// ── Scroll Restoration ────────────────────────────────────────────────────
// Saves scroll position per route in sessionStorage so Back navigation
// returns to the exact pixel the user was at. Zero network calls.
const SCROLL_KEY_PREFIX = "dispatch_scroll:";

export function saveScrollPosition(path: string) {
  try {
    sessionStorage.setItem(SCROLL_KEY_PREFIX + path, String(Math.round(window.scrollY)));
  } catch (_) {}
}

export function restoreScrollPosition(path: string) {
  try {
    const saved = sessionStorage.getItem(SCROLL_KEY_PREFIX + path);
    if (saved !== null) {
      // Use instant (not smooth) so the user doesn't see an animated scroll on back
      window.scrollTo({ top: parseInt(saved, 10), behavior: "instant" as ScrollBehavior });
      return true;
    }
  } catch (_) {}
  return false;
}

// ── Page Loading Skeleton (replaces "Loading..." text) ───────────────────
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Nav skeleton */}
      <div className="h-14 bg-card border-b border-border" />
      <div className="h-10 bg-card border-b border-border" />
      <div className="h-9 bg-muted border-b border-border" />
      {/* Content skeleton */}
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        <div className="flex gap-8">
          <div className="hidden xl:block w-60 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-muted rounded animate-shimmer" />)}
          </div>
          <div className="flex-1 space-y-6">
            <div className="h-[420px] bg-muted rounded-xl animate-shimmer" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="rounded-xl overflow-hidden border border-border">
                  <div className="aspect-[16/10] bg-muted animate-shimmer" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-muted rounded animate-shimmer w-1/3" />
                    <div className="h-5 bg-muted rounded animate-shimmer" />
                    <div className="h-5 bg-muted rounded animate-shimmer w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden xl:block w-72 space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-muted rounded animate-shimmer" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Error Boundary ───────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage?: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    logComponentError(error, info.componentStack || undefined);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center space-y-6 max-w-md animate-fade-in-up">
            <div className="text-6xl">📰</div>
            <h1 className="text-2xl font-display font-black text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The application encountered an unexpected error. Please try refreshing the page.
            </p>
            {this.state.errorMessage && (
              <code className="text-xs bg-secondary px-3 py-2 rounded block text-left text-muted-foreground">
                {this.state.errorMessage}
              </code>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-6 py-3 bg-secondary text-foreground rounded-sm font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-accent-editorial text-white rounded-sm font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    // If we've visited this path before, restore scroll. 
    // Otherwise, scroll to top.
    if (!restoreScrollPosition(location)) {
      window.scrollTo(0, 0);
    }
    
    return () => saveScrollPosition(location);
  }, [location]);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/article/:id" component={ArticleDetail} />
        <Route path="/dashboard" component={EditorDashboard} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/system" component={SystemDashboard} />
        <Route path="/bookmarks" component={BookmarksPage} />
        <Route path="/publishers" component={PublishersPage} />
        <Route path="/blindspot" component={BlindspotPage} />
        <Route path="/my-bias" component={MyBiasPage} />
        <Route path="/history" component={ReadingHistoryPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/for-you" component={HomePage} />
        <Route path="/compare/:clusterId" component={ComparePage} />
        <Route path="/factuality" component={FactualityPage} />
        <Route path="/profile/:id" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  // Initialize client-side error capture on mount
  useEffect(() => {
    initClientLogger();
    // Flush logs on page unload so nothing is lost
    const handleUnload = () => flushClientLogs();
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <CountryProfileProvider>
              <Toaster />
              <CookieConsent />
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </CountryProfileProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
