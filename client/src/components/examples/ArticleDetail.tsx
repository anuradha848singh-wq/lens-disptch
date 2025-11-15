import { ThemeProvider } from "../ThemeProvider";
import ArticleDetail from "@/pages/ArticleDetail";
import { Router } from "wouter";

export default function ArticleDetailExample() {
  return (
    <ThemeProvider>
      <Router>
        <ArticleDetail />
      </Router>
    </ThemeProvider>
  );
}
