import { useMemo } from "react";
import type { ArticleWithDetails } from "@shared/schema";
import { Info, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ContextDiffPanelProps {
  activeArticle: ArticleWithDetails;
  clusterArticles: ArticleWithDetails[];
}

// Helper to reliably pull entities (or simulate them if missing)
const extractEntities = (article: ArticleWithDetails): string[] => {
  const entities: string[] = [];
  
  if (article.entities) {
    if (Array.isArray(article.entities)) {
      entities.push(...article.entities.filter(e => typeof e === 'string'));
    } else if (typeof article.entities === 'object') {
      Object.values(article.entities).forEach((val: any) => {
        if (Array.isArray(val)) {
          entities.push(...val.filter(v => typeof v === 'string'));
        }
      });
    }
  }

  // Fallback heuristic: Extract capitalized noun phrases from AI Insights or excerpt
  if (entities.length === 0) {
    const text = (article.aiInsights?.join(" ") || article.excerpt || "").slice(0, 500);
    const matches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
    if (matches) {
      // Filter out common sentence starters
      const filtered = matches.filter((m: string) => m.length > 3 && !["The", "This", "That", "There", "Here", "It", "They", "We", "He", "She", "But", "And", "Or"].includes(m));
      entities.push(...filtered);
    }
  }

  // Deduplicate and normalize
  return Array.from(new Set(entities.map(e => e.trim())));
};

export function ContextDiffPanel({ activeArticle, clusterArticles }: ContextDiffPanelProps) {
  const missingContext = useMemo(() => {
    if (!activeArticle || !clusterArticles || clusterArticles.length <= 1) return [];

    const activeEntities = new Set(extractEntities(activeArticle).map(e => e.toLowerCase()));
    const missing = new Map<string, { entity: string; mentionedBy: string[] }>();

    clusterArticles.forEach(article => {
      if (article.id === activeArticle.id) return;

      const entities = extractEntities(article);
      entities.forEach(entity => {
        const lower = entity.toLowerCase();
        if (!activeEntities.has(lower)) {
          const existing = missing.get(lower) || { entity, mentionedBy: [] };
          if (article.publisher?.name && !existing.mentionedBy.includes(article.publisher.name)) {
            existing.mentionedBy.push(article.publisher.name);
          }
          missing.set(lower, existing);
        }
      });
    });

    // Only show entities that are mentioned by at least one other source, sort by how many sources mention it
    return Array.from(missing.values())
      .filter(m => m.mentionedBy.length > 0)
      .sort((a, b) => b.mentionedBy.length - a.mentionedBy.length)
      .slice(0, 6); // Top 6 missing entities
  }, [activeArticle, clusterArticles]);

  if (missingContext.length === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest flex items-center gap-2">
           <EyeOff className="w-4 h-4" />
           What This Article Left Out
        </p>
        <div className="group relative">
          <Info className="w-3.5 h-3.5 text-zinc-400 cursor-help" />
          <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl font-sans z-20">
            <strong>Context Diff:</strong> This panel highlights people, places, and facts mentioned by other sources covering this story, but omitted by {activeArticle.publisher?.name || "this source"}.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {missingContext.map((item) => (
            <motion.div
              key={item.entity}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 shadow-sm flex flex-col justify-between"
            >
              <p className="font-bold text-sm text-foreground mb-2">{item.entity}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                Mentioned by: <span className="text-zinc-600 dark:text-zinc-400">{item.mentionedBy.slice(0, 2).join(", ")}{item.mentionedBy.length > 2 ? ` +${item.mentionedBy.length - 2}` : ''}</span>
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
