export function SrevoxLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="40" height="40" rx="10" fill="url(#lz-g1)" />
      {/* Outer ring */}
      <circle cx="20" cy="20" r="13" stroke="white" strokeWidth="1.5" strokeOpacity="0.2" fill="none" />
      {/* Mid ring */}
      <circle cx="20" cy="20" r="8.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.45" fill="none" />
      {/* Center dot */}
      <circle cx="20" cy="20" r="3.5" fill="white" />
      {/* Crash arc - broken top-right = crash detected */}
      <path d="M 27.5 12.5 A 10.5 10.5 0 0 1 31 20" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" strokeOpacity="0.95" />
      {/* Dot at break = alert point */}
      <circle cx="27.5" cy="12.5" r="2.2" fill="white" />
      <defs>
        <linearGradient id="lz-g1" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SrevoxWordmark({ size = "md", forceDark = false }: { size?: "sm" | "md" | "lg"; forceDark?: boolean }) {
  const dims = { sm: 28, md: 34, lg: 42 };
  const ts   = { sm: "text-sm", md: "text-base", lg: "text-xl" };
  const ss   = { sm: "text-[9px]", md: "text-[10px]", lg: "text-xs" };
  const textColor = forceDark ? "text-white" : "text-gray-900 dark:text-white";
  const subColor  = forceDark ? "text-indigo-200" : "text-gray-400 dark:text-slate-500";
  return (
    <div className="flex items-center gap-2.5">
      <SrevoxLogo size={dims[size]} />
      <div>
        <div className={`font-bold leading-tight ${ts[size]} ${textColor}`}>Srevox</div>
        {size !== "sm" && <div className={`leading-tight ${ss[size]} ${subColor}`}>Catch crashes before your users do.</div>}
      </div>
    </div>
  );
}