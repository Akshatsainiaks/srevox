"use client";
import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCheck, RefreshCw, AlertTriangle, CheckCircle, Zap, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/Toast";

interface NotifItem { id: string; icon: React.ElementType; color: string; bg: string; title: string; sub: string; incident_id: string; time: string; read: boolean; }

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

async function fetchNotifs(readIds: Set<string>): Promise<NotifItem[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000"}/api/incidents?limit=30`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("lz_token")}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.incidents || []).map((inc: any) => {
      const id = `${inc.status}-${inc.id}`;
      const isOpen = inc.status === "open";
      const isCrit = inc.severity === "critical";
      return {
        id, incident_id: inc.id,
        icon: isOpen ? (isCrit ? Zap : AlertTriangle) : CheckCircle,
        color: isOpen ? (isCrit?"text-red-500":"text-amber-500") : "text-green-500",
        bg:    isOpen ? (isCrit?"bg-red-50 dark:bg-red-500/10":"bg-amber-50 dark:bg-amber-500/10") : "bg-green-50 dark:bg-green-500/10",
        title: isOpen ? `${inc.pod_name} crashed` : `${inc.pod_name} resolved`,
        sub: `${inc.crash_reason} · ${inc.namespace} · ${inc.restart_count} restarts`,
        time: inc.first_seen_at,
        read: readIds.has(id),
      };
    }).sort((a:NotifItem,b:NotifItem) => new Date(b.time).getTime()-new Date(a.time).getTime());
  } catch { return []; }
}

export default function NotificationsPage() {
  const [notifs,  setNotifs]  = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const { success } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const saved = new Set<string>(JSON.parse(localStorage.getItem("lz_read_notifs")||"[]"));
    setReadIds(saved);
    setNotifs(await fetchNotifs(saved));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = (id: string) => {
    const next = new Set([...readIds, id]);
    setReadIds(next);
    localStorage.setItem("lz_read_notifs", JSON.stringify([...next]));
    setNotifs(p => p.map(n => n.id===id ? {...n,read:true} : n));
  };

  const markAllRead = () => {
    const next = new Set(notifs.map(n=>n.id));
    setReadIds(next);
    localStorage.setItem("lz_read_notifs", JSON.stringify([...next]));
    setNotifs(p => p.map(n => ({...n,read:true})));
    success("All caught up!", "All notifications marked as read");
  };

  const unread = notifs.filter(n=>!n.read).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Crash events and incident updates from your clusters
            {unread > 0 && <span className="ml-2 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs px-2.5 py-0.5 rounded-full font-semibold">{unread} unread</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary text-xs gap-1.5"><RefreshCw className="w-3.5 h-3.5"/>Refresh</button>
          {unread > 0 && <button onClick={markAllRead} className="btn-secondary text-xs gap-1.5"><CheckCheck className="w-3.5 h-3.5"/>Mark all read</button>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="card p-5 animate-pulse bg-gray-100 dark:bg-slate-800 h-16"/>)}</div>
      ) : notifs.length === 0 ? (
        <div className="card py-24 text-center">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-indigo-300 dark:text-indigo-500"/>
          </div>
          <p className="font-bold text-gray-700 dark:text-slate-300 text-lg">All clear!</p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1.5">No incidents to report. Your pods are healthy.</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-gray-50 dark:divide-slate-800">
          {notifs.map(n => (
            <div key={n.id}
              className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors ${!n.read?"bg-indigo-50/30 dark:bg-indigo-500/5":""} hover:bg-gray-50 dark:hover:bg-slate-800/50`}
              onClick={() => markRead(n.id)}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${n.bg}`}>
                <n.icon className={`w-5 h-5 ${n.color}`}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold leading-tight ${!n.read?"text-gray-900 dark:text-white":"text-gray-600 dark:text-slate-400"}`}>{n.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"/>}
                    <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">{timeAgo(n.time)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{n.sub}</p>
                <Link href={`/dashboard/incidents/${n.incident_id}`}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1.5"
                  onClick={e => e.stopPropagation()}>
                  View incident <ExternalLink className="w-3 h-3"/>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}