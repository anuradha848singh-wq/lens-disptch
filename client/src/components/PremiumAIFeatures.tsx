import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  Zap, 
  TrendingUp, 
  Quote, 
  ShieldCheck, 
  AlertCircle,
  Map,
  MessageSquare,
  Users,
  LineChart
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// --- 1. FOREIGN GAZE PANEL ---
export function ForeignGazePanel({ clusterId }: { clusterId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/clusters", clusterId, "foreign-gaze"],
    queryFn: () => api.clusters.foreignGaze(clusterId),
    enabled: !!clusterId,
  });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-3xl" />;
  if (error || !data || !data.available || !data.domestic_summary) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-card border-[1.5px] border-dashed border-hairline-dashed p-6 mb-6"
    >
      <div className="flex items-center gap-3 mb-6 border-b-[1.5px] border-hairline pb-4">
        <Globe className="w-5 h-5 text-lens-cyan" />
        <div>
          <h3 className="text-eyebrow text-ink tracking-[0.2em]">FOREIGN GAZE ENGINE</h3>
          <p className="text-mono-metadata text-ink-muted uppercase mt-1">Domestic vs. International Narrative Divergence</p>
        </div>
        {data.difference && (
          <div className="ml-auto">
            <span className="bg-lens-cyan/10 text-lens-cyan font-mono text-[10px] font-bold px-2 py-1 uppercase tracking-widest border border-lens-cyan/20">
              Divergence Detected
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
        <div className="absolute inset-y-0 left-1/2 w-px bg-hairline-dashed hidden md:block border-l-[1.5px] border-dashed border-hairline-dashed" />
        
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b-[1.5px] border-hairline pb-2">
            <span className="text-mono-metadata text-ink-muted uppercase tracking-[0.2em] flex items-center gap-2">
              <Map className="w-3 h-3" /> DOMESTIC NARRATIVE
            </span>
            <span className="text-mono-metadata text-ink font-bold">{data.domestic_sources?.length || 0} SOURCES</span>
          </div>
          <div className="font-serif text-[16px] leading-[1.6] text-ink pl-4 border-l-[3px] border-ink-muted">
            {data.domestic_summary || "Analyzing domestic coverage patterns..."}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b-[1.5px] border-hairline pb-2">
            <span className="text-mono-metadata text-ink-muted uppercase tracking-[0.2em] flex items-center gap-2">
              <Globe className="w-3 h-3" /> INTERNATIONAL PERSPECTIVE
            </span>
            <span className="text-mono-metadata text-ink font-bold">{data.foreign_sources?.length || 0} SOURCES</span>
          </div>
          <div className="font-serif text-[16px] leading-[1.6] text-ink pl-4 border-l-[3px] border-lens-cyan">
            {data.foreign_summary || "Synthesizing global media framing..."}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- 2. EXECUTIVE BRIEFING ---
export function ExecutiveBriefing({ clusterId }: { clusterId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/clusters", clusterId, "briefing"],
    queryFn: () => api.clusters.briefing(clusterId),
    enabled: !!clusterId,
  });

  if (isLoading) return <Skeleton className="h-80 w-full rounded-3xl" />;
  if (error || !data || !data.available || !data.summary) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card-surface border-[1.5px] border-hairline p-6 mb-6 shadow-none"
    >
      <div className="flex items-center gap-3 mb-6 pb-4 border-b-[1.5px] border-hairline text-eyebrow text-ink tracking-[0.2em]">
        <ShieldCheck className="w-5 h-5 text-signal-yellow" />
        <div>
          <h3>EXECUTIVE BRIEFING</h3>
          <p className="text-mono-metadata text-ink-muted mt-1">MAP-REDUCE CONSENSUS ANALYSIS</p>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h4 className="text-mono-metadata text-ink-muted mb-3 uppercase tracking-[0.2em]">CORE SUMMARY</h4>
          <p className="font-serif text-[18px] leading-[1.6] text-ink">
            {data.summary}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t-[1.5px] border-hairline pt-6">
          <div>
            <h4 className="text-mono-metadata text-ink-muted mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
              <Users className="w-3 h-3" /> KEY STAKEHOLDERS
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.key_players?.map((player: string, i: number) => (
                <span key={i} className="font-mono text-[11px] uppercase tracking-widest text-ink bg-paper border-[1.5px] border-hairline px-3 py-1">
                  {player}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-mono-metadata text-ink-muted mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
              <AlertCircle className="w-3 h-3 text-signal-yellow" /> FRAMING DISCREPANCIES
            </h4>
            <ul className="space-y-3">
              {data.discrepancies?.map((point: string, i: number) => (
                <li key={i} className="text-[13px] font-sans font-bold text-ink flex items-start gap-3 leading-relaxed">
                  <span className="w-1.5 h-1.5 bg-signal-yellow rounded-full mt-[6px] shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- 3. MARKET IMPACT OVERLAY ---
export function MarketImpact({ clusterId }: { clusterId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/clusters", clusterId, "market-impact"],
    queryFn: () => api.clusters.marketImpact(clusterId),
    enabled: !!clusterId,
  });

  if (isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (error || !data || !data.tickers?.length) return null;

  return (
    <div className="bg-card border-[1.5px] border-hairline-dashed overflow-hidden mb-6">
      <div className="p-4 border-b-[1.5px] border-dashed border-hairline-dashed bg-card flex items-center justify-between">
        <h3 className="text-eyebrow text-ink flex items-center gap-2">
          <LineChart className="w-4 h-4 text-wire-blue" /> MARKET IMPACT
        </h3>
        <TrendingUp className="w-4 h-4 text-wire-blue" />
      </div>
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {data.tickers.map((ticker: string) => (
            <span key={ticker} className="font-mono text-[11px] uppercase tracking-widest text-ink bg-card-surface border-[1.5px] border-hairline px-2 py-1">
              ${ticker}
            </span>
          ))}
        </div>
        <p className="font-serif text-[16px] text-ink leading-relaxed">
          {data.analysis}
        </p>
      </div>
    </div>
  );
}

// --- 4. ENTITY & QUOTE TRACKER ---
export function EntityQuoteTracker({ clusterId }: { clusterId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/clusters", clusterId, "entities"],
    queryFn: () => api.clusters.entities(clusterId),
    enabled: !!clusterId,
  });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (error || !data || !data.quotes?.length) return null;

  return (
    <div className="bg-card border-[1.5px] border-hairline-dashed overflow-hidden mb-6">
      <div className="p-4 border-b-[1.5px] border-dashed border-hairline-dashed bg-card-surface flex items-center justify-between">
        <h3 className="text-eyebrow text-ink tracking-[0.2em] flex items-center gap-2">
          <Quote className="w-4 h-4" /> DIRECT QUOTE TRACKER
        </h3>
        <MessageSquare className="w-4 h-4 text-ink-muted" />
      </div>
      <div className="divide-y-[1.5px] divide-dashed divide-hairline-dashed">
        {data.quotes.map((q: { entity: string, quote: string }, i: number) => (
          <div key={i} className="p-5 space-y-3 hover:bg-card-surface transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full border-[1.5px] border-ink flex items-center justify-center font-mono text-[10px] font-bold text-ink bg-paper">
                {q.entity.charAt(0).toUpperCase()}
              </div>
              <span className="text-eyebrow text-ink tracking-widest">{q.entity}</span>
            </div>
            <p className="font-serif italic text-[18px] text-ink leading-relaxed pl-9 border-l-[3px] border-ink-muted ml-3">
              "{q.quote}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
