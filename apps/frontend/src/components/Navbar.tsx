"use client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell, LogOut, User, Crown, Shield, Eye, Sun, Moon, ExternalLink, SlidersHorizontal, CheckCheck, AlertTriangle, CheckCircle, Zap, LifeBuoy, Search, Loader2, Server, BookOpen } from "lucide-react";
import { getUser, removeToken, AuthUser } from "@/lib/auth";
import { apiLogout, fetchIncidents, fetchClusters, fetchRules, fetchChannels } from "@/lib/api";
import { useTheme } from "./ThemeProvider";
import { useToast } from "./Toast";
import { SrevoxWordmark } from "./Logo";


const ROLE_ICONS: Record<string,React.ElementType> = { admin: Crown, member: Shield, viewer: Eye };
const ROLE_COLORS: Record<string,string> = {
  admin: "text-purple-500 dark:text-purple-400",
  member:"text-blue-500 dark:text-blue-400",
  viewer:"text-gray-500 dark:text-slate-400",
};

interface NotifItem {
  id: string; icon: React.ElementType; color: string; bg: string;
  title: string; sub: string; incident_id: string; time: string; read: boolean;
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

async function loadRealNotifications(readIds: Set<string>): Promise<NotifItem[]> {
  try {
    const res = await fetch(`/api/incidents?limit=20`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("sv_token")}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const incidents = data.incidents || [];
    return incidents.map((inc: any) => {
      const id = `${inc.status}-${inc.id}`;
      const isOpen = inc.status === "open";
      const isCrit = inc.severity === "critical";
      return {
        id,
        icon: isOpen ? (isCrit ? Zap : AlertTriangle) : CheckCircle,
        color: isOpen ? (isCrit ? "text-red-500" : "text-amber-500") : "text-green-500",
        bg:    isOpen ? (isCrit ? "bg-red-50 dark:bg-red-500/10" : "bg-amber-50 dark:bg-amber-500/10") : "bg-green-50 dark:bg-green-500/10",
        title: isOpen ? `${inc.pod_name} crashed` : `${inc.pod_name} resolved`,
        sub:   `${inc.crash_reason} · ${inc.namespace} · ${inc.restart_count} restarts`,
        incident_id: inc.id,
        time:  inc.first_seen_at,
        read:  readIds.has(id),
      };
    }).filter((x: NotifItem) => x && x.time).sort((a: NotifItem, b: NotifItem) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);
  } catch { return []; }
}

export default function Navbar() {
  const router = useRouter();
  const [user, setUserState] = useState<AuthUser | null>(getUser());

  useEffect(() => {
    const handleUserUpdate = (e: any) => setUserState(e.detail);
    window.addEventListener("sv_user_updated", handleUserUpdate);
    return () => window.removeEventListener("sv_user_updated", handleUserUpdate);
  }, []);
  const { theme, setTheme } = useTheme();
  const { success } = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);
  const RoleIcon = ROLE_ICONS[user?.role || "viewer"] || Shield;

