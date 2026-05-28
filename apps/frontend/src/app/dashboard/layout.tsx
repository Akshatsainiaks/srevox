"use client";
import { useState, useEffect } from "react";
import Sidebar   from "@/components/Sidebar";
import Navbar    from "@/components/Navbar";
import AuthGuard from "@/components/AuthGuard";
import UpdateAnnouncement from "@/components/UpdateAnnouncement";
import { startRoleSync } from "@/lib/auth";

function applyDashboardTheme() {
  try {
    const t = localStorage.getItem("sv_dashboard_theme");
    if (t === "dark") {
      document.documentElement.classList.add("dark");
    } else if (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch {}
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    applyDashboardTheme();
  }, []);

  useEffect(() => startRoleSync(), []); // polls /api/auth/me every 30s — no re-login needed after role change

  return (
    <AuthGuard>
      <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0d0f17]">
        <div className="shrink-0">
          <Navbar />
        </div>
        <UpdateAnnouncement />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
          <main className="flex-1 overflow-y-auto min-w-0 bg-slate-50 dark:bg-[#0d0f17]">
            <div className="w-full px-6 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}