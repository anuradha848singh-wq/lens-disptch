import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell,
  BarChart, Bar
} from 'recharts';
import { Globe2 } from 'lucide-react';

const REGION_LABELS: Record<string, string> = {
  north_america: "North America",
  europe: "Europe",
  asia: "Asia",
  middle_east: "Middle East",
  africa: "Africa",
  latam: "Latin America",
  oceania: "Oceania",
  global: "Global / Int'l"
};

const FACTUALITY_COLORS = {
  very_high: "#10b981", // green
  high: "#34d399", 
  mixed: "#fbbf24",     // yellow
  low: "#f87171",       // red
  very_low: "#ef4444"
};

/**
 * WorldViewChart: A sleek horizontal bar chart showing regional distribution of sources
 */
export function WorldViewChart({ sources }: { sources: any[] }) {
  const data = useMemo(() => {
    const counts = sources.reduce((acc, src) => {
      const region = src.publisher?.region || "global";
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([key, value]) => ({
        name: REGION_LABELS[key] || key,
        value,
        key
      }))
      .sort((a: any, b: any) => b.value - a.value);
  }, [sources]);

  return (
    <div className="w-full h-full min-h-[250px] flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-4">
        <Globe2 className="w-4 h-4 text-lens-cyan" />
        <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-ink">Global Reach</h4>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart layout="vertical" data={data} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 11, fill: 'hsl(var(--ink))', opacity: 0.7, fontFamily: 'monospace' }} />
          <Tooltip 
            cursor={{ fill: 'hsl(var(--ink))', opacity: 0.05 }}
            contentStyle={{ backgroundColor: 'hsl(var(--paper))', border: '1px solid hsl(var(--ink)/0.1)', borderRadius: 0, fontFamily: 'monospace' }} 
            itemStyle={{ color: 'hsl(var(--ink))' }} 
          />
          <Bar dataKey="value" fill="hsl(var(--lens-cyan))" radius={[0, 4, 4, 0]} barSize={12} animationDuration={1500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * NarrativeMatrix: A scatter plot tracking Ideology (X) vs Narrative Stance (Y)
 */
export function NarrativeMatrix({ sources }: { sources: any[] }) {
  const data = useMemo(() => {
    return sources.map((s, idx) => {
      const pub = s.publisher || {};
      
      // Map X-Axis: Ideology
      let x = 0;
      switch (pub.politicalAlignment) {
        case "far_left": x = -80; break;
        case "left": x = -50; break;
        case "center_left": x = -20; break;
        case "center": x = 0; break;
        case "center_right": x = 20; break;
        case "right": x = 50; break;
        case "far_right": x = 80; break;
        default: x = 0;
      }
      
      // Jitter slightly for visual clarity
      x += (Math.random() * 10 - 5);

      // Map Y-Axis: Stance
      let y = 0;
      switch (pub.narrativeStance) {
        case "pro_establishment": y = 70; break;
        case "neutral": y = 0; break;
        case "pro_opposition": y = -70; break;
        case "state_affiliated": y = 90; break; // State media pushed to top
        default: y = 0;
      }
      y += (Math.random() * 16 - 8);

      const fact = pub.factualityRating || "mixed";
      const color = FACTUALITY_COLORS[fact as keyof typeof FACTUALITY_COLORS] || FACTUALITY_COLORS.mixed;

      return {
        id: pub.id || idx,
        name: pub.name || "Unknown",
        x,
        y,
        color,
        factuality: fact.replace('_', ' ').toUpperCase(),
        stance: (pub.narrativeStance || 'neutral').replace('_', ' ').toUpperCase(),
        ideology: (pub.politicalAlignment || 'center').replace('_', ' ').toUpperCase()
      };
    });
  }, [sources]);

  return (
    <div className="w-full relative h-[350px]">
      {/* Quadrant Lines */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
        <div className="w-full h-px bg-ink absolute top-1/2 -translate-y-1/2"></div>
        <div className="h-full w-px bg-ink absolute left-1/2 -translate-x-1/2"></div>
      </div>
      
      {/* Axis Labels */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 text-[9px] font-mono font-bold tracking-widest text-ink-muted uppercase">Pro-Establishment</div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 text-[9px] font-mono font-bold tracking-widest text-ink-muted uppercase">Pro-Opposition</div>
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 -rotate-90 text-[9px] font-mono font-bold tracking-widest text-ink-muted uppercase">Left</div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 -rotate-90 text-[9px] font-mono font-bold tracking-widest text-ink-muted uppercase">Right</div>

      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <XAxis type="number" dataKey="x" domain={[-100, 100]} hide />
          <YAxis type="number" dataKey="y" domain={[-100, 100]} hide />
          <ZAxis range={[60, 60]} /> {/* Fixed size */}
          
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-paper border-[1.5px] border-ink p-3 shadow-xl max-w-[200px]">
                    <h5 className="font-serif font-black text-ink mb-2">{data.name}</h5>
                    <div className="flex flex-col gap-1 text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                      <div className="flex justify-between">
                        <span>Ideology:</span>
                        <span className="font-bold text-ink">{data.ideology}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Stance:</span>
                        <span className="font-bold text-ink">{data.stance}</span>
                      </div>
                      <div className="flex justify-between mt-1 pt-1 border-t border-hairline border-dashed">
                        <span>Factuality:</span>
                        <span className="font-bold" style={{ color: data.color }}>{data.factuality}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter name="Sources" data={data} animationDuration={1500} animationEasing="ease-out">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--paper))" strokeWidth={1.5} style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
