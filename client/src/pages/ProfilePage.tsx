import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, AlertTriangle, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/social/profiles", id],
    queryFn: () => api.social.getProfile(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
        <div className="flex items-center gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        Profile not found or is private.
      </div>
    );
  }

  const { profile, stats } = data;
  
  const biasData = [
    { name: "Pro-Establishment", value: stats.proEstablishmentCount || 0, color: "#3b82f6" },
    { name: "Neutral", value: stats.neutralCount || 0, color: "#a1a1aa" },
    { name: "Pro-Opposition", value: stats.proOppositionCount || 0, color: "#ef4444" },
    { name: "Regional", value: stats.regionalAlignedCount || 0, color: "#eab308" },
  ].filter(d => d.value > 0);

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 border-b border-border/50 pb-8 mb-8">
        <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
          <AvatarImage src={profile.avatarUrl} />
          <AvatarFallback className="text-2xl">{profile.displayName?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div className="text-center md:text-left space-y-2 flex-1">
          <h1 className="text-3xl font-black tracking-tight">{profile.displayName || "Anonymous User"}</h1>
          {profile.bio && <p className="text-muted-foreground">{profile.bio}</p>}
          <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground mt-2">
            <CalendarDays className="h-4 w-4" />
            <span>Joined {format(new Date(profile.createdAt || Date.now()), "MMMM yyyy")}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center bg-card p-4 rounded-xl border border-border shadow-sm min-w-[120px]">
          <span className="text-3xl font-black text-primary">{stats.totalRead}</span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold mt-1">Articles Read</span>
        </div>
      </div>

      {/* Perspective Profile */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight">Perspective Profile</h2>
        
        {stats.totalRead === 0 ? (
          <div className="p-8 border border-dashed border-muted rounded-xl text-center text-muted-foreground">
            No reading history to analyze yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Chart */}
            <div className="bg-card/50 border border-border rounded-xl p-6 shadow-sm backdrop-blur-sm">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">Media Diet</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={biasData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {biasData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {biasData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-xs font-medium">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name} ({Math.round(d.value / stats.totalRead * 100)}%)
                  </div>
                ))}
              </div>
            </div>

            {/* Diversity Analysis */}
            <div className="flex flex-col gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card/50 border border-border rounded-xl p-6 shadow-sm backdrop-blur-sm"
              >
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Echo Chamber Risk</h3>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Diversity Score</span>
                    <span className="font-bold">{Math.round((stats.shannonDiversity || 0) * 100)} / 100</span>
                  </div>
                  <Progress value={(stats.shannonDiversity || 0) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {stats.diversityLabel}
                  </p>
                </div>
              </motion.div>

              {stats.blindspotBias && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <h3 className="font-semibold text-orange-600 dark:text-orange-400">Identified Blindspot</h3>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    This user rarely reads articles from the <span className="font-bold text-orange-500 capitalize">{stats.blindspotBias.replace('_', ' ')}</span> perspective.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
