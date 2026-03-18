import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface BiasBarProps {
  left: number;
  center: number;
  right: number;
  showLabels?: boolean;
  showPercentages?: boolean;
  size?: "sm" | "md" | "lg";
}

export function BiasBar({ left, center, right, showLabels = false, showPercentages = false, size = "md" }: BiasBarProps) {
  const total = left + center + right;
  const leftPct = total > 0 ? Math.round((left / total) * 100) : 0;
  const centerPct = total > 0 ? Math.round((center / total) * 100) : 0;
  const rightPct = total > 0 ? Math.round((right / total) * 100) : 100 - leftPct - centerPct;

  const heights = { sm: "h-1", md: "h-1.5", lg: "h-2" };
  const height = heights[size];

  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span className="bias-left-text font-medium">Left</span>
          <span className="bias-center-text font-medium">Center</span>
          <span className="bias-right-text font-medium">Right</span>
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex w-full rounded-full overflow-hidden ${height} cursor-help`}>
            {leftPct > 0 && (
              <div
                className="bias-left transition-all"
                style={{ width: `${leftPct}%` }}
              />
            )}
            {centerPct > 0 && (
              <div
                className="bias-center transition-all"
                style={{ width: `${centerPct}%` }}
              />
            )}
            {rightPct > 0 && (
              <div
                className="bias-right transition-all"
                style={{ width: `${rightPct}%` }}
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="flex gap-3">
            <span className="bias-left-text">{leftPct}% Left</span>
            <span className="bias-center-text">{centerPct}% Center</span>
            <span className="bias-right-text">{rightPct}% Right</span>
          </div>
        </TooltipContent>
      </Tooltip>
      {showPercentages && (
        <div className="flex justify-between text-xs mt-1">
          <span className="bias-left-text">{leftPct}%</span>
          <span className="bias-center-text">{centerPct}%</span>
          <span className="bias-right-text">{rightPct}%</span>
        </div>
      )}
    </div>
  );
}

export function BiasLabel({ bias }: { bias: "left" | "center" | "right" }) {
  const config = {
    left: { label: "Left", className: "bias-left-text" },
    center: { label: "Center", className: "bias-center-text" },
    right: { label: "Right", className: "bias-right-text" },
  };
  const c = config[bias];
  return <span className={`text-xs font-semibold uppercase tracking-wide ${c.className}`}>{c.label}</span>;
}

export function BiasChip({ bias, sourceCount }: { bias: "left" | "center" | "right"; sourceCount?: number }) {
  const config = {
    left: { label: "Left", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
    center: { label: "Center", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
    right: { label: "Right", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
  };
  const c = config[bias];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.label}
      {sourceCount !== undefined && <span className="opacity-70">{sourceCount}</span>}
    </span>
  );
}
