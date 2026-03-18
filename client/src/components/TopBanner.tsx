import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";

export function TopBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="bg-foreground text-background text-sm py-2 px-4 flex items-center justify-between" data-testid="top-banner">
      <div className="flex-1 text-center">
        See every side of every news story.
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent border-background/40 text-background hover:bg-background/10 hover:text-background" data-testid="button-get-started">
          Get Started
        </Button>
        <button
          onClick={() => setVisible(false)}
          className="text-background/60 hover:text-background transition-colors"
          data-testid="button-close-banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
