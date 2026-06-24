import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface StoryImpactRingsProps {
  clusterId: string;
  sourceCount: number;
}

export function StoryImpactRings({ clusterId, sourceCount }: StoryImpactRingsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/clusters", clusterId, "impact"],
    queryFn: () => api.clusters.impact(clusterId),
  });

  if (isLoading) return <div className="h-32 bg-muted animate-pulse rounded-lg" />;
  if (!data) return null;

  const { reach, velocity, depth } = data;

  const rings = [
    { label: "BREADTH", value: reach, color: "#3B82F6", sub: "Global Reach" },
    ...(velocity > 0 ? [{ label: "VELOCITY", value: velocity, color: "#10B981", sub: "Story Speed" }] : []),
    { label: "DEPTH", value: depth, color: "#6366F1", sub: "Original Analysis" },
  ];

  return (
    <div className="bg-card border border-card-border rounded p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Impact Profile</h4>
          <p className="text-[11px] font-bold text-foreground">Multi-dimensional Analysis</p>
        </div>
        <div className="bg-secondary px-2 py-0.5 rounded text-[9px] font-black uppercase text-muted-foreground ring-1 ring-border">
          {sourceCount} Sources
        </div>
      </div>

      <div className="flex justify-around items-end gap-2 h-24 pt-4 px-2">
        {rings.map((ring) => (
          <div key={ring.label} className="relative flex flex-col items-center group w-full">
            <div className="relative w-16 h-16 flex items-center justify-center">
              {/* Static background ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-muted/10"
                />
                {/* Dynamic animated ring */}
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={ring.color}
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - ring.value / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="z-10 text-[11px] font-black text-foreground">{ring.value}%</div>
            </div>
            <div className="mt-3 text-center">
              <span className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">{ring.label}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-dashed border-border flex justify-between items-center text-[9px]">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-bold text-muted-foreground">CRITICALITY: HIGH</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-bold text-muted-foreground">PHASE: DEVELOPING</span>
          </div>
        </div>
      </div>
    </div>
  );
}
