"use client";
import { useEffect, useState } from "react";
import { Users, Plus, Trash2, Loader2, Info } from "lucide-react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { getUser } from "@/lib/auth";

interface ServiceOwner {
  service_owner_id: string; cluster_id: string; cluster_name: string;
  namespace?: string; pod_prefix?: string;
  user_id: string; owner_name: string; owner_email: string;
  channel_ids: string[];
  created_at: string;
}
interface User    { user_id: string; email: string; full_name: string; role: string; }
interface Cluster { cluster_id: string; name: string; }
interface Channel { channel_id: string; name: string; type: string; }

function AddModal({
  clusters, users, channels, onClose, onAdded,
}: {
  clusters: Cluster[]; users: User[]; channels: Channel[];
  onClose: () => void; onAdded: () => void;
}) {
  const [clusterId,    setClusterId]    = useState(clusters[0]?.cluster_id || "");
  const [namespace,    setNamespace]    = useState("");
  const [podPrefix,    setPodPrefix]    = useState("");
  const [ownerUserId,  setOwnerUserId]  = useState(users[0]?.user_id || "");
  const [selChannels,  setSelChannels]  = useState<string[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  const toggleCh = (id: string) =>
    setSelChannels((p) => p.includes(id) ? p.filter((c) => c !== id) : [...p, id]);

  const submit = async () => {
    if (!clusterId || !ownerUserId) return;
    setLoading(true); setError("");
    try {
      await api.post("/api/service-owners", {
        cluster_id: clusterId,
        namespace:  namespace  || undefined,
        pod_prefix: podPrefix  || undefined,
        user_id: ownerUserId,
        channel_ids: selChannels,
      });
      onAdded(); onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-gray-900">Assign service owner</h2>
            <p className="text-xs text-gray-500 mt-0.5">Route alerts for a service to a specific user</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-xl">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info box */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex gap-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-700 leading-relaxed">
              When a pod matching this rule crashes, the alert goes to the assigned owner's personal channel
              AND the org admins — in addition to the regular alert rule channels.
            </p>
          </div>

          <div>
            <label className="label">Cluster</label>
            <select className="input" value={clusterId} onChange={(e) => setClusterId(e.target.value)}>
              {clusters.map((c) => <option key={c.cluster_id} value={c.cluster_id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Namespace <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input" placeholder="production" value={namespace} onChange={(e) => setNamespace(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Empty = all namespaces</p>
            </div>
            <div>
              <label className="label">Pod prefix <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input" placeholder="auth-java" value={podPrefix} onChange={(e) => setPodPrefix(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">e.g. auth-java matches auth-java-xxx</p>
            </div>
          </div>

          <div>
            <label className="label">Owner (who to alert)</label>
            <select className="input" value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name || u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {channels.length > 0 && (
            <div>
              <label className="label">Additional channels for this service</label>
              <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                {channels.map((ch) => (
                  <label key={ch.channel_id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selChannels.includes(ch.channel_id)}
                      onChange={() => toggleCh(ch.channel_id)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">{ch.name}</span>
                    <span className="badge bg-gray-100 text-gray-500 border-gray-200 text-xs capitalize">{ch.type}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">These are sent in addition to the owner's personal channel.</p>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={!clusterId || !ownerUserId || loading} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Assign owner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const [owners,   setOwners]   = useState<ServiceOwner[]>([]);
  const [users,    setUsers]    = useState<User[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const me = getUser();

  const load = async () => {
    setLoading(true);
    try {
      const [so, c, ch] = await Promise.all([
        api.get("/api/service-owners"),
        api.get("/api/clusters"),
        api.get("/api/channels"),
      ]);
      setOwners(so.data.service_owners   || []);
      setClusters(c.data.clusters        || []);
      setChannels(ch.data.channels       || []);

      if (me?.role === "admin") {
        api.get("/api/users").then(u => setUsers(u.data.users || [])).catch(console.error);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Remove this service owner assignment?")) return;
    await api.delete(`/api/service-owners/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Service owners</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Route crash alerts to specific team members based on service/namespace
          </p>
        </div>
        {me?.role === "admin" && (
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Assign owner
          </button>
        )}
      </div>

      {showAdd && (
        <AddModal
          clusters={clusters} users={users} channels={channels}
          onClose={() => setShowAdd(false)} onAdded={load}
        />
      )}

      {/* How it works */}
      <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-5">
        <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-3 text-sm">How service routing works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-indigo-700 dark:text-indigo-400">
          {[
            { step: "1", title: "Pod crashes",        desc: "auth-java-7d9f pod crashes in production namespace" },
            { step: "2", title: "Owner matched",      desc: "Srevox finds Rahul owns pod_prefix: auth-java in production" },
            { step: "3", title: "Routed alert sent",  desc: "Alert goes to Rahul's personal channel + org admins + rule channels" },
          ].map((s) => (
            <div key={s.step} className="flex gap-2">
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{s.step}</div>
              <div>
                <div className="font-semibold">{s.title}</div>
                <div className="opacity-75 mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Assignments ({owners.length})</h2>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="px-5 py-4 animate-pulse bg-gray-100 dark:bg-slate-800 h-16" />
            ))}
          </div>
        ) : owners.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="font-medium text-gray-500 dark:text-slate-400">No service owners assigned yet</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Assign owners to route alerts to specific team members</p>
            {me?.role === "admin" && (
              <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">
                <Plus className="w-4 h-4" /> Assign first owner
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {owners.map((owner) => (
              <div key={owner.service_owner_id} className="px-5 py-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                  {(owner.owner_name || owner.owner_email)?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {owner.owner_name || owner.owner_email}
                    </span>
                    <span className="text-gray-400 dark:text-slate-500 text-xs">owns</span>
                    <span className="badge bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20 text-xs">
                      {owner.cluster_name}
                    </span>
                    {owner.namespace && (
                      <span className="badge bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20 text-xs">
                        ns: {owner.namespace}
                      </span>
                    )}
                    {owner.pod_prefix && (
                      <span className="badge bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-100 dark:border-green-500/20 text-xs">
                        prefix: {owner.pod_prefix}*
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 flex gap-3">
                    <span>{owner.owner_email}</span>
                    <span>·</span>
                    <span>Assigned {timeAgo(owner.created_at)}</span>
                    {owner.channel_ids.length > 0 && (
                      <><span>·</span><span>{owner.channel_ids.length} extra channel{owner.channel_ids.length !== 1 ? "s" : ""}</span></>
                    )}
                  </div>
                </div>
                {me?.role === "admin" && (
                  <button
                    onClick={() => remove(owner.service_owner_id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}