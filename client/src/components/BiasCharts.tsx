import { useMemo, useState } from "react";
import { BiasChip } from "./BiasBar";
import { format, formatDistanceToNow } from "date-fns";
import { PublisherLogo } from "./PublisherLogo";

interface DonutProps {
  left: number;
  center: number;
  right: number;
  total: number;
  onCompareClick?: () => void;
}

// 1. Trends Coverage (Overlapping Circles / Venn Diagram style)
export function TrendsDonut({ left, center, right, total, onCompareClick }: DonutProps) {
  const t = left + center + right || 1;
  const lP = Math.round((left / t) * 100);
  const cP = Math.round((center / t) * 100);
  const rP = Math.round((right / t) * 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground">Trends Coverage</h4>
        <div className="flex items-center text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded">
          <span className="text-blue-600">L {lP}%</span>
          <span className="mx-1 text-border">|</span>
          <span className="text-muted-foreground">C {cP}%</span>
          <span className="mx-1 text-border">|</span>
          <span className="text-red-600">R {rP}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between bg-secondary/20 rounded-xl p-4 border border-border">
        {/* Overlapping Circles */}
        <div className="relative h-20 w-52 flex items-center justify-center">
          {/* Left Circle */}
          <div className="absolute left-0 w-20 h-20 rounded-full border-[6px] border-blue-500/20 flex flex-col items-center justify-center bg-card shadow-sm z-10 transition-transform hover:scale-105 hover:z-40">
            <span className="text-lg font-black text-blue-600 leading-none">{lP}%</span>
            <span className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase mt-0.5">Left</span>
          </div>
          {/* Center Circle */}
          <div className="absolute left-16 w-20 h-20 rounded-full border-[6px] border-muted/40 flex flex-col items-center justify-center bg-card shadow-sm z-20 transition-transform hover:scale-105 hover:z-40">
            <span className="text-lg font-black text-muted-foreground leading-none">{cP}%</span>
            <span className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase mt-0.5">Center</span>
          </div>
          {/* Right Circle */}
          <div className="absolute left-32 w-20 h-20 rounded-full border-[6px] border-red-500/20 flex flex-col items-center justify-center bg-card shadow-sm z-30 transition-transform hover:scale-105 hover:z-40">
            <span className="text-lg font-black text-red-600 leading-none">{rP}%</span>
            <span className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase mt-0.5">Right</span>
          </div>
        </div>

        {/* Total Stories Text */}
        <div className="flex flex-col items-center justify-center text-center pl-4 border-l border-border">
           <span className="text-3xl font-black text-foreground leading-none">{total}</span>
           <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mt-1">Stories</span>
        </div>
      </div>
      
      <div 
        className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mt-4 px-2 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors"
        onClick={onCompareClick}
      >
        <span>See full coverage summary →</span>
      </div>
    </div>
  );
}

// 2. Coverage Stats Bar Chart
export function CoverageBarChart({ left, center, right }: { left: number, center: number, right: number }) {
  const [activeTab, setActiveTab] = useState("Sentiments");
  
  const total = left + center + right || 1;

  return (
    <div className="w-full">
      <div className="flex gap-4 mb-6 border-b border-border">
        {["Sentiments", "Publishers", "Right"].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-xs font-bold transition-colors relative ${activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
          </button>
        ))}
      </div>

      <div className="bg-secondary/10 border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-xs">AI</span>
            </div>
            <div>
              <p className="text-[11px] font-black text-foreground">Contextual Bias</p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Shift Metrics</p>
            </div>
          </div>
          <div className="text-right">
             <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-muted-foreground mb-1">
               <div className="w-2 h-2 rounded-full bg-blue-500" /> Left <span className="text-foreground">{left}</span>
             </div>
             <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-muted-foreground mb-1">
               <div className="w-2 h-2 rounded-full bg-muted-foreground" /> Center <span className="text-foreground">{center}</span>
             </div>
             <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-muted-foreground">
               <div className="w-2 h-2 rounded-full bg-red-500" /> Right <span className="text-foreground">{right}</span>
             </div>
          </div>
        </div>

        {/* Bar Chart Timeline replaced with singular snapshot bar */}
        <div className="h-4 flex items-center w-full gap-1 mt-4 rounded-full overflow-hidden">
           <div className="h-full bg-blue-500 transition-all" style={{ width: `${(left / total) * 100}%` }} title={`Left: ${left}`} />
           <div className="h-full bg-muted-foreground transition-all" style={{ width: `${(center / total) * 100}%` }} title={`Center: ${center}`} />
           <div className="h-full bg-red-500 transition-all" style={{ width: `${(right / total) * 100}%` }} title={`Right: ${right}`} />
        </div>
      </div>
    </div>
  );
}

