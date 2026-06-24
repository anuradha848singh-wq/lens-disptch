import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TopicHeatCalendarProps {
  categorySlug: string;
  days?: number;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES   = ["","Mon","","Wed","","Fri",""];

function getColor(count: number, maxCount: number): string {
  if (count === 0) return "rgba(var(--muted), 0.1)";
  const intensity = count / maxCount;
  if (intensity < 0.15) return "#B5D4F4"; // blue-100
  if (intensity < 0.35) return "#85B7EB"; // blue-200
  if (intensity < 0.60) return "#378ADD"; // blue-400
  if (intensity < 0.85) return "#185FA5"; // blue-600
  return "#0C447C";                        // blue-800
}

export function TopicHeatCalendar({ categorySlug, days = 365 }: TopicHeatCalendarProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/analytics/heat", categorySlug, days],
    queryFn: () => api.analytics.heatCalendar(categorySlug, days),
    staleTime: 60 * 60 * 1000, 
  });

  const weeks = useMemo(() => {
    if (!data) return [];
    const result: { date: string; count: number }[][] = [];
    let week: { date: string; count: number }[] = [];
    
    // Day of the week for the first date in the data
    const firstDate = data.days[0]?.date ? new Date(data.days[0].date) : new Date();
    const startPad = firstDate.getDay(); 
    
    for (let i = 0; i < startPad; i++) {
        week.push({ date: "", count: -1 });
    }
    
    for (const day of data.days) {
      week.push(day);
      if (week.length === 7) { 
        result.push(week); 
        week = []; 
      }
    }
    
    if (week.length > 0) {
      while (week.length < 7) {
          week.push({ date: "", count: -1 });
      }
      result.push(week);
    }
    return result;
  }, [data]);

  const monthLabels = useMemo(() => {
    if (!data) return [];
    const labels: { weekIdx: number; label: string }[] = [];
    let lastMonth = -1;
    
    weeks.forEach((week, wi) => {
      const firstReal = week.find(d => d.count >= 0);
      if (!firstReal?.date) return;
      const m = new Date(firstReal.date).getMonth();
      if (m !== lastMonth) { 
        labels.push({ weekIdx: wi, label: MONTH_NAMES[m] }); 
        lastMonth = m; 
      }
    });
    return labels;
  }, [weeks, data]);

  if (isLoading) return (
    <div className="space-y-4">
        <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
    </div>
  );
  
  if (!data) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Coverage Intensity
            </h4>
            <p className="text-[11px] font-bold text-foreground">
              {data.category} — Past {days === 365 ? "12 months" : `${days} days`}
            </p>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground bg-secondary/30 px-2 py-1 rounded">
          <span>Less</span>
          {["#B5D4F4","#85B7EB","#378ADD","#185FA5","#0C447C"].map((c,i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar pb-2">
        <div className="min-w-[600px]">
            {/* Month labels */}
            <div className="flex mb-1.5 ml-8 relative h-4">
                {weeks.map((_, wi) => {
                const ml = monthLabels.find(m => m.weekIdx === wi);
                return (
                    <div 
                        key={wi} 
                        className="absolute text-[9px] font-bold text-muted-foreground uppercase"
                        style={{ left: `${(wi / weeks.length) * 100}%` }}
                    >
                    {ml?.label || ""}
                    </div>
                );
                })}
            </div>

            {/* Grid */}
            <TooltipProvider delayDuration={100}>
                <div className="flex gap-1">
                    {/* Day labels */}
                    <div className="flex flex-col gap-1 mr-1 justify-between py-1">
                        {DAY_NAMES.map((d, i) => (
                        <div key={i} className="h-[10px] text-[8px] font-black text-muted-foreground leading-[10px] uppercase w-6">{d}</div>
                        ))}
                    </div>
                    {/* Weeks */}
                    {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-1 flex-1">
                        {week.map((day, di) => (
                        <Tooltip key={di}>
                            <TooltipTrigger asChild>
                                <div
                                    className={`rounded-sm transition-all duration-300 ${day.count < 0 ? "opacity-0" : "hover:scale-125 hover:z-10 shadow-sm"}`}
                                    style={{
                                        height: "10px",
                                        background: day.count === 0 ? "rgba(var(--muted), 0.15)" : (day.count < 0 ? "transparent" : getColor(day.count, data.maxCount)),
                                    }}
                                />
                            </TooltipTrigger>
                            {day.count >= 0 && (
                                <TooltipContent className="text-[10px] font-bold py-1 px-2">
                                    {day.date}: {day.count} articles
                                </TooltipContent>
                            )}
                        </Tooltip>
                        ))}
                    </div>
                    ))}
                </div>
            </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
