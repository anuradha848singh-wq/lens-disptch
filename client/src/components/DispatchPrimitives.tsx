import React from 'react';
import { EyeOff, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Aperture } from './Aperture'; // Re-use the existing one

export { Aperture };

// 1. Postmark
export function Postmark({ count, rotation = -9, className }: { count: number | string, rotation?: number, className?: string }) {
  return (
    <div 
      className={cn(
        "flex items-center justify-center rounded-full border-[1.5px] border-ink bg-card-surface text-mono-metadata text-ink w-7 h-7",
        className
      )}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {count}
    </div>
  );
}

// 2. DispatchCard
interface DispatchCardProps {
  variant?: 'standard' | 'wide';
  image?: string;
  sourceCount: number;
  eyebrow: string;
  headline: string;
  dek?: string;
  diversityPct: number;
  fallbackTelemetry?: boolean;
  className?: string;
}
export function DispatchCard({ variant = 'standard', image, sourceCount, eyebrow, headline, dek, diversityPct, fallbackTelemetry = false, className }: DispatchCardProps) {
  const isTextOnly = !image && !fallbackTelemetry;
  return (
    <article className={cn(
      "border border-border bg-card flex flex-col relative group", 
      className, 
      variant === 'wide' ? 'md:col-span-2' : '',
      isTextOnly ? 'border-l-[3.5px] border-l-wire-blue bg-card-surface/40' : ''
    )}>
      {(image || fallbackTelemetry) && (
        <div className="relative border-b-[1.5px] border-dashed border-hairline-dashed h-48 md:h-56 bg-card-surface overflow-hidden flex flex-col items-center justify-center p-0">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full border border-dashed border-ink-muted/20 flex flex-col items-center justify-center relative bg-paper select-none font-mono">
              {/* Blueprint Grid Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:16px_16px]" />
              <div className="absolute top-2 left-2 text-[9px] text-ink-muted/50 tracking-widest uppercase">DISPATCH TELEMETRY</div>
              <div className="absolute bottom-2 right-2 text-[9px] text-ink-muted/50 tracking-widest">LENS-TRUTH.01</div>
              <div className="w-8 h-8 border border-dashed border-ink-muted/40 flex items-center justify-center text-ink-muted/60 text-sm relative">
                +
                <div className="absolute -top-1 -left-1 w-1.5 h-1.5 border-t border-l border-ink-muted/50" />
                <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 border-b border-r border-ink-muted/50" />
              </div>
            </div>
          )}
          <Postmark count={sourceCount} className="absolute top-3 right-3 shadow-none z-10" />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="text-eyebrow text-muted-foreground mb-2">{eyebrow}</div>
        <h3 className={cn(
          "text-foreground mb-2 group-hover:text-signal-yellow transition-colors",
          isTextOnly ? "font-serif text-[20px] font-black leading-tight" : "text-card-headline"
        )}>{headline}</h3>
        {dek && <p className={cn("text-dek text-muted-foreground mb-4", isTextOnly ? "line-clamp-4 leading-relaxed" : "line-clamp-2")}>{dek}</p>}
        
        <div className="mt-auto pt-4 flex items-center gap-2">
          <Aperture sources={Array(sourceCount).fill({ lean: 'unrated' })} diversityScore={diversityPct} size="inline" />
          <span className="text-mono-metadata text-muted-foreground">{Math.round(diversityPct)}% diverse &middot; {sourceCount} sources</span>
        </div>
      </div>
    </article>
  );
}

// 3. WireTicker
export function WireTicker({ title, items, className }: { title: string, items: { rank: string | number, headline: string }[], className?: string }) {
  return (
    <div className={cn("border-y-[1.5px] border-dashed border-hairline-dashed py-4", className)}>
      <h3 className="text-eyebrow text-ink mb-4">{title}</h3>
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="flex gap-3 items-start">
            <span className="text-mono-metadata text-wire-red mt-[2px]">{String(item.rank).padStart(2, '0')}</span>
            <span className="text-dek text-ink line-clamp-2">{item.headline}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 4. WireClipping
export function WireClipping({ source, lean, timestamp, quote, className }: { source: string, lean: string, timestamp: string, quote: string, className?: string }) {
  return (
    <div className={cn("border-[1.5px] border-dashed border-hairline-dashed p-5 bg-card flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between text-mono-metadata text-muted-foreground uppercase">
        <div className="flex items-center gap-2">
          <Postmark count={source.charAt(0).toUpperCase()} className="w-6 h-6 text-[10px]" rotation={0} />
          <span>{source} &middot; {lean}</span>
        </div>
        <span>{timestamp}</span>
      </div>
      <p className="font-serif italic text-lg text-ink">"{quote}"</p>
    </div>
  );
}

// 5. TicketTabs
export function TicketTabs({ options, active, onChange, className }: { options: string[], active: string, onChange: (v: string) => void, className?: string }) {
  return (
    <div className={cn("flex border-b-[1.5px] border-dashed border-hairline-dashed", className)}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-4 py-3 text-eyebrow transition-colors relative",
            active === opt ? "text-ink" : "text-muted-foreground hover:text-ink"
          )}
        >
          {opt}
          {active === opt && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-signal-yellow" />
          )}
        </button>
      ))}
    </div>
  );
}

// 6. OffTheWire (Redesigned as "What This Article Left Out")

export function OffTheWire({ gaps, className }: { gaps: { label: string, mentionedBy: string | string[] }[], className?: string }) {
  return (
    <div className={cn("bg-card border border-border/50 rounded-xl p-5 md:p-6", className)}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
          <EyeOff className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">What This Article Left Out</span>
        </div>
        <Info className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div className="grid gap-3 md:grid-cols-2">
        {gaps.map((gap, i) => {
          let mentionsStr = "";
          if (Array.isArray(gap.mentionedBy)) {
             const display = gap.mentionedBy.slice(0, 2).join(", ").toUpperCase();
             const remaining = gap.mentionedBy.length - 2;
             mentionsStr = remaining > 0 ? `${display} +${remaining}` : display;
          } else {
             const parts = gap.mentionedBy.split(",");
             const display = parts.slice(0, 2).join(", ").toUpperCase();
             const remaining = parts.length - 2;
             mentionsStr = remaining > 0 ? `${display} +${remaining}` : display;
          }

          return (
            <div key={i} className="bg-background border border-border/60 rounded-lg p-4 hover:border-amber-500/30 transition-colors">
              <div className="text-[15px] font-bold text-foreground mb-2">
                {gap.label}
              </div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Mentioned By: {mentionsStr}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 7. SpectrumStrip
export function SpectrumStrip({ sources, className }: { sources: { name: string, leanPosition: number, lean: string }[], className?: string }) {
  return (
    <div className={cn("py-4", className)}>
      <div className="flex justify-between text-eyebrow text-muted-foreground mb-4">
        <span>LEFT</span>
        <span>RIGHT</span>
      </div>
      <div className="relative h-[1px] bg-border mb-6">
        {sources.map((s, i) => {
          let dotColor = 'bg-ink-muted';
          if (s.lean === 'left') dotColor = 'bg-wire-blue';
          if (s.lean === 'right') dotColor = 'bg-wire-red';
          
          return (
            <div 
              key={i}
              className={cn("absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full ring-2 ring-card-surface", dotColor)}
              style={{ left: `${Math.max(0, Math.min(100, s.leanPosition))}%` }}
              title={s.name}
            />
          );
        })}
      </div>
    </div>
  );
}

// 8. SealedFeature
export function SealedFeature({ label, unlockAction, className }: { label: string, unlockAction?: () => void, className?: string }) {
  return (
    <div className={cn("border border-border bg-card p-4 flex items-center justify-between", className)}>
      <div className="flex items-center gap-3">
        {/* Simple wax-seal glyph */}
        <div className="relative w-5 h-5 rounded-full bg-ink-muted flex items-center justify-center">
          <div className="absolute -bottom-2 right-0 w-1.5 h-3 bg-ink-muted transform -rotate-12" />
        </div>
        <span className="text-eyebrow text-ink">SEALED &middot; {label}</span>
      </div>
      <button 
        onClick={unlockAction}
        className="text-mono-metadata text-signal-yellow hover:underline uppercase"
      >
        Upgrade to unseal
      </button>
    </div>
  );
}

// 9. OriginMedallion
export function OriginMedallion({ source, timestamp, integrityScore, className }: { source: string, timestamp: string, integrityScore: number, className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-3", className)}>
      <div className="flex gap-3">
        <Postmark count={source.charAt(0).toUpperCase()} rotation={0} className="w-8 h-8 text-sm" />
        <div className="flex flex-col">
          <span className="text-eyebrow text-ink tracking-widest">ORIGIN</span>
          <span className="text-dek text-ink">{source}</span>
          <span className="text-mono-metadata text-muted-foreground">{timestamp}</span>
        </div>
      </div>
      <Postmark count={integrityScore} rotation={0} className="w-8 h-8 font-medium border-signal-yellow text-ink" />
    </div>
  );
}
