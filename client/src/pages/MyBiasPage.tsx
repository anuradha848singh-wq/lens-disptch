import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { useState } from "react";
import { Link } from "wouter";
import { 
  BarChart3, Eye, TrendingUp, AlertTriangle, 
  ChevronRight, Shield, BookOpen, Fingerprint,
  Info, ArrowUpRight, Scale
} from "lucide-react";
import type { MyBiasStats } from "@shared/schema";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EchoChamberRadar } from "@/components/EchoChamberRadar";

function computeDiversityIndex(stats: MyBiasStats) {
  const total = stats.totalRead;
  if (!total) return 0;
  const pLeft = (stats as any).proEstablishmentCount / total;
  const pCenter = (stats as any).neutralCount / total;
  const pRight = (stats as any).proOppositionCount / total;
  let h = 0;
  [pLeft, pCenter, pRight].forEach(p => {
    if (p > 0) h -= p * Math.log(p);
  });
  // H max for 3 categories is ln(3) ≈ 1.0986
  return Math.min(Math.round((h / 1.0986) * 100), 100);
}

function getDiversityLabel(index: number) {
  if (index > 80) return { label: "Exceptional", color: "text-green-600", bg: "bg-green-50", border: "border-green-100" };
  if (index > 60) return { label: "Balanced", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" };
  if (index > 40) return { label: "Moderate", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" };
  return { label: "Echo Chamber", color: "text-red-600", bg: "bg-red-50", border: "border-red-100" };
}

export default function MyBiasPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: biasStats, isLoading, error } = useQuery<MyBiasStats>({
    queryKey: ["/api/my-bias"],
    queryFn: () => api.myBias(),
    enabled: !!user,
    staleTime: 0,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#fcfaf7] dark:bg-zinc-950">
        <MainNav onSearch={setSearchQuery} searchQuery={searchQuery} />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <Fingerprint className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-black font-serif mb-4">Your Perspective Profile</h1>
          <p className="text-xl text-zinc-500 font-serif italic mb-10 max-w-lg mx-auto">
            Unlock deep insights into your news consumption patterns and media bias.
          </p>
          <button className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:scale-105 transition-transform">
            Sign In to Analyze
          </button>
        </div>
      </div>
    );
  }

  const diversityScore = biasStats ? computeDiversityIndex(biasStats) : 0;
  const dLabel = getDiversityLabel(diversityScore);

  return (
    <div className="min-h-screen bg-[#fcfaf7] dark:bg-zinc-950 font-serif">
      <MainNav onSearch={setSearchQuery} searchQuery={searchQuery} />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="mb-16 border-b border-zinc-200 dark:border-zinc-800 pb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 text-primary mb-3">
                <Scale className="w-6 h-6" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Personal Analytics</span>
              </div>
              <h1 className="text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                Media Consumption Audit
              </h1>
            </div>
            <p className="text-xl text-zinc-500 italic max-w-md">
              "To be well-informed is to seek the stories that challenge your assumptions."
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-white dark:bg-zinc-900 rounded-2xl animate-pulse shadow-sm" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-2xl p-12 text-center max-w-2xl mx-auto">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black mb-2">Analysis Interrupted</h2>
            <p className="text-red-700/70 dark:text-red-400">We couldn't reach your reading data. Please try again or read more articles.</p>
          </div>
        ) : biasStats?.totalRead === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-20 text-center shadow-sm max-w-3xl mx-auto">
            <BookOpen className="w-16 h-16 mx-auto text-zinc-300 mb-8" />
            <h2 className="text-3xl font-black mb-4">Tabula Rasa</h2>
            <p className="text-xl text-zinc-500 font-serif italic mb-10">You haven't read enough articles yet to generate a perspective profile.</p>
            <Link href="/">
              <button className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs">
                Begin Reading
              </button>
            </Link>
          </div>
        ) : biasStats ? (
          <div className="space-y-12">
            
            {/* Top Row: Diversity Index, Radar, & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Shannon Diversity Index Gauge */}
              <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col items-center justify-center">
                 <div className="absolute top-6 left-6 flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Diversity Index</span>
                    <div className="group relative">
                      <Info className="w-3.5 h-3.5 text-zinc-300 cursor-help" />
                      <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-zinc-900 text-[10px] text-white rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 font-sans">
                        Calculated using the Shannon-Wiener Diversity Index, measuring how balanced your consumption is across the political spectrum.
                      </div>
                    </div>
                 </div>

                 {/* Gauge Visualization */}
                 <div className="relative w-48 h-48 flex items-center justify-center mt-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="96" cy="96" r="88" strokeWidth="12" stroke="currentColor" fill="transparent" className="text-zinc-100 dark:text-zinc-800" />
                      <motion.circle 
                        cx="96" cy="96" r="88" strokeWidth="12" stroke="currentColor" fill="transparent"
                        strokeDasharray={2 * Math.PI * 88}
                        initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - diversityScore / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className={cn(diversityScore > 60 ? "text-green-500" : diversityScore > 40 ? "text-amber-500" : "text-red-500")}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-5xl font-black tracking-tighter">{diversityScore}%</span>
                      <span className={cn("text-xs font-black uppercase tracking-widest mt-1", dLabel.color)}>
                        {dLabel.label}
                      </span>
                    </div>
                 </div>
              </div>

              {/* Echo Chamber Radar */}
              <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">News Diet Radar</span>
                </div>
                <div className="mt-8 -ml-4">
                  <EchoChamberRadar stats={biasStats} />
                </div>
              </div>

              {/* Bias Distribution Card */}
              <div className="lg:col-span-5 bg-zinc-900 dark:bg-zinc-900 text-white rounded-3xl p-8 shadow-xl flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-black mb-8 flex items-center justify-between">
                    Bias Spectrum Analysis
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </h2>
                  
                  <div className="space-y-12 mb-8">
                    {/* Distribution Bar */}
                    <div className="space-y-4">
                      <div className="h-10 w-full rounded-2xl overflow-hidden flex shadow-inner p-1 bg-white/5 border border-white/10 group">
                        {biasStats.proEstablishmentPercent > 0 && (
                          <motion.div 
                            initial={{ width: 0 }} animate={{ width: `${biasStats.proEstablishmentPercent}%` }}
                            className="bg-blue-600 h-full relative group"
                          >
                             <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent" />
                          </motion.div>
                        )}
                        {biasStats.neutralPercent > 0 && (
                          <motion.div 
                            initial={{ width: 0 }} animate={{ width: `${biasStats.neutralPercent}%` }}
                            className="bg-zinc-500 h-full relative"
                          >
                             <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
                          </motion.div>
                        )}
                        {biasStats.regionalAlignedPercent > 0 && (
                          <motion.div 
                            initial={{ width: 0 }} animate={{ width: `${biasStats.regionalAlignedPercent}%` }}
                            className="bg-purple-600 h-full relative"
                          >
                             <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-transparent" />
                          </motion.div>
                        )}
                        {biasStats.proOppositionPercent > 0 && (
                          <motion.div 
                            initial={{ width: 0 }} animate={{ width: `${biasStats.proOppositionPercent}%` }}
                            className="bg-red-600 h-full relative"
                          >
                             <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-transparent" />
                          </motion.div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-4 text-center">
                        <div>
                          <p className="text-2xl font-black text-blue-400">{biasStats.proEstablishmentPercent}%</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Pro-Establishment</p>
                        </div>
                        <div className="border-l border-white/10 px-2">
                          <p className="text-2xl font-black text-zinc-400">{biasStats.neutralPercent}%</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Neutral</p>
                        </div>
                        <div className="border-l border-white/10 px-2">
                          <p className="text-2xl font-black text-purple-400">{biasStats.regionalAlignedPercent}%</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Regional</p>
                        </div>
                        <div className="border-l border-white/10 px-2">
                          <p className="text-2xl font-black text-red-400">{biasStats.proOppositionPercent}%</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Pro-Opposition</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-xs">
                        {biasStats.totalRead}
                      </div>
                      <div>
                        <p className="text-sm font-bold">Total Articles Audited</p>
                        <p className="text-xs text-zinc-500 italic font-serif">Historical reading volume</p>
                      </div>
                   </div>
                   <Link href="/history">
                     <button className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary hover:text-white transition-colors">
                        View History <ArrowUpRight className="w-4 h-4" />
                     </button>
                   </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Blindspot Action */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                   <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Media Blindspots</span>
                   <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                
                {biasStats.blindspotBias ? (
                  <>
                    <h3 className="text-3xl font-black mb-4">
                      Your {biasStats.blindspotBias.charAt(0).toUpperCase() + biasStats.blindspotBias.slice(1)} Blindspot
                    </h3>
                    <p className="text-lg text-zinc-500 leading-relaxed mb-8 italic">
                      You typically consume fewer stories from <span className="text-zinc-900 dark:text-zinc-100 font-bold not-italic">{biasStats.blindspotBias}-leaning</span> perspectives. This can lead to an incomplete worldview.
                    </p>
                    <Link href="/blindspot">
                      <button className="w-full bg-amber-500 text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl text-[10px] shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-transform">
                        Explore Blindspot Coverage
                      </button>
                    </Link>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <Eye className="w-12 h-12 mx-auto text-green-500 mb-4 opacity-20" />
                    <p className="text-zinc-500 italic">No significant blindspots detected.</p>
                  </div>
                )}
              </div>

              {/* Top Sites Table */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                   <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Top Trusted Outlets</span>
                   <BarChart3 className="w-5 h-5 text-zinc-300" />
                </div>
                
                <div className="space-y-6">
                  {biasStats.topPublishers.map((pub, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center font-black text-zinc-400 group-hover:bg-primary group-hover:text-white transition-colors">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-black text-lg truncate group-hover:text-primary transition-colors">{pub.name}</h4>
                          {pub.bias && (
                            <span className={cn(
                              "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                              pub.bias === "left" ? "bg-blue-500/10 text-blue-600" :
                              pub.bias === "center" ? "bg-zinc-100 text-zinc-500" :
                              "bg-red-500/10 text-red-600"
                            )}>
                              {pub.bias}
                            </span>
                          )}
                        </div>
                        <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${(pub.count / biasStats.totalRead) * 100}%` }}
                             className="h-full bg-zinc-400 group-hover:bg-primary transition-colors"
                           />
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-sm font-black">{pub.count}</p>
                         <p className="text-[10px] font-bold text-zinc-400 uppercase">Reads</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Editorial Insight Section */}
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-3xl p-10 flex flex-col md:flex-row gap-8 items-center border border-zinc-200 dark:border-zinc-700">
               <div className="w-32 h-32 flex-shrink-0 bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-700 p-6 flex items-center justify-center">
                  <Eye className="w-full h-full text-zinc-300" />
               </div>
               <div>
                  <h3 className="text-2xl font-black mb-4">Editorial Prescription</h3>
                  <p className="text-lg text-zinc-600 dark:text-zinc-400 italic font-serif leading-relaxed mb-6">
                    {diversityScore > 80 ? 
                      "Your perspective is remarkably balanced. You are likely seeing the nuances that others miss. Keep challenging yourself." :
                      diversityScore > 50 ?
                      "You have a solid foundation of diverse sources, but the analytics show a slight preference for familiar narratives. Try actively seeking opposing views today." :
                      "Your news bubble is currently very narrow. For a more objective worldview, try diversifying your reading with the 'Analyze' tools in your dispatch."}
                  </p>
                  <div className="flex gap-4">
                     <Link href="/publishers">
                        <button className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline">
                          Browse All Outlets
                        </button>
                     </Link>
                     <span className="text-zinc-300">|</span>
                     <Link href="/">
                        <button className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline">
                          Back to Dispatch
                        </button>
                     </Link>
                  </div>
               </div>
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}
