"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, Zap, Tag, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmModal";

interface Incident {
  id: string; pod_name: string; namespace: string; container_name?: string;
  crash_reason: string; restart_count: number; exit_code?: number;
  pod_labels?: Record<string,string>; severity: string; status: string;
  first_seen_at: string; last_seen_at: string; resolved_at?: string;
  cluster_name?: string; rule_name?: string;
  ai_diagnosis?: { root_cause?: string; fix_steps?: string[]; kubectl_commands?: string[]; prevention?: string; estimated_fix_time?: string; };
}

const SEV: Record<string,string> = {
  critical: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
  warning:  "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  info:     "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
};
const STS: Record<string,string> = {
  open:         "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/20",
  acknowledged: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20",
  resolved:     "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-100 dark:border-green-500/20",
};

function timeAgo(iso: string) {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 dark:border-slate-800 last:border-0">
      <span className="text-sm text-gray-500 dark:text-slate-400 w-36 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-slate-100 text-right">{value}</span>
    </div>
  );
}

function Code({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group my-2">
      <pre className="bg-gray-900 text-green-400 text-xs font-mono rounded-xl px-4 py-3 overflow-x-auto leading-relaxed">{code}</pre>
      <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-lg transition-all">
        {copied ? "✓" : "Copy"}
      </button>
    </div>
  );
}

