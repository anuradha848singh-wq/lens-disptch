import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface SourceRadarChartProps {
  publisherId: string;
}

const LABELS = [
  { key: "reliability", label: "Reliability" },
  { key: "uniqueness", label: "Uniqueness" },
  { key: "consistency", label: "Consistency" },
  { key: "correction", label: "Correction" },
  { key: "transparency", label: "Transparency" },
];

export function SourceRadarChart({ publisherId }: SourceRadarChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/publishers", publisherId, "radar"],
    queryFn: () => api.publishers.radar(publisherId),
  });

  if (isLoading) return <div className="h-64 bg-muted animate-pulse rounded-xl" />;
  if (!data) return null;

  const size = 300;
  const center = size / 2;
  const radius = size * 0.35;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / LABELS.length - Math.PI / 2;
    const r = (radius * value) / 100;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const points = LABELS.map((label, i) => getPoint(i, (data as any)[label.key]));
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(" ");

  // Background grid circles
  const gridLevels = [25, 50, 75, 100];

  return (
    <div className="bg-card border border-card-border rounded-xl p-6 flex flex-col items-center">
      <div className="text-center mb-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source DNA</h4>
        <p className="text-[12px] font-bold text-foreground">Operational Reliability Index</p>
      </div>

      <div className="relative w-full aspect-square max-w-[300px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
          {/* Grid */}
          {gridLevels.map(level => (
            <polygon
              key={level}
              points={LABELS.map((_, i) => {
                const p = getPoint(i, level);
                return `${p.x},${p.y}`;
              }).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-muted/10"
            />
          ))}
          
          {/* Axis lines */}
          {LABELS.map((_, i) => {
            const p = getPoint(i, 100);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={p.x}
                y2={p.y}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 4"
                className="text-muted/20"
              />
            );
          })}

          {/* Data Poly */}
          <polygon
            points={polygonPoints}
            fill="rgba(59, 130, 246, 0.2)"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeLinejoin="round"
            className="transition-all duration-1000 ease-in-out"
          />

          {/* Labels */}
          {LABELS.map((label, i) => {
            const p = getPoint(i, 115);
            const anchor = i === 0 ? "middle" : (i === 1 || i === 2) ? "start" : (i === 3 || i === 4) ? "end" : "middle";
            return (
              <text
                key={i}
                x={p.x}
                y={p.y}
                textAnchor={anchor}
                className="text-[10px] font-black fill-muted-foreground uppercase tracking-tighter"
                dominantBaseline="middle"
              >
                {label.label}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-5 gap-2 w-full mt-6">
        {LABELS.map((label) => (
          <div key={label.key} className="text-center">
            <div className="text-[11px] font-black text-foreground">{(data as any)[label.key]}%</div>
            <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{label.label.slice(0, 3)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
