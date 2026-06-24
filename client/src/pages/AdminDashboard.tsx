import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainNav } from "@/components/MainNav";

const apiFetch = (path: string) => fetch(path, { credentials: "include" }).then(r => r.json());

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    green: "bg-green-100 text-green-800", red: "bg-red-100 text-red-800",
    amber: "bg-amber-100 text-amber-800", blue: "bg-blue-100 text-blue-800",
    gray: "bg-gray-100 text-gray-600", purple: "bg-purple-100 text-purple-800",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${map[color] || map.gray}`}>{children}</span>;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  const border = color === "red" ? "border-red-200" : color === "green" ? "border-green-200" : color === "amber" ? "border-amber-200" : "border-border";
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

export default function AdminDashboard() {
  const [tab, setTab] = useState<"overview" | "fetch" | "worker" | "cluster" | "api" | "errors">("overview");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/metrics"],
    queryFn: () => apiFetch("/api/admin/metrics"),
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

  if (isLoading) return <div className="min-h-screen bg-background"><MainNav /><div className="p-8 text-muted-foreground">Loading metrics...</div></div>;
  if (!data || data.error) return <div className="min-h-screen bg-background"><MainNav /><div className="p-8 text-red-500">Access denied or not logged in as admin.</div></div>;

  const { uptime, fetch: ft, worker, clustering, api: apiStats, schedulers, errors, memory, topStories, queueDepth } = data;
  const tabs = ["overview", "fetch", "worker", "cluster", "api", "errors"] as const;
  const criticalCount = errors?.counts?.critical || 0;
  const activeErrors = errors?.active || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MainNav />
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-20">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">System Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Uptime: {uptime?.human} · Memory: {memory?.currentMB}MB heap</p>
          </div>
          <div className="flex items-center gap-3">
            {criticalCount > 0 && <Pill color="red">{criticalCount} critical</Pill>}
            <button onClick={() => setAutoRefresh(p => !p)} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${autoRefresh ? "border-green-400 text-green-700 bg-green-50" : "border-border text-muted-foreground"}`}>
              {autoRefresh ? "● Live" : "Paused"}
            </button>
            <button onClick={() => qc.invalidateQueries({ queryKey: ["/api/admin/metrics"] })} className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground">Refresh</button>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-bold capitalize whitespace-nowrap border-b-2 transition-colors ${tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t === "errors" && criticalCount > 0 ? `Errors (${criticalCount})` : t}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Worker success rate" value={`${worker?.successRate || 0}%`} sub={`${worker?.success || 0} ok / ${worker?.failed || 0} failed`} color={worker?.successRate > 90 ? "green" : "red"} />
              <StatCard label="Cluster match rate" value={`${clustering?.matchRate || 0}%`} sub={`${clustering?.matches || 0} matched / ${clustering?.newClusters || 0} new`} color={clustering?.matchRate > 30 ? "green" : "amber"} />
              <StatCard label="Active errors" value={activeErrors.length} sub={`${criticalCount} critical`} color={criticalCount > 0 ? "red" : "green"} />
              <StatCard label="API error rate" value={`${apiStats?.errorRate || 0}%`} sub={`${apiStats?.total || 0} total calls`} color={apiStats?.errorRate > 5 ? "red" : "green"} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Fetch cycles" value={ft?.totalCycles || 0} sub={ft?.lastEnd ? `Last: ${new Date(ft.lastEnd).toLocaleTimeString()}` : "Not run"} />
              <StatCard label="Articles processed" value={worker?.total || 0} sub={`${worker?.duplicate || 0} duplicates skipped`} />
              <StatCard label="Queue depth" value={queueDepth ? `${(queueDepth.article?.waiting || 0) + (queueDepth.heavy?.waiting || 0)} waiting` : "N/A"} />
              <StatCard label="Memory" value={`${memory?.currentMB || 0}MB`} color={(memory?.currentMB || 0) > 400 ? "amber" : "green"} sub="heap used" />
            </div>

            {topStories && topStories.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Top stories quality</h2>
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="grid grid-cols-5 text-[10px] font-bold text-muted-foreground uppercase px-3 py-2 border-b border-border bg-secondary/30">
                    <span className="col-span-2">Story</span><span>Sources</span><span>Velocity</span><span>Phase</span>
                  </div>
                  {topStories.map((s: any, i: number) => (
                    <div key={i} className="grid grid-cols-5 text-xs px-3 py-2 border-b border-border last:border-0 items-center">
                      <span className="col-span-2 truncate font-medium">{s.title}</span>
                      <span className={s.sourceCount >= 5 ? "text-blue-600 font-bold" : "text-muted-foreground"}>{s.sourceCount}</span>
                      <span className={s.velocityScore > 0 ? "text-green-600 font-bold" : "text-muted-foreground"}>{s.velocityScore || 0}</span>
                      <span>{s.storyPhase === "breaking" ? <Pill color="red">Breaking</Pill> : s.storyPhase === "developing" ? <Pill color="amber">Developing</Pill> : <span className="text-muted-foreground">{s.storyPhase || "—"}</span>}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeErrors.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Active errors</h2>
                <div className="border border-red-200 rounded-xl overflow-hidden">
                  {activeErrors.slice(0, 5).map((e: any) => (
                    <div key={e.id} className="flex items-start gap-3 px-3 py-2.5 border-b border-border last:border-0 text-xs">
                      <SeverityBadge s={e.severity} />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">[{e.source}]</span> {e.message}
                        {e.detail && <div className="text-muted-foreground mt-0.5 truncate font-mono text-[10px]">{e.detail}</div>}
                        <div className="text-muted-foreground mt-0.5">{new Date(e.timestamp).toLocaleTimeString()}</div>
                      </div>
                      <button onClick={() => resolveMutation.mutate(e.id)} className="text-[10px] border border-border rounded px-2 py-0.5 text-muted-foreground hover:text-foreground">✓</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "fetch" && (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-5 text-[10px] font-bold text-muted-foreground uppercase px-3 py-2 border-b border-border bg-secondary/30">
              <span className="col-span-2">Source</span><span>Tier</span><span>Status</span><span>Articles</span>
            </div>
            {(ft?.recentSources || []).slice(0, 80).map((s: any, i: number) => (
              <div key={i} className="grid grid-cols-5 text-xs px-3 py-2 border-b border-border last:border-0 items-center">
                <span className="col-span-2 font-medium truncate">{s.source}</span>
                <span className="text-muted-foreground">T{s.tier}</span>
                <span>{s.status === "ok" ? <Pill color="green">OK</Pill> : s.status === "failed" ? <Pill color="red">Failed</Pill> : <Pill color="gray">304</Pill>}</span>
                <span className="text-muted-foreground">{s.articlesEnqueued}</span>
              </div>
            ))}
            {!(ft?.recentSources?.length) && <div className="px-3 py-8 text-center text-sm text-muted-foreground">No fetch history yet</div>}
          </div>
        )}

        {tab === "worker" && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Total" value={worker?.total || 0} />
              <StatCard label="Success" value={worker?.success || 0} color="green" />
              <StatCard label="Failed" value={worker?.failed || 0} color={worker?.failed > 0 ? "red" : "green"} />
              <StatCard label="Duplicates" value={worker?.duplicate || 0} />
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 text-[10px] font-bold text-muted-foreground uppercase px-3 py-2 border-b border-border bg-secondary/30">
                <span className="col-span-2">Article</span><span>Status</span><span>Duration</span>
              </div>
              {(worker?.recentJobs || []).map((j: any, i: number) => (
                <div key={i} className="grid grid-cols-4 text-xs px-3 py-2 border-b border-border last:border-0 items-start">
                  <span className="col-span-2">
                    <div className="font-medium truncate">{j.title}</div>
                    {j.errorMessage && <div className="text-red-500 truncate text-[10px] mt-0.5 font-mono">{j.errorMessage}</div>}
                  </span>
                  <span>{j.status === "success" ? <Pill color="green">OK</Pill> : j.status === "duplicate" ? <Pill color="gray">Dup</Pill> : <Pill color="red">Failed</Pill>}</span>
                  <span className="text-muted-foreground">{j.durationMs}ms</span>
                </div>
              ))}
              {!(worker?.recentJobs?.length) && <div className="px-3 py-8 text-center text-sm text-muted-foreground">No jobs yet</div>}
            </div>
          </div>
        )}

        {tab === "cluster" && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Matched" value={clustering?.matches || 0} color="green" />
              <StatCard label="New clusters" value={clustering?.newClusters || 0} />
              <StatCard label="Merges" value={clustering?.merges || 0} />
              <StatCard label="Match rate" value={`${clustering?.matchRate || 0}%`} color={clustering?.matchRate > 30 ? "green" : "amber"} />
            </div>
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
              {!(clustering?.recentEvents?.length) && <div className="px-3 py-8 text-center text-sm text-muted-foreground">No events yet</div>}
            </div>
          </div>
        )}

        {tab === "api" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total calls" value={apiStats?.total || 0} />
              <StatCard label="Errors" value={apiStats?.errors || 0} color={apiStats?.errors > 0 ? "red" : "green"} />
              <StatCard label="Error rate" value={`${apiStats?.errorRate || 0}%`} color={apiStats?.errorRate > 5 ? "red" : "green"} />
            </div>
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
          </div>
        )}

        {tab === "errors" && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Critical" value={errors?.counts?.critical || 0} color={errors?.counts?.critical > 0 ? "red" : "green"} />
              <StatCard label="Warnings" value={errors?.counts?.warn || 0} color={errors?.counts?.warn > 0 ? "amber" : "green"} />
              <StatCard label="Performance" value={errors?.counts?.perf || 0} />
              <StatCard label="Info" value={errors?.counts?.info || 0} />
            </div>
            <button onClick={() => clearErrors.mutate()} className="text-xs px-4 py-2 border border-red-200 text-red-600 rounded-full hover:bg-red-50">
              Clear all errors
            </button>
            <div className="border border-border rounded-xl overflow-hidden">
              {(errors?.all || []).length === 0 && <div className="px-3 py-10 text-center text-sm text-muted-foreground">No errors — system healthy</div>}
              {(errors?.all || []).map((e: any) => (
                <div key={e.id} className={`flex items-start gap-3 px-3 py-3 border-b border-border last:border-0 text-xs ${e.resolved ? "opacity-40" : ""}`}>
                  <SeverityBadge s={e.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase text-[10px]">{e.source}</span>
                      <span className="text-muted-foreground">{new Date(e.timestamp).toLocaleTimeString()}</span>
                      {e.resolved && <Pill color="gray">Resolved</Pill>}
                    </div>
                    <div className="mt-0.5">{e.message}</div>
                    {e.detail && <div className="text-muted-foreground mt-0.5 font-mono text-[10px] break-all">{e.detail}</div>}
                  </div>
                  {!e.resolved && (
                    <button onClick={() => resolveMutation.mutate(e.id)} className="text-[10px] border border-border rounded px-2 py-0.5 text-muted-foreground hover:text-foreground">✓</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
