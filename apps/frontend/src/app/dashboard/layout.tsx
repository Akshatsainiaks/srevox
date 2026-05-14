"use client";
import { useState, useEffect } from "react";
import Sidebar   from "@/components/Sidebar";
import Navbar    from "@/components/Navbar";
import AuthGuard from "@/components/AuthGuard";

function applyDashboardTheme() {
  try {
    const t = localStorage.getItem("lz_dashboard_theme");
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
    // Re-apply saved theme every time dashboard loads
    applyDashboardTheme();
  }, []);

  return (
    <AuthGuard>
      <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0d0f17]">
        {/* Navbar — full width top */}
        <div className="shrink-0">
          <Navbar />
        </div>
        {/* Sidebar + content */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
          <main className="flex-1 overflow-y-auto min-w-0 bg-slate-50 dark:bg-[#0d0f17]">
            <div className="max-w-7xl mx-auto px-6 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}