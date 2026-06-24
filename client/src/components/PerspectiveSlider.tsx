import { motion } from "framer-motion";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type BiasPerspective = "left" | "center" | "right";

interface PerspectiveSliderProps {
  activeBias: BiasPerspective;
  onChange: (bias: BiasPerspective) => void;
  availableBiases: Set<BiasPerspective>;
}

export function PerspectiveSlider({
  activeBias,
  onChange,
  availableBiases,
}: PerspectiveSliderProps) {
  const tabs: { id: BiasPerspective; label: string; color: string }[] = [
    { id: "left", label: "Left", color: "bg-blue-600" },
    { id: "center", label: "Center", color: "bg-gray-600" },
    { id: "right", label: "Right", color: "bg-red-600" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
          Perspective Switcher
        </span>
      </div>
      <div className="relative flex w-full max-w-sm bg-secondary/30 p-1.5 rounded-full border border-border shadow-inner">
        {tabs.map((tab) => {
          const isActive = activeBias === tab.id;
          const isAvailable = availableBiases.has(tab.id);

          const buttonContent = (
            <button
              key={tab.id}
              onClick={() => isAvailable && onChange(tab.id)}
              disabled={!isAvailable}
              className={`relative flex-1 py-2 text-sm font-bold rounded-full transition-all duration-300 z-10 ${
                isActive
                  ? "text-white"
                  : isAvailable
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-perspective-pill"
                  className={`absolute inset-0 rounded-full shadow-sm ${tab.color}`}
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  style={{ zIndex: -1 }}
                />
              )}
              {tab.label}
            </button>
          );

          if (!isAvailable) {
            return (
              <TooltipProvider key={tab.id}>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <div className="flex-1 flex justify-center">{buttonContent}</div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-popover border-border text-popover-foreground">
                    <p className="flex items-center gap-2 text-sm">
                      <Info className="w-4 h-4 text-amber-500" />
                      No coverage from {tab.label}-leaning sources yet.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          return buttonContent;
        })}
      </div>
    </div>
  );
}