// 3. Media Bias Distribution Detail List (Publisher Bubble Stack columns)
export function MediaBiasDistribution({ sources }: { sources: any[] }) {
  // Group sources by derived bias rating
  const grouped = useMemo(() => {
    const left: any[] = [];
    const center: any[] = [];
    const right: any[] = [];
    const untracked: any[] = [];

    for (const s of sources) {
      const pub = s.publisher;
      const name = pub?.name || s.sourceName || s.source_name || "Unknown";
      const domain = pub?.website || s.url;
      const bias = s.bias || pub?.biasRating || "center";
      
      const entry = { name, domain, bias };
      
      if (!pub || !pub.biasRating || pub.biasRating === "unknown") {
        untracked.push(entry);
      } else if (bias === "pro_opposition" || bias === "left") {
        left.push(entry);
      } else if (bias === "pro_establishment" || bias === "right") {
        right.push(entry);
      } else {
        center.push(entry);
      }
    }
    return { left, center, right, untracked };
  }, [sources]);

  const total = grouped.left.length + grouped.center.length + grouped.right.length || 1;
  const lPct = Math.round((grouped.left.length / total) * 100);
  const cPct = Math.round((grouped.center.length / total) * 100);
  const rPct = 100 - lPct - cPct;

  // Determine dominant bias for the subtitle
  const dominant = useMemo(() => {
    const max = Math.max(lPct, cPct, rPct);
    if (max === cPct) return `${cPct}% of the sources are Center`;
    if (max === lPct) return `${lPct}% of the sources are Left Leaning`;
    return `${rPct}% of the sources are Right Leaning`;
  }, [lPct, cPct, rPct]);

  // Max 4 logo bubbles shown per column
  const limit = 4;
  const leftShown = grouped.left.slice(0, limit);
  const leftExtra = grouped.left.length > limit ? grouped.left.length - limit : 0;

  const centerShown = grouped.center.slice(0, limit);
  const centerExtra = grouped.center.length > limit ? grouped.center.length - limit : 0;

  const rightShown = grouped.right.slice(0, limit);
  const rightExtra = grouped.right.length > limit ? grouped.right.length - limit : 0;

  // Untracked max 10 icons
  const untrackedShown = grouped.untracked.slice(0, 10);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-[13px] font-serif font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
          Bias Distribution
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted-foreground"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </h4>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3 font-serif font-medium">{dominant}</p>

      {/* Spectrum Bar Chart */}
      <div className="h-4 flex items-center w-full rounded-sm overflow-hidden mb-5 text-[8px] font-black text-white uppercase tracking-wider select-none font-sans">
        {lPct > 0 && (
          <div className="h-full bg-[#e11d48] flex items-center justify-center transition-all" style={{ width: `${lPct}%` }}>
            {lPct >= 15 && `L ${lPct}%`}
          </div>
        )}
        {cPct > 0 && (
          <div className="h-full bg-[#71717a] flex items-center justify-center transition-all" style={{ width: `${cPct}%` }}>
            {cPct >= 15 && `C ${cPct}%`}
          </div>
        )}
        {rPct > 0 && (
          <div className="h-full bg-[#2563eb] flex items-center justify-center transition-all" style={{ width: `${rPct}%` }}>
            {rPct >= 15 && `R ${rPct}%`}
          </div>
        )}
      </div>

      {/* Bubble Columns Stack */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Left Leaning column (rose color theme) */}
        <div className="flex flex-col items-center bg-rose-50/40 dark:bg-rose-950/5 border border-rose-100/50 dark:border-rose-950/20 rounded-xl py-3 px-1 gap-2.5">
          <span className="text-[9px] font-black uppercase text-rose-600 tracking-wider">Left</span>
          <div className="flex flex-col items-center gap-1.5 w-full">
            {leftShown.map((pub, idx) => (
              <PublisherLogo key={idx} name={pub.name} domain={pub.domain} size="sm" className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm shrink-0" />
            ))}
            {leftExtra > 0 && (
              <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-zinc-800 shadow-sm shrink-0">
                +{leftExtra}
              </div>
            )}
            {grouped.left.length === 0 && (
              <span className="text-[9px] text-muted-foreground italic my-4">—</span>
            )}
          </div>
        </div>

        {/* Center column (zinc gray theme) */}
        <div className="flex flex-col items-center bg-zinc-50/40 dark:bg-zinc-950/5 border border-zinc-200/50 dark:border-zinc-800/20 rounded-xl py-3 px-1 gap-2.5">
          <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Center</span>
          <div className="flex flex-col items-center gap-1.5 w-full">
            {centerShown.map((pub, idx) => (
              <PublisherLogo key={idx} name={pub.name} domain={pub.domain} size="sm" className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm shrink-0" />
            ))}
            {centerExtra > 0 && (
              <div className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-zinc-800 shadow-sm shrink-0">
                +{centerExtra}
              </div>
            )}
            {grouped.center.length === 0 && (
              <span className="text-[9px] text-muted-foreground italic my-4">—</span>
            )}
          </div>
        </div>

        {/* Right Leaning column (blue theme) */}
        <div className="flex flex-col items-center bg-blue-50/40 dark:bg-blue-950/5 border border-blue-100/50 dark:border-blue-950/20 rounded-xl py-3 px-1 gap-2.5">
          <span className="text-[9px] font-black uppercase text-blue-600 tracking-wider">Right</span>
          <div className="flex flex-col items-center gap-1.5 w-full">
            {rightShown.map((pub, idx) => (
              <PublisherLogo key={idx} name={pub.name} domain={pub.domain} size="sm" className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm shrink-0" />
            ))}
            {rightExtra > 0 && (
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-zinc-800 shadow-sm shrink-0">
                +{rightExtra}
              </div>
            )}
            {grouped.right.length === 0 && (
              <span className="text-[9px] text-muted-foreground italic my-4">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Untracked Bias Section */}
      {untrackedShown.length > 0 && (
        <div className="border-t border-border/50 pt-3">
          <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block mb-2">Untracked Bias</span>
          <div className="flex flex-wrap gap-1.5">
            {untrackedShown.map((pub, idx) => (
              <PublisherLogo key={idx} name={pub.name} domain={pub.domain} size="xs" className="w-5 h-5 rounded-full border border-border/50 shadow-sm shrink-0" />
            ))}
            {grouped.untracked.length > 10 && (
              <div className="w-5 h-5 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-[8px] font-bold border border-border/50 shadow-sm shrink-0">
                +{grouped.untracked.length - 10}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
