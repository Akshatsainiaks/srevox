import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmModal";

export const metadata: Metadata = {
  title: "Srevox — Stay calm. We'll catch the crash loops.",
  description: "Kubernetes pod crash alerting with AI diagnostics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline SVG favicon — works without public folder */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><rect width='40' height='40' rx='10' fill='url(%23g)'/><circle cx='20' cy='20' r='13' stroke='white' stroke-width='1.5' stroke-opacity='.2' fill='none'/><circle cx='20' cy='20' r='8.5' stroke='white' stroke-width='1.5' stroke-opacity='.45' fill='none'/><circle cx='20' cy='20' r='3.5' fill='white'/><path d='M27.5 12.5 A10.5 10.5 0 0 1 31 20' stroke='white' stroke-width='3' stroke-linecap='round' fill='none'/><circle cx='27.5' cy='12.5' r='2.2' fill='white'/><defs><linearGradient id='g' x1='0' y1='0' x2='40' y2='40'><stop offset='0%25' stop-color='%236366f1'/><stop offset='100%25' stop-color='%237c3aed'/></linearGradient></defs></svg>" />
        {/* Anti-flash script — runs before paint, applies dark class instantly */}
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  try {
    var t = localStorage.getItem('lz_dashboard_theme');
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#0d0f17';
      document.body && (document.body.style.backgroundColor = '#0d0f17');
    } else if (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#0d0f17';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#f8fafc';
    }
  } catch(e) {}
})();
        `}} />
      </head>
      <body className="antialiased bg-slate-50 dark:bg-[#0d0f17] text-gray-900 dark:text-slate-100">
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}