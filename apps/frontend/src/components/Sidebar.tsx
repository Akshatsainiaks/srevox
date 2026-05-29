"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
// import {
//   LayoutDashboard, AlertTriangle, Server,
//   Bell, BookOpen, FileText, Users, Boxes,
//   SlidersHorizontal, ChevronRight, ChevronLeft,
// } from "lucide-react";
import {
  LayoutDashboard,
  AlertTriangle,
  Server,
  Bell,
  BookOpen,
  FileText,
  Users,
  Boxes,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  TerminalSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getUser } from "@/lib/auth";

const NAV = [
  { href: "/dashboard",             label: "Dashboard",      icon: LayoutDashboard },
  { href: "/dashboard/incidents",   label: "Incidents",      icon: AlertTriangle },
  { href: "/dashboard/clusters",    label: "Clusters",       icon: Server },
  { href: "/dashboard/channels",    label: "Channels",       icon: Bell },
  { href: "/dashboard/rules",       label: "Alert Rules",    icon: BookOpen },
  { href: "/dashboard/services",    label: "Service Owners", icon: Boxes },
  { href: "/dashboard/team",        label: "Team",           icon: Users },
  { href: "/dashboard/preferences", label: "My Preferences", icon: SlidersHorizontal },
  { href: "/dashboard/infrastructure", label: "Infrastructure", icon: Server },
  
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const path = usePathname();

  return (
    <aside className={cn(
      "relative h-full bg-white dark:bg-[#0d0f17]",
      "border-r border-gray-100 dark:border-slate-800/80",
      "flex flex-col shrink-0",
      "transition-[width] duration-300 ease-in-out",
      collapsed ? "w-[64px]" : "w-[220px]"
    )}>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden",
        collapsed ? "px-2" : "px-3"
      )}>
        {NAV.filter(item => {
          if (item.href === "/dashboard/team") {
            const user = getUser();
            return user?.role === "admin" || user?.role === "member";
          }
          return true;
        }).map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard"
            ? path === "/dashboard"
            : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all group",
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                active
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                  : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Icon className={cn(
                "w-[18px] h-[18px] shrink-0",
                active
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-400 dark:text-slate-500 group-hover:text-gray-700 dark:group-hover:text-slate-200"
              )} />
              {!collapsed && (
                <>
                  <span className="flex-1 whitespace-nowrap">{label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-500 shrink-0" />}
                </>
              )}
              {collapsed && (
                <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 dark:bg-slate-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg transition-opacity">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
     <Link
  href="/dashboard/engineering"
  title={collapsed ? "Engineering" : undefined}
  className={cn(
    "relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-300 group mb-1",

    // Always highlighted
    "bg-gradient-to-r from-indigo-500/8 to-transparent border border-indigo-500/15 text-white hover:bg-[#172033]",

    collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
  )}
>
  <TerminalSquare className="w-[18px] h-[18px] shrink-0 text-indigo-500 dark:text-indigo-400" />

  {!collapsed && (
    <>
      <span className="flex-1 font-medium">
        Engineering
      </span>

    </>
  )}

  {collapsed && (
    <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 dark:bg-slate-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg transition-opacity">
      Engineering
    </span>
  )}
</Link>
      {/* Docs at bottom */}
      <div className={cn(
        "shrink-0 border-t border-gray-100 dark:border-slate-800/80 py-3",
        collapsed ? "px-2" : "px-3"
      )}>
        <Link
          href="/docs"
          target="_blank"
          title={collapsed ? "Documentation" : undefined}
          className={cn(
            "relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all group",
            "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-slate-200",
            collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
          )}
        >
          <FileText className="w-[18px] h-[18px] shrink-0 text-gray-400 dark:text-slate-500" />
          {!collapsed && <><span className="flex-1">Docs</span><span className="text-xs text-gray-300 dark:text-slate-600">↗</span></>}
          {collapsed && (
            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 dark:bg-slate-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg transition-opacity">
              Documentation
            </span>
          )}
        </Link>
      </div>

      {/* Floating pill collapse button on right edge */}
      <button
        onClick={onToggle}
        title={collapsed ? "Expand" : "Collapse"}
        className="absolute top-6 -right-3.5 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center shadow-md hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-all z-10 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white"
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5" />
          : <ChevronLeft  className="w-3.5 h-3.5" />
        }
      </button>

    </aside>
  );
}
