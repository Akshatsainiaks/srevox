"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Search, Server, Bell, Shield, Terminal, Code, Sun, Moon, Menu, X, Zap, Copy, Check, Radio, AlertTriangle } from "lucide-react";

// Docs uses its OWN theme key — never touches dashboard theme
const DOCS_KEY = "lz_docs_theme";

function useDocsTheme() {
  const [dark, setDark] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(DOCS_KEY);
    setDark(saved === "dark");
  }, []);

  const toggle = (toDark: boolean) => {
    setDark(toDark);
    localStorage.setItem(DOCS_KEY, toDark ? "dark" : "light");
  };

  return { dark, toggle };
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ code, dark: d }: { code: string; dark: boolean }) {
  return (
    <div className={`relative rounded-2xl overflow-hidden border my-4 ${d ? "bg-[#0d1117] border-slate-700" : "bg-gray-900 border-gray-800"}`}>
      <div className={`flex items-center gap-1.5 px-4 py-2.5 border-b ${d ? "border-slate-700" : "border-gray-800"}`}>
        <div className="w-3 h-3 rounded-full bg-red-500/60" /><div className="w-3 h-3 rounded-full bg-amber-500/60" /><div className="w-3 h-3 rounded-full bg-green-500/60" />
      </div>
      <pre className="p-4 text-xs leading-relaxed text-green-400 overflow-x-auto font-mono">{code.trim()}</pre>
      <CopyBtn text={code.trim()} />
    </div>
  );
}

