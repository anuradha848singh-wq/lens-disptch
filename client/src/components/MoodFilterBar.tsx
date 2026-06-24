import React from "react";
import { MOOD_COLORS } from "@/lib/sentiment";

interface MoodFilterBarProps {
  currentMood: string | null;
  onSelectMood: (mood: string | null) => void;
}

const MOOD_OPTIONS = [
  { key: null,        label: "All",      color: "bg-border" },
  { key: "alarming",  label: "Alarming", color: "bg-[#E24B4A]" },
  { key: "tense",     label: "Tense",    color: "bg-[#EF9F27]" },
  { key: "neutral",   label: "Neutral",  color: "bg-[#888780]" },
  { key: "calm",      label: "Calm",     color: "bg-[#1D9E75]" },
  { key: "hopeful",   label: "Hopeful",  color: "bg-[#378ADD]" },
];

export function MoodFilterBar({ currentMood, onSelectMood }: MoodFilterBarProps) {
  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
        Tone Filter:
      </span>
      <div className="flex items-center gap-1.5">
        {MOOD_OPTIONS.map((mood) => (
          <button
            key={String(mood.key)}
            onClick={() => onSelectMood(mood.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              currentMood === mood.key
                ? "border-foreground bg-foreground text-background shadow-sm scale-105"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <span 
              className={`w-2 h-2 rounded-full ${mood.color}`} 
              style={{ 
                backgroundColor: mood.key ? MOOD_COLORS[mood.key] : undefined,
                boxShadow: currentMood === mood.key ? `0 0 8px ${MOOD_COLORS[mood.key || "neutral"]}88` : "none"
              }}
            />
            {mood.label}
          </button>
        ))}
      </div>
    </div>
  );
}
