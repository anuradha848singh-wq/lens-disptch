import { PublisherLogo } from "@/components/PublisherLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function StoryOrigin({ publisher, publishedAt }: { publisher?: any; publishedAt?: string }) {
  if (!publisher) return null;
  return (
    <div className="flex items-center gap-6 p-4 bg-card border-[1.5px] border-hairline-dashed mb-6">
      <div className="flex flex-col items-center gap-2 shrink-0 border-r-[1.5px] border-dashed border-hairline-dashed pr-6">
        <div className="w-14 h-14 rounded-none bg-paper border-[1.5px] border-ink flex items-center justify-center overflow-hidden font-mono text-2xl font-bold text-ink">
          {publisher.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-mono-metadata text-ink-muted uppercase tracking-[0.2em]">ORIGIN</span>
      </div>
      <div className="flex-1">
        <h4 className="text-eyebrow text-ink tracking-[0.2em] mb-1">FIRST REPORTED BY</h4>
        <p className="font-serif text-[24px] font-black text-ink leading-none">{publisher.name}</p>
        <p className="text-mono-metadata text-ink-muted mt-2 uppercase tracking-widest">
          {publishedAt ? formatDistanceToNow(new Date(publishedAt), { addSuffix: true }) : "IDENTIFYING..."}
        </p>
      </div>
      <div className="hidden md:flex flex-col items-center justify-center px-6 py-2 border-l-[1.5px] border-dashed border-hairline-dashed pl-6">
        <span className="text-mono-metadata text-ink-muted uppercase tracking-[0.2em] mb-1">INTEGRITY SCORE</span>
        <span className="font-mono text-2xl font-bold text-lens-cyan">{publisher.reliabilityScore || 85}%</span>
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
    <div className="space-y-4">
      {sorted.map(([country, count]) => (
        <div key={country} className="flex items-center gap-4 border-b-[1.5px] border-dashed border-hairline-dashed pb-3 last:border-b-0 last:pb-0">
          <span className="font-mono text-[18px] text-ink shrink-0">{flags[country] || "🌍"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-end mb-2">
              <span className="text-mono-metadata text-ink tracking-widest uppercase">
                {country === "US" ? "UNITED STATES" : country === "UK" ? "UNITED KINGDOM" : country.toUpperCase()}
              </span>
              <span className="text-mono-metadata text-ink-muted">{count} SOURCES</span>
            </div>
            <div className="h-1 bg-card-surface border-[1px] border-hairline overflow-hidden">
              <div 
                className={`h-full ${count / max > 0.6 ? 'bg-wire-blue' : count / max > 0.3 ? 'bg-wire-blue/60' : 'bg-ink-muted'}`}
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div className="bg-card border-[1.5px] border-hairline-dashed p-6">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-eyebrow text-ink tracking-[0.2em]">PERSPECTIVES DIVERSITY</h3>
          <span className={`font-mono text-xl font-bold ${sdi > 75 ? 'text-lens-cyan' : sdi > 50 ? 'text-wire-blue' : 'text-wire-red'}`}>
            {sdi}%
          </span>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between text-mono-metadata text-ink-muted uppercase tracking-[0.2em]">
            <span>UNIFORM ECHO</span>
            <span>DIVERSE MARKET</span>
          </div>
          <div className="h-2 bg-card-surface border-[1.5px] border-hairline overflow-hidden flex">
            <div className={`h-full transition-all duration-1000 ${sdi > 75 ? 'bg-lens-cyan' : 'bg-wire-blue'}`} style={{ width: `${sdi}%` }} />
          </div>
          <p className="font-serif text-[13px] text-ink-muted leading-relaxed mt-4">
            The Shannon Diversity Index (SDI) measures the equilibrium of coverage across the bias spectrum. 
            A score of 75%+ indicates balanced representation from all sides.
          </p>
        </div>
      </div>

      <div className="bg-card border-[1.5px] border-hairline-dashed p-6">
        <h3 className="text-eyebrow text-ink tracking-[0.2em] mb-6">GLOBAL REACH</h3>
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
    <div className="border-t-[1.5px] border-dashed border-hairline-dashed py-8 mt-6">
      <h3 className="text-eyebrow text-ink tracking-[0.2em] mb-8 pb-4 border-b-[1.5px] border-hairline flex items-center gap-3">
        <span className="w-2 h-2 bg-lens-cyan" />
        STORY TIMELINE
      </h3>
      <div className="relative pl-6 border-l-[1.5px] border-dashed border-hairline-dashed space-y-8">
        {timeline.map((event: any) => (
          <div key={event.id} className="relative">
            <div className="absolute -left-[30px] top-2 w-3 h-3 bg-paper border-[1.5px] border-lens-cyan" />
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11px] font-bold uppercase text-lens-cyan tracking-widest">
                {event.publishedAt ? new Date(event.publishedAt).toLocaleDateString(undefined, {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                }) : "JUST NOW"}
              </span>
              <h4 className="font-serif text-[18px] font-black leading-tight text-ink">
                {event.title}
              </h4>
              <span className="text-mono-metadata text-ink-muted uppercase tracking-widest">{event.publisher?.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