function Callout({ type, children, dark: d }: { type: "info"|"warning"|"success"|"tip"; children: React.ReactNode; dark: boolean }) {
  const s = {
    info:    { bg: d ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-800", icon: "💡" },
    warning: { bg: d ? "bg-amber-500/10 border-amber-500/20 text-amber-300"   : "bg-amber-50 border-amber-200 text-amber-800",   icon: "⚠️" },
    success: { bg: d ? "bg-green-500/10 border-green-500/20 text-green-300"   : "bg-green-50 border-green-200 text-green-800",   icon: "✅" },
    tip:     { bg: d ? "bg-purple-500/10 border-purple-500/20 text-purple-300": "bg-purple-50 border-purple-200 text-purple-800", icon: "🔥" },
  }[type];
  return <div className={`flex gap-3 rounded-2xl border p-4 my-4 ${s.bg}`}><span className="text-base shrink-0">{s.icon}</span><div className="text-sm leading-relaxed">{children}</div></div>;
}

const NAV = [
  { id:"intro", title:"Introduction", icon:BookOpen, items:[{id:"what",title:"What is Loopzen?"},{id:"how",title:"How it works"},{id:"arch",title:"Architecture"},{id:"qs",title:"Quick start (5 min)"}]},
  { id:"clusters", title:"Clusters", icon:Server, items:[{id:"connect",title:"Connect a cluster"},{id:"agent",title:"Agent installation"},{id:"kubeconfig",title:"Kubeconfig method"},{id:"rbac",title:"RBAC permissions"}]},
  { id:"channels", title:"Alert Channels", icon:Bell, items:[{id:"email",title:"Email / Gmail"},{id:"teams",title:"Microsoft Teams"},{id:"whatsapp",title:"WhatsApp"},{id:"webhook",title:"Webhook / Slack"}]},
  { id:"rules", title:"Alert Rules", icon:Shield, items:[{id:"rule-create",title:"Creating rules"},{id:"noise",title:"Noise control"},{id:"reasons",title:"Crash reasons"}]},
  { id:"ai", title:"AI Diagnosis", icon:Zap, items:[{id:"ai-overview",title:"Overview"},{id:"ai-providers",title:"AI providers"},{id:"ai-local",title:"Local / offline"}]},
  { id:"api", title:"API Reference", icon:Code, items:[{id:"api-auth",title:"Authentication"},{id:"api-incidents",title:"Incidents"},{id:"api-clusters",title:"Clusters"}]},
  { id:"k8s", title:"Testing & K8s", icon:Terminal, items:[{id:"k8s-redis",title:"Test via Redis"},{id:"k8s-crash",title:"Simulate pod crash"},{id:"k8s-watcher",title:"Run Go watcher"},{id:"k8s-full",title:"Full cluster setup"}]},
];

function Content({ id, dark: d }: { id: string; dark: boolean }) {
  const p = `text-sm leading-7 mb-4 ${d?"text-slate-400":"text-gray-600"}`;
  const h2 = `text-2xl font-bold mb-6 ${d?"text-white":"text-gray-900"}`;
  const h3 = `text-base font-bold mt-8 mb-3 ${d?"text-slate-200":"text-gray-800"}`;
  const card = `rounded-2xl border p-4 ${d?"bg-slate-800/50 border-slate-700":"bg-gray-50 border-gray-200"}`;

  const map: Record<string, React.ReactNode> = {
    what: (<>
      <h1 className={h2}>What is Loopzen?</h1>
      <p className={p}>Loopzen is an open-source Kubernetes pod crash alerting platform. It watches your clusters 24/7 using the K8s Watch API and instantly notifies your team when pods crash — with AI-powered root cause analysis.</p>
      <Callout type="tip" dark={d}>Loop = CrashLoopBackOff. Zen = staying calm. Together: staying in control of your K8s incidents.</Callout>
      <h3 className={h3}>Key features</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
        {[["⚡","Instant detection","Sub-5s via K8s Watch API"],["🔔","Multi-channel","Email, Teams, WhatsApp, Webhooks"],["🤖","AI diagnosis","Root cause + fix steps on demand"],["🛡️","Noise control","Cooldowns, thresholds, filters"],["☁️","Any cluster","EKS, GKE, AKS, on-prem, minikube"],["🔒","Self-hostable","Run entirely in your own infra"]].map(([e,t,dd])=>(
          <div key={String(t)} className={`flex gap-3 p-4 rounded-2xl border ${d?"bg-slate-800/50 border-slate-700":"bg-gray-50 border-gray-200"}`}>
            <span className="text-2xl shrink-0">{e}</span>
            <div><div className={`font-semibold text-sm ${d?"text-slate-200":"text-gray-800"}`}>{t}</div><div className={`text-xs mt-0.5 ${d?"text-slate-500":"text-gray-500"}`}>{dd}</div></div>
          </div>
        ))}
      </div>
    </>),
    how: (<>
      <h1 className={h2}>How it works</h1>
      <p className={p}>Loopzen uses the Kubernetes Watch API — a single persistent connection per cluster. K8s pushes events the moment they happen.</p>
      <div className="space-y-4 my-6">
        {[["1","Go watcher connects","Opens a Watch stream on the Pods API. K8s pushes every pod state change in real-time."],["2","Crash event → Redis","When OOMKilled or CrashLoopBackOff detected, publishes JSON to Redis channel loopzen:crashes."],["3","Alert worker processes","Node.js worker subscribes, matches alert rules, applies noise filters, sends alerts."],["4","Incident stored","Saved to PostgreSQL. View, acknowledge, resolve, or trigger AI diagnosis."]].map(([n,t,dd])=>(
          <div key={n} className={`flex gap-4 p-4 rounded-2xl border ${d?"bg-slate-800/30 border-slate-700":"bg-white border-gray-200"}`}>
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">{n}</div>
            <div><div className={`font-semibold text-sm ${d?"text-slate-200":"text-gray-800"}`}>{t}</div><div className={`text-xs mt-1 ${d?"text-slate-500":"text-gray-500"}`}>{dd}</div></div>
          </div>
        ))}
      </div>
    </>),
    qs: (<>
      <h1 className={h2}>Quick start</h1>
      <Callout type="info" dark={d}>Prerequisites: Node.js 18+, Python 3.10+, Go 1.21+, PostgreSQL 16, Redis 7</Callout>
      {[["1. Start the API","cd apps/api\nnpm install\nnpm run dev"],["2. Start AI service","cd apps/backend\npip install -r requirements.txt\nuvicorn ai_service:app --port 8000 --reload"],["3. Start alert worker","cd apps/alert-worker\nnpm install\nnpm run dev"],["4. Start frontend","cd apps/frontend\nnpm install\nnpm run dev"]].map(([t,c])=><div key={String(t)}><h3 className={h3}>{t}</h3><CodeBlock code={String(c)} dark={d}/></div>)}
      <Callout type="success" dark={d}>Default login: admin@loopzen.local / admin123</Callout>
    </>),
    agent: (<>
      <h1 className={h2}>Agent installation</h1>
      <p className={p}>The Loopzen agent runs as a Deployment inside your cluster. Connects outbound to Redis — no inbound firewall rules needed.</p>
      <CodeBlock dark={d} code={`kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loopzen-agent
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels: { app: loopzen-agent }
  template:
    metadata:
      labels: { app: loopzen-agent }
    spec:
      containers:
      - name: agent
        image: loopzen/agent:latest
        env:
        - name: REDIS_URL
          value: "redis://YOUR_REDIS:6379"
        - name: CLUSTER_ID
          value: "YOUR_CLUSTER_UUID"
        resources:
          requests: { cpu: 5m, memory: 16Mi }
          limits:   { cpu: 50m, memory: 64Mi }
EOF`}/>
    </>),
    email: (<>
      <h1 className={h2}>Email / Gmail setup</h1>
      <div className={`rounded-2xl border overflow-hidden my-4 ${d?"border-slate-700":"border-gray-200"}`}>
        <table className="w-full text-sm">
          <thead><tr className={`border-b ${d?"border-slate-700 bg-slate-800":"border-gray-200 bg-gray-50"}`}><th className={`text-left px-4 py-3 text-xs font-bold uppercase ${d?"text-slate-400":"text-gray-500"}`}>Field</th><th className={`text-left px-4 py-3 text-xs font-bold uppercase ${d?"text-slate-400":"text-gray-500"}`}>Value</th></tr></thead>
          <tbody>
            {[["smtp_host","smtp.gmail.com"],["smtp_port","587"],["smtp_user","you@gmail.com"],["smtp_pass","16-char App Password"],["to","comma-separated recipients"]].map(([k,v])=>(
              <tr key={k} className={`border-b ${d?"border-slate-800":"border-gray-100"}`}>
                <td className={`px-4 py-3 font-mono text-xs ${d?"text-indigo-400":"text-indigo-600"}`}>{k}</td>
                <td className={`px-4 py-3 text-xs ${d?"text-slate-400":"text-gray-600"}`}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Callout type="info" dark={d}>Gmail: myaccount.google.com → Security → 2-Step Verification → App passwords → Create "Loopzen"</Callout>
    </>),
    "k8s-redis": (<>
      <h1 className={h2}>Test via Redis</h1>
      <p className={p}>Manually publish a crash event to test the full alert pipeline without a real K8s cluster.</p>
      <Callout type="tip" dark={d}>Make sure you have a cluster added in the dashboard and an alert rule pointing to that cluster_id first.</Callout>
      <h3 className={h3}>Publish test crash event</h3>
      <CodeBlock dark={d} code={`docker exec podwatch-redis redis-cli PUBLISH loopzen:crashes '{
  "cluster_id": "YOUR_CLUSTER_UUID_HERE",
  "pod_name": "payment-service-abc123",
  "namespace": "backend",
  "container_name": "app",
  "crash_reason": "OOMKilled",
  "restart_count": 5,
  "pod_labels": {},
  "raw_event": {},
  "detected_at": "2026-04-09T10:00:00Z"
}'`}/>
      <Callout type="success" dark={d}>If you see the incident in the dashboard → alert worker is working correctly!</Callout>
    </>),
    "k8s-crash": (<>
      <h1 className={h2}>Simulate pod crash</h1>
      <CodeBlock dark={d} code={`# CrashLoopBackOff
kubectl run crash-test \\
  --image=busybox --restart=Always \\
  -- /bin/sh -c "exit 1"

# OOMKilled
kubectl run oom-test \\
  --image=polinux/stress \\
  --restart=Always \\
  --limits='memory=64Mi' \\
  -- stress --vm 1 --vm-bytes 128M

# Watch restarts
kubectl get pod crash-test -w

# Clean up
kubectl delete pod crash-test oom-test`}/>
    </>),
    "k8s-watcher": (<>
      <h1 className={h2}>Run Go watcher</h1>
      <CodeBlock dark={d} code={`cd apps/watcher
go mod tidy

REDIS_URL=redis://192.168.133.150:6379 \\
CLUSTER_ID=bf151459-9dd0-4298-a70c-bad244c7efcb \\
CLUSTER_NAME=production \\
go run cmd/watcher/main.go`}/>
      <Callout type="info" dark={d}>The watcher auto-uses ~/.kube/config if KUBECONFIG is not set. Redis is at 192.168.133.150:6379 for VMware setups.</Callout>
    </>),
    "k8s-full": (<>
      <h1 className={h2}>Full cluster setup</h1>
      {[["1. Add cluster in dashboard","# Dashboard → Clusters → Add cluster\n# Choose Agent connection type\n# Copy the cluster UUID"],["2. Create alert rule","# Dashboard → Alert Rules → New rule\n# Namespaces: (leave empty for all)\n# Min restarts: 1\n# Select your email channel"],["3. Trigger crash","kubectl run crash-test \\\n  --image=busybox --restart=Always \\\n  -- /bin/sh -c \"exit 1\""],["4. Verify","# Dashboard → bell shows notification\n# Incidents page shows new incident\n# Email/WhatsApp alert received"]].map(([t,c])=><div key={String(t)}><h3 className={h3}>{t}</h3><CodeBlock dark={d} code={String(c)}/></div>)}
      <Callout type="success" dark={d}>Full pipeline verified: Pod crashes → Watcher → Redis → Alert Worker → Alert sent + Incident in dashboard</Callout>
    </>),
  };
  return <>{map[id] || <p className={`text-sm ${d?"text-slate-400":"text-gray-500"}`}>Select a topic from the sidebar.</p>}</>;
}

export default function DocsPage() {
  const { dark: d, toggle } = useDocsTheme();
  const [active, setActive] = useState("what");
  const [open, setOpen] = useState(["intro","k8s"]);
  const [search, setSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const toggleSection = (id: string) => setOpen(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  const filtered = search ? NAV.map(s => ({ ...s, items: s.items.filter(i => i.title.toLowerCase().includes(search.toLowerCase())) })).filter(s => s.items.length > 0) : NAV;

  // Apply docs theme as a data attribute on the docs wrapper, NOT on html element
  const bg    = d ? "#0d0f17" : "#ffffff";
  const sideBg= d ? "#101218" : "#f9fafb";
  const navBg = d ? "#101218" : "#ffffff";
  const navBdr= d ? "#1e293b" : "#e5e7eb";
  const txt   = d ? "#f1f5f9" : "#111827";
  const muted = d ? "#64748b" : "#9ca3af";
  const bdr   = d ? "#1e293b" : "#e5e7eb";
  const inputBg = d ? "#1e293b" : "#ffffff";
  const inputTxt= d ? "#cbd5e1" : "#374151";

  return (
    <div style={{ minHeight:"100vh", backgroundColor:bg, color:txt, fontFamily:"sans-serif" }}>
      {/* Navbar */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:50, backgroundColor:navBg, borderBottom:`1px solid ${navBdr}`, height:"56px", display:"flex", alignItems:"center", padding:"0 20px", gap:"12px" }}>
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:"8px", textDecoration:"none" }}>
          <div style={{ width:"28px", height:"28px", borderRadius:"7px", background:"linear-gradient(135deg,#6366f1,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Radio style={{ width:"14px", height:"14px", color:"white" }} />
          </div>
          <span style={{ fontWeight:700, fontSize:"15px", color:txt }}>Loopzen</span>
          <span style={{ color:muted }}>/</span>
          <span style={{ fontSize:"14px", color:muted }}>Docs</span>
        </Link>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:"12px", padding:"4px 10px", borderRadius:"20px", border:`1px solid ${bdr}`, color:muted, backgroundColor:d?"#1e293b":"#f3f4f6" }}>v1.0.0</span>
        {/* Docs-only theme toggle */}
        <div style={{ display:"flex", gap:"2px", padding:"4px", borderRadius:"10px", backgroundColor:d?"#1e293b":"#f3f4f6", border:`1px solid ${bdr}` }}>
          <button onClick={() => toggle(false)} style={{ width:"28px", height:"28px", borderRadius:"7px", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backgroundColor:!d?"white":"transparent", boxShadow:!d?"0 1px 3px rgba(0,0,0,0.1)":"none", color:!d?"#92400e":muted }}>
            <Sun style={{ width:"14px", height:"14px" }} />
          </button>
          <button onClick={() => toggle(true)} style={{ width:"28px", height:"28px", borderRadius:"7px", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backgroundColor:d?"#475569":"transparent", boxShadow:d?"0 1px 3px rgba(0,0,0,0.3)":"none", color:d?"white":muted }}>
            <Moon style={{ width:"14px", height:"14px" }} />
          </button>
        </div>
        <button onClick={() => setMobileNav(!mobileNav)} style={{ display:"none", width:"32px", height:"32px", border:"none", background:"transparent", cursor:"pointer", color:muted }} className="docs-mobile-btn">
          {mobileNav ? <X style={{ width:"16px", height:"16px" }} /> : <Menu style={{ width:"16px", height:"16px" }} />}
        </button>
      </nav>

      <style>{`
        @media(max-width:768px) { .docs-mobile-btn { display:flex !important; align-items:center; justify-content:center; } .docs-sidebar { transform: ${mobileNav?"translateX(0)":"translateX(-100%)"}; } }
      `}</style>

      <div style={{ display:"flex", paddingTop:"56px", minHeight:"calc(100vh - 56px)" }}>
        {/* Sidebar */}
        <aside className="docs-sidebar" style={{ position:"fixed", top:"56px", left:0, width:"256px", height:"calc(100vh - 56px)", backgroundColor:sideBg, borderRight:`1px solid ${bdr}`, display:"flex", flexDirection:"column", overflow:"hidden", zIndex:40, transition:"transform 0.2s" }}>
          <div style={{ padding:"12px", borderBottom:`1px solid ${bdr}` }}>
            <div style={{ position:"relative" }}>
              <Search style={{ width:"14px", height:"14px", position:"absolute", left:"10px", top:"50%", transform:"translateY(-50%)", color:muted }} />
              <input style={{ width:"100%", paddingLeft:"30px", paddingRight:"10px", paddingTop:"8px", paddingBottom:"8px", fontSize:"12px", borderRadius:"10px", border:`1px solid ${bdr}`, backgroundColor:inputBg, color:inputTxt, outline:"none", boxSizing:"border-box" }}
                placeholder="Search docs..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
            {filtered.map(s => (
              <div key={s.id}>
                <button onClick={() => toggleSection(s.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", padding:"8px 12px", borderRadius:"10px", border:"none", background:"transparent", cursor:"pointer", textAlign:"left" }}>
                  <s.icon style={{ width:"14px", height:"14px", color:muted, flexShrink:0 }} />
                  <span style={{ flex:1, fontSize:"11px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:muted }}>{s.title}</span>
                  <ChevronRight style={{ width:"12px", height:"12px", color:muted, transform:open.includes(s.id)?"rotate(90deg)":"none", transition:"transform 0.2s" }} />
                </button>
                {open.includes(s.id) && (
                  <div style={{ marginLeft:"20px", borderLeft:`2px solid ${d?"rgba(99,102,241,0.2)":"#e0e7ff"}`, paddingLeft:"12px", marginBottom:"4px" }}>
                    {s.items.map(item => (
                      <button key={item.id} onClick={() => { setActive(item.id); setMobileNav(false); }} style={{ width:"100%", textAlign:"left", padding:"7px 10px", borderRadius:"8px", border:"none", cursor:"pointer", fontSize:"13px", backgroundColor:active===item.id?(d?"rgba(99,102,241,0.15)":"#eef2ff"):"transparent", color:active===item.id?(d?"#a5b4fc":"#4338ca"):d?"#94a3b8":"#6b7280", fontWeight:active===item.id?600:400 }}>
                        {item.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ padding:"12px", borderTop:`1px solid ${bdr}`, textAlign:"center", fontSize:"11px", color:muted }}>
            Loopzen · Open source · MIT
          </div>
        </aside>

        {/* Content */}
        <main style={{ flex:1, marginLeft:"256px", padding:"40px 48px", maxWidth:"800px" }}>
          <Content id={active} dark={d} />
        </main>
      </div>
    </div>
  );
}