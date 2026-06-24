import { type ArticleWithDetails } from "@shared/schema";
import { Link } from "wouter";
import { deriveBias } from "@/lib/bias-utils";

interface BiasSpectrumStripProps {
  articles: ArticleWithDetails[];
}

export function BiasSpectrumStrip({ articles }: BiasSpectrumStripProps) {
  const left = articles.filter(a => deriveBias(a) === "left").length;
  const center = articles.filter(a => deriveBias(a) === "center").length;
  const right = articles.filter(a => deriveBias(a) === "right").length;
  const total = left + center + right;

  if (total === 0) {
    return (
      <div className="w-full bg-white border-y border-border py-3 mb-12 shadow-sm">
        <div className="max-w-[1500px] mx-auto px-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">
            Loading perspective data...
          </p>
        </div>
      </div>
    );
  }

  const lp = Math.round((left / total) * 100);
  const cp = Math.round((center / total) * 100);
  const rp = 100 - lp - cp;

  return (
    <div className="w-full bg-white border-y border-border/60 py-6 mb-12 shadow-sm">
      <div className="flex flex-col xl:flex-row items-center justify-between gap-8 xl:gap-16 px-4">
        
        {/* Left Stats Info */}
        <div className="flex flex-col shrink-0 min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            </div>
            <h2 className="text-xs font-black uppercase tracking-[.2em] text-foreground leading-none">
              Global Perspective<br/>Spectrum
            </h2>
          </div>
          <p className="text-[10px] font-medium text-muted-foreground leading-tight mb-4 max-w-[200px]">
            Analyzing transparency across {total} articles today
          </p>
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
            <span className="text-foreground">6 Perspectives</span> · 12 SOURCES<br/>
            ACROSS LEFT, CENTER & RIGHT
          </div>
        </div>

        {/* Center Bar */}
        <div className="flex-1 flex flex-col gap-3 w-full">
          <div className="flex justify-between gap-2 text-[10px] font-black uppercase tracking-widest leading-none">
            <span className="text-blue-600 truncate">Left Coverage {lp}%</span>
            <span className="text-slate-500 truncate">Centered {cp}%</span>
            <span className="text-red-600 truncate">Right Coverage {rp}%</span>
          </div>
          
          <div className="h-3 w-full bg-secondary/30 rounded-full overflow-hidden flex">
            <div className="bg-blue-600 h-full transition-all duration-1000 ease-out" style={{ width: `${lp}%` }} />
            <div className="bg-slate-400 h-full transition-all duration-1000 ease-out" style={{ width: `${cp}%` }} />
            <div className="bg-red-600 h-full transition-all duration-1000 ease-out" style={{ width: `${rp}%` }} />
          </div>
          
          <div className="flex justify-between gap-2 text-[15px] font-black text-foreground uppercase tracking-tight mt-1">
            <span className="truncate">{left} <span className="text-[9px] text-muted-foreground ml-1">LEFT REPORTS</span></span>
            <span className="truncate">{center} <span className="text-[9px] text-muted-foreground ml-1">CENTER REPORTS</span></span>
            <span className="truncate">{right} <span className="text-[9px] text-muted-foreground ml-1">RIGHT REPORTS</span></span>
          </div>
        </div>

        {/* Right Status Box */}
        <div className="hidden xl:flex shrink-0 items-center gap-6 pl-10 border-l border-border/40">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-muted-foreground mb-3">Daily Lean<br/>Status</span>
            <div className="text-lg font-black uppercase tracking-tight text-foreground leading-none mb-1">
              {lp > rp + 10 ? "Left Lean" : rp > lp + 10 ? "Right Lean" : "Balanced"}
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Coverage<br/>Today</span>
          </div>
          <div className="text-foreground">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"></path><rect x="4" y="9" width="16" height="10" rx="2"></rect><path d="M12 9V5"></path><path d="M8 5h8"></path></svg>
          </div>
        </div>
      </div>
    </div>
  );
}
