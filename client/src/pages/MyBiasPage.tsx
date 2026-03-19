import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { useState } from "react";
import { Link } from "wouter";
import { BarChart3, Eye, EyeOff, TrendingUp, AlertTriangle, ChevronRight, Shield, BookOpen } from "lucide-react";
import type { MyBiasStats } from "@shared/schema";

export default function MyBiasPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: biasStats, isLoading, error } = useQuery<MyBiasStats>({
    queryKey: ["my-bias"],
    queryFn: () => api.myBias(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav onSearch={setSearchQuery} searchQuery={searchQuery} />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-3xl font-bold mb-2">My News Bias</h1>
          <p className="text-muted-foreground mb-6">Sign in to see your personal reading bias analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav onSearch={setSearchQuery} searchQuery={searchQuery} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            My News Bias
          </h1>
          <p className="text-muted-foreground mt-1">
            Understand your reading habits and discover your media blind spots
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive rounded-xl p-6 text-center">
            Failed to load bias data. Try reading some articles first!
          </div>
        ) : biasStats?.totalRead === 0 ? (
          <div className="bg-muted rounded-xl p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No reading history yet</h2>
            <p className="text-muted-foreground mb-4">Start reading articles to see your bias analysis</p>
            <Link href="/">
              <span className="text-primary font-medium hover:underline cursor-pointer">Browse articles →</span>
            </Link>
          </div>
        ) : biasStats ? (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card border rounded-xl p-5 text-center">
                <div className="text-3xl font-bold text-primary">{biasStats.totalRead}</div>
                <div className="text-sm text-muted-foreground mt-1">Articles Read</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 text-center">
                <div className="text-3xl font-bold text-blue-500">{biasStats.leftPercent}%</div>
                <div className="text-sm text-muted-foreground mt-1">Left Sources</div>
              </div>
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-5 text-center">
                <div className="text-3xl font-bold text-violet-500">{biasStats.centerPercent}%</div>
                <div className="text-sm text-muted-foreground mt-1">Center Sources</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 text-center">
                <div className="text-3xl font-bold text-red-500">{biasStats.rightPercent}%</div>
                <div className="text-sm text-muted-foreground mt-1">Right Sources</div>
              </div>
            </div>

            {/* Bias Distribution Bar */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Your Reading Bias Distribution</h2>
              <div className="relative h-10 rounded-full overflow-hidden flex">
                {biasStats.leftPercent > 0 && (
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                    style={{ width: `${Math.max(biasStats.leftPercent, 5)}%` }}
                  >
                    {biasStats.leftPercent}%
                  </div>
                )}
                {biasStats.centerPercent > 0 && (
                  <div
                    className="bg-violet-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                    style={{ width: `${Math.max(biasStats.centerPercent, 5)}%` }}
                  >
                    {biasStats.centerPercent}%
                  </div>
                )}
                {biasStats.rightPercent > 0 && (
                  <div
                    className="bg-red-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                    style={{ width: `${Math.max(biasStats.rightPercent, 5)}%` }}
                  >
                    {biasStats.rightPercent}%
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span> Left</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-violet-500 rounded-full inline-block"></span> Center</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full inline-block"></span> Right</span>
              </div>
            </div>

            {/* Blindspot Alert */}
            {biasStats.blindspotBias && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-700 dark:text-amber-400">
                      Blindspot Detected: {biasStats.blindspotBias.charAt(0).toUpperCase() + biasStats.blindspotBias.slice(1)} Sources
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      You read the fewest articles from <strong>{biasStats.blindspotBias}</strong>-leaning sources. 
                      Consider diversifying your reading to get a more complete picture of the news.
                    </p>
                    <Link href="/blindspot">
                      <span className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-3 hover:underline cursor-pointer">
                        Explore Blindspot Stories <ChevronRight className="w-4 h-4" />
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Top Publishers */}
            {biasStats.topPublishers.length > 0 && (
              <div className="bg-card border rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Your Most-Read Publishers</h2>
                <div className="space-y-3">
                  {biasStats.topPublishers.map((pub, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pub.name}</span>
                          {pub.bias && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              pub.bias === "left" ? "bg-blue-500/10 text-blue-500" :
                              pub.bias === "center" ? "bg-violet-500/10 text-violet-500" :
                              "bg-red-500/10 text-red-500"
                            }`}>
                              {pub.bias.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">{pub.count} articles</span>
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(pub.count / biasStats.totalRead) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-3">💡 Tips for Balanced Reading</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Eye className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  Read at least one article per day from a source outside your usual bias
                </li>
                <li className="flex items-start gap-2">
                  <Eye className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  Check the Blindspot page to see stories you might be missing
                </li>
                <li className="flex items-start gap-2">
                  <Eye className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  Compare coverage from different publishers on the same topic
                </li>
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
