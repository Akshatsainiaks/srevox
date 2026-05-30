"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle, RefreshCw, Server,
  Plus, ArrowRight, Activity, X, Circle, Cpu,
  Network, ExternalLink, ChevronRight, AlertCircle, Clock,
  Bell,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { fetchIncidentStats, fetchIncidents, fetchClusters, updateCluster, fetchTrends, api } from "@/lib/api";
import type { IncidentStats, Incident, Cluster } from "@/lib/utils";
import { timeAgo, severityBadge, statusBadge, severityDot } from "@/lib/utils";

// ─── Incident Row ─────────────────────────────────────────────────────────────

function IncidentRow({ inc }: { inc: Incident }) {
  return (
    <Link
      href={`/dashboard/incidents/${inc.incident_id}`}
      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors group"
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot(inc.severity)}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900 dark:text-slate-100 truncate max-w-[200px]">
            {inc.pod_name}
          </span>
          <span className={`badge text-xs ${severityBadge(inc.severity)}`}>{inc.crash_reason}</span>
          <span className={`badge text-xs ${statusBadge(inc.status)}`}>{inc.status}</span>
        </div>
        <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5">
          <span className="font-mono text-[10px]">{inc.namespace}</span>
          {inc.cluster_name && (
            <>
              <span className="text-gray-200 dark:text-slate-700">·</span>
              <span className="text-indigo-500 dark:text-indigo-400 font-medium text-[11px]">{inc.cluster_name}</span>
            </>
          )}
          <span className="text-gray-200 dark:text-slate-700">·</span>
          <span>{timeAgo(inc.first_seen_at)}</span>
        </div>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}

// ─── Node Row ─────────────────────────────────────────────────────────────────

function NodeRow({ node, cluster }: { node: any; cluster: Cluster }) {
  const isReady = node.status === "Ready";
  const cpuThreshold = cluster.node_cpu_threshold ?? 85;
  const memThreshold = cluster.node_memory_threshold ?? 90;

  const isCpuHigh = node.cpu_usage_pct > cpuThreshold;
  const isMemHigh = node.memory_usage_pct > memThreshold;
  const hasAlert = !isReady || isCpuHigh || isMemHigh;

  return (
    <div className={`px-5 py-3.5 border-b border-gray-100 dark:border-slate-800/40 transition-colors ${
      hasAlert ? "bg-red-500/[0.03] dark:bg-red-500/[0.02]" : ""
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${isReady ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
          <span className="font-semibold text-sm text-gray-900 dark:text-slate-100 truncate" title={node.name}>
            {node.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasAlert && (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
            node.role === "master"
              ? "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20"
              : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20"
          }`}>
            {node.role}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {/* CPU */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400 dark:text-slate-500 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5" /> CPU
          </span>
          <span className={`font-medium ${isCpuHigh ? "text-red-500 font-bold" : "text-gray-700 dark:text-slate-300"}`}>
            {node.cpu_usage_pct}% of {node.cpu_cores} cores
            {isCpuHigh && ` (exceeds ${cpuThreshold}%)`}
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${
            isCpuHigh ? "bg-red-500 animate-pulse" : node.cpu_usage_pct >= 70 ? "bg-amber-500" : "bg-green-500"
          }`} style={{ width: `${Math.min(node.cpu_usage_pct, 100)}%` }} />
        </div>

        {/* Memory */}
        <div className="flex items-center justify-between text-xs mt-1.5">
          <span className="text-gray-400 dark:text-slate-500 flex items-center gap-1">
            <Network className="w-3.5 h-3.5" /> Mem
          </span>
          <span className={`font-medium ${isMemHigh ? "text-red-500 font-bold" : "text-gray-700 dark:text-slate-300"}`}>
            {node.memory_usage_pct}% of {node.memory_gb} GB
            {isMemHigh && ` (exceeds ${memThreshold}%)`}
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${
            isMemHigh ? "bg-red-500 animate-pulse" : node.memory_usage_pct >= 70 ? "bg-amber-500" : "bg-green-500"
          }`} style={{ width: `${Math.min(node.memory_usage_pct, 100)}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-slate-500 mt-2.5">
        <span>Age: {node.age}</span>
        <span>{node.pods_running} / {node.pods_capacity} pods</span>
      </div>
    </div>
  );
}

// ─── Cluster Drawer ───────────────────────────────────────────────────────────

function ClusterDrawer({ cluster, onClose, onRefresh }: { cluster: Cluster; onClose: () => void; onRefresh: () => void }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats,     setStats]     = useState<IncidentStats | null>(null);
  const [nodes,     setNodes]     = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<"incidents" | "nodes" | "alerts">("incidents");

  const [masterAlerts, setMasterAlerts] = useState(cluster.master_alerts_enabled ?? true);
  const [workerAlerts, setWorkerAlerts] = useState(cluster.worker_alerts_enabled ?? true);
  const [cpuThresh, setCpuThresh]       = useState(cluster.node_cpu_threshold ?? 85);
  const [memThresh, setMemThresh]       = useState(cluster.node_memory_threshold ?? 90);
  const [savingAlerts, setSavingAlerts] = useState(false);

  useEffect(() => {
    setMasterAlerts(cluster.master_alerts_enabled ?? true);
    setWorkerAlerts(cluster.worker_alerts_enabled ?? true);
    setCpuThresh(cluster.node_cpu_threshold ?? 85);
    setMemThresh(cluster.node_memory_threshold ?? 90);
  }, [cluster]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchIncidents({ cluster_id: cluster.cluster_id, limit: "30" }),
      fetchIncidentStats({ cluster_id: cluster.cluster_id }),
      api.get(`/api/infrastructure/${cluster.cluster_id}/nodes`).catch(() => ({ data: { nodes: [] } })),
    ]).then(([i, s, n]) => {
      setIncidents(i.incidents || []);
      setStats(s);
      setNodes(n.data.nodes || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [cluster.cluster_id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const saveAlertSettings = async (fields: Partial<Cluster>) => {
    setSavingAlerts(true);
    try {
      await updateCluster(cluster.cluster_id, fields);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingAlerts(false);
    }
  };

  const isConnected = cluster.status === "connected";
  const isError     = cluster.status === "error";
  const openInc     = incidents.filter(i => i.status === "open");
  const resolvedInc = incidents.filter(i => i.status !== "open");

  // Check node offline alerts
  const showMasterOfflineAlert = cluster.master_alerts_enabled && cluster.master_nodes_ready !== undefined && cluster.master_nodes_total !== undefined && cluster.master_nodes_ready < cluster.master_nodes_total;
  const showWorkerOfflineAlert = cluster.worker_alerts_enabled && cluster.worker_nodes_ready !== undefined && cluster.worker_nodes_total !== undefined && cluster.worker_nodes_ready < cluster.worker_nodes_total;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25 dark:bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col w-full max-w-[420px] bg-white dark:bg-[#0d0f18] border-l border-gray-100 dark:border-slate-800"
        style={{ animation: "drawerIn .2s cubic-bezier(.4,0,.2,1)" }}
      >
        <style>{`
          @keyframes drawerIn { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
          .drawer-scroll::-webkit-scrollbar { width: 4px }
          .drawer-scroll::-webkit-scrollbar-thumb { background: rgba(100,100,120,0.2); border-radius: 4px }
        `}</style>

        {/* Drawer header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-slate-800/80">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isConnected ? "bg-green-500" : isError ? "bg-red-500" : "bg-amber-500"}`} />
                <h2 className="font-bold text-gray-900 dark:text-white text-base truncate">{cluster.name}</h2>
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 capitalize pl-[18px]">
                {cluster.connection_type?.replace("_", " ") ?? "Self Hosted"}
                {cluster.cloud_provider ? ` · ${cluster.cloud_provider}` : ""}
                {cluster.k8s_version && (
                  <span className="ml-1.5 font-mono bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">k8s {cluster.k8s_version}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Link href="/dashboard/clusters" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="pl-[18px]">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
              isConnected ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20"
              : isError   ? "bg-red-50 dark:bg-red-500/10 text-red-650 dark:text-red-405 border-red-200 dark:border-red-500/20"
              : "bg-amber-50 dark:bg-amber-500/10 text-amber-660 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
            }`}>
              <Circle className="w-1.5 h-1.5 fill-current" />
              {cluster.status}
            </span>
          </div>
          {cluster.error_message && (
            <div className="mt-3 flex items-start gap-2 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/15 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-650 dark:text-red-405 font-mono leading-relaxed">{cluster.error_message}</p>
            </div>
          )}
          
          {/* Node alert warning banners in header */}
          {(showMasterOfflineAlert || showWorkerOfflineAlert) && (
            <div className="mt-3 space-y-2">
              {showMasterOfflineAlert && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/15 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold leading-relaxed">
                    Alert: {cluster.master_nodes_total! - cluster.master_nodes_ready!} master / control-plane node(s) offline!
                  </p>
                </div>
              )}
              {showWorkerOfflineAlert && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/15 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold leading-relaxed">
                    Alert: {cluster.worker_nodes_total! - cluster.worker_nodes_ready!} worker node(s) offline!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer stats */}
        <div className="grid grid-cols-3 gap-px bg-gray-100 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800/80">
          {[
            { label: "Open",     value: loading ? "—" : stats?.open_count ?? 0,     color: "text-red-500"    },
            { label: "Resolved", value: loading ? "—" : stats?.resolved_count ?? 0, color: "text-green-500"  },
            { label: "24h",      value: loading ? "—" : stats?.last_24h ?? 0,       color: "text-indigo-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-[#0d0f18] px-4 py-3 text-center">
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 font-medium uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>

        {/* Node counts */}
        {(cluster.worker_nodes_total !== undefined || cluster.master_nodes_total !== undefined) && (
          <div className="px-5 py-3 flex gap-4 border-b border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/30">
            {cluster.master_nodes_total !== undefined && (
              <div className="flex items-center gap-2">
                <Cpu className={`w-3.5 h-3.5 ${showMasterOfflineAlert ? "text-red-500 animate-pulse" : "text-gray-400 dark:text-slate-500"}`} />
                <span className={`text-sm font-bold ${showMasterOfflineAlert ? "text-red-500 animate-pulse" : "text-gray-800 dark:text-slate-200"}`}>
                  {cluster.master_nodes_ready}<span className="text-gray-300 dark:text-slate-600 font-normal">/{cluster.master_nodes_total}</span>
                </span>
                <span className="text-[11px] text-gray-400 dark:text-slate-500">masters</span>
              </div>
            )}
            {cluster.worker_nodes_total !== undefined && (
              <div className="flex items-center gap-2">
                <Network className={`w-3.5 h-3.5 ${showWorkerOfflineAlert ? "text-red-500 animate-pulse" : "text-gray-400 dark:text-slate-500"}`} />
                <span className={`text-sm font-bold ${showWorkerOfflineAlert ? "text-red-500 animate-pulse" : "text-gray-800 dark:text-slate-200"}`}>
                  {cluster.worker_nodes_ready}<span className="text-gray-300 dark:text-slate-600 font-normal">/{cluster.worker_nodes_total}</span>
                </span>
                <span className="text-[11px] text-gray-400 dark:text-slate-500">workers</span>
              </div>
            )}
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex border-b border-gray-100 dark:border-slate-800/80 bg-gray-50/20 dark:bg-[#0c0d15] select-none">
          <button
            onClick={() => setActiveTab("incidents")}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === "incidents"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900/30"
                : "border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400"
            }`}
          >
            Incidents
          </button>
          <button
            onClick={() => setActiveTab("nodes")}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === "nodes"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900/30"
                : "border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400"
            }`}
          >
            Nodes {nodes.length > 0 && `(${nodes.length})`}
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === "alerts"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900/30"
                : "border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400"
            }`}
          >
            Alerts
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto drawer-scroll">
          {loading ? (
            <div className="px-5 pt-5 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-gray-100 dark:bg-slate-800 mt-2 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 dark:bg-slate-800 rounded-lg w-3/4" />
                    <div className="h-2.5 bg-gray-55 dark:bg-slate-800/60 rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "incidents" ? (
            incidents.length === 0 ? (
              <div className="py-20 text-center px-6">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-gray-700 dark:text-slate-300">All clear</p>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">No incidents in this cluster</p>
              </div>
            ) : (
              <div>
                {openInc.length > 0 && (
                  <>
                    <div className="px-5 pt-4 pb-2">
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Open · {openInc.length}</span>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-slate-800/50">
                      {openInc.map(inc => <IncidentRow key={inc.incident_id} inc={inc} />)}
                    </div>
                  </>
                )}
                {resolvedInc.length > 0 && (
                  <>
                    <div className="px-5 pt-5 pb-2">
                      <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Resolved · {resolvedInc.length}</span>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-slate-800/50 opacity-75">
                      {resolvedInc.map(inc => <IncidentRow key={inc.incident_id} inc={inc} />)}
                    </div>
                  </>
                )}
                <div className="h-6" />
              </div>
            )
          ) : activeTab === "nodes" ? (
            nodes.length === 0 ? (
              <div className="py-20 text-center px-6">
                <Server className="w-8 h-8 text-gray-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="font-semibold text-gray-700 dark:text-slate-300">No node metrics</p>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Metrics server is not ready or configured.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-slate-800/50">
                {nodes.map(node => <NodeRow key={node.name} node={node} cluster={cluster} />)}
              </div>
            )
          ) : (
            // Alerts Tab: Configuration View and Toggles
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-gray-900 dark:text-white">Master offline alerts</label>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">Alert when master nodes go NotReady</p>
                </div>
                <button
                  onClick={() => {
                    const next = !masterAlerts;
                    setMasterAlerts(next);
                    saveAlertSettings({ master_alerts_enabled: next });
                  }}
                  disabled={savingAlerts}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                    masterAlerts ? "bg-indigo-600" : "bg-gray-200 dark:bg-slate-700"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${masterAlerts ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-gray-900 dark:text-white">Worker offline alerts</label>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">Alert when worker nodes go NotReady</p>
                </div>
                <button
                  onClick={() => {
                    const next = !workerAlerts;
                    setWorkerAlerts(next);
                    saveAlertSettings({ worker_alerts_enabled: next });
                  }}
                  disabled={savingAlerts}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                    workerAlerts ? "bg-indigo-600" : "bg-gray-200 dark:bg-slate-700"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${workerAlerts ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>

              <hr className="border-gray-100 dark:border-slate-800/80" />

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <label className="text-gray-700 dark:text-slate-350">CPU Alert Threshold</label>
                  <span className="text-indigo-600 dark:text-indigo-400">{cpuThresh}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="98"
                  value={cpuThresh}
                  onChange={(e) => setCpuThresh(Number(e.target.value))}
                  onMouseUp={() => saveAlertSettings({ node_cpu_threshold: cpuThresh })}
                  onTouchEnd={() => saveAlertSettings({ node_cpu_threshold: cpuThresh })}
                  className="w-full accent-indigo-600"
                />
                <p className="text-[10px] text-gray-400 dark:text-slate-500">Warns when node CPU usage rises above this limit</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <label className="text-gray-700 dark:text-slate-350">Memory Alert Threshold</label>
                  <span className="text-indigo-600 dark:text-indigo-400">{memThresh}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="98"
                  value={memThresh}
                  onChange={(e) => setMemThresh(Number(e.target.value))}
                  onMouseUp={() => saveAlertSettings({ node_memory_threshold: memThresh })}
                  onTouchEnd={() => saveAlertSettings({ node_memory_threshold: memThresh })}
                  className="w-full accent-indigo-600"
                />
                <p className="text-[10px] text-gray-400 dark:text-slate-500">Warns when node memory usage rises above this limit</p>
              </div>
            </div>
          )}
        </div>

        {/* Drawer footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800/80 flex gap-2">
          <Link href={`/dashboard/incidents?cluster_id=${cluster.cluster_id}`} className="flex-1 btn-secondary justify-center text-sm">
            <Activity className="w-4 h-4" /> All incidents
          </Link>
          <Link href="/dashboard/clusters" className="flex-1 btn-secondary justify-center text-sm">
            <Server className="w-4 h-4" /> Manage
          </Link>
        </div>
      </div>
    </>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    let formattedDate = label;
    try {
      formattedDate = new Date(label).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch (e) {}

    return (
      <div className="bg-white dark:bg-[#151724] border border-gray-200 dark:border-slate-800 p-3 rounded-xl shadow-xl">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 mb-1.5">{formattedDate}</p>
        <div className="space-y-1">
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center gap-4 text-xs justify-between">
              <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-slate-350">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name === "critical" ? "Critical Crashes" : p.name === "warning" ? "Warning Alerts" : "Total Crashes"}
              </span>
              <span className="font-bold text-gray-900 dark:text-white">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats,         setStats]         = useState<IncidentStats | null>(null);
  const [clusters,      setClusters]      = useState<Cluster[]>([]);
  const [trends,        setTrends]        = useState<any[]>([]);
  const [activeCluster, setActiveCluster] = useState<Cluster | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [updated,       setUpdated]       = useState(new Date());
  const [mounted,       setMounted]       = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    try {
      const [s, c, t] = await Promise.all([
        fetchIncidentStats(),
        fetchClusters(),
        fetchTrends().catch(() => ({ trends: [] })),
      ]);
      setStats(s);
      setClusters(c.clusters || []);
      setTrends(t.trends || []);
      setUpdated(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  const onlineClusters = clusters.filter(c => c.status === "connected").length;
  const errorClusters  = clusters.filter(c => c.status === "error").length;
  const healthPct      = clusters.length ? Math.round((onlineClusters / clusters.length) * 100) : null;

  // ── Loading skeleton ──
  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 bg-gray-100 dark:bg-slate-800 rounded-xl w-36" />
        <div className="h-9 w-24 bg-gray-100 dark:bg-slate-800 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-2xl" />)}
      </div>
      <div className="h-48 bg-gray-100 dark:bg-slate-800 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-64 bg-gray-100 dark:bg-slate-800 rounded-2xl" />
        <div className="h-48 bg-gray-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              Updated {timeAgo(updated.toISOString())}
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="btn-secondary gap-2 text-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Error banner ── */}
        {errorClusters > 0 && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/15 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-750 dark:text-red-400">
              <span className="font-semibold">{errorClusters} cluster{errorClusters > 1 ? "s" : ""}</span> reporting connection errors.
            </p>
            <Link href="/dashboard/clusters" className="ml-auto text-xs text-red-600 dark:text-red-400 font-semibold shrink-0 hover:underline">
              Fix →
            </Link>
          </div>
        )}

        {/* ── 3 summary stat cards ── */}
        <div className="grid grid-cols-3 gap-3">

          {/* Open incidents */}
          <div className={`rounded-2xl border p-5 ${
            (stats?.open_count ?? 0) > 0
              ? "bg-red-50 dark:bg-red-500/[0.06] border-red-100 dark:border-red-500/20"
              : "bg-white dark:bg-[#13151f] border-gray-100 dark:border-slate-800/80"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <AlertTriangle className={`w-4 h-4 ${(stats?.open_count ?? 0) > 0 ? "text-red-500" : "text-gray-300 dark:text-slate-600"}`} />
              {(stats?.critical_open ?? 0) > 0 && (
                <span className="text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-500/15 px-1.5 py-0.5 rounded-full">
                  {stats?.critical_open} critical
                </span>
              )}
            </div>
            <div className={`text-3xl font-bold tracking-tight mb-1 ${(stats?.open_count ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
              {stats?.open_count ?? 0}
            </div>
            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400">Open incidents</div>
          </div>

          {/* Clusters online */}
          <div className="rounded-2xl border bg-white dark:bg-[#13151f] border-gray-100 dark:border-slate-800/80 p-5">
            <div className="flex items-center justify-between mb-3">
              <Server className="w-4 h-4 text-indigo-500" />
              {healthPct !== null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  healthPct === 100 ? "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/15"
                  : healthPct >= 50  ? "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15"
                  : "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/15"
                }`}>
                  {healthPct}%
                </span>
              )}
            </div>
            <div className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-1">
              {onlineClusters}<span className="text-lg font-normal text-gray-300 dark:text-slate-600">/{clusters.length}</span>
            </div>
            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400">Clusters online</div>
            {clusters.length > 0 && (
              <div className="mt-3 w-full h-1 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    healthPct === 100 ? "bg-green-500"
                    : healthPct && healthPct >= 50 ? "bg-amber-500"
                    : "bg-red-500"
                  }`}
                  style={{ width: `${healthPct ?? 0}%` }}
                />
              </div>
            )}
          </div>

          {/* Resolved */}
          <div className="rounded-2xl border bg-white dark:bg-[#13151f] border-gray-100 dark:border-slate-800/80 p-5">
            <div className="mb-3">
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-1">
              {stats?.resolved_count ?? 0}
            </div>
            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400">Resolved all time</div>
            {(stats?.last_24h ?? 0) > 0 && (
              <div className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">
                {stats?.last_24h} crash{(stats?.last_24h ?? 0) !== 1 ? "es" : ""} today
              </div>
            )}
          </div>
        </div>

        {/* ── Clusters ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-indigo-500" />
              Clusters
              {clusters.length > 0 && (
                <span className="text-[11px] text-gray-400 bg-gray-100 dark:bg-slate-800 dark:text-slate-500 px-1.5 py-0.5 rounded-full">{clusters.length}</span>
              )}
            </span>
            <Link href="/dashboard/clusters" className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1 font-medium">
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {clusters.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-slate-700/80 py-10 text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">No clusters yet</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Connect your first Kubernetes cluster to start monitoring</p>
              <Link href="/dashboard/clusters" className="btn-primary text-xs px-4 py-2 inline-flex">
                <Plus className="w-3.5 h-3.5" /> Add cluster
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {clusters.map(cl => {
                const isConnected = cl.status === "connected";
                const isError     = cl.status === "error";
                const isActive    = activeCluster?.cluster_id === cl.cluster_id;
                return (
                  <button
                    key={cl.cluster_id}
                    onClick={() => setActiveCluster(isActive ? null : cl)}
                    className={`group text-left w-full rounded-2xl border p-4 transition-all duration-200 relative overflow-hidden
                      ${isActive
                        ? "border-indigo-400 dark:border-indigo-500/70 bg-indigo-50/50 dark:bg-indigo-500/[0.07] shadow-sm"
                        : isError
                          ? "border-red-100 dark:border-red-500/20 bg-white dark:bg-[#13151f] hover:shadow-sm"
                          : "border-gray-100 dark:border-slate-800/80 bg-white dark:bg-[#13151f] hover:shadow-sm"
                      }`}
                  >
                    {/* Active top accent bar */}
                    {isActive && (
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-t-2xl" />
                    )}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isConnected ? "bg-green-500" : isError ? "bg-red-500" : "bg-amber-500"}`} />
                        <span className="font-semibold text-sm text-gray-900 dark:text-slate-100 truncate">{cl.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {cl.open_incidents_count !== undefined && cl.open_incidents_count > 0 && (
                          <span className="text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-500/15 px-1.5 py-0.5 rounded-full">
                            {cl.open_incidents_count} open
                          </span>
                        )}
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isActive ? "text-indigo-500 rotate-90" : "text-gray-300 dark:text-slate-600"}`} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 dark:text-slate-500 capitalize">
                        {cl.connection_type?.replace("_", " ") ?? "Self Hosted"}
                        {cl.cloud_provider ? ` · ${cl.cloud_provider}` : ""}
                      </span>
                      <span className={`text-[11px] font-semibold ${isConnected ? "text-green-500" : isError ? "text-red-500" : "text-amber-500"}`}>
                        {cl.status}
                      </span>
                    </div>
                    {cl.worker_nodes_total !== undefined && (
                      <div className="mt-2.5 pt-2.5 border-t border-gray-50 dark:border-slate-800/60 flex gap-3 text-[11px] text-gray-400 dark:text-slate-500">
                        <span className="flex items-center gap-1" title="Master nodes ready/total">
                          <Cpu className={`w-3 h-3 ${cl.master_nodes_ready !== undefined && cl.master_nodes_total !== undefined && cl.master_nodes_ready < cl.master_nodes_total ? "text-red-500 animate-pulse" : ""}`} />
                          <span className={cl.master_nodes_ready !== undefined && cl.master_nodes_total !== undefined && cl.master_nodes_ready < cl.master_nodes_total ? "text-red-500 font-bold" : ""}>
                            {cl.master_nodes_ready}/{cl.master_nodes_total}
                          </span>
                        </span>
                        <span className="flex items-center gap-1" title="Worker nodes ready/total">
                          <Network className={`w-3 h-3 ${cl.worker_nodes_ready !== undefined && cl.worker_nodes_total !== undefined && cl.worker_nodes_ready < cl.worker_nodes_total ? "text-red-500 animate-pulse" : ""}`} />
                          <span className={cl.worker_nodes_ready !== undefined && cl.worker_nodes_total !== undefined && cl.worker_nodes_ready < cl.worker_nodes_total ? "text-red-500 font-bold" : ""}>
                            {cl.worker_nodes_ready}/{cl.worker_nodes_total}
                          </span>
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
              <Link
                href="/dashboard/clusters"
                className="rounded-2xl border border-dashed border-gray-200 dark:border-slate-700/80 flex flex-col items-center justify-center gap-2 min-h-[100px] hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-colors group"
              >
                <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-colors">
                  <Plus className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors" />
                </div>
                <span className="text-xs text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors font-medium">Add cluster</span>
              </Link>
            </div>
          )}
        </div>

        {/* ── Bottom: Trends Chart + Quick actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Daily Trends Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-[#13151f] border border-gray-100 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold text-sm text-gray-900 dark:text-white">Crash loop trends (Last 30 days)</span>
              </div>
              <Link href="/dashboard/incidents" className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1 font-medium">
                All Incidents <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex-1 min-h-[200px] w-full flex items-center justify-center">
              {!mounted ? (
                <div className="h-[200px] w-full bg-gray-50 dark:bg-slate-800/40 rounded-xl animate-pulse" />
              ) : trends.length === 0 ? (
                <div className="text-center py-10 px-6">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
                  <p className="font-semibold text-sm text-gray-700 dark:text-slate-350">All stable</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">No pod crashes observed over the last 30 days</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trends} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.08)" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 9 }}
                      dy={8}
                      tickFormatter={(val) => {
                        try {
                          const date = new Date(val);
                          return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        } catch (e) {
                          return val;
                        }
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 9 }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={32}
                      align="right"
                      iconType="circle"
                      iconSize={6}
                      wrapperStyle={{ fontSize: 10, fill: "#64748b" }}
                    />
                    <Area
                      name="total"
                      type="monotone"
                      dataKey="total"
                      stroke="#6366f1"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                    />
                    <Area
                      name="critical"
                      type="monotone"
                      dataKey="critical"
                      stroke="#ef4444"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#colorCritical)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white dark:bg-[#13151f] border border-gray-100 dark:border-slate-800/80 rounded-2xl p-5">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">Quick actions</h3>
            <div className="space-y-1">
              {[
                { label: "Add cluster",    href: "/dashboard/clusters", icon: Server,        desc: "Connect Kubernetes"   },
                { label: "New alert rule", href: "/dashboard/rules",    icon: Bell,          desc: "Set up notifications" },
                { label: "Add channel",    href: "/dashboard/channels", icon: Clock,         desc: "Slack, PagerDuty..."  },
              ].map(({ label, href, icon: Icon, desc }) => (
                <Link
                  key={href} href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-slate-800/80 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 dark:text-slate-300">{label}</div>
                    <div className="text-[11px] text-gray-400 dark:text-slate-500">{desc}</div>
                  </div>
                  <ArrowRight className="w-3 h-3 text-gray-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Cluster drawer overlay ── */}
      {activeCluster && (
        <ClusterDrawer cluster={activeCluster} onClose={() => setActiveCluster(null)} onRefresh={() => load(true)} />
      )}
    </>
  );
}
