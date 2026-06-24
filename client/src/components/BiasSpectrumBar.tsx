import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BiasSpectrumBarProps {
  proEstablishmentCount: number;
  neutralCount: number;
  proOppositionCount: number;
  totalStats?: number; // Optional, defaults to left + center + right
  className?: string;
}

export function BiasSpectrumBar({
  proEstablishmentCount,
  neutralCount,
  proOppositionCount,
  totalStats,
  className = "",
}: BiasSpectrumBarProps) {
  const total = totalStats !== undefined ? totalStats : proEstablishmentCount + neutralCount + proOppositionCount;

  // Calculate percentages (handle division by zero)
  const leftPct = total > 0 ? (proEstablishmentCount / total) * 100 : 0;
  const centerPct = total > 0 ? (neutralCount / total) * 100 : 0;
  const rightPct = total > 0 ? (proOppositionCount / total) * 100 : 0;

  if (total === 0) {
    return (
      <div className={`w-full h-2 rounded-full overflow-hidden flex bg-muted/20 ${className}`}>
        <div className="h-full w-full bg-muted/10"></div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`w-full h-2 rounded-full overflow-hidden flex bg-color-background-secondary border border-color-border-tertiary ${className}`}>
            <div
              className="h-full bg-[#2563EB] transition-all duration-500 ease-in-out"
              style={{ width: `${leftPct}%` }}
              role="progressbar"
              aria-valuenow={leftPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
            <div
              className="h-full bg-[#6B7280] transition-all duration-500 ease-in-out"
              style={{ width: `${centerPct}%` }}
              role="progressbar"
              aria-valuenow={centerPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
            <div
              className="h-full bg-[#DC2626] transition-all duration-500 ease-in-out"
              style={{ width: `${rightPct}%` }}
              role="progressbar"
              aria-valuenow={rightPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent className="flex flex-col gap-1 p-3 min-w-[150px] shadow-lg border-muted/20">
          <div className="text-xs font-semibold mb-1 text-muted-foreground border-b pb-1">Coverage Bias Distribution</div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#2563EB]" />
              <span className="font-medium">Left</span>
            </div>
            <span className="text-muted-foreground">{leftPct.toFixed(0)}% ({proEstablishmentCount})</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#6B7280]" />
              <span className="font-medium">Center</span>
            </div>
            <span className="text-muted-foreground">{centerPct.toFixed(0)}% ({neutralCount})</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#DC2626]" />
              <span className="font-medium">Right</span>
            </div>
            <span className="text-muted-foreground">{rightPct.toFixed(0)}% ({proOppositionCount})</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
