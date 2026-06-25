/**
 * MyBiasDashboard - Personal reading bias analytics
 * 
 * Displays user's reading distribution across the 4 bias buckets
 * with balance score and insights. Clinical/data-only, no gamification.
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  TrendingUp, 
  AlertCircle, 
  Info, 
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { useLocation } from "wouter";

interface BiasDistribution {
  proEstablishmentCount: number;
  proOppositionCount: number;
  regionalAlignedCount: number;
  neutralCount: number;
  proEstablishmentPercent: number;
  proOppositionPercent: number;
  regionalAlignedPercent: number;
  neutralPercent: number;
  totalRead: number;
}

interface MyBiasData {
  distribution: BiasDistribution;
  balanceScore: number; // 0-100, higher = more balanced
  topPublishers: { name: string; count: number; bias: string }[];
  recentReads: { title: string; publishedAt: string; bias: string }[];
}

export default function MyBiasDashboard() {
  const [, setLocation] = useLocation();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch my bias data
  const { data, isLoading, refetch, isRefetching } = useQuery<MyBiasData>({
    queryKey: ["/api/my-bias"],
    queryFn: async () => {
      const response = await fetch("/api/my-bias", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch bias data");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-48 w-full mb-6" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!data || data.distribution.totalRead === 0) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="bg-card border border-border rounded-2xl p-12">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <h1 className="text-2xl font-display font-black text-foreground mb-3">
                Your Reading Profile
              </h1>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start reading articles to see your bias distribution. 
                We track your reading history to help you understand your media consumption patterns.
              </p>
              <Button 
                onClick={() => setLocation("/")}
                className="bg-accent-interactive hover:bg-accent-interactive/90"
              >
                Browse Articles <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        </main>
        <NewsFooter />
      </div>
    );
  }

  const { distribution, balanceScore, topPublishers, recentReads } = data;

  // Determine bias label
  const getBiasLabel = (percent: number, otherPercent: number) => {
    if (percent > 60) return "dominant";
    if (percent > 40) return "leaning";
    return "balanced";
  };

  const dominantBias = 
    distribution.proEstablishmentPercent > distribution.proOppositionPercent &&
    distribution.proEstablishmentPercent > distribution.neutralPercent
      ? "pro-establishment"
      : distribution.proOppositionPercent > distribution.proEstablishmentPercent &&
        distribution.proOppositionPercent > distribution.neutralPercent
        ? "pro-opposition"
        : "neutral";

  const biasColor = {
    "pro-establishment": "text-[hsl(200,25%,48%)]",
    "pro-opposition": "text-[hsl(270,22%,50%)]",
    "neutral": "text-[hsl(220,10%,48%)]"
  }[dominantBias] || "text-muted-foreground";

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-display font-black text-foreground">
              Your Reading Profile
            </h1>
            <p className="text-muted-foreground mt-1">
              Based on your last 30 days of reading
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching || refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching || refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </motion.div>

        {/* Balance Score Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-6 mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Balance Score
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                How evenly you consume across perspectives
              </p>
            </div>
            <div className={`text-4xl font-black ${balanceScore >= 70 ? "text-green-600" : balanceScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
              {balanceScore}
              <span className="text-lg font-normal text-muted-foreground">/100</span>
            </div>
          </div>
          
          {/* Balance bar */}
          <div className="h-3 bg-secondary rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-[hsl(200,25%,48%)]" 
              style={{ width: `${distribution.proEstablishmentPercent}%` }} 
            />
            <div 
              className="h-full bg-[hsl(220,10%,48%)]" 
              style={{ width: `${distribution.neutralPercent}%` }} 
            />
            <div 
              className="h-full bg-[hsl(270,22%,50%)]" 
              style={{ width: `${distribution.proOppositionPercent}%` }} 
            />
          </div>
          
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Pro-Establishment</span>
            <span>Neutral</span>
            <span>Pro-Opposition</span>
          </div>

          {balanceScore < 40 && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">
                Your reading leans heavily toward <span className={`font-bold ${biasColor}`}>{dominantBias}</span> sources. 
                Consider exploring perspectives from other buckets for a more balanced view.
              </p>
            </div>
          )}
        </motion.div>

        {/* Distribution Details */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-6 mb-6"
        >
          <h2 className="text-lg font-bold text-foreground mb-4">
            Reading Distribution
          </h2>
          
          <div className="space-y-4">
            {[
              { 
                label: "Pro-Establishment", 
                count: distribution.proEstablishmentCount, 
                percent: distribution.proEstablishmentPercent,
                color: "bg-[hsl(200,25%,48%)]"
              },
              { 
                label: "Pro-Opposition", 
                count: distribution.proOppositionCount, 
                percent: distribution.proOppositionPercent,
                color: "bg-[hsl(270,22%,50%)]"
              },
              { 
                label: "Regional", 
                count: distribution.regionalAlignedCount, 
                percent: distribution.regionalAlignedPercent,
                color: "bg-[hsl(25,20%,52%)]"
              },
              { 
                label: "Neutral", 
                count: distribution.neutralCount, 
                percent: distribution.neutralPercent,
                color: "bg-[hsl(220,10%,48%)]"
              },
            ].map((bucket) => (
              <div key={bucket.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{bucket.label}</span>
                  <span className="text-muted-foreground">
                    {bucket.count} articles ({bucket.percent}%)
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${bucket.color} rounded-full transition-all duration-500`}
                    style={{ width: `${bucket.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>Total articles read: {distribution.totalRead}</span>
          </div>
        </motion.div>

        {/* Top Publishers */}
        {topPublishers && topPublishers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-2xl p-6 mb-6"
          >
            <h2 className="text-lg font-bold text-foreground mb-4">
              Your Top Publishers
            </h2>
            
            <div className="space-y-3">
              {topPublishers.slice(0, 5).map((pub, idx) => (
                <div 
                  key={pub.name} 
                  className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-muted-foreground/50">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium text-foreground">{pub.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      pub.bias === "pro_establishment" ? "bg-[hsl(200,25%,48%)]/10 text-[hsl(200,25%,48%)]":
                      pub.bias === "pro_opposition" ? "bg-[hsl(270,22%,50%)]/10 text-[hsl(270,22%,50%)]":
                      "bg-[hsl(220,10%,48%)]/10 text-[hsl(220,10%,48%)]"
                    }`}>
                      {pub.bias.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-muted-foreground">
                    {pub.count} reads
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Call to Action */}
        {balanceScore < 60 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-secondary/30 border border-dashed border-border rounded-2xl p-6 text-center"
          >
            <h3 className="text-lg font-bold text-foreground mb-2">
              Expand Your Perspective
            </h3>
            <p className="text-muted-foreground mb-4">
              Discover articles from sources you don't normally read
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="bg-accent-interactive hover:bg-accent-interactive/90"
            >
              Explore Diverse Coverage
            </Button>
          </motion.div>
        )}
      </main>

      <NewsFooter />
    </div>
  );
}