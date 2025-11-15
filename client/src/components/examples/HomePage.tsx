import { ThemeProvider } from "../ThemeProvider";
import HomePage from "@/pages/HomePage";
import { Router } from "wouter";

export default function HomePageExample() {
  return (
    <ThemeProvider>
      <Router>
        <HomePage />
      </Router>
    </ThemeProvider>
  );
}
