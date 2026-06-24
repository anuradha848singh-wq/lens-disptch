import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Play, Pause, RefreshCw, Plus, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface AdminStatus {
  isPaused: boolean;
  fetchIntervalMs: number;
  algorithmIntervalMs: number;
  lastFetchTime: string | null;
  totalArticlesEnqueued: number;
  sourcesConfigured: number;
  queueActive: boolean;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newSource, setNewSource] = useState({ name: "", url: "", category: "World" });

  const { data: status, isLoading, error } = useQuery<AdminStatus>({
    queryKey: ["/api/admin/fetcher"],
    queryFn: api.admin.getStatus,        // FIX: use centralized api.ts
    refetchInterval: 10000,               // FIX: was 2000 (30x/min), now 10s
    refetchIntervalInBackground: false,   // FIX: stop polling on hidden tab
  });

  const updateConfig = useMutation({
    mutationFn: (config: any) => api.admin.updateConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fetcher"] });
      toast({ title: "Configuration Updated" });
    }
  });

  const addSource = useMutation({
    mutationFn: (source: any) => api.admin.addSource(source),
    onSuccess: () => {
      setNewSource({ name: "", url: "", category: "World" });
      toast({ title: "Custom RSS Source Added" });
    }
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  if (isLoading || !status) return <div className="p-8">Loading Background Worker Stats...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        <h1 className="text-3xl font-bold font-serif tracking-tight pr-4">System Admin</h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="relative flex h-3 w-3">
            {!status.isPaused && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${status.isPaused ? 'bg-red-500' : 'bg-green-500'}`}></span>
          </span>
          <span className="text-sm font-medium text-muted-foreground mr-4 hidden sm:inline-block">
            {status.isPaused ? "Ingestion Paused" : "Ingestion Active"}
          </span>
          <button 
            onClick={() => updateConfig.mutate({ isPaused: !status.isPaused })}
            className={`px-4 py-2 flex items-center gap-2 rounded-md font-medium text-sm transition-colors ${status.isPaused ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
          >
            {status.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {status.isPaused ? "Resume Engine" : "Pause Engine"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-5 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-bold font-serif mb-1">{status.totalArticlesEnqueued ?? 0}</div>
          <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Articles Enqueued</div>
        </div>
        <div className="bg-card border rounded-lg p-5 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-bold font-serif mb-1">{status.sourcesConfigured ?? 0}</div>
          <div className="text-[10px] text-green-600 uppercase font-semibold tracking-wider">Sources Configured</div>
        </div>
        <div className="bg-card border rounded-lg p-5 flex flex-col items-center justify-center text-center">
          <div className={`text-3xl font-bold font-serif mb-1 ${status.queueActive ? "text-green-600" : "text-red-600"}`}>
            {status.queueActive ? "ON" : "OFF"}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Queue Status</div>
        </div>
        <div className="bg-card border rounded-lg p-5 flex flex-col items-center justify-center text-center">
          <div className="text-xs font-bold font-serif mb-1 text-muted-foreground">
            {status.lastFetchTime ? new Date(status.lastFetchTime).toLocaleTimeString() : "Never"}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Last Fetch</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 border-b flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <h2 className="font-semibold text-sm uppercase tracking-wider">Engine Tuning</h2>
          </div>
          <div className="p-4 space-y-6">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Fast RSS Fetch Interval</label>
              <select 
                value={status.fetchIntervalMs}
                onChange={(e) => updateConfig.mutate({ fetchIntervalMs: parseInt(e.target.value) })}
                className="w-full bg-background border px-3 py-2 rounded text-sm outline-none focus:border-primary"
              >
                <option value={10000}>10 Seconds (Aggressive)</option>
                <option value={30000}>30 Seconds (Fast)</option>
                <option value={60000}>1 Minute (Standard)</option>
                <option value={300000}>5 Minutes (Relaxed)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Heavy AI Algorithm Interval</label>
              <select 
                value={status.algorithmIntervalMs}
                onChange={(e) => updateConfig.mutate({ algorithmIntervalMs: parseInt(e.target.value) })}
                className="w-full bg-background border px-3 py-2 rounded text-sm outline-none focus:border-primary"
              >
                <option value={60 * 1000}>1 Minute (Local Testing only)</option>
                <option value={60 * 60 * 1000}>1 Hour (Standard)</option>
                <option value={6 * 60 * 60 * 1000}>6 Hours</option>
                <option value={12 * 60 * 60 * 1000}>12 Hours</option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-3 leading-snug">
                Decoupling the computational AI Synthesis from simple RSS fetch prevents processing bottlenecks when handling massive volumes of data.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 border-b flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <h2 className="font-semibold text-sm uppercase tracking-wider">Inject Live Source</h2>
          </div>
          <div className="p-4 space-y-4">
             <div>
              <input 
                placeholder="Channel Name (e.g., TechCrunch)"
                value={newSource.name}
                onChange={e => setNewSource({...newSource, name: e.target.value})}
                className="w-full bg-background border px-3 py-2 rounded text-sm mb-3 outline-none focus:border-primary"
              />
              <input 
                placeholder="RSS URL"
                value={newSource.url}
                onChange={e => setNewSource({...newSource, url: e.target.value})}
                className="w-full bg-background border px-3 py-2 rounded text-sm mb-3 outline-none focus:border-primary"
              />
              <select 
                value={newSource.category}
                onChange={e => setNewSource({...newSource, category: e.target.value})}
                className="w-full bg-background border px-3 py-2 rounded text-sm mb-4 outline-none focus:border-primary"
              >
                <option value="World">World</option>
                <option value="Technology">Technology</option>
                <option value="Business">Business</option>
                <option value="US">US Politics</option>
                <option value="Sports">Sports</option>
              </select>
              
              <button 
                onClick={() => {
                  if(newSource.name && newSource.url) {
                    addSource.mutate(newSource);
                  }
                }}
                disabled={addSource.isPending || !newSource.name || !newSource.url}
                className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 py-2 rounded font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {addSource.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Channel Globally
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
