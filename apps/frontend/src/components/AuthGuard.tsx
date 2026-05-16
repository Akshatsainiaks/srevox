"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken } from "@/lib/auth";
import { Radio } from "lucide-react";

const PUBLIC_PATHS = ["/", "/login", "/signup"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ready,  setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith("/landing"));
    if (!token && !isPublic) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [pathname, router]);

  if (!ready && !PUBLIC_PATHS.includes(pathname)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center animate-pulse">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm text-gray-400">Loading Srevox...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
