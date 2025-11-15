import { Badge } from "@/components/ui/badge";

type Bias = "left" | "center" | "right";

interface BiasIndicatorProps {
  bias: Bias;
  size?: "sm" | "default";
}

export function BiasIndicator({ bias, size = "default" }: BiasIndicatorProps) {
  const biasConfig = {
    left: { label: "Left", className: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20" },
    center: { label: "Center", className: "bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/20" },
    right: { label: "Right", className: "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-500/20" },
  };

  const config = biasConfig[bias];

  return (
    <Badge
      variant="outline"
      className={`${config.className} font-medium ${size === "sm" ? "text-xs" : ""}`}
      data-testid={`badge-bias-${bias}`}
    >
      {config.label}
    </Badge>
  );
}
