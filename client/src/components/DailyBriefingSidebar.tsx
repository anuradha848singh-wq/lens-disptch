import { Link } from "wouter";
import { type ArticleWithDetails } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { PublisherLogo } from "./PublisherLogo";

export function DailyBriefingSidebar({ articles }: { articles: ArticleWithDetails[] }) {
  if (!articles || articles.length === 0) {
    return (
      <div className="overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <h2 className="text-[22px] font-sans font-bold tracking-tight text-foreground">Top Stories</h2>
          <a href="#" className="text-xs text-muted-foreground hover:text-foreground">View all</a>
        </div>
        <div className="divide-y divide-border/40">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="py-4 space-y-1.5">
              <div className="h-2.5 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-2 w-1/2 bg-muted/60 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalSources = articles.reduce((acc, a) => acc + (a.sourceCount || 1), 0);

  return (
    <div className="bg-white border border-border shadow-sm rounded-sm overflow-hidden sticky top-20">
      <div className="p-5 border-b-2 border-primary">
        <h2 className="text-xl font-display font-black uppercase tracking-tight text-foreground leading-none">
          Daily Briefing
        </h2>
        <div className="flex items-center gap-2 mt-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
          <span className="text-primary">{articles.length} STORIES</span>
          <span>·</span>
          <span>{totalSources} ARTICLES</span>
        </div>
      </div>
      
      <div className="divide-y divide-border/40">
        {articles.map((article, i) => {
          const timeAgo = article.publishedAt
            ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: false }).replace('about ', '').replace(' minutes', 'm').replace(' hours', 'h') + ' ago'
            : "recently";
            
          return (
            <Link key={article.id} href={`/article/${article.id}`}>
              <div className="py-4 cursor-pointer group hover:bg-secondary/10 transition-colors flex items-start gap-3 px-4">
                <span className="text-xs font-black text-primary w-4 text-right pt-0.5">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <PublisherLogo name={article.publisher?.name ?? "??"} domain={article.publisher?.website} size="xs" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate flex-1">
                      {article.publisher?.name}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground/60 whitespace-nowrap">{timeAgo}</span>
                  </div>
                  <h4 className="text-[14px] font-serif font-black leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h4>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/40">
        <button className="w-full py-3 text-xs font-black text-foreground uppercase tracking-widest border border-border/60 rounded hover:bg-secondary transition-colors">
          VIEW ALL STORIES →
        </button>
      </div>
    </div>
  );
}
