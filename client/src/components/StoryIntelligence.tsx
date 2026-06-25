import { PublisherLogo } from "@/components/PublisherLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function StoryOrigin({ publisher, publishedAt }: { publisher?: any; publishedAt?: string }) {
  if (!publisher) return null;
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-blue-100 flex items-center justify-center overflow-hidden">
          <PublisherLogo name={publisher.name} domain={publisher.website} size="md" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Origin</span>
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-1">First Reported By</h4>
        <p className="text-lg font-bold text-foreground leading-tight">{publisher.name}</p>
        <p className="text-xs text-muted-foreground mt-1 font-medium">
          {publishedAt ? formatDistanceToNow(new Date(publishedAt), { addSuffix: true }) : "Identifying..."}
        </p>
      </div>
      <div className="hidden md:block px-4 py-2 bg-white/60 border border-blue-100 rounded-xl text-center">
        <span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Integrity Score</span>
        <span className="text-lg font-black text-blue-600">{publisher.reliabilityScore || 85}%</span>
      </div>
    </div>
  );
}

export function CoverageByCountry({ countryData }: { countryData: Record<string, number> }) {
  if (!countryData || Object.keys(countryData).length === 0) {
    return <p className="text-xs text-muted-foreground italic">Coverage data unavailable</p>;
  }

  const flags: Record<string, string> = {
    US: "🇺🇸", UK: "🇬🇧", IN: "🇮🇳", AU: "🇦🇺", CA: "🇨🇦",
    DE: "🇩🇪", FR: "🇫🇷", JP: "🇯🇵", SG: "🇸🇬", IL: "🇮🇱",
    QA: "🇶🇦", RU: "🇷🇺", NZ: "🇳🇿", ZA: "🇿🇦", NG: "🇳🇬",
    PK: "🇵🇰", MY: "🇲🇾", TH: "🇹🇭", PH: "🇵🇭", ID: "🇮🇩",
  };

  const sorted = Object.entries(countryData).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  return (
    <div className="space-y-3">
      {sorted.map(([country, count]) => (
        <div key={country} className="flex items-center gap-3">
          <span className="text-xl shrink-0">{flags[country] || "🌍"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-end mb-1">
              <span className="text-xs font-bold text-foreground">
                {country === "US" ? "United States" : country === "UK" ? "United Kingdom" : country}
              </span>
              <span className="text-xs font-bold text-muted-foreground">{count} sources</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${count / max > 0.6 ? 'bg-blue-600' : count / max > 0.3 ? 'bg-blue-400' : 'bg-gray-400'}`}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DeepIntelligenceDashboard({ data, isLoading }: { data?: any; isLoading: boolean }) {
  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!data) return null;

  const { sdi, geography } = data.intelligence;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div className="border border-border/50 p-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Perspectives Diversity</h3>
          <span className={`text-lg font-black ${sdi > 75 ? 'text-green-600' : sdi > 50 ? 'text-blue-600' : 'text-amber-600'}`}>
            {sdi}%
          </span>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <span>Uniform Echo</span>
            <span>Diverse Market</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden flex">
            <div className={`h-full transition-all duration-1000 ${sdi > 75 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${sdi}%` }} />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The Shannon Diversity Index (SDI) measures the equilibrium of coverage across the bias spectrum. 
            A score of 75%+ indicates balanced representation from all sides.
          </p>
        </div>
      </div>

      <div className="border border-border/50 p-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Global Reach</h3>
        <CoverageByCountry countryData={geography} />
      </div>
    </div>
  );
}

export function StoryTimeline({ clusterId }: { clusterId: string }) {
  const { data: timeline, isLoading } = useQuery({
    queryKey: ["/api/clusters", clusterId, "timeline"],
    queryFn: () => api.clusters.timeline(clusterId),
    enabled: !!clusterId,
  });

  if (isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="border-t border-border/50 py-4 mt-4">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        Story Timeline
      </h3>
      <div className="relative pl-4 border-l-2 border-blue-200 dark:border-blue-800 space-y-7">
        {timeline.map((event: any) => (
          <div key={event.id} className="relative">
            <div className="absolute -left-[25px] top-1.5 w-4 h-4 rounded-full border-4 border-background bg-blue-500" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-black uppercase text-blue-500 tracking-widest">
                {event.publishedAt ? new Date(event.publishedAt).toLocaleDateString(undefined, {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                }) : "Just now"}
              </span>
              <h4 className="text-sm font-bold leading-snug text-foreground line-clamp-2">
                {event.title}
              </h4>
              <span className="text-xs text-muted-foreground font-bold">{event.publisher?.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