  // Global search state
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchData, setSearchData] = useState<{
    incidents: any[];
    clusters: any[];
    rules: any[];
    channels: any[];
  }>({ incidents: [], clusters: [], rules: [], channels: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadSearchData = async () => {
    if (searchData.incidents.length > 0) return; // already loaded once
    setSearchLoading(true);
    try {
      const [incRes, clRes, ruRes, chRes] = await Promise.all([
        fetchIncidents().catch(() => ({ incidents: [] })),
        fetchClusters().catch(() => ({ clusters: [] })),
        fetchRules().catch(() => ({ rules: [] })),
        fetchChannels().catch(() => ({ channels: [] })),
      ]);
      setSearchData({
        incidents: incRes?.incidents || [],
        clusters: clRes?.clusters || [],
        rules: ruRes?.rules || [],
        channels: chRes?.channels || [],
      });
    } catch (err) {
      console.error("Failed to load search index", err);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (searchFocused) {
      loadSearchData();
    }
  }, [searchFocused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        setSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadNotifs = useCallback(async () => {
    const saved = new Set<string>(JSON.parse(localStorage.getItem("sv_read_notifs") || "[]"));
    setReadIds(saved);
    const items = await loadRealNotifications(saved);
    setNotifs(items);
  }, []);

  useEffect(() => { loadNotifs(); const t = setInterval(loadNotifs, 30000); return () => clearInterval(t); }, [loadNotifs]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (searchRef.current  && !searchRef.current.contains(e.target as Node))  setSearchFocused(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const markRead = (id: string) => {
    const next = new Set([...readIds, id]);
    setReadIds(next);
    localStorage.setItem("sv_read_notifs", JSON.stringify([...next]));
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    const next = new Set(notifs.map(n => n.id));
    setReadIds(next);
    localStorage.setItem("sv_read_notifs", JSON.stringify([...next]));
    setNotifs(p => p.map(n => ({ ...n, read: true })));
    success("All caught up!", "All notifications marked as read");
  };

  const query = searchQuery.trim().toLowerCase();

  const filteredIncidents = query
    ? searchData.incidents.filter((i: any) =>
        (i.pod_name || "").toLowerCase().includes(query) ||
        (i.namespace || "").toLowerCase().includes(query) ||
        (i.crash_reason || "").toLowerCase().includes(query) ||
        (i.cluster_name && i.cluster_name.toLowerCase().includes(query))
      ).slice(0, 5)
    : [];

  const filteredClusters = query
    ? searchData.clusters.filter((c: any) =>
        (c.name || "").toLowerCase().includes(query)
      ).slice(0, 3)
    : [];

  const filteredRules = query
    ? searchData.rules.filter((r: any) =>
        (r.name || "").toLowerCase().includes(query) ||
        (r.description && r.description.toLowerCase().includes(query))
      ).slice(0, 3)
    : [];

  const filteredChannels = query
    ? searchData.channels.filter((c: any) =>
        (c.name || "").toLowerCase().includes(query) ||
        (c.type || "").toLowerCase().includes(query)
      ).slice(0, 3)
    : [];

  const hasResults =
    filteredIncidents.length > 0 ||
    filteredClusters.length > 0 ||
    filteredRules.length > 0 ||
    filteredChannels.length > 0;

  const unread = notifs.filter(n => !n.read).length;

  const logout = async () => {
    try { await apiLogout(); } catch {}
    removeToken();
    router.push("/login");
  };

  return (
    <header className="h-14 bg-white dark:bg-[#151823] border-b border-gray-100 dark:border-slate-800 flex items-center px-5 sticky top-0 z-30 w-full">
      <Link href="/dashboard" className="mr-auto"><SrevoxWordmark size="md" /></Link>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div ref={searchRef} className="relative hidden md:block w-64 mr-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search everything... (⌘K)"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50/85 dark:bg-slate-800/40 text-xs text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-xl pl-9 pr-3 py-1.5 border border-gray-100 dark:border-slate-800/60 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-550/30 transition-all"
            />
          </div>

          {searchFocused && (
            <div className="absolute right-0 top-full mt-2 w-[440px] bg-white dark:bg-[#1e2130] border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
              {searchLoading && (
                <div className="p-6 text-center text-xs text-gray-400 dark:text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  Indexing Srevox resources...
                </div>
              )}

              {!searchLoading && !query && (
                <div className="p-3">
                  <div className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1.5 text-left">
                    Quick navigation
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-left">
                    {[
                      { href: "/dashboard", label: "Dashboard", desc: "Overview & metrics" },
                      { href: "/dashboard/incidents", label: "Incidents", desc: "Active crash logs" },
                      { href: "/dashboard/clusters", label: "Clusters", desc: "K8s connections" },
                      { href: "/dashboard/rules", label: "Alert Rules", desc: "Thresholds & triggers" },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSearchFocused(false)}
                        className="flex flex-col p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-slate-800"
                      >
                        <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">{item.label}</span>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 leading-tight">{item.desc}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {!searchLoading && query && hasResults && (
                <div className="divide-y divide-gray-50 dark:divide-slate-800/40 text-left">
                  {/* Incidents */}
                  {filteredIncidents.length > 0 && (
                    <div className="p-2">
                      <div className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1">
                        Incidents
                      </div>
                      {filteredIncidents.map((inc: any) => (
                        <Link
                          key={inc.id}
                          href={`/dashboard/incidents/${inc.id}`}
                          onClick={() => { setSearchFocused(false); setSearchQuery(""); }}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <div className={`w-2 h-2 rounded-full shrink-0 ${inc.severity === "critical" ? "bg-red-500 animate-pulse" : inc.severity === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{inc.pod_name}</div>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500 truncate mt-0.5">
                              {inc.namespace} {inc.cluster_name ? `· ${inc.cluster_name}` : ""}
                            </div>
                          </div>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border capitalize shrink-0 ${
                            inc.status === "open" ? "bg-red-50/50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20" :
                            inc.status === "acknowledged" ? "bg-amber-50/50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20" :
                            "bg-green-50/50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-100 dark:border-green-500/20"
                          }`}>{inc.status}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Clusters */}
                  {filteredClusters.length > 0 && (
                    <div className="p-2">
                      <div className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1">
                        Clusters
                      </div>
                      {filteredClusters.map((cl: any) => (
                        <Link
                          key={cl.cluster_id}
                          href="/dashboard/clusters"
                          onClick={() => { setSearchFocused(false); setSearchQuery(""); }}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <Server className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{cl.name}</div>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500 truncate mt-0.5">
                              Status: {cl.status} {cl.provider ? `· ${cl.provider}` : ""}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Rules */}
                  {filteredRules.length > 0 && (
                    <div className="p-2">
                      <div className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1">
                        Alert Rules
                      </div>
                      {filteredRules.map((ru: any) => (
                        <Link
                          key={ru.rule_id}
                          href="/dashboard/rules"
                          onClick={() => { setSearchFocused(false); setSearchQuery(""); }}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{ru.name}</div>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500 truncate mt-0.5">
                              {ru.description || "No description"}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Channels */}
                  {filteredChannels.length > 0 && (
                    <div className="p-2">
                      <div className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1">
                        Alert Channels
                      </div>
                      {filteredChannels.map((ch: any) => (
                        <Link
                          key={ch.channel_id}
                          href="/dashboard/channels"
                          onClick={() => { setSearchFocused(false); setSearchQuery(""); }}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{ch.name}</div>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500 truncate mt-0.5">
                              Type: {ch.type} · {ch.enabled ? "Active" : "Disabled"}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!searchLoading && query && !hasResults && (
                <div className="p-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-gray-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">No results found</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">No resources matched "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Troubleshooter */}
        <div className="relative group">
          <Link href="/dashboard/troubleshooter"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors relative">
            <LifeBuoy className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-pulse" />
          </Link>
          
          {/* Hover popup card */}
          <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#1e2130] border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl p-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 transform translate-y-1 group-hover:translate-y-0">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                <LifeBuoy className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 dark:text-white text-xs">Troubleshooter</div>
                <div className="text-[10px] text-gray-400 dark:text-slate-500 leading-tight mt-0.5">Diagnose setup logs & cluster errors.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bell */}
        <div ref={notifRef} className="relative">
          <button onClick={() => { setNotifOpen(o=>!o); setProfileOpen(false); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors relative">
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-[#151823]">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-[#1e2130] border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 dark:text-white text-sm">Notifications</span>
                  {unread > 0 && <span className="text-xs bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">{unread} new</span>}
                </div>
                <div className="flex items-center gap-3">
                  {unread > 0 && <button onClick={markAllRead} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"><CheckCheck className="w-3 h-3" />Mark all read</button>}
                  <Link href="/dashboard/notifications" onClick={() => setNotifOpen(false)} className="text-xs text-gray-400 dark:text-slate-500 hover:underline">View all</Link>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-700/50">
                {notifs.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-6 h-6 text-gray-300 dark:text-slate-600" />
                    </div>
                    <p className="text-sm text-gray-400 dark:text-slate-500 font-medium">All clear! No incidents.</p>
                    <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">Notifications appear here when pods crash</p>
                  </div>
                ) : notifs.map(n => (
                  <div key={n.id}
                    className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors group ${!n.read ? "bg-indigo-50/40 dark:bg-indigo-500/5" : ""} hover:bg-gray-50 dark:hover:bg-slate-800/50`}
                    onClick={() => { markRead(n.id); setNotifOpen(false); router.push(`/dashboard/incidents/${n.incident_id}`); }}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.bg}`}>
                      <n.icon className={`w-4 h-4 ${n.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight truncate ${!n.read ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-slate-400"}`}>{n.title}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 truncate">{n.sub}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">{timeAgo(n.time)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <Link href="/dashboard/notifications" onClick={() => setNotifOpen(false)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center justify-center gap-1">
                  View all notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-100 dark:bg-slate-800 mx-1" />

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button onClick={() => { setProfileOpen(o=>!o); setNotifOpen(false); }}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-gray-800 dark:text-slate-200 leading-tight max-w-[120px] truncate">{(user?.full_name || user?.email?.split("@")[0] || "").split(" ").map((w:string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}</div>
              <div className={`text-[11px] flex items-center gap-1 leading-tight ${ROLE_COLORS[user?.role||"viewer"]}`}><RoleIcon className="w-2.5 h-2.5"/><span className="capitalize">{user?.role}</span></div>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#1e2130] border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-4 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/5 dark:to-violet-500/5 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">{user?.email?.[0]?.toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 dark:text-white text-sm truncate">{(user?.full_name||"—").split(" ").map((w:string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.email}</div>
                    <div className={`text-xs flex items-center gap-1 mt-0.5 font-medium ${ROLE_COLORS[user?.role||"viewer"]}`}><RoleIcon className="w-2.5 h-2.5"/><span className="capitalize">{user?.role}</span></div>
                  </div>
                </div>
              </div>
              <div className="p-2 space-y-0.5">
                {[
                  { href:"/dashboard/settings",   icon:User,            label:"Profile & Settings",  sub:"Account, password" },
                  { href:"/dashboard/preferences", icon:SlidersHorizontal,label:"Alert Preferences", sub:"Filters, quiet hours" },
                  { href:"/docs",                  icon:ExternalLink,    label:"Documentation",       sub:"Opens in new tab", target:"_blank" },
                ].map(item => (
                  <Link key={item.href} href={item.href} target={(item as any).target} onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center shrink-0"><item.icon className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400"/></div>
                    <div><div className="font-medium text-gray-800 dark:text-slate-200 text-sm leading-tight">{item.label}</div><div className="text-xs text-gray-400 dark:text-slate-500">{item.sub}</div></div>
                  </Link>
                ))}

                {/* Theme */}
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    {theme==="dark"?<Moon className="w-3.5 h-3.5 text-slate-400"/>:<Sun className="w-3.5 h-3.5 text-gray-500"/>}
                  </div>
                  <span className="font-medium text-gray-800 dark:text-slate-200 text-sm flex-1">Theme</span>
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                    <button onClick={()=>setTheme("light")} className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${theme==="light"?"bg-white shadow-sm text-gray-800":"text-gray-400 dark:text-slate-500"}`}><Sun className="w-3.5 h-3.5"/></button>
                    <button onClick={()=>setTheme("dark")}  className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${theme==="dark" ?"bg-slate-600 shadow-sm text-white":"text-gray-400 dark:text-slate-500"}`}><Moon className="w-3.5 h-3.5"/></button>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-slate-700 my-1"/>
                <button onClick={()=>{setProfileOpen(false);logout();}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0"><LogOut className="w-3.5 h-3.5 text-red-500 dark:text-red-400"/></div>
                  <span className="font-medium">Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}