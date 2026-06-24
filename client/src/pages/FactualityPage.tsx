import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { PublisherLogo } from "@/components/PublisherLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, ShieldAlert, Award, AlertTriangle, XCircle, Info, Activity } from "lucide-react";
import { type Publisher } from "@shared/schema";
import { useMemo } from "react";

function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Unrated</span>;
  
  const config: Record<string, { bg: string, text: string, icon: React.ReactNode }> = {
    "exemplary": { bg: "bg-emerald-100", text: "text-emerald-800", icon: <Award className="w-3 h-3" /> },
    "high":      { bg: "bg-blue-100", text: "text-blue-800", icon: <CheckCircle2 className="w-3 h-3" /> },
    "standard":  { bg: "bg-zinc-100", text: "text-zinc-800", icon: <Info className="w-3 h-3" /> },
    "mixed":     { bg: "bg-amber-100", text: "text-amber-800", icon: <AlertTriangle className="w-3 h-3" /> },
    "low":       { bg: "bg-red-100", text: "text-red-800", icon: <ShieldAlert className="w-3 h-3" /> },
  };

  const { bg, text, icon } = config[tier.toLowerCase()] || config["standard"];
  const label = tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${bg} ${text}`}>
      {icon} {label}
    </span>
  );
}

function BooleanCheck({ val }: { val: boolean }) {
  return val ? (
    <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
  ) : (
    <XCircle className="w-4 h-4 text-muted mx-auto" />
  );
}

export default function FactualityPage() {
  const { data: rawPublishers = [], isLoading } = useQuery({
    queryKey: ["/api/publishers"],
    queryFn: api.publishers.list,
  });

  const ratedPublishers = useMemo(() => {
    return (rawPublishers as Publisher[])
      .filter((p) => p.factualityScore !== null && p.factualityScore !== undefined)
      .sort((a, b) => (b.factualityScore || 0) - (a.factualityScore || 0));
  }, [rawPublishers]);

  return (
    <div className="min-h-screen bg-background">
      <MainNav onSearch={() => {}} searchQuery="" />

      {/* Header Section */}
      <div className="bg-[#1A1A1A] text-white py-16 px-6 md:px-12 border-b-4 border-red-700">
        <div className="max-w-[1200px] mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-700/20 text-red-500 text-xs font-black uppercase tracking-widest mb-6 rounded-sm border border-red-700/30">
            <Activity className="w-3 h-3" /> Platform Transparency
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight mb-6">
            The Factuality Index
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-3xl leading-relaxed mb-8">
            Trust isn't given; it's computed. Every news outlet on The Lens Dispatch is algorithmically scored from 0 to 100 based on a rigorous 5-signal composite matrix derived from global journalistic watchdogs and their own transparency practices.
          </p>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-12 py-16">
        
        {/* Methodology Breakdown */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">?</span>
            Scoring Methodology
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-card border border-border p-5 rounded-xl">
              <div className="text-3xl font-black text-blue-600 mb-2">35%</div>
              <h3 className="font-bold text-sm mb-2">MBFC Rating</h3>
              <p className="text-xs text-muted-foreground">Historical accuracy record from Media Bias/Fact Check's massive database.</p>
            </div>
            <div className="bg-card border border-border p-5 rounded-xl">
              <div className="text-3xl font-black text-emerald-600 mb-2">20%</div>
              <h3 className="font-bold text-sm mb-2">NewsGuard</h3>
              <p className="text-xs text-muted-foreground">Nutrition Label score assessing journalistic criteria and hidden alignments.</p>
            </div>
            <div className="bg-card border border-border p-5 rounded-xl">
              <div className="text-3xl font-black text-violet-600 mb-2">20%</div>
              <h3 className="font-bold text-sm mb-2">Transparency</h3>
              <p className="text-xs text-muted-foreground">Does the site visibly post an ownership disclosure, corrections policy, and label opinions?</p>
            </div>
            <div className="bg-card border border-border p-5 rounded-xl">
              <div className="text-3xl font-black text-amber-600 mb-2">15%</div>
              <h3 className="font-bold text-sm mb-2">IFCN Status</h3>
              <p className="text-xs text-muted-foreground">Are they an active signatory of the Poynter International Fact-Checking Network?</p>
            </div>
            <div className="bg-card border border-border p-5 rounded-xl">
              <div className="text-3xl font-black text-red-600 mb-2">10%</div>
              <h3 className="font-bold text-sm mb-2">Community</h3>
              <p className="text-xs text-muted-foreground">Reader flags. Sites flagged for misinformation over rigorous thresholds lose points.</p>
            </div>
          </div>
        </div>

        {/* The Leaderboard Table */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Source Leaderboard</h2>
          
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="p-4 font-black">Publisher</th>
                    <th className="p-4 font-black text-center">Composite Score</th>
                    <th className="p-4 font-black text-center">Tier</th>
                    <th className="p-4 font-black text-center">MBFC</th>
                    <th className="p-4 font-black text-center">NewsGuard</th>
                    <th className="p-4 font-black text-center" title="IFCN Signatory">IFCN</th>
                    <th className="p-4 font-black text-center" title="Corrections Policy">Corr. Policy</th>
                    <th className="p-4 font-black text-center" title="Ownership Disclosure">Ownership</th>
                    <th className="p-4 font-black text-right">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        Calculating matrix...
                      </td>
                    </tr>
                  ) : ratedPublishers.length === 0 ? (
                     <tr>
                      <td colSpan={9} className="p-12 text-center text-muted-foreground border-b border-border bg-secondary/20">
                        <div className="max-w-md mx-auto">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-500 opacity-50" />
                          <p className="font-bold text-foreground">Worker Pending</p>
                          <p className="text-xs mt-1">The factuality-sync worker has not yet completed its initial scan of the publisher matrix. Check back soon.</p>
                        </div>
                      </td>
                    </tr>
                  ) : ratedPublishers.map((pub, idx) => (
                    <tr key={pub.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}.</span>
                          <PublisherLogo name={pub.name} domain={pub.website} size="sm" />
                          <div className="font-bold text-foreground">{pub.name}</div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="text-xl font-black font-display text-primary">{pub.factualityScore}/100</div>
                      </td>
                      <td className="p-4 text-center">
                        <TierBadge tier={pub.factualityTier} />
                      </td>
                      <td className="p-4 text-center">
                        {pub.mbfcUrl ? (
                          <a href={pub.mbfcUrl} target="_blank" className="text-xs font-bold text-blue-600 hover:underline">
                            {pub.mbfcRating || "View"}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">{pub.mbfcRating || "-"}</span>
                        )}
                      </td>
                      <td className="p-4 text-center text-xs font-bold">
                        {pub.newsguardScore ? `${pub.newsguardScore}/100` : "-"}
                      </td>
                      <td className="p-4"><BooleanCheck val={pub.ifcnSignatory} /></td>
                      <td className="p-4"><BooleanCheck val={pub.hasCorrectionsPolicy} /></td>
                      <td className="p-4"><BooleanCheck val={pub.hasOwnershipDisclosure} /></td>
                      <td className="p-4 text-right text-xs text-muted-foreground">
                        {pub.factualityLastUpdated ? new Date(pub.factualityLastUpdated).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <NewsFooter />
    </div>
  );
}