export default function IncidentDetailPage() {
  const { id } = useParams();
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();
  const [incident, setIncident] = useState<Incident|null>(null);
  const [loading, setLoading] = useState(true);
  const [diagLoading, setDiagLoading] = useState(false);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/api/incidents/${id}`);
      setIncident(r.data.incident || r.data);
    } catch { toastError("Failed to load incident"); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (id) load(); }, [id]);

  const acknowledge = async () => {
    setActing(true);
    try { await api.patch(`/api/incidents/${id}/acknowledge`); success("Acknowledged"); load(); }
    catch { toastError("Failed"); } finally { setActing(false); }
  };

  const resolve = async () => {
    const { confirmed } = await confirm({ title:"Mark as resolved?", message:"This will mark the incident resolved.", confirmLabel:"Mark resolved", variant:"info" });
    if (!confirmed) return;
    setActing(true);
    try { await api.patch(`/api/incidents/${id}/resolve`); success("Incident resolved ✅"); load(); }
    catch { toastError("Failed"); } finally { setActing(false); }
  };

  const diagnose = async () => {
    setDiagLoading(true);
    try {
      const r = await api.post(`/api/incidents/${id}/diagnose`);
      setIncident(p => p ? { ...p, ai_diagnosis: r.data.diagnosis } : p);
      success("AI diagnosis complete!");
    } catch { toastError("AI diagnosis failed", "Make sure AI service is running on port 8000"); }
    finally { setDiagLoading(false); }
  };

  if (loading) return (
    <div className="space-y-4 max-w-5xl animate-pulse">
      <div className="h-5 bg-gray-100 dark:bg-slate-800 rounded w-32"/>
      <div className="card p-6 space-y-3">
        <div className="flex gap-2"><div className="h-6 bg-gray-100 dark:bg-slate-800 rounded-full w-20"/><div className="h-6 bg-gray-100 dark:bg-slate-800 rounded-full w-16"/></div>
        <div className="h-8 bg-gray-100 dark:bg-slate-800 rounded w-56"/>
        <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-24"/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6 space-y-4">{[...Array(5)].map((_,i)=><div key={i} className="h-4 bg-gray-100 dark:bg-slate-800 rounded"/>)}</div>
        <div className="card p-6 h-64 flex items-center justify-center"><div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl"/></div>
      </div>
    </div>
  );

  if (!incident) return (
    <div className="text-center py-20">
      <p className="text-gray-500 dark:text-slate-400 mb-4">Incident not found</p>
      <Link href="/dashboard/incidents" className="btn-primary">Back to incidents</Link>
    </div>
  );

  const labels = incident.pod_labels && Object.keys(incident.pod_labels).length > 0 ? incident.pod_labels : null;

  return (
    <div className="space-y-5 max-w-5xl">
      <Link href="/dashboard/incidents" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"/> Back to incidents
      </Link>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${SEV[incident.severity]||""}`}>{incident.severity}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STS[incident.status]||""}`}>{incident.status}</span>
              {incident.cluster_name && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20">{incident.cluster_name}</span>}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{incident.pod_name}</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{incident.namespace}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {incident.status === "open" && (
              <button onClick={acknowledge} disabled={acting} className="btn-secondary gap-2">
                {acting?<Loader2 className="w-4 h-4 animate-spin"/>:<Clock className="w-4 h-4"/>} Acknowledge
              </button>
            )}
            {incident.status !== "resolved" && (
              <button onClick={resolve} disabled={acting} className="btn-primary gap-2">
                {acting?<Loader2 className="w-4 h-4 animate-spin"/>:<CheckCircle className="w-4 h-4"/>} Mark resolved
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-indigo-500"/>
              <h2 className="font-bold text-gray-900 dark:text-white">Incident details</h2>
            </div>
            <Row label="Crash reason"  value={<span className="font-mono text-red-600 dark:text-red-400">{incident.crash_reason}</span>}/>
            <Row label="Restart count" value={<span className="text-orange-600 dark:text-orange-400 font-bold">{incident.restart_count}</span>}/>
            <Row label="Namespace"     value={incident.namespace}/>
            {incident.container_name && <Row label="Container" value={<span className="font-mono">{incident.container_name}</span>}/>}
            {incident.exit_code != null && <Row label="Exit code" value={<span className="font-mono">{incident.exit_code}</span>}/>}
            <Row label="First seen" value={timeAgo(incident.first_seen_at)}/>
            <Row label="Last seen"  value={timeAgo(incident.last_seen_at)}/>
            {incident.resolved_at && <Row label="Resolved" value={timeAgo(incident.resolved_at)}/>}
            {incident.rule_name && <Row label="Alert rule" value={incident.rule_name}/>}
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-indigo-500"/>
              <h2 className="font-bold text-gray-900 dark:text-white">Pod labels</h2>
            </div>
            {labels ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(labels).map(([k,v])=>(
                  <span key={k} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 font-mono">{k}={v}</span>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400 dark:text-slate-500">No labels</p>}
          </div>
        </div>

        <div className="card p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-indigo-500"/>
            <h2 className="font-bold text-gray-900 dark:text-white">AI Diagnosis</h2>
          </div>
          {incident.ai_diagnosis ? (
            <div className="space-y-4 flex-1 overflow-y-auto">
              {incident.ai_diagnosis.root_cause && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">Root cause</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed bg-red-50 dark:bg-red-500/10 rounded-xl p-3 border border-red-100 dark:border-red-500/20">{incident.ai_diagnosis.root_cause}</p>
                </div>
              )}
              {incident.ai_diagnosis.fix_steps && incident.ai_diagnosis.fix_steps.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">Fix steps</p>
                  <ol className="space-y-2">
                    {incident.ai_diagnosis.fix_steps.map((s,i)=>(
                      <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {incident.ai_diagnosis.kubectl_commands && incident.ai_diagnosis.kubectl_commands.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">kubectl commands</p>
                  {incident.ai_diagnosis.kubectl_commands.map((c,i)=><Code key={i} code={c}/>)}
                </div>
              )}
              {incident.ai_diagnosis.prevention && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">Prevention</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300 bg-green-50 dark:bg-green-500/10 rounded-xl p-3 border border-green-100 dark:border-green-500/20">{incident.ai_diagnosis.prevention}</p>
                </div>
              )}
              <button onClick={diagnose} disabled={diagLoading} className="btn-secondary text-xs gap-2 mt-2">
                <RefreshCw className={`w-3.5 h-3.5 ${diagLoading?"animate-spin":""}`}/> Re-run diagnosis
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-8">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-indigo-400"/>
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">AI-powered root cause analysis</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-5 leading-relaxed">On-demand analysis — never automatic.</p>
              <button onClick={diagnose} disabled={diagLoading} className="btn-primary gap-2">
                {diagLoading?<><Loader2 className="w-4 h-4 animate-spin"/>Analyzing...</>:<><Sparkles className="w-4 h-4"/>Run AI Diagnosis</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
