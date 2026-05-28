"use client";
import { useEffect, useState } from "react";
import { BookOpen, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { fetchRules, createRule, deleteRule, toggleRule, fetchClusters, fetchChannels } from "@/lib/api";
import type { AlertRule, Cluster, Channel } from "@/lib/utils";
import { severityBadge, timeAgo } from "@/lib/utils";
import { getUser } from "@/lib/auth";

const parseArr = (v: unknown): string[] => typeof v === "string" ? JSON.parse(v) : (Array.isArray(v) ? v : []);
const DEFAULT_REASONS = ["CrashLoopBackOff", "OOMKilled", "Error", "BackOff", "ImagePullBackOff"];

function AddModal({ clusters, channels, onClose, onAdded }: { clusters: Cluster[]; channels: Channel[]; onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [clusterId, setClusterId] = useState(clusters[0]?.id || "");
  const [desc, setDesc] = useState("");
  const [namespaces, setNs] = useState("");
  const [minRst, setMinRst] = useState(3);
  const [cooldown, setCooldown] = useState(15);
  const [severity, setSeverity] = useState("warning");
  const [selChannels, setSelCh] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const toggleCh = (id: string) => setSelCh((p) => p.includes(id) ? p.filter((c) => c !== id) : [...p, id]);

  const submit = async () => {
    if (!name || !clusterId) return;
    setLoading(true);
    try {
      await createRule({ name, cluster_id: clusterId, description: desc, namespaces: namespaces ? namespaces.split(",").map(s => s.trim()) : [], crash_reasons: DEFAULT_REASONS, min_restarts: minRst, cooldown_minutes: cooldown, severity, channel_ids: selChannels });
      onAdded(); onClose();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1e2130] rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-[#1e2130]">
          <h2 className="font-bold text-gray-900 dark:text-white">New alert rule</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 text-xl">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="label">Rule name</label><input className="input" placeholder="Production critical" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div><label className="label">Description (optional)</label><input className="input" placeholder="Alert on all production crashes" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div>
            <label className="label">Cluster</label>
            <select className="input" value={clusterId} onChange={(e) => setClusterId(e.target.value)}>
              {clusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label">Namespaces (comma-separated, empty = all)</label><input className="input" placeholder="production, staging" value={namespaces} onChange={(e) => setNs(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Min restarts to alert</label><input type="number" className="input" min={1} value={minRst} onChange={(e) => setMinRst(Number(e.target.value))} /><p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Noise filter</p></div>
            <div><label className="label">Cooldown (minutes)</label><input type="number" className="input" min={1} value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))} /><p className="text-xs text-gray-400 dark:text-slate-500 mt-1">No repeat alerts</p></div>
          </div>
          <div>
            <label className="label">Severity</label>
            <div className="flex gap-2">
              {(["info","warning","critical"] as const).map((s) => (
                <button key={s} onClick={() => setSeverity(s)} className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all capitalize ${severity === s ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Alert channels</label>
            {channels.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800 rounded-xl p-3">No channels yet. Add channels first.</p>
            ) : (
              <div className="space-y-2 bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
                {channels.map((ch) => (
                  <label key={ch.id} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={selChannels.includes(ch.id)} onChange={() => toggleCh(ch.id)} className="rounded" />
                    <span className="text-sm text-gray-700 dark:text-slate-300">{ch.name}</span>
                    <span className="badge bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 text-xs capitalize">{ch.type}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={!name || !clusterId || loading} className="btn-primary flex-1 justify-center">{loading ? "Creating..." : "Create rule"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RulesPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const me = getUser();

  const load = () => {
    setLoading(true);
    Promise.all([fetchRules(), fetchClusters(), fetchChannels()])
      .then(([r, c, ch]) => { setRules(r.rules || []); setClusters(c.clusters || []); setChannels(ch.channels || []); })
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => { if (!confirm("Delete this rule?")) return; await deleteRule(id); load(); };
  const toggle = async (id: string) => { await toggleRule(id); load(); };
  const clusterName = (id: string | null) => !id ? 'All clusters' : clusters.find((c) => c.id === id)?.name || id.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alert rules</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Define when and how to alert on pod crashes</p>
        </div>
        {me?.role === "admin" && (
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> New rule</button>
        )}
      </div>
      {showAdd && <AddModal clusters={clusters} channels={channels} onClose={() => setShowAdd(false)} onAdded={load} />}
      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="card p-5 animate-pulse bg-gray-100 dark:bg-slate-800 h-24" />)}</div>
      ) : rules.length === 0 ? (
        <div className="card py-20 text-center">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><BookOpen className="w-8 h-8 text-indigo-400" /></div>
          <p className="font-bold text-gray-800 dark:text-white mb-1">No alert rules yet</p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mb-6">Create a rule to define when Srevox sends alerts</p>
          {me?.role === "admin" && (
            <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Create first rule</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const ns = parseArr(rule.namespaces);
            const reasons = parseArr(rule.crash_reasons);
            return (
              <div key={rule.id} className={`card p-5 ${!rule.enabled ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-gray-900 dark:text-white">{rule.name}</span>
                      <span className={`badge text-xs ${severityBadge(rule.severity)}`}>{rule.severity}</span>
                      {!rule.enabled && <span className="badge bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 text-xs">paused</span>}
                    </div>
                    {rule.description && <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">{rule.description}</p>}
                    <div className="text-xs text-gray-500 dark:text-slate-400 flex flex-wrap gap-3">
                      <span>Cluster: <span className="text-gray-700 dark:text-slate-200 font-medium">{rule.cluster_name || clusterName(rule.cluster_id)}</span></span>
                      <span>Namespaces: <span className="text-gray-700 dark:text-slate-200 font-medium">{ns.length ? ns.join(", ") : "all"}</span></span>
                      <span>Min restarts: <span className="text-gray-700 dark:text-slate-200 font-medium">{rule.min_restarts}</span></span>
                      <span>Cooldown: <span className="text-gray-700 dark:text-slate-200 font-medium">{rule.cooldown_minutes}m</span></span>
                      <span>Created: <span className="text-gray-700 dark:text-slate-200 font-medium">{timeAgo(rule.created_at)}</span></span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {reasons.map((r: string) => <span key={r} className="badge bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 text-xs">{r}</span>)}
                    </div>
                  </div>
                  {["admin", "member"].includes(me?.role || "viewer") && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggle(rule.id)} className={`transition-colors ${rule.enabled ? "text-indigo-500 hover:text-indigo-700" : "text-gray-300 dark:text-slate-600 hover:text-indigo-400"}`}>
                        {rule.enabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                      </button>
                      {me?.role === "admin" && (
                        <button onClick={() => remove(rule.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
