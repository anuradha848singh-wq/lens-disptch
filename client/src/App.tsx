import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/auth-context";
import HomePage from "@/pages/HomePage";
import ArticleDetail from "@/pages/ArticleDetail";
import EditorDashboard from "@/pages/EditorDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import BookmarksPage from "@/pages/BookmarksPage";
import PublishersPage from "@/pages/PublishersPage";
import BlindspotPage from "@/pages/BlindspotPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/article/:id" component={ArticleDetail} />
      <Route path="/dashboard" component={EditorDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/bookmarks" component={BookmarksPage} />
      <Route path="/publishers" component={PublishersPage} />
      <Route path="/blindspot" component={BlindspotPage} />
      <Route path="/for-you" component={HomePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
