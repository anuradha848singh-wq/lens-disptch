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

// 3. Media Bias Distribution Detail List
export function MediaBiasDistribution({ sources, onAllSourcesClick }: { sources: any[], onAllSourcesClick?: () => void }) {
  // Aggregate sources by publisher to match screenshots
  const publisherMap = new Map<string, { count: number, bias: string, url: string, latestPublishedAt: string | null }>();
  sources.forEach(s => {
    const name = s.source_name || s.sourceName || "Unknown";
    const pubDate = s.publishedAt || s.published_at || null;
    if (!publisherMap.has(name)) {
      publisherMap.set(name, { 
        count: 0, 
        bias: s.bias_label || s.bias || "center", 
        url: s.url,
        latestPublishedAt: pubDate
      });
    }
    const entry = publisherMap.get(name)!;
    entry.count++;
    if (pubDate && (!entry.latestPublishedAt || new Date(pubDate) > new Date(entry.latestPublishedAt))) {
      entry.latestPublishedAt = pubDate;
    }
  });
  
  const pubList = Array.from(publisherMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  if (pubList.length === 0) return null;

  return (
    <div className="w-full mt-2">
      <div className="space-y-4">
        {pubList.map((pub, i) => {
          const s = sources.find(src => (src.sourceName || src.source_name || src.publisherName) === pub.name) || { url: pub.url };
          const name = pub.name !== "Unknown" ? pub.name : (() => {
            try { return new URL(s.url || '').hostname.replace('www.',''); }
            catch { return 'Unknown'; }
          })();
          const totalStories = pub.count;
          const biasPerc = Math.round((pub.count / sources.length) * 100) || 1;
          const isLeft = pub.bias.toLowerCase().includes("left");
          const isRight = pub.bias.toLowerCase().includes("right");
          const isCenter = !isLeft && !isRight;
          
          return (
            <div key={i} className="flex items-center gap-3 group px-2 py-1.5 hover:bg-secondary/40 rounded-lg transition-colors cursor-pointer">
              {/* Publisher Avatar */}
              <PublisherLogo name={name} domain={pub.url} size="md" className="w-8 h-8 shadow-sm shrink-0 bg-card" />
              
              {/* Publisher Name & Time */}
              <div className="flex-1 min-w-0">
                <h5 className="text-[13px] font-bold text-foreground truncate group-hover:text-primary">{name}</h5>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {pub.latestPublishedAt 
                    ? formatDistanceToNow(new Date(pub.latestPublishedAt), { addSuffix: true })
                    : 'Recently'}
                </p>
              </div>
              
              {/* Stats Bar */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold text-muted-foreground w-6 text-right">{biasPerc}%</span>
                <div className="flex flex-col items-center gap-1 w-12">
                   {/* Tiny stacked bar */}
                   <div className="w-full h-1.5 flex rounded-full overflow-hidden bg-secondary">
                     <div className={`h-full ${isLeft ? 'bg-blue-500 w-[60%]' : 'bg-transparent'}`} />
                     <div className={`h-full ${isCenter ? 'bg-muted-foreground w-[80%]' : 'bg-transparent'}`} />
                     <div className={`h-full ${isRight ? 'bg-red-500 w-[70%]' : 'bg-transparent'}`} />
                   </div>
                   <div className="flex w-full justify-between px-0.5">
                     <span className={`w-1 h-1 rounded-full ${isLeft ? 'bg-blue-500' : 'bg-transparent'}`} />
                     <span className={`w-1 h-1 rounded-full ${isRight ? 'bg-red-500' : 'bg-transparent'}`} />
                   </div>
                </div>
                {/* Total stories counts */}
                <div className="flex flex-col items-end">
                   <span className="text-[11px] font-bold text-foreground">{totalStories}</span>
                   <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Stories</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <button 
        className="w-full mt-6 py-2.5 rounded-xl border-2 border-border text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
        onClick={onAllSourcesClick}
      >
        View All Sources
      </button>
    </div>
  );
}
