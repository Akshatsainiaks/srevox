"use client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell, LogOut, User, Crown, Shield, Eye, Sun, Moon, ExternalLink, SlidersHorizontal, CheckCheck, AlertTriangle, CheckCircle, Zap } from "lucide-react";
import { getUser, removeToken, AuthUser } from "@/lib/auth";
import { apiLogout } from "@/lib/api";
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
    }).sort((a: NotifItem, b: NotifItem) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);
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

  const unread = notifs.filter(n => !n.read).length;

  const logout = async () => {
    try { await apiLogout(); } catch {}
    removeToken();
    router.push("/login");
  };

  return (
    <header className="h-14 bg-white dark:bg-[#151823] border-b border-gray-100 dark:border-slate-800 flex items-center px-5 sticky top-0 z-30 w-full">
      <Link href="/dashboard" className="mr-auto"><SrevoxWordmark size="md" /></Link>

      <div className="flex items-center gap-1">
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
              <div className="text-xs font-semibold text-gray-800 dark:text-slate-200 leading-tight max-w-[120px] truncate">{user?.full_name || user?.email?.split("@")[0]}</div>
              <div className={`text-[11px] flex items-center gap-1 leading-tight ${ROLE_COLORS[user?.role||"viewer"]}`}><RoleIcon className="w-2.5 h-2.5"/><span className="capitalize">{user?.role}</span></div>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#1e2130] border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-4 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/5 dark:to-violet-500/5 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">{user?.email?.[0]?.toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 dark:text-white text-sm truncate">{user?.full_name||"—"}</div>
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