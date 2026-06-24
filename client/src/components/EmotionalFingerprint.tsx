import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface EmotionalFingerprintProps {
  publisherId: string;
}

export function EmotionalFingerprint({ publisherId }: EmotionalFingerprintProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/publishers", publisherId, "fingerprint"],
    queryFn: () => api.publishers.fingerprint(publisherId),
  });

  if (isLoading) return <div className="h-40 bg-muted animate-pulse rounded-xl" />;
  if (!data) return null;

  const total = data.total || 1;
  const items = [
    { label: "Alarming", value: data.alarming, color: "bg-red-500" },
    { label: "Tense", value: data.tense, color: "bg-amber-500" },
    { label: "Neutral", value: data.neutral, color: "bg-gray-400" },
    { label: "Calm", value: data.calm, color: "bg-emerald-500" },
    { label: "Hopeful", value: data.hopeful, color: "bg-blue-500" },
  ];

  return (
    <div className="bg-card border border-card-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Emotional Fingerprint</h4>
          <p className="text-[12px] font-bold text-foreground">Long-term Sentiment Distribution</p>
        </div>
        <div className="text-[10px] font-black text-muted-foreground bg-secondary px-2 py-0.5 rounded">
          {total} Articles Analyzed
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 h-24 mb-6 px-2">
        {items.map((item) => {
          const percent = (item.value / total) * 100;
          return (
            <div key={item.label} className="relative flex flex-col items-center group flex-1">
              <div 
                className={`w-full ${item.color} rounded-t-sm transition-all duration-1000 ease-out min-h-[4px]`}
                style={{ height: `${Math.max(4, percent)}%` }}
              >
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap transition-opacity z-10">
                  {Math.round(percent)}% {item.label}
                </div>
              </div>
              <div className="mt-2 text-[8px] font-black uppercase tracking-tighter text-muted-foreground text-center">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-dashed border-border">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-muted-foreground font-bold italic">"This publisher tends toward a {
            items.reduce((prev, current) => (prev.value > current.value) ? prev : current).label.toLowerCase()
          } narrative style."</span>
        </div>
      </div>
    </div>
  );
}
