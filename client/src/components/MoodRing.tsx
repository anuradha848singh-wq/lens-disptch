import React from "react";
import { getMoodLabel, MOOD_COLORS } from "@/lib/sentiment";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MoodRingProps {
  sentimentScore: number;
  size?: number;
  className?: string;
}

export function MoodRing({
  sentimentScore,
  size = 24,
  className = "",
}: MoodRingProps) {
  const mood = getMoodLabel(sentimentScore);
  const color = MOOD_COLORS[mood] || MOOD_COLORS.neutral;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`inline-flex items-center justify-center ${className}`}
            style={{ width: size, height: size }}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              className="transition-all duration-700 ease-out hover:scale-110"
              style={{ filter: `drop-shadow(0 0 2px ${color}44)` }}
            >
              {[10, 8, 6, 4, 2].map((radius, i) => (
                <circle
                  key={i}
                  cx="12"
                  cy="12"
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  className="transition-all duration-1000"
                  style={{ 
                    opacity: 1 - i * 0.15,
                    strokeDasharray: i % 2 === 0 ? "none" : "1 1"
                  }}
                />
              ))}
              <circle
                cx="12"
                cy="12"
                r="1"
                fill={color}
              />
            </svg>
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs font-medium px-2 py-1 shadow-md border-muted/20 capitalize">
          Mood: <span style={{ color }}>{mood}</span> ({sentimentScore.toFixed(2)})
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
