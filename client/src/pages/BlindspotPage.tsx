import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { StoryCard } from "@/components/StoryCard";
import { BiasChip } from "@/components/BiasBar";
import { Skeleton } from "@/components/ui/skeleton";
import { type ArticleWithDetails } from "@shared/schema";
import { Eye, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

function SkeletonCard() {
  return (
    <div className="bg-white border border-border p-4 space-y-3 animate-pulse">
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}

export default function BlindspotPage() {
  const { data: clusters = [], isLoading } = useQuery({
    queryKey: ["/api/blindspots"],
    queryFn: api.clusters.blindspots,
  });

  // A Pro-Establishment blindspot is a story heavily covered by Opposition, but ignored by Establishment
  const proEstablishmentBlindspots = clusters.filter((c: any) => c.blindspotSide === "pro_establishment" || ((c.proOppositionCount || 0) > (c.proEstablishmentCount || 0) * 3 && (c.proOppositionCount || 0) >= 2));
  
  // A Pro-Opposition blindspot is a story heavily covered by Establishment, but ignored by Opposition
  const proOppositionBlindspots = clusters.filter((c: any) => c.blindspotSide === "pro_opposition" || ((c.proEstablishmentCount || 0) > (c.proOppositionCount || 0) * 3 && (c.proEstablishmentCount || 0) >= 2));

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      <MainNav onSearch={() => {}} searchQuery="" />

      <div className="max-w-[1400px] mx-auto px-4 py-10 w-full flex-1">

        {/* Hero Explanation */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
              <Eye className="w-5 h-5 text-background" />
            </div>
            <h1 className="text-2xl font-display font-black tracking-tight">Blindspots</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed mb-4">
            Stories disproportionately covered by one side of the political spectrum — revealing what your media diet might be missing.
            Stories appear here when one side ignores a major narrative.
          </p>
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-sm max-w-2xl">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              These stories exist outside most readers' media bubbles. Reading across the spectrum doesn't mean agreeing — it means being informed.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Pro-Establishment Blindspot Column */}
          <div>
            <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-orange-500">
              <BiasChip bias="pro_establishment" />
              <div className="flex-1">
                <h2 className="text-sm font-black uppercase tracking-widest">Establishment Blindspot</h2>
                <p className="text-xs text-muted-foreground">Ignored by Pro-Establishment, heavily covered by Pro-Opposition</p>
              </div>
              <span className="text-xs font-black bg-orange-500 text-white px-2 py-1 rounded-sm uppercase tracking-widest">
                {isLoading ? "—" : `${proEstablishmentBlindspots.length} stories`}
              </span>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : proEstablishmentBlindspots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-dashed border-border rounded-sm">
                <Eye className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-bold text-muted-foreground">No establishment blindspots right now</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Coverage is currently balanced</p>
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 gap-4"
                initial="hidden"
                animate="show"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
              >
                {proEstablishmentBlindspots.map((a: any) => (
                  <motion.div key={a.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                    <StoryCard article={a} variant="standard" />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Pro-Opposition Blindspot Column */}
          <div>
            <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-green-600">
              <BiasChip bias="pro_opposition" />
              <div className="flex-1">
                <h2 className="text-sm font-black uppercase tracking-widest">Opposition Blindspot</h2>
                <p className="text-xs text-muted-foreground">Ignored by Pro-Opposition, heavily covered by Pro-Establishment</p>
              </div>
              <span className="text-xs font-black bg-green-600 text-white px-2 py-1 rounded-sm uppercase tracking-widest">
                {isLoading ? "—" : `${proOppositionBlindspots.length} stories`}
              </span>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : proOppositionBlindspots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-dashed border-border rounded-sm">
                <Eye className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-bold text-muted-foreground">No opposition blindspots right now</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Coverage is currently balanced</p>
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 gap-4"
                initial="hidden"
                animate="show"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
              >
                {proOppositionBlindspots.map((a: any) => (
                  <motion.div key={a.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                    <StoryCard article={a} variant="standard" />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <NewsFooter />
    </div>
  );
}
