import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface BiasBarProps {
  left: number;
  center: number;
  right: number;
  showLabels?: boolean;
  showCounts?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  total?: number;
}

export function BiasBar({ left, center, right, showLabels = false, showCounts = false, size = "md", total }: BiasBarProps) {
  const sum = left + center + right;
  if (sum === 0) return null;
  const lp = Math.round((left / sum) * 100);
  const cp = Math.round((center / sum) * 100);
  const rp = 100 - lp - cp;

  const heights = { xs: "h-0.5", sm: "h-1", md: "h-1.5", lg: "h-2" };

  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
          <span className="bias-left-text">Left {lp}%</span>
          <span className="bias-center-text">Center {cp}%</span>
          <span className="bias-right-text">Right {rp}%</span>
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex w-full overflow-hidden rounded-full cursor-help ${heights[size]}`}>
            {lp > 0 && <div className="bias-left" style={{ width: `${lp}%` }} />}
            {cp > 0 && <div className="bias-center" style={{ width: `${cp}%` }} />}
            {rp > 0 && <div className="bias-right" style={{ width: `${rp}%` }} />}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs py-1.5 px-3">
          <div className="flex gap-3 font-medium">
            <span className="bias-left-text">{lp}% Left</span>
            <span className="bias-center-text">{cp}% Center</span>
            <span className="bias-right-text">{rp}% Right</span>
          </div>
          {total && <p className="text-muted-foreground mt-0.5 text-center">{total} sources total</p>}
        </TooltipContent>
      </Tooltip>
      {showCounts && (
        <div className="flex justify-between text-[10px] mt-0.5 text-muted-foreground font-medium">
          <span className="bias-left-text">{left}</span>
          <span className="bias-center-text">{center}</span>
          <span className="bias-right-text">{right}</span>
        </div>
      )}
    </div>
  );
}

export function BiasChip({ bias, size = "sm" }: { bias: "left" | "center" | "right"; size?: "xs" | "sm" }) {
  const config = {
    left:   { label: "Left",   bg: "bias-left-bg",   text: "bias-left-text" },
    center: { label: "Center", bg: "bias-center-bg", text: "bias-center-text" },
    right:  { label: "Right",  bg: "bias-right-bg",  text: "bias-right-text" },
  }[bias];
  return (
    <span className={`inline-flex items-center font-bold uppercase tracking-wide rounded ${config.bg} ${config.text} ${size === "xs" ? "text-[9px] px-1 py-0.5" : "text-[10px] px-1.5 py-0.5"}`}>
      {config.label}
    </span>
  );
}

export function PublisherAvatar({ name, size = "sm" }: { name: string; size?: "xs" | "sm" | "md" }) {
  const sizes = { xs: "w-5 h-5 text-[8px]", sm: "w-7 h-7 text-[10px]", md: "w-9 h-9 text-xs" };
  return (
    <div className={`rounded-full bg-muted border border-border flex items-center justify-center font-bold text-muted-foreground flex-shrink-0 ${sizes[size]}`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function CoverageDetails({
  total, left, center, right,
}: { total: number; left: number; center: number; right: number }) {
  const lp = total > 0 ? Math.round((left / total) * 100) : 0;

  return (
    <div className="bg-card border border-card-border rounded p-4 text-sm">
      <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3">Coverage Details</h3>

      <div className="space-y-2 mb-4">
        {[
          { label: "Total News Sources", value: total, bold: true },
          { label: "Leaning Left", value: left, color: "bias-left-text" },
          { label: "Leaning Right", value: right, color: "bias-right-text" },
          { label: "Center", value: center, color: "bias-center-text" },
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-center">
            <span className={`text-xs ${row.bold ? "font-semibold" : "text-muted-foreground"}`}>{row.label}</span>
            <span className={`text-xs font-bold ${row.color || ""}`}>{row.value}</span>
          </div>
        ))}
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-[10px] font-bold mb-1 uppercase tracking-wide">
          <span className="bias-left-text">Left</span>
          <span className="bias-right-text">Right</span>
        </div>
        <BiasBar left={left} center={center} right={right} size="lg" />
        <p className="text-[10px] text-muted-foreground mt-1 text-center">
          {lp}% of the sources lean Left
        </p>
      </div>
    </div>
  );
}
