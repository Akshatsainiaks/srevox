"use client";
import { useEffect, useState } from "react";
import { Server, Plus, Trash2, Copy, CheckCircle, RefreshCw, Wifi, WifiOff, Clock, Pencil } from "lucide-react";
import { fetchClusters, createCluster, deleteCluster, api } from "@/lib/api";
import type { Cluster } from "@/lib/utils";
import { timeAgo, copyToClipboard } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmModal";
import { getUser } from "@/lib/auth";

const CONN_INFO: Record<string, { label: string; desc: string; color: string }> = {
  agent:       { label: "Agent (on-prem)",  desc: "Tiny pod inside your cluster. Outbound only — no inbound firewall rules.", color: "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20" },
  kubeconfig:  { label: "Kubeconfig",       desc: "Upload a read-only kubeconfig. API server must be reachable from Srevox.", color: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" },
  self_hosted: { label: "Self-hosted",      desc: "Run Srevox entirely inside your own infrastructure.", color: "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-600" },
};
const CLOUD_PROVIDERS = ["aws","gcp","azure","on-prem","other"];

function AddModal({ onClose, onAdded }: { onClose:()=>void; onAdded:()=>void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("agent");
  const [provider, setProvider] = useState("other");
  const [kubeconfig, setKube] = useState("");
  const [result, setResult] = useState<Cluster|null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const { success, error } = useToast();

  const submit = async () => {
    if (!name) return;
    setLoading(true);
    try {
      const res = await createCluster({ name, connection_type: type, cloud_provider: provider, kubeconfig: kubeconfig||undefined });
      setResult(res); onAdded();
      success("Cluster added!", `${name} is now connected`);
    } catch { error("Failed to add cluster", "Check your configuration and try again"); }
    finally { setLoading(false); }
  };

  const copyId = async (text: string) => { await copyToClipboard(text); setCopiedId(true); setTimeout(()=>setCopiedId(false),2000); };
  const copyCmd = async (text: string) => { await copyToClipboard(text); setCopiedCmd(true); setTimeout(()=>setCopiedCmd(false),2000); };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1e2130] rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-[#1e2130]">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Add cluster</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Connect a Kubernetes cluster to Srevox</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 text-xl">&times;</button>
        </div>
        {result ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-100 dark:border-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300 mb-1">Cluster added!</p>
                <div className="flex items-center gap-2 flex-wrap text-sm text-green-600 dark:text-green-500">
                  <span>Cluster ID:</span>
                  <span className="font-mono bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-lg select-all text-green-800 dark:text-green-300">{result.cluster_id}</span>
                  <button onClick={() => copyId(result.cluster_id)}
                    className="p-1.5 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-all shrink-0 shadow-sm"
                    title="Copy Cluster ID"
                  >
                    {copiedId ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            {result.install_command && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Run inside your cluster:</p>
                <div className="bg-gray-900 rounded-xl p-4 flex items-start gap-3">
                  <code className="text-green-400 text-xs font-mono break-all flex-1 leading-relaxed">{result.install_command}</code>
                  <button onClick={() => copyCmd(result.install_command!)} className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors">
                    {copiedCmd ? <CheckCircle className="w-4 h-4 text-green-400"/> : <Copy className="w-4 h-4"/>}
                  </button>
                </div>
              </div>
            )}
            <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="label">Cluster name</label>
              <input className="input" placeholder="production-us-east" value={name} onChange={e=>setName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Connection type</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(CONN_INFO).map(t=>(
                  <button key={t} onClick={()=>setType(t)} className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${type===t?"border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400":"border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"}`}>
                    {CONN_INFO[t].label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2">{CONN_INFO[type]?.desc}</p>
            </div>
            <div>
              <label className="label">Cloud provider</label>
              <select className="input" value={provider} onChange={e=>setProvider(e.target.value)}>
                {CLOUD_PROVIDERS.map(p=><option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
            {type==="kubeconfig" && (
              <div>
                <label className="label">Kubeconfig (read-only)</label>
                <textarea className="input font-mono text-xs h-28 resize-none" placeholder="Paste kubeconfig YAML..." value={kubeconfig} onChange={e=>setKube(e.target.value)} />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button onClick={submit} disabled={!name||loading} className="btn-primary flex-1 justify-center">
                {loading?"Adding...":"Add cluster"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditModal({ cluster, onClose, onSaved }: { cluster: Cluster; onClose:()=>void; onSaved:()=>void }) {
  const [name, setName] = useState(cluster.name);
  const [masterAlertsEnabled, setMasterAlertsEnabled] = useState(cluster.master_alerts_enabled ?? true);
  const [workerAlertsEnabled, setWorkerAlertsEnabled] = useState(cluster.worker_alerts_enabled ?? true);
  const [nodeCpuThreshold, setNodeCpuThreshold] = useState(cluster.node_cpu_threshold ?? 85);
  const [nodeMemoryThreshold, setNodeMemoryThreshold] = useState(cluster.node_memory_threshold ?? 90);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const save = async () => {
    setLoading(true);
    try {
      await api.patch(`/api/clusters/${cluster.cluster_id}`, {
        name,
        master_alerts_enabled: masterAlertsEnabled,
        worker_alerts_enabled: workerAlertsEnabled,
        node_cpu_threshold: Number(nodeCpuThreshold),
        node_memory_threshold: Number(nodeMemoryThreshold),
      });
      success("Cluster updated", `${name} settings saved`);
      onSaved(); onClose();
    } catch { error("Failed to update cluster"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1e2130] rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white">Edit cluster</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Cluster name</label>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&save()} />
          </div>

          <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Node Status Alerts</h3>
            
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={masterAlertsEnabled}
                  onChange={(e) => setMasterAlertsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-200 dark:border-slate-700 text-indigo-600 bg-white dark:bg-slate-800 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Enable Master Node alerts</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={workerAlertsEnabled}
                  onChange={(e) => setWorkerAlertsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-200 dark:border-slate-700 text-indigo-600 bg-white dark:bg-slate-800 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Enable Worker Node alerts</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="label flex items-center justify-between text-xs mb-1.5">
                  <span>CPU Warn (%)</span>
                  <span className="font-semibold text-indigo-500">{nodeCpuThreshold}%</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={nodeCpuThreshold}
                  onChange={(e) => setNodeCpuThreshold(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                />
              </div>

              <div>
                <label className="label flex items-center justify-between text-xs mb-1.5">
                  <span>Mem Warn (%)</span>
                  <span className="font-semibold text-indigo-500">{nodeMemoryThreshold}%</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={nodeMemoryThreshold}
                  onChange={(e) => setNodeMemoryThreshold(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={save} disabled={!name||loading} className="btn-primary flex-1 justify-center">{loading?"Saving...":"Save changes"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClustersPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [editing,  setEditing]  = useState<Cluster|null>(null);
  const [copiedClusterId, setCopiedClusterId] = useState<string|null>(null);
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const me = getUser();

  const copyClusterId = async (id: string, name: string) => {
    await copyToClipboard(id);
    setCopiedClusterId(id);
    success("Copied Cluster ID", `${name} ID copied to clipboard`);
    setTimeout(() => setCopiedClusterId(null), 2000);
  };

  const load = () => {
    setLoading(true);
    fetchClusters().then(d=>setClusters(d.clusters||[])).catch(console.error).finally(()=>setLoading(false));
  };
  useEffect(()=>{load();},[]);

  const remove = async (cl: Cluster) => {
    const { confirmed } = await confirm({
      title: `Delete "${cl.name}"?`,
      message: "This will permanently remove the cluster and all its alert rules. This cannot be undone.",
      confirmLabel: "Delete cluster",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteCluster(cl.cluster_id);
      success("Cluster deleted", cl.name);
      load();
    } catch { error("Failed to delete cluster"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clusters</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Connect your K8s clusters — cloud or on-prem</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary p-2.5"><RefreshCw className="w-4 h-4"/></button>
          {me?.role === "admin" && (
            <button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add cluster</button>
          )}
        </div>
      </div>

      {showAdd && <AddModal onClose={()=>setShowAdd(false)} onAdded={load}/>}
      {editing  && <EditModal cluster={editing} onClose={()=>setEditing(null)} onSaved={load}/>}

      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_,i)=><div key={i} className="card p-5 animate-pulse bg-gray-100 dark:bg-slate-800 h-20"/>)}</div>
      ) : clusters.length===0 ? (
        <div className="card py-20 text-center">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><Server className="w-8 h-8 text-indigo-400"/></div>
          <p className="font-bold text-gray-800 dark:text-white mb-1">No clusters connected yet</p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mb-6">Connect your first Kubernetes cluster to start monitoring</p>
          {me?.role === "admin" && (
            <button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add your first cluster</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {clusters.map(cl=>{
            const status = cl.status;
            return (
              <div key={cl.cluster_id} className="card p-5 flex items-center gap-4 hover:shadow-md dark:hover:shadow-slate-900 transition-shadow">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <Server className="w-6 h-6 text-indigo-500 dark:text-indigo-400"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white">{cl.name}</span>
                    <span className={`badge text-xs ${CONN_INFO[cl.connection_type]?.color||"bg-gray-100 text-gray-600"}`}>{CONN_INFO[cl.connection_type]?.label||cl.connection_type}</span>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                    <span>Added {timeAgo(cl.created_at)}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-gray-300 dark:text-slate-600" title={cl.cluster_id}>{cl.cluster_id.slice(0,8)}...</span>
                      <button
                        onClick={() => copyClusterId(cl.cluster_id, cl.name)}
                        className="p-1 bg-white dark:bg-slate-800 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 rounded transition-all shadow-sm"
                        title="Copy full Cluster ID"
                      >
                        {copiedClusterId === cl.cluster_id ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  {cl.status === "connected" && ((cl.master_nodes_total ?? 0) > 0 || (cl.worker_nodes_total ?? 0) > 0) && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {(cl.master_nodes_total ?? 0) > 0 && (
                        <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-[11px] font-medium border border-purple-100 dark:border-purple-900/30">
                          <span className={`w-1.5 h-1.5 rounded-full ${cl.master_nodes_ready === cl.master_nodes_total ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
                          <span>Master Node: {cl.master_nodes_ready}/{cl.master_nodes_total} Ready</span>
                        </div>
                      )}
                      {(cl.worker_nodes_total ?? 0) > 0 && (
                        <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[11px] font-medium border border-blue-100 dark:border-blue-900/30">
                          <span className={`w-1.5 h-1.5 rounded-full ${cl.worker_nodes_ready === cl.worker_nodes_total ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
                          <span>Worker Node: {cl.worker_nodes_ready}/{cl.worker_nodes_total} Ready</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {status==="connected" ? (
                      <Wifi className="w-4 h-4 text-green-500"/>
                    ) : status==="error" || status==="disconnected" ? (
                      <WifiOff className={`w-4 h-4 ${status==="error" ? "text-red-500" : "text-gray-400"}`}/>
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500"/>
                    )}
                    <span className={`text-xs font-medium capitalize ${
                      status==="connected" ? "text-green-600 dark:text-green-400" :
                      status==="error" ? "text-red-600 dark:text-red-400" :
                      status==="disconnected" ? "text-gray-500 dark:text-slate-400" :
                      "text-amber-600 dark:text-amber-400"
                    }`}>{status}</span>
                  </div>
                  {me?.role === "admin" && (
                    <>
                      <button onClick={()=>setEditing(cl)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 dark:text-slate-600 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"><Pencil className="w-4 h-4"/></button>
                      <button onClick={()=>remove(cl)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4"/></button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 flex gap-3">
        <span className="text-lg shrink-0">🔒</span>
        <div>
          <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">Read-only access only</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Srevox only watches pod events. It never modifies your cluster. The agent uses a read-only ClusterRole scoped to pods and events only.</p>
        </div>
      </div>
    </div>
  );
}