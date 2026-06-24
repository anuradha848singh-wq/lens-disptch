import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AlertTriangle, Droplets } from "lucide-react";

export function CoverageDroughtDetector() {
  const { data: droughts = [], isLoading } = useQuery({
    queryKey: ["/api/analytics/droughts"],
    queryFn: api.analytics.droughts,
    refetchInterval: 300000, // 5 minutes
  });

  if (isLoading) return <div className="h-48 bg-muted animate-pulse rounded-xl" />;
  if (droughts.length === 0) return null;

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 border-l-4 border-l-amber-500 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground">Coverage Gaps Detected</h4>
        </div>
        <div className="text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded ring-1 ring-amber-500/20">
          LIVE MONITOR
        </div>
      </div>

      <div className="space-y-4">
        {droughts.slice(0, 3).map((d) => (
          <div key={d.slug} className="flex flex-col gap-1.5 group">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-foreground group-hover:text-amber-600 transition-colors uppercase tracking-tight">{d.category}</span>
              <span className="text-muted-foreground font-black">{d.hoursSinceLast}h SILENCE</span>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden flex items-center">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  d.severity === "high" ? "bg-red-500 animate-pulse" : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(100, (d.hoursSinceLast / 72) * 100)}%` }}
              />
            </div>
            {d.severity === "high" && (
              <div className="flex items-center gap-1 text-[9px] font-black text-red-600/80 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                CRITICAL RECOVERY NEEDED
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-5 text-[9px] text-muted-foreground font-medium leading-relaxed italic border-t border-border pt-4">
        Gaps in reporting identified by analyzing global source frequency vs category decay thresholds. 
        Reporting usually resumes in <span className="text-foreground font-bold">~4.2 hours</span>.
      </p>
    </div>
  );
}
