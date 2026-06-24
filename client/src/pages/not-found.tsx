import { Link } from "wouter";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { motion } from "framer-motion";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNav onSearch={() => {}} searchQuery="" />

      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <motion.div
          className="text-center max-w-lg mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Large editorial number */}
          <div className="mb-6 relative">
            <span className="font-display font-black text-[120px] md:text-[160px] leading-none text-border/60 select-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl">📰</span>
            </div>
          </div>

          <div className="border-t-2 border-b border-primary pt-4 pb-6 mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight mb-2">
              Story Not Found
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
              The page you're looking for may have been removed, renamed, or is
              temporarily unavailable. Return to the front page for the latest coverage.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/">
              <button className="flex items-center gap-2 px-6 py-3 bg-foreground text-background text-xs font-black uppercase tracking-widest hover:bg-accent-editorial transition-colors">
                <Home className="w-3.5 h-3.5" />
                Back to Front Page
              </button>
            </Link>
            <Link href="/blindspot">
              <button className="flex items-center gap-2 px-6 py-3 border border-border text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
                <Search className="w-3.5 h-3.5" />
                Explore Blindspot
              </button>
            </Link>
          </div>

          <p className="mt-10 text-xs font-serif italic text-muted-foreground/60">
            The Lens Dispatch — Covering every story, from every side.
          </p>
        </motion.div>
      </main>

      <NewsFooter />
    </div>
  );
}
