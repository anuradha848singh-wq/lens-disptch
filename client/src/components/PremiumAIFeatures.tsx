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
      className="relative overflow-hidden bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5 border border-indigo-500/10 rounded-3xl p-6 md:p-8 mb-10"
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-indigo-500/10 rounded-xl">
          <Globe className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-indigo-900">Foreign Gaze Engine</h3>
          <p className="text-[10px] font-bold text-indigo-600/70">Domestic vs. International Narrative Divergence</p>
        </div>
        {data.difference && (
          <div className="ml-auto">
            <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 font-black">
              Divergence detected
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
        <div className="absolute inset-y-0 left-1/2 w-px bg-indigo-500/10 hidden md:block" />
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Map className="w-3 h-3" /> Domestic Narrative
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">{data.domestic_sources?.length || 0} sources</span>
          </div>
          <div className="text-sm leading-relaxed text-foreground font-medium italic border-l-2 border-indigo-500/20 pl-4">
            &ldquo;{data.domestic_summary || "Analyzing domestic coverage patterns..."}&rdquo;
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> International Perspective
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">{data.foreign_sources?.length || 0} sources</span>
          </div>
          <div className="text-sm leading-relaxed text-foreground font-medium italic border-l-2 border-blue-500/20 pl-4">
            &ldquo;{data.foreign_summary || "Synthesizing global media framing..."}&rdquo;
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
      className="bg-slate-900 text-slate-100 rounded-3xl p-8 mb-10 shadow-2xl shadow-slate-900/20"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20">
          <ShieldCheck className="w-6 h-6 text-slate-900" />
        </div>
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-500">Executive Briefing</h3>
          <p className="text-[10px] font-bold text-slate-400">Map-Reduce Consensus Analysis</p>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Core Summary</h4>
          <p className="text-lg font-medium leading-relaxed text-slate-200">
            {data.summary}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
              <Users className="w-3 h-3" /> Key Stakeholders
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.key_players?.map((player: string, i: number) => (
                <Badge key={i} variant="outline" className="border-slate-700 text-slate-300 font-bold bg-slate-800/50 px-3 py-1">
                  {player}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
              <AlertCircle className="w-3 h-3 text-amber-500" /> Framing Discrepancies
            </h4>
            <ul className="space-y-2">
              {data.discrepancies?.map((point: string, i: number) => (
                <li key={i} className="text-xs text-slate-400 flex items-start gap-2 leading-relaxed">
                  <span className="w-1 h-1 bg-amber-500 rounded-full mt-1.5 shrink-0" />
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
    <Card className="border-emerald-500/20 bg-emerald-500/5 overflow-hidden rounded-2xl mb-6">
      <div className="p-4 border-b border-emerald-500/10 bg-emerald-500/10 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
          <LineChart className="w-3 h-3" /> Market Intelligence
        </h3>
        <TrendingUp className="w-3 h-3 text-emerald-600" />
      </div>
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {data.tickers.map((ticker: string) => (
            <Badge key={ticker} className="bg-emerald-600 hover:bg-emerald-700 font-black px-2 py-0.5">
              ${ticker}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-emerald-900/70 leading-relaxed font-medium">
          {data.analysis}
        </p>
      </div>
    </Card>
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
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Quote className="w-3 h-3" /> Direct Quote Tracker
        </h3>
        <MessageSquare className="w-3 h-3 text-muted-foreground" />
      </div>
      <div className="divide-y divide-border">
        {data.quotes.map((q: { entity: string, quote: string }, i: number) => (
          <div key={i} className="p-4 space-y-2 hover:bg-secondary/10 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{q.entity}</span>
            </div>
            <p className="text-xs italic text-muted-foreground leading-relaxed pl-3.5 border-l border-border/50">
              "{q.quote}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
