import React, { useEffect, Suspense, lazy, useRef } from "react";
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
import { motion, AnimatePresence } from "framer-motion";

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
      window.scrollTo({ top: parseInt(saved, 10), behavior: "instant" as ScrollBehavior });
      return true;
    }
  } catch (_) {}
  return false;
}

// ── Lightweight inline skeleton (no layout shift) ─────────────────────────
// Shows a subtle opacity fade rather than a huge skeleton layout
function PageFader() {
  return (
    <div
      className="min-h-screen bg-background"
      style={{ animation: "fadeIn 0.15s ease-out" }}
    />
  );
}

// ── Page transition wrapper ───────────────────────────────────────────────
// A very subtle fade+slide (80ms) that feels instant but signals navigation
const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: "easeOut" } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.12, ease: "easeIn" } },
};

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
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
  // Track which locations we've visited — only restore scroll on back-nav
  const prevLocation = useRef<string | null>(null);

  useEffect(() => {
    const previous = prevLocation.current;
    prevLocation.current = location;

    // Restore scroll only if navigating BACK to a seen path
    if (previous !== null && !restoreScrollPosition(location)) {
      window.scrollTo(0, 0);
    }

    return () => saveScrollPosition(location);
  }, [location]);

  // Key for AnimatePresence — change only on real page changes, NOT search param changes
  // This prevents a flash when only filters/query params update on the same page
  const pageKey = location.split("?")[0];

  return (
    // keepMounted={false} + mode="wait" ensures old page fully fades out before new one in
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<PageFader />} key={pageKey}>
        <PageTransition key={pageKey}>
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
        </PageTransition>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    initClientLogger();
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
