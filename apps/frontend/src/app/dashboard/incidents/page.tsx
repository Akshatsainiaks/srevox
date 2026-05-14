"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowRight, Search } from "lucide-react";
import { fetchIncidents } from "@/lib/api";
import type { Incident } from "@/lib/utils";
import { timeAgo, severityBadge, statusBadge, severityDot } from "@/lib/utils";

const STATUSES   = ["", "open", "acknowledged", "resolved"] as const;
const SEVERITIES = ["", "critical", "warning", "info"]      as const;

export default function IncidentsPage() {
  const [incidents,  setIncidents]  = useState<Incident[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status,     setStatus]     = useState("");
  const [severity,   setSeverity]   = useState("");
  const [search,     setSearch]     = useState("");

  const load = useCallback((quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    const params: Record<string, string> = {};
    if (status)   params.status   = status;
    if (severity) params.severity = severity;
    fetchIncidents(params)
      .then((d) => setIncidents(d.incidents || []))
      .catch(console.error)
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [status, severity]);

  useEffect(() => { load(); }, [load]);

  const filtered = incidents.filter((i) =>
    !search ||
    i.pod_name.toLowerCase().includes(search.toLowerCase()) ||
    i.namespace.toLowerCase().includes(search.toLowerCase()) ||
    i.crash_reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
          <p className="text-sm text-gray-500 mt-0.5">All pod crash events across your clusters</p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#151823] border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 py-2" placeholder="Search pods, namespaces..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${status === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {s || "All status"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {SEVERITIES.map((s) => (
            <button key={s} onClick={() => setSeverity(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${severity === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {s || "All severity"}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} results</span>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2"><div className="h-3.5 bg-gray-100 dark:bg-slate-800 rounded w-48" /><div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-32" /></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <AlertTriangle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-medium text-gray-500">No incidents found</p>
            <p className="text-sm text-gray-400 mt-1">{search ? "Try different search terms" : "Your pods are healthy 🎉"}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((inc) => (
              <Link key={inc.id} href={`/dashboard/incidents/${inc.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${severityDot(inc.severity)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-[220px]">{inc.pod_name}</span>
                    <span className={`badge text-xs ${severityBadge(inc.severity)}`}>{inc.crash_reason}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                    <span className="font-medium text-gray-500">{inc.namespace}</span>·
                    <span>{inc.restart_count} restarts</span>·
                    <span>{timeAgo(inc.first_seen_at)}</span>
                    {inc.cluster_name && <><span>·</span><span>{inc.cluster_name}</span></>}
                  </div>
                </div>
                <span className={`badge text-xs ${statusBadge(inc.status)} shrink-0`}>{inc.status}</span>
                <span className="text-xs text-gray-400 w-16 text-right hidden sm:block">{inc.severity}</span>
                <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
