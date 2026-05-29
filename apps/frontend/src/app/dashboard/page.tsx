"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle, Zap, TrendingUp,
  RefreshCw, Server, Plus, ArrowRight, Clock, Activity,
} from "lucide-react";
import { fetchIncidentStats, fetchIncidents, fetchClusters } from "@/lib/api";
import type { IncidentStats, Incident, Cluster } from "@/lib/utils";
import { timeAgo, severityBadge, statusBadge, severityDot, clusterStatusColor } from "@/lib/utils";

function StatCard({ label, value, icon: Icon, color, bg, sub }: {
  label: string; value: number | string;
  icon: React.ElementType; color: string; bg: string; sub?: string;
}) {
  return (
    <div className="card p-5 hover:shadow-md dark:hover:shadow-slate-900 transition-shadow">
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{label}</div>
          {sub && <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats,      setStats]      = useState<IncidentStats | null>(null);
  const [incidents,  setIncidents]  = useState<Incident[]>([]);
  const [clusters,   setClusters]   = useState<Cluster[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updated,    setUpdated]    = useState(new Date());

  const load = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    try {
      const [s, i, c] = await Promise.all([fetchIncidentStats(), fetchIncidents({ limit: "8" }), fetchClusters()]);
      setStats(s); setIncidents(i.incidents || []); setClusters(c.clusters || []);
      setUpdated(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-100 dark:bg-slate-800 rounded-xl w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 dark:bg-slate-800 dark:bg-slate-800 rounded-2xl" />)}
      </div>
    </div>
  );

  const openIncidents = incidents.filter(i => i.status === "open");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Real-time pod crash monitoring · Updated {timeAgo(updated.toISOString())}
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open incidents"  value={stats?.open_count ?? 0}    icon={AlertTriangle} color="text-red-500"    bg="bg-red-50 dark:bg-red-500/10"    sub={stats?.open_count ? "Needs attention" : "All clear 🎉"} />
        <StatCard label="Critical open"   value={stats?.critical_open ?? 0} icon={Zap}           color="text-orange-500" bg="bg-orange-50 dark:bg-orange-500/10" sub={stats?.critical_open ? "High priority" : "None"} />
        <StatCard label="Last 24 hours"   value={stats?.last_24h ?? 0}      icon={TrendingUp}    color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-500/10" sub="Total crashes today" />
        <StatCard label="Resolved"        value={stats?.resolved_count ?? 0}icon={CheckCircle}   color="text-green-500"  bg="bg-green-50 dark:bg-green-500/10"  sub="All time" />
      </div>

      {/* Severity bar */}
      {openIncidents.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Open incident severity</span>
            <span className="text-xs text-gray-400 dark:text-slate-500">{openIncidents.length} total</span>
          </div>
          <div className="flex rounded-full overflow-hidden h-2 gap-0.5">
            {["critical","warning","info"].map((sev) => {
              const count = openIncidents.filter(i => i.severity === sev).length;
              if (!count) return null;
              return <div key={sev} className={`transition-all ${sev === "critical" ? "bg-red-500" : sev === "warning" ? "bg-amber-400" : "bg-blue-400"}`} style={{ width: `${count/openIncidents.length*100}%` }} />;
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent incidents */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-gray-900 dark:text-white">Recent incidents</span>
              {(stats?.open_count ?? 0) > 0 && (
                <span className="badge-open text-xs">{stats?.open_count} open</span>
              )}
            </div>
            <Link href="/dashboard/incidents" className="text-sm text-indigo-500 hover:text-indigo-400 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {incidents.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle className="w-10 h-10 text-green-300 dark:text-green-500/30 mx-auto mb-3" />
              <p className="font-medium text-gray-600 dark:text-slate-400">No incidents yet</p>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Your pods are healthy 🎉</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-slate-800/60">
              {incidents.map((inc) => (
                <Link key={inc.incident_id} href={`/dashboard/incidents/${inc.incident_id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors group">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${severityDot(inc.severity)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900 dark:text-slate-100 truncate max-w-[180px]">{inc.pod_name}</span>
                      <span className={`badge text-xs ${severityBadge(inc.severity)}`}>{inc.crash_reason}</span>
                      <span className={`badge text-xs ${statusBadge(inc.status)}`}>{inc.status}</span>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 flex gap-2">
                      <span>{inc.namespace}</span>·<span>{inc.restart_count} restarts</span>·<span>{timeAgo(inc.first_seen_at)}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Clusters */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold text-gray-900 dark:text-white">Clusters</span>
              </div>
              <Link href="/dashboard/clusters" className="text-sm text-indigo-500 hover:text-indigo-400">Manage →</Link>
            </div>
            {clusters.length === 0 ? (
              <div className="py-8 text-center px-5">
                <Server className="w-8 h-8 text-gray-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-slate-500 mb-3">No clusters connected</p>
                <Link href="/dashboard/clusters" className="btn-primary text-xs px-3 py-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add cluster
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-slate-800/60">
                {clusters.map((cl) => (
                  <div key={cl.cluster_id} className="px-5 py-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${cl.status === "connected" ? "bg-green-500" : cl.status === "error" ? "bg-red-500" : "bg-amber-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{cl.name}</div>
                      <div className="text-xs text-gray-400 dark:text-slate-500 capitalize">{cl.connection_type.replace("_", " ")}</div>
                    </div>
                    <span className={`text-xs font-medium capitalize ${clusterStatusColor(cl.status)}`}>{cl.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">Quick actions</h3>
            <div className="space-y-1.5">
              {[
                { label: "Add cluster",    href: "/dashboard/clusters", icon: Server },
                { label: "New alert rule", href: "/dashboard/rules",    icon: AlertTriangle },
                { label: "Add channel",    href: "/dashboard/channels", icon: Clock },
              ].map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/60 text-sm text-gray-700 dark:text-slate-300 transition-colors group">
                  <Icon className="w-4 h-4 text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors" />
                  {label}
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600 ml-auto group-hover:text-indigo-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}