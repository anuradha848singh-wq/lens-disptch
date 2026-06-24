import React, { useEffect, Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/auth-context";
import { CookieConsent } from "@/components/CookieConsent";
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
    // Send to structured log system
    logComponentError(error, info.componentStack || undefined);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center space-y-6 max-w-md">
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
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-accent-editorial text-white rounded-sm font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center text-muted-foreground uppercase text-xs font-black tracking-widest">Loading...</div>}>
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
            <Toaster />
            <CookieConsent />
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
