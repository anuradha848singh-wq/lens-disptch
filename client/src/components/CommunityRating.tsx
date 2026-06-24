import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function CommunityRating({ clusterId }: { clusterId: string }) {
  const { user } = useAuth();
  const [ratedBias, setRatedBias] = useState<string | null>(null);
  const [ratedFactuality, setRatedFactuality] = useState<string | null>(null);

  const rateMutation = useMutation({
    mutationFn: (data: { ratingType: "bias" | "factuality"; ratingValue: string }) =>
      api.social.rateCluster(clusterId, data),
  });

  const handleRateBias = (val: string) => {
    if (!user) return;
    setRatedBias(val);
    rateMutation.mutate({ ratingType: "bias", ratingValue: val });
  };

  const handleRateFactuality = (val: string) => {
    if (!user) return;
    setRatedFactuality(val);
    rateMutation.mutate({ ratingType: "factuality", ratingValue: val });
  };

  if (!user) {
    return null; // Or we could show a "Sign in to vote" disabled state, but cleaner to hide.
  }

  return (
    <div className="w-full mt-4 p-5 rounded-xl border border-border bg-card/40 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Community Context Rating</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Do you disagree with our automated classification? Provide your feedback to help train the algorithm.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bias Rating */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rate Bias</span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "pro_establishment", label: "Pro-Establishment" },
              { id: "neutral", label: "Balanced" },
              { id: "pro_opposition", label: "Pro-Opposition" },
              { id: "regional_aligned", label: "Regional" }
            ].map(b => (
              <Button
                key={b.id}
                variant={ratedBias === b.id ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => handleRateBias(b.id)}
              >
                {ratedBias === b.id && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {b.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Factuality Rating */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rate Factuality</span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "high", label: "High / Verified" },
              { id: "mixed", label: "Mixed / Missing Context" },
              { id: "low", label: "Low / Sensationalist" }
            ].map(f => (
              <Button
                key={f.id}
                variant={ratedFactuality === f.id ? "secondary" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => handleRateFactuality(f.id)}
              >
                {ratedFactuality === f.id && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
