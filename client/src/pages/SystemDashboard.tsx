import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainNav } from "@/components/MainNav";

const api = (path: string) => fetch(path, { credentials: "include" }).then(r => r.json());

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-blue-100 text-blue-800",
    gray: "bg-gray-100 text-gray-600",
    purple: "bg-purple-100 text-purple-800",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  const border = color === "red" ? "border-red-300" : color === "green" ? "border-green-300" : color === "amber" ? "border-amber-300" : "border-gray-200";
  return (
    <div className={`border ${border} rounded-xl p-4 bg-card`}>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs font-medium text-muted-foreground mt-1">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function SeverityBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-100 text-red-800 border border-red-300",
    warn: "bg-amber-100 text-amber-800 border border-amber-300",
    perf: "bg-orange-100 text-orange-800 border border-orange-300",
    info: "bg-blue-100 text-blue-700 border border-blue-200",
  };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${map[s] || map.info}`}>{s.toUpperCase()}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function SystemDashboard() {
  const [tab, setTab] = useState<"overview" | "fetch" | "worker" | "cluster" | "api" | "errors">("overview");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/metrics"],
    queryFn: () => api("/api/admin/metrics"),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/metrics/resolve/${id}`, { method: "POST", credentials: "include" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/metrics"] }),
  });

  const clearErrors = useMutation({
    mutationFn: () => fetch("/api/admin/metrics/errors", { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/metrics"] }),
  });

  if (isLoading) return <div className="min-h-screen bg-background"><MainNav /><div className="max-w-7xl mx-auto px-6 pt-20 text-muted-foreground">Loading metrics...</div></div>;
  if (!data || data.error) return <div className="min-h-screen bg-background"><MainNav /><div className="max-w-7xl mx-auto px-6 pt-20 text-red-500">Access denied or server error.</div></div>;

  const { uptime, fetch: ft, worker, clustering, api: apiStats, schedulers, errors, process, queueDepth, storyQuality } = data;
  const tabs = ["overview", "fetch", "worker", "cluster", "api", "errors"] as const;

  const activeErrors = errors?.active || [];
  const criticalCount = errors?.counts?.critical || 0;
  const warnCount = errors?.counts?.warn || 0;
  const perfCount = errors?.counts?.perf || 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MainNav />
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-10 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">System Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Uptime: {uptime?.human} · Started {new Date(uptime?.serverStartTime).toLocaleTimeString()}</p>
          </div>
          <div className="flex items-center gap-3">
            {criticalCount > 0 && <Pill color="red">{criticalCount} critical</Pill>}
            {warnCount > 0 && <Pill color="amber">{warnCount} warnings</Pill>}
            <button
              onClick={() => setAutoRefresh(p => !p)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium ${autoRefresh ? "border-green-400 text-green-700 bg-green-50" : "border-gray-300 text-gray-600"}`}
            >
              {autoRefresh ? "● Live" : "Paused"}
            </button>
            <button onClick={() => qc.invalidateQueries({ queryKey: ["/api/admin/metrics"] })} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-muted-foreground">Refresh</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-bold capitalize whitespace-nowrap border-b-2 transition-colors ${tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t === "errors" && criticalCount > 0 ? `Errors (${criticalCount} crit)` : t === "cluster" ? "Clustering" : t}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <>
            <Section title="At a glance">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <StatCard label="Worker success rate" value={`${worker?.successRate || 0}%`} sub={`${worker?.success || 0} ok / ${worker?.failed || 0} failed`} color={worker?.successRate > 90 ? "green" : "red"} />
                <StatCard label="Cluster match rate" value={`${clustering?.matchRate || 0}%`} sub={`${clustering?.matches || 0} matched / ${clustering?.newClusters || 0} new`} color={clustering?.matchRate > 30 ? "green" : "amber"} />
                <StatCard label="Active errors" value={activeErrors.length} sub={`${criticalCount} critical · ${warnCount} warn · ${perfCount} perf`} color={criticalCount > 0 ? "red" : warnCount > 0 ? "amber" : "green"} />
                <StatCard label="API error rate" value={`${apiStats?.errorRate || 0}%`} sub={`${apiStats?.total || 0} total calls`} color={apiStats?.errorRate > 5 ? "red" : "green"} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Fetch cycles" value={ft?.totalCycles || 0} sub={ft?.lastEnd ? `Last: ${new Date(ft.lastEnd).toLocaleTimeString()}` : "Not run yet"} />
                <StatCard label="Articles processed" value={worker?.total || 0} sub={`${worker?.duplicate || 0} duplicates skipped`} />
                <StatCard label="Queue depth" value={queueDepth?.article?.waiting || 0} sub={`${queueDepth?.article?.active || 0} active workers`} color={queueDepth?.article?.waiting > 500 ? "amber" : "gray"} />
                <StatCard label="Node Memory" value={`${process?.memoryMB || 0} MB`} sub="Heap used" color={process?.memoryMB > 400 ? "amber" : "gray"} />
              </div>
            </Section>

            <Section title="Current fetch cycle">
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 text-[10px] font-bold text-muted-foreground uppercase px-3 py-2 border-b border-border bg-secondary/30">
                  <span>Source</span><span>Status</span><span>Articles</span><span>Duration</span>
                </div>
                {(ft?.currentSources || []).length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No fetch cycle running yet</div>
                ) : (
                  (ft?.currentSources || []).slice(0, 20).map((s: any, i: number) => (
                    <div key={i} className="grid grid-cols-4 text-xs px-3 py-2 border-b border-border last:border-0 items-center">
                      <span className="font-medium truncate">{s.source}</span>
                      <span>{s.status === "ok" ? <Pill color="green">OK</Pill> : s.status === "failed" ? <Pill color="red">Failed</Pill> : <Pill color="gray">304</Pill>}</span>
                      <span>{s.articlesEnqueued || 0}</span>
                      <span className="text-muted-foreground">{s.durationMs}ms</span>
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section title="Top Stories Quality Check">
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="grid grid-cols-6 text-[10px] font-bold text-muted-foreground uppercase px-3 py-2 border-b border-border bg-secondary/30">
                  <span className="col-span-2">Story</span><span>Sources</span><span>Velocity</span><span>Phase</span><span>Bias Mix (L/R)</span>
                </div>
                {(storyQuality || []).length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No top stories generated yet</div>
                ) : (
                  (storyQuality || []).map((s: any, i: number) => (
                    <div key={i} className="grid grid-cols-6 text-xs px-3 py-2 border-b border-border last:border-0 items-center">
                      <span className="col-span-2 font-medium truncate pr-4">{s.title}</span>
                      <span>{s.sourceCount}</span>
                      <span>{s.velocityScore?.toFixed(2)}</span>
                      <span><Pill color={s.storyPhase === "breaking" ? "red" : s.storyPhase === "developing" ? "amber" : "blue"}>{s.storyPhase || "none"}</Pill></span>
                      <span className="text-muted-foreground">L:{s.proEstablishmentCount} / R:{s.proOppositionCount}</span>
                    </div>
                  ))
                )}
              </div>
            </Section>

            {activeErrors.length > 0 && (
              <Section title="Active errors">
                <div className="border border-red-200 rounded-xl overflow-hidden">
                  {activeErrors.slice(0, 10).map((e: any) => (
                    <div key={e.id} className="flex items-start gap-3 px-3 py-2.5 border-b border-border last:border-0 text-xs">
                      <SeverityBadge s={e.severity} />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground">[{e.source}]</span> {e.message}
                        {e.detail && <div className="text-muted-foreground mt-0.5 truncate">{e.detail}</div>}
                        <div className="text-muted-foreground mt-0.5">{new Date(e.timestamp).toLocaleTimeString()}</div>
                      </div>
                      <button onClick={() => resolveMutation.mutate(e.id)} className="text-[10px] text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5 shrink-0">Resolve</button>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        {/* ── FETCH TAB ── */}
        {tab === "fetch" && (
          <Section title="Recent RSS fetches">
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-5 text-[10px] font-bold text-muted-foreground uppercase px-3 py-2 border-b border-border bg-secondary/30">
                <span>Source</span><span>Tier</span><span>Status</span><span>Articles</span><span>Time</span>
              </div>
              {(ft?.recentSources || []).map((s: any, i: number) => (
                <div key={i} className="grid grid-cols-5 text-xs px-3 py-2 border-b border-border last:border-0 items-center">
                  <span className="font-medium truncate">{s.source}</span>
                  <span className="text-muted-foreground">T{s.tier}</span>
                  <span>{s.status === "ok" ? <Pill color="green">OK +{s.articlesEnqueued}</Pill> : s.status === "failed" ? <Pill color="red">Failed</Pill> : <Pill color="gray">304</Pill>}</span>
                  <span>{s.articlesEnqueued}</span>
                  <span className="text-muted-foreground">{new Date(s.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
              {(ft?.recentSources || []).length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">No fetch history yet — wait for first fetch cycle</div>
              )}
            </div>
          </Section>
        )}

        {/* ── WORKER TAB ── */}
        {tab === "worker" && (
          <>
            <Section title="Worker summary">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <StatCard label="Total jobs" value={worker?.total || 0} />
                <StatCard label="Succeeded" value={worker?.success || 0} color="green" />
                <StatCard label="Failed" value={worker?.failed || 0} color={worker?.failed > 0 ? "red" : "green"} />
                <StatCard label="Duplicates skipped" value={worker?.duplicate || 0} color="gray" />
              </div>
            </Section>
            <Section title="Recent jobs">
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 text-[10px] font-bold text-muted-foreground uppercase px-3 py-2 border-b border-border bg-secondary/30">
                  <span className="col-span-2">Article</span><span>Status</span><span>Duration</span>
                </div>
                {(worker?.recentJobs || []).map((j: any, i: number) => (
                  <div key={i} className="grid grid-cols-4 text-xs px-3 py-2 border-b border-border last:border-0 items-start">
                    <span className="col-span-2">
                      <div className="font-medium truncate">{j.title}</div>
                      {j.errorMessage && <div className="text-red-500 truncate text-[10px] mt-0.5">{j.errorMessage}</div>}
                      {j.clusterId && <div className="text-muted-foreground text-[10px] mt-0.5">→ cluster {j.clusterId.substring(0, 8)} (score {j.clusterScore?.toFixed(2)})</div>}
                    </span>
                    <span>{j.status === "success" ? <Pill color="green">OK</Pill> : j.status === "duplicate" ? <Pill color="gray">Dup</Pill> : <Pill color="red">Failed</Pill>}</span>
                    <span className="text-muted-foreground">{j.durationMs}ms</span>
                  </div>
                ))}
                {(worker?.recentJobs || []).length === 0 && (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">No jobs processed yet</div>
                )}
              </div>
            </Section>
          </>
        )}

        {/* ── CLUSTER TAB ── */}
        {tab === "cluster" && (
          <>
            <Section title="Clustering summary">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <StatCard label="Articles matched" value={clustering?.matches || 0} color="green" sub="joined existing cluster" />
                <StatCard label="New clusters created" value={clustering?.newClusters || 0} sub="no match found" />
                <StatCard label="Retroactive merges" value={clustering?.merges || 0} sub="solo articles pulled in" />
                <StatCard label="Match rate" value={`${clustering?.matchRate || 0}%`} color={clustering?.matchRate > 30 ? "green" : "amber"} sub="target: 40%+" />
              </div>
            </Section>

            <Section title="Score Distribution (Matches)">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <StatCard label="< 0.3 (Low)" value={clustering?.scoreDistribution?.low || 0} />
                <StatCard label="0.3 - 0.5 (Mid)" value={clustering?.scoreDistribution?.mid || 0} />
                <StatCard label="0.5 - 0.7 (High)" value={clustering?.scoreDistribution?.high || 0} />
                <StatCard label="0.7+ (Perfect)" value={clustering?.scoreDistribution?.perfect || 0} color="green" />
              </div>
            </Section>

            <Section title="Recent cluster events">
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 text-[10px] font-bold text-muted-foreground uppercase px-3 py-2 border-b border-border bg-secondary/30">
                  <span>Type</span><span className="col-span-2">Article</span><span>Score</span>
                </div>
                {(clustering?.recentEvents || []).map((e: any, i: number) => (
                  <div key={i} className="grid grid-cols-4 text-xs px-3 py-2 border-b border-border last:border-0 items-center">
                    <span>{e.type === "match" ? <Pill color="green">Match</Pill> : e.type === "new" ? <Pill color="blue">New</Pill> : <Pill color="purple">Merge</Pill>}</span>
                    <span className="col-span-2 truncate">{e.title}</span>
                    <span className="text-muted-foreground">{e.score ? e.score.toFixed(3) : "—"}</span>
                  </div>
                ))}
                {(clustering?.recentEvents || []).length === 0 && (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">No clustering events yet</div>
                )}
              </div>
            </Section>
          </>
        )}

        {/* ── API TAB ── */}
        {tab === "api" && (
          <>
            <Section title="API performance">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <StatCard label="Total API calls" value={apiStats?.total || 0} />
                <StatCard label="Errors (4xx/5xx)" value={apiStats?.errors || 0} color={apiStats?.errors > 0 ? "red" : "green"} />
                <StatCard label="Error rate" value={`${apiStats?.errorRate || 0}%`} color={apiStats?.errorRate > 5 ? "red" : "green"} />
              </div>
            </Section>
            <Section title="Slowest endpoints (avg)">
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 text-[10px] font-bold text-muted-foreground uppercase px-3 py-2 border-b border-border bg-secondary/30">
                  <span className="col-span-2">Endpoint</span><span>Avg ms</span><span>Calls / Errors</span>
                </div>
                {(apiStats?.slowEndpoints || []).map((e: any, i: number) => (
                  <div key={i} className="grid grid-cols-4 text-xs px-3 py-2 border-b border-border last:border-0 items-center">
                    <span className="col-span-2 font-mono truncate">{e.endpoint}</span>
                    <span className={e.avgMs > 1000 ? "text-red-600 font-bold" : e.avgMs > 400 ? "text-amber-600" : "text-green-700"}>{e.avgMs}ms</span>
                    <span className="text-muted-foreground">{e.count} / {e.errors}</span>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="Recent API calls">
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 text-[10px] font-bold text-muted-foreground uppercase px-3 py-2 border-b border-border bg-secondary/30">
                  <span className="col-span-2">Endpoint</span><span>Status</span><span>Duration</span>
                </div>
                {(apiStats?.recentCalls || []).map((c: any, i: number) => (
                  <div key={i} className="grid grid-cols-4 text-xs px-3 py-2 border-b border-border last:border-0 items-center">
                    <span className="col-span-2 font-mono truncate">{c.endpoint}</span>
                    <span className={c.statusCode >= 500 ? "text-red-600 font-bold" : c.statusCode >= 400 ? "text-amber-600" : "text-green-700"}>{c.statusCode}</span>
                    <span className={c.durationMs > 1000 ? "text-red-500" : "text-muted-foreground"}>{c.durationMs}ms</span>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* ── ERRORS TAB ── */}
        {tab === "errors" && (
          <>
            <Section title="Error summary">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <StatCard label="Critical" value={errors?.counts?.critical || 0} color={errors?.counts?.critical > 0 ? "red" : "green"} sub="code crashes, DB errors" />
                <StatCard label="Warnings" value={errors?.counts?.warn || 0} color={errors?.counts?.warn > 0 ? "amber" : "green"} sub="failed fetches, partial errors" />
                <StatCard label="Performance" value={errors?.counts?.perf || 0} color={errors?.counts?.perf > 0 ? "amber" : "green"} sub="slow jobs, slow APIs" />
                <StatCard label="Info" value={errors?.counts?.info || 0} sub="general notices" />
              </div>
              <button
                onClick={() => clearErrors.mutate()}
                className="text-xs px-4 py-2 border border-red-200 text-red-600 rounded-full hover:bg-red-50"
              >
                Clear all errors
              </button>
            </Section>
            <Section title="All errors (newest first)">
              <div className="border border-border rounded-xl overflow-hidden">
                {(errors?.all || []).length === 0 && (
                  <div className="px-3 py-10 text-center text-sm text-muted-foreground">No errors recorded — system is healthy ✓</div>
                )}
                {(errors?.all || []).map((e: any) => (
                  <div key={e.id} className={`flex items-start gap-3 px-3 py-3 border-b border-border last:border-0 text-xs ${e.resolved ? "opacity-40" : ""}`}>
                    <SeverityBadge s={e.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground uppercase text-[10px]">{e.source}</span>
                        <span className="text-muted-foreground">{new Date(e.timestamp).toLocaleTimeString()}</span>
                        {e.resolved && <Pill color="gray">Resolved</Pill>}
                      </div>
                      <div className="text-foreground mt-0.5">{e.message}</div>
                      {e.detail && <div className="text-muted-foreground mt-0.5 font-mono text-[10px] break-all">{e.detail}</div>}
                    </div>
                    {!e.resolved && (
                      <button onClick={() => resolveMutation.mutate(e.id)} className="text-[10px] border border-border rounded px-2 py-0.5 text-muted-foreground hover:text-foreground shrink-0">✓</button>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
