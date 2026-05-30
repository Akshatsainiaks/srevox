"use client";
import Cookies from "js-cookie";
import { SrevoxLogo } from "@/components/Logo";
import { useState, useEffect, useRef } from "react";
import { BookOpen, ChevronRight, Search, Server, Bell, Shield, Terminal, Code, Sun, Moon, Menu, X, Zap, Copy, Check, Radio, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { copyToClipboard } from "@/lib/utils";


// Docs uses its OWN theme key — never touches dashboard theme
const DOCS_KEY = "sv_docs_theme";

function useDocsTheme() {
  const [dark, setDark] = useState(false);

  const applyTheme = (toDark: boolean) => {
    const r = document.documentElement;
    if (toDark) {
      r.classList.add("dark");
      r.style.setProperty("--docs-bg",        "#0d0f17");
      r.style.setProperty("--docs-side-bg",   "#090b11");
      r.style.setProperty("--docs-nav-bg",    "#090b11");
      r.style.setProperty("--docs-nav-bdr",   "#1e293b");
      r.style.setProperty("--docs-txt",       "#f8fafc");
      r.style.setProperty("--docs-muted",     "#64748b");
      r.style.setProperty("--docs-bdr",       "#1e293b");
      r.style.setProperty("--docs-input-bg",  "#151823");
      r.style.setProperty("--docs-input-txt", "#cbd5e1");
    } else {
      r.classList.remove("dark");
      r.style.setProperty("--docs-bg",        "#ffffff");
      r.style.setProperty("--docs-side-bg",   "#f9fafb");
      r.style.setProperty("--docs-nav-bg",    "#ffffff");
      r.style.setProperty("--docs-nav-bdr",   "#e5e7eb");
      r.style.setProperty("--docs-txt",       "#0f172a");
      r.style.setProperty("--docs-muted",     "#94a3b8");
      r.style.setProperty("--docs-bdr",       "#e5e7eb");
      r.style.setProperty("--docs-input-bg",  "#ffffff");
      r.style.setProperty("--docs-input-txt", "#374151");
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(DOCS_KEY);
    const isDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    applyTheme(isDark);
  }, []);

  const toggle = (toDark: boolean) => {
    setDark(toDark);
    localStorage.setItem(DOCS_KEY, toDark ? "dark" : "light");
    applyTheme(toDark);
  };

  return { dark, toggle };
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
function CodeBlock({ code, dark: d }: { code: string; dark: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`relative rounded-2xl overflow-hidden border my-4 ${d ? "bg-[#0d1117] border-slate-700" : "bg-gray-900 border-gray-800"}`}>
      <div className={`flex items-center gap-1.5 px-4 py-2.5 border-b ${d ? "border-slate-700" : "border-gray-800"}`}>
        <div className="w-3 h-3 rounded-full bg-red-500/60" /><div className="w-3 h-3 rounded-full bg-amber-500/60" /><div className="w-3 h-3 rounded-full bg-green-500/60" />
        <button onClick={async () => { await copyToClipboard(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="ml-auto text-xs text-slate-400 hover:text-white transition-colors px-2 py-0.5 rounded-lg hover:bg-white/10">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-sm text-slate-300 overflow-x-auto font-mono leading-relaxed whitespace-pre">{code}</pre>
    </div>
  );
}

const NAV = [
  { id:"intro", title:"Introduction", icon:BookOpen, items:[{id:"what",title:"What is Srevox?"},{id:"how",title:"How it works"},{id:"arch",title:"Architecture"},{id:"qs",title:"Quick start (5 min)"}]},
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
      <h1 className={h2}>What is Srevox?</h1>
      <p className={p}>Srevox is an open-source Kubernetes pod crash alerting platform. It watches your clusters 24/7 using the K8s Watch API and instantly notifies your team when pods crash — with AI-powered root cause analysis.</p>
      <Callout type="tip" dark={d}>SRE + VOX — The voice of your site reliability. Catch crashes before your users do.</Callout>
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
      <p className={p}>Srevox uses the Kubernetes Watch API — a single persistent connection per cluster. K8s pushes events the moment they happen.</p>
      <div className="space-y-4 my-6">
        {[["1","Go watcher connects","Opens a Watch stream on the Pods API. K8s pushes every pod state change in real-time."],["2","Crash event → Redis","When OOMKilled or CrashLoopBackOff detected, publishes JSON to Redis channel srevox:crashes."],["3","Alert worker processes","Node.js worker subscribes, matches alert rules, applies noise filters, sends alerts."],["4","Incident stored","Saved to PostgreSQL. View, acknowledge, resolve, or trigger AI diagnosis."]].map(([n,t,dd])=>(
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
      <Callout type="success" dark={d}>Default login: admin@srevox.local / admin123</Callout>
    </>),
    agent: (<>
      <h1 className={h2}>Agent installation</h1>
      <p className={p}>The Srevox agent runs as a Deployment inside your cluster. Connects outbound to Redis — no inbound firewall rules needed.</p>
      <CodeBlock dark={d} code={`kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: srevox-agent
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels: { app: srevox-agent }
  template:
    metadata:
      labels: { app: srevox-agent }
    spec:
      containers:
      - name: agent
        image: srevox/agent:latest
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
      <Callout type="info" dark={d}>Gmail: myaccount.google.com → Security → 2-Step Verification → App passwords → Create "Srevox"</Callout>
    </>),

    arch: (<>
      <h1 className={h2}>Architecture</h1>
      <p className={p}>Srevox is composed of 5 services that work together:</p>
      <div className="space-y-3 my-4">
        {[
          ["Go Watcher", "Connects to K8s Watch API. Detects pod crashes in under 5 seconds. Publishes JSON events to Redis."],
          ["Redis", "Pub/sub message bus between watcher and alert worker. Channel: srevox:crashes."],
          ["Alert Worker (Node.js)", "Subscribes to Redis. Matches alert rules. Applies noise filters. Sends alerts to channels."],
          ["API (Fastify)", "REST API for dashboard. JWT auth. Manages clusters, rules, channels, incidents."],
          ["Frontend (Next.js)", "Dashboard UI. Landing page. Docs. Real-time notifications."],
        ].map(([t, d]) => (
          <div key={String(t)} className={`p-4 rounded-2xl border ${d?"bg-slate-800/30 border-slate-700":"bg-white border-gray-200"}`}>
            <div className={`font-semibold text-sm mb-1 ${d?"text-slate-200":"text-gray-800"}`}>{t}</div>
            <div className={`text-xs ${d?"text-slate-400":"text-gray-500"}`}>{d}</div>
          </div>
        ))}
      </div>
    </>),
    connect: (<>
      <h1 className={h2}>Connect a cluster</h1>
      <p className={p}>Srevox supports two connection methods: Agent-based (recommended) and Kubeconfig.</p>
      <Callout type="tip" dark={d}>Agent-based is recommended for production. It connects outbound only — no inbound firewall rules needed.</Callout>
      <h3 className={h3}>Agent method (recommended)</h3>
      <p className={p}>1. Go to Dashboard → Clusters → Add Cluster → choose "Agent"</p>
      <p className={p}>2. Copy your Cluster UUID</p>
      <p className={p}>3. Deploy the agent into your cluster:</p>
      <CodeBlock dark={d} code={`kubectl apply -f https://raw.githubusercontent.com/Akshatsainiaks/srevox/main/srevox-agent.yml

kubectl set env deployment/srevox-agent -n kube-system \
  REDIS_URL=redis://YOUR_SREVOX_IP:6379 \
  CLUSTER_ID=YOUR_UUID \
  CLUSTER_NAME=production`}/>
      <h3 className={h3}>Kubeconfig method</h3>
      <p className={p}>Go to Dashboard → Clusters → Add Cluster → choose "Kubeconfig" → paste your kubeconfig content.</p>
      <Callout type="warning" dark={d}>Kubeconfig method stores your cluster credentials. Use agent method for better security.</Callout>
    </>),
    kubeconfig: (<>
      <h1 className={h2}>Kubeconfig method</h1>
      <p className={p}>Use this method when you want to connect without deploying an agent inside the cluster.</p>
      <CodeBlock dark={d} code={`# Get your kubeconfig
cat ~/.kube/config

# Or for a specific cluster
kubectl config view --minify --raw`}/>
      <Callout type="warning" dark={d}>Never share your kubeconfig. It grants full cluster access. For production, use the agent method instead.</Callout>
    </>),
    rbac: (
      <>
        <h1 className={h2}>RBAC permissions</h1>
        <p className={p}>
          The Srevox agent runs as a Go process inside your cluster. It needs read-only access to pods, nodes, namespaces, services, deployments, and cronjobs to monitor resources and capture events. If you see watch stream access/forbidden errors, you need to apply the ClusterRole and ClusterRoleBinding permissions.
        </p>
        
        <h3 className={h3}>Apply direct from terminal</h3>
        <p className={p}>
          Run the following command in your terminal to create and bind the required permissions for the <code>srevox-agent</code> ServiceAccount in the <code>kube-system</code> namespace:
        </p>
        <CodeBlock dark={d} code={`kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: srevox-agent
rules:
  - apiGroups: [""]
    resources: ["pods", "nodes", "namespaces", "services", "endpoints", "persistentvolumes", "persistentvolumeclaims", "events"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: srevox-agent
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: srevox-agent
subjects:
  - kind: ServiceAccount
    name: srevox-agent
    namespace: kube-system
EOF`} />
        
        <h3 className={h3}>Restart the agent</h3>
        <p className={p}>Restart the agent deployment to load and apply the new permissions:</p>
        <CodeBlock dark={d} code={`kubectl rollout restart deployment/srevox-agent -n kube-system`} />

        <h3 className={h3}>Verify permissions</h3>
        <p className={p}>Verify the ServiceAccount possesses access using the auth check command:</p>
        <CodeBlock dark={d} code={`kubectl auth can-i watch pods --as=system:serviceaccount:kube-system:srevox-agent -n default`} />
        
        <Callout type="success" dark={d}>
          Expected verification output is <code>yes</code>. The agent only reads pod status and event logs — it never writes or modifies cluster workloads.
        </Callout>
      </>
    ),
    teams: (<>
      <h1 className={h2}>Microsoft Teams</h1>
      <p className={p}>Send crash alerts directly to a Teams channel via incoming webhook.</p>
      <h3 className={h3}>Setup</h3>
      <p className={p}>1. In Teams, go to the channel → ••• → Connectors → Incoming Webhook → Configure</p>
      <p className={p}>2. Name it "Srevox" → Copy the webhook URL</p>
      <p className={p}>3. In Srevox dashboard → Channels → Add → Microsoft Teams → paste URL</p>
      <CodeBlock dark={d} code={`webhook_url: https://your-org.webhook.office.com/webhookb2/...`}/>
      <Callout type="success" dark={d}>Test the channel with one click from the dashboard before going live.</Callout>
    </>),
    whatsapp: (<>
      <h1 className={h2}>WhatsApp</h1>
      <p className={p}>Send crash alerts via WhatsApp using Twilio.</p>
      <h3 className={h3}>Setup</h3>
      <p className={p}>1. Create a Twilio account at twilio.com</p>
      <p className={p}>2. Enable WhatsApp sandbox or buy a WhatsApp-enabled number</p>
      <p className={p}>3. In Srevox → Channels → Add → WhatsApp</p>
      <CodeBlock dark={d} code={`account_sid: ACxxxxxxxxxxxxxxxx
auth_token:  your_auth_token
from:        whatsapp:+14155238886
to:          whatsapp:+91XXXXXXXXXX`}/>
    </>),
    webhook: (<>
      <h1 className={h2}>Webhook / Slack</h1>
      <p className={p}>Send crash alerts to any HTTP endpoint — including Slack, PagerDuty, or your own service.</p>
      <h3 className={h3}>Slack setup</h3>
      <p className={p}>1. Go to api.slack.com → Your Apps → Create App → Incoming Webhooks → Add webhook</p>
      <p className={p}>2. Copy the webhook URL</p>
      <p className={p}>3. In Srevox → Channels → Add → Webhook → paste URL</p>
      <h3 className={h3}>Payload format</h3>
      <CodeBlock dark={d} code={`{
  "pod_name": "payment-svc-abc",
  "namespace": "backend",
  "crash_reason": "OOMKilled",
  "restart_count": 5,
  "severity": "critical",
  "incident_id": "uuid",
  "cluster_name": "production",
  "detected_at": "2026-05-16T14:00:00Z"
}`}/>
    </>),
    "rule-create": (<>
      <h1 className={h2}>Creating alert rules</h1>
      <p className={p}>Alert rules define which crashes trigger alerts and where to send them.</p>
      <h3 className={h3}>Steps</h3>
      <p className={p}>1. Dashboard → Alert Rules → New rule</p>
      <p className={p}>2. Select a cluster</p>
      <p className={p}>3. Configure filters (namespaces, crash reasons, min restarts)</p>
      <p className={p}>4. Set cooldown period</p>
      <p className={p}>5. Select alert channels</p>
      <p className={p}>6. Save and enable</p>
      <div className={`rounded-2xl border overflow-hidden my-4 ${d?"border-slate-700":"border-gray-200"}`}>
        <table className="w-full text-sm">
          <thead><tr className={`border-b ${d?"border-slate-700 bg-slate-800":"border-gray-200 bg-gray-50"}`}>
            <th className={`text-left px-4 py-3 text-xs font-bold uppercase ${d?"text-slate-400":"text-gray-500"}`}>Field</th>
            <th className={`text-left px-4 py-3 text-xs font-bold uppercase ${d?"text-slate-400":"text-gray-500"}`}>Description</th>
          </tr></thead>
          <tbody>
            {[
              ["Cluster", "Which cluster to watch"],
              ["Namespaces", "Leave empty to watch all namespaces"],
              ["Crash reasons", "OOMKilled, CrashLoopBackOff, Error, etc. Empty = all"],
              ["Min restarts", "Only alert after N restarts (noise filter)"],
              ["Cooldown", "Minutes to suppress duplicate alerts for same pod"],
              ["Severity", "warning or critical"],
              ["Channels", "Where to send alerts"],
            ].map(([k,v]) => (
              <tr key={k} className={`border-b ${d?"border-slate-800":"border-gray-100"}`}>
                <td className={`px-4 py-3 font-mono text-xs ${d?"text-indigo-400":"text-indigo-600"}`}>{k}</td>
                <td className={`px-4 py-3 text-xs ${d?"text-slate-400":"text-gray-600"}`}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>),
    noise: (<>
      <h1 className={h2}>Noise control</h1>
      <p className={p}>Srevox has built-in noise control to prevent alert fatigue.</p>
      <h3 className={h3}>Cooldown periods</h3>
      <p className={p}>After an alert fires for a pod, Srevox suppresses duplicate alerts for that pod for the cooldown duration. Default: 15 minutes.</p>
      <h3 className={h3}>Restart thresholds</h3>
      <p className={p}>Only alert when a pod has restarted at least N times. Prevents alerts for transient one-off crashes.</p>
      <h3 className={h3}>Namespace filters</h3>
      <p className={p}>Scope rules to specific namespaces. Leave empty to watch all namespaces.</p>
      <h3 className={h3}>Crash reason filters</h3>
      <p className={p}>Only alert for specific crash reasons. Leave empty to catch all crash types.</p>
      <Callout type="tip" dark={d}>Start with min_restarts=3 and cooldown=15min. Tune based on your cluster's noise level.</Callout>
    </>),
    reasons: (<>
      <h1 className={h2}>Crash reasons</h1>
      <p className={p}>Srevox detects these Kubernetes crash reasons:</p>
      <div className="grid grid-cols-2 gap-2 my-4">
        {["CrashLoopBackOff","OOMKilled","Error","BackOff","Failed","FailedMount",
          "FailedScheduling","ImagePullBackOff","ErrImagePull","CreateContainerError",
          "Killing","Unhealthy","Evicted","NetworkNotReady","HostPortConflict"
        ].map(r => (
          <div key={r} className={`px-3 py-2 rounded-xl text-xs font-mono ${d?"bg-slate-800 text-red-400 border border-slate-700":"bg-red-50 text-red-600 border border-red-100"}`}>{r}</div>
        ))}
      </div>
      <Callout type="info" dark={d}>Leave crash reasons empty in your alert rule to catch all types automatically.</Callout>
    </>),
    "ai-overview": (<>
      <h1 className={h2}>AI Diagnosis Overview</h1>
      <p className={p}>When a pod crashes, Srevox can automatically diagnose the root cause using AI and provide specific fix steps.</p>
      <h3 className={h3}>How to use</h3>
      <p className={p}>1. Go to Dashboard → Incidents → click any incident</p>
      <p className={p}>2. Click "AI Diagnosis" or "Re-run diagnosis"</p>
      <p className={p}>3. Get instant root cause analysis with kubectl commands</p>
      <h3 className={h3}>What you get</h3>
      <div className="space-y-2 my-4">
        {[
          ["Root cause", "Clear explanation of why the pod crashed"],
          ["Fix steps", "Step-by-step actions to resolve the issue"],
          ["kubectl commands", "Exact commands with your pod name and namespace"],
          ["Prevention", "How to prevent this crash in future"],
          ["Estimated fix time", "How long the fix should take"],
        ].map(([t, d2]) => (
          <div key={t} className={`flex gap-3 p-3 rounded-xl border ${d?"bg-slate-800/30 border-slate-700":"bg-gray-50 border-gray-200"}`}>
            <span className="text-green-500 shrink-0">✓</span>
            <div><span className={`font-semibold text-sm ${d?"text-slate-200":"text-gray-800"}`}>{t}</span><span className={`text-xs ml-2 ${d?"text-slate-400":"text-gray-500"}`}>{d2}</span></div>
          </div>
        ))}
      </div>
      <Callout type="info" dark={d}>Diagnoses are cached per incident. Use "Re-run diagnosis" to get a fresh analysis.</Callout>
    </>),
    "ai-providers": (<>
      <h1 className={h2}>AI Providers</h1>
      <p className={p}>Configure your AI provider in Dashboard → Settings → AI Diagnosis.</p>
      <div className="space-y-3 my-4">
        {[
          ["Groq", "Free, extremely fast. Recommended for self-hosted. Get key at console.groq.com", "llama-3.1-8b-instant, llama-3.3-70b-versatile"],
          ["OpenAI", "GPT-4o-mini (cheap) or GPT-4o (powerful). Get key at platform.openai.com", "gpt-4o-mini, gpt-4o"],
          ["Anthropic", "Claude models. Get key at console.anthropic.com", "claude-haiku, claude-sonnet"],
          ["Ollama", "Fully local, no internet required. Perfect for air-gapped environments.", "llama3, mistral, tinyllama"],
        ].map(([name, desc, models]) => (
          <div key={name} className={`p-4 rounded-2xl border ${d?"bg-slate-800/30 border-slate-700":"bg-white border-gray-200"}`}>
            <div className={`font-bold text-sm mb-1 ${d?"text-white":"text-gray-900"}`}>{name}</div>
            <div className={`text-xs mb-2 ${d?"text-slate-400":"text-gray-500"}`}>{desc}</div>
            <div className={`text-xs font-mono ${d?"text-indigo-400":"text-indigo-600"}`}>{models}</div>
          </div>
        ))}
      </div>
    </>),
    "ai-local": (<>
      <h1 className={h2}>Local / Offline AI</h1>
      <p className={p}>Use Ollama for fully local AI diagnosis — no internet required. Perfect for air-gapped environments.</p>
      <h3 className={h3}>Install Ollama</h3>
      <CodeBlock dark={d} code={`# Linux / macOS
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3

# Start serving
ollama serve`}/>
      <h3 className={h3}>Configure Srevox</h3>
      <CodeBlock dark={d} code={`# In Dashboard → Settings → AI Diagnosis:
Provider: Ollama
Ollama URL: http://localhost:11434
Model: llama3`}/>
      <Callout type="tip" dark={d}>For servers with limited RAM, use llama3.2:1b (requires ~2GB) or tinyllama (requires ~600MB).</Callout>
    </>),
    "api-auth": (<>
      <h1 className={h2}>Authentication</h1>
      <p className={p}>Srevox API uses JWT Bearer tokens. Get a token by logging in.</p>
      <CodeBlock dark={d} code={`# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@srevox.local","password":"admin123"}'

# Response
{"access_token": "eyJhbGci...", "user": {...}}`}/>
      <p className={p}>Use the token in subsequent requests:</p>
      <CodeBlock dark={d} code={`curl http://localhost:4000/api/incidents \
  -H "Authorization: Bearer YOUR_TOKEN"`}/>
    </>),
    "api-incidents": (<>
      <h1 className={h2}>Incidents API</h1>
      <CodeBlock dark={d} code={`# List incidents
GET /api/incidents?status=open&limit=20

# Get incident
GET /api/incidents/:id

# Acknowledge
POST /api/incidents/:id/acknowledge

# Resolve
POST /api/incidents/:id/resolve

# AI diagnosis
POST /api/incidents/:id/diagnose`}/>
    </>),
    "api-clusters": (<>
      <h1 className={h2}>Clusters API</h1>
      <CodeBlock dark={d} code={`# List clusters
GET /api/clusters

# Add cluster
POST /api/clusters
{
  "name": "production",
  "connection_type": "agent"
}

# Delete cluster
DELETE /api/clusters/:id`}/>
    </>),

    "k8s-redis": (<>
      <h1 className={h2}>Test via Redis</h1>
      <p className={p}>Manually publish a crash event to test the full alert pipeline without a real K8s cluster.</p>
      <Callout type="tip" dark={d}>Make sure you have a cluster added in the dashboard and an alert rule pointing to that cluster_id first.</Callout>
      <h3 className={h3}>Publish test crash event</h3>
      <CodeBlock dark={d} code={`docker exec podwatch-redis redis-cli PUBLISH srevox:crashes '{
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
  const dark = d;
  const [active, setActive] = useState("what");
  const [open, setOpen] = useState(["intro","k8s"]);
  const [search, setSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const toggleSection = (id: string) => setOpen(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);

  const handleSectionClick = (s: typeof NAV[number]) => {
    const isOpen = open.includes(s.id);
    if (isOpen) {
      setOpen(p => p.filter(x => x !== s.id));
    } else {
      setOpen(p => [...p, s.id]);
      if (s.items && s.items.length > 0) {
        setActive(s.items[0].id);
      }
    }
  };

  const filtered = search ? NAV.map(s => ({ ...s, items: s.items.filter(i => i.title.toLowerCase().includes(search.toLowerCase())) })).filter(s => s.items.length > 0) : NAV;

  return (
    <div suppressHydrationWarning style={{ minHeight:"100vh", backgroundColor:"var(--docs-bg)", color:"var(--docs-txt)", fontFamily:"sans-serif" }}>
      {/* Navbar */}
      <nav suppressHydrationWarning style={{ position:"fixed", top:0, left:0, right:0, zIndex:50, backgroundColor:"var(--docs-nav-bg)", borderBottom:"1px solid var(--docs-nav-bdr)", height:"56px", display:"flex", alignItems:"center", padding:"0 20px", gap:"12px" }}>
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:"8px", textDecoration:"none" }}>
          <SrevoxLogo size={28} />
          <span style={{ fontWeight:700, fontSize:"15px", color:"var(--docs-txt)" }}>Srevox</span>
          <span style={{ color:"var(--docs-muted)" }}>/</span>
          <span style={{ fontSize:"14px", color:"var(--docs-muted)" }}>Docs</span>
        </Link>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:"12px", padding:"4px 10px", borderRadius:"20px", border:"1px solid var(--docs-bdr)", color:"var(--docs-muted)", backgroundColor:d?"#1e293b":"#f3f4f6" }}>v1.0.0</span>
        {/* Docs-only theme toggle */}
        <div style={{ display:"flex", gap:"2px", padding:"4px", borderRadius:"10px", backgroundColor:d?"#1e293b":"#f3f4f6", border:"1px solid var(--docs-bdr)" }}>
          <button onClick={() => toggle(false)} style={{ width:"28px", height:"28px", borderRadius:"7px", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backgroundColor:!d?"white":"transparent", boxShadow:!d?"0 1px 3px rgba(0,0,0,0.1)":"none", color:!d?"#92400e":"var(--docs-muted)" }}>
            <Sun style={{ width:"14px", height:"14px" }} />
          </button>
          <button onClick={() => toggle(true)} style={{ width:"28px", height:"28px", borderRadius:"7px", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backgroundColor:d?"#475569":"transparent", boxShadow:d?"0 1px 3px rgba(0,0,0,0.3)":"none", color:d?"white":"var(--docs-muted)" }}>
            <Moon style={{ width:"14px", height:"14px" }} />
          </button>
        </div>
        <button onClick={() => setMobileNav(!mobileNav)} style={{ display:"none", width:"32px", height:"32px", border:"none", background:"transparent", cursor:"pointer", color:"var(--docs-muted)" }} className="docs-mobile-btn">
          {mobileNav ? <X style={{ width:"16px", height:"16px" }} /> : <Menu style={{ width:"16px", height:"16px" }} />}
        </button>
      </nav>

      <style>{`
        @media(max-width:768px) {
          .docs-mobile-btn { display:flex !important; align-items:center; justify-content:center; }
          .docs-sidebar { transform: ${mobileNav?"translateX(0)":"translateX(-100%)"}; }
          .docs-main { margin-left: 0 !important; padding: 24px 20px !important; }
        }
      `}</style>

      <div style={{ display:"flex", paddingTop:"56px", minHeight:"calc(100vh - 56px)" }}>
        {/* Sidebar */}
        <aside className="docs-sidebar" style={{ position:"fixed", top:"56px", left:0, width:"256px", height:"calc(100vh - 56px)", backgroundColor:"var(--docs-side-bg)", borderRight:"1px solid var(--docs-bdr)", display:"flex", flexDirection:"column", overflow:"hidden", zIndex:40, transition:"transform 0.2s" }}>
          <div style={{ padding:"12px", borderBottom:"1px solid var(--docs-bdr)" }}>
            <div style={{ position:"relative" }}>
              <Search style={{ width:"14px", height:"14px", position:"absolute", left:"10px", top:"50%", transform:"translateY(-50%)", color:"var(--docs-muted)" }} />
              <input style={{ width:"100%", paddingLeft:"30px", paddingRight:"10px", paddingTop:"8px", paddingBottom:"8px", fontSize:"12px", borderRadius:"10px", border:"1px solid var(--docs-bdr)", backgroundColor:"var(--docs-input-bg)", color:"var(--docs-input-txt)", outline:"none", boxSizing:"border-box" }}
                placeholder="Search docs..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
            {filtered.map(s => (
              <div key={s.id}>
                <button onClick={() => handleSectionClick(s)} style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", padding:"8px 12px", borderRadius:"10px", border:"none", background:"transparent", cursor:"pointer", textAlign:"left" }}>
                  <s.icon style={{ width:"14px", height:"14px", color:"var(--docs-muted)", flexShrink:0 }} />
                  <span style={{ flex:1, fontSize:"11px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--docs-muted)" }}>{s.title}</span>
                  <ChevronRight style={{ width:"12px", height:"12px", color:"var(--docs-muted)", transform:open.includes(s.id)?"rotate(90deg)":"none", transition:"transform 0.2s" }} />
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
          <div style={{ padding:"12px", borderTop:"1px solid var(--docs-bdr)", textAlign:"center", fontSize:"11px", color:"var(--docs-muted)" }}>
            Srevox · Open source · MIT
          </div>
        </aside>

        {/* Content */}
        <main className="docs-main" suppressHydrationWarning style={{ flex:1, marginLeft:"256px", padding:"40px 48px" }}>
          <div style={{ maxWidth:"800px", margin:"0 auto" }}>
            <Content id={active} dark={d} />
          </div>
        </main>
      </div>
    </div>
  );
}


