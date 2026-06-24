import { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { MyBiasStats } from "@shared/schema";
import { Info } from "lucide-react";

export function EchoChamberRadar({ stats }: { stats: MyBiasStats }) {
  const data = useMemo(() => {
    return [
      { subject: "Liberal Focus", score: stats.proEstablishmentPercent, fullMark: 100 },
      { subject: "Hopeful Tone", score: stats.hopefulPercent, fullMark: 100 },
      { subject: "Diversity", score: stats.shannonDiversity, fullMark: 100 },
      { subject: "Alarmist Tone", score: stats.alarmingPercent, fullMark: 100 },
      { subject: "Conservative Focus", score: stats.proOppositionPercent, fullMark: 100 },
    ];
  }, [stats]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-700/50 p-3 rounded-lg shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
            {dataPoint.subject}
          </p>
          <p className="text-xl font-black text-primary">
            {dataPoint.score}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center">
      <div className="absolute top-0 right-0 z-10 group">
        <Info className="w-4 h-4 text-zinc-400 cursor-help" />
        <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl font-sans">
          Your <strong>News Diet Radar</strong> maps your reading habits across political leanings and editorial tones. A larger, more balanced shape indicates a healthier, more diverse information diet.
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 900, textAnchor: "middle" }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            name="News Diet"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
