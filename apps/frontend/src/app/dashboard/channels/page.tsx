"use client";
import { useEffect, useState } from "react";
import { Bell, Plus, Trash2, Mail, MessageSquare, Webhook, Users, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { fetchChannels, createChannel, deleteChannel, toggleChannel, testChannel } from "@/lib/api";
import type { Channel } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { getUser } from "@/lib/auth";

type ChannelType = "email" | "teams" | "whatsapp" | "webhook";
const CHANNEL_ICONS: Record<ChannelType, React.ElementType> = { email: Mail, teams: Users, whatsapp: MessageSquare, webhook: Webhook };
const CHANNEL_COLORS: Record<ChannelType, string> = {
  email: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
  teams: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400",
  whatsapp: "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400",
  webhook: "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
};
const CHANNEL_LABELS: Record<ChannelType, string> = { email: "Email (SMTP)", teams: "Microsoft Teams", whatsapp: "WhatsApp", webhook: "Webhook / Slack" };
const FIELDS: Record<ChannelType, Array<{ key: string; label: string; placeholder: string; secret?: boolean; hint?: string }>> = {
  email: [
    { key: "smtp_host", label: "SMTP host", placeholder: "smtp.gmail.com" },
    { key: "smtp_port", label: "SMTP port", placeholder: "587" },
    { key: "smtp_user", label: "SMTP username", placeholder: "you@gmail.com" },
    { key: "smtp_pass", label: "App password", placeholder: "••••••••", secret: true, hint: "Use Gmail App Password" },
    { key: "from", label: "From address", placeholder: "alerts@company.com" },
    { key: "to", label: "To (comma-sep)", placeholder: "eng@company.com" },
  ],
  teams: [{ key: "webhook_url", label: "Incoming Webhook URL", placeholder: "https://company.webhook.office.com/..." }],
  whatsapp: [
    { key: "provider", label: "Provider", placeholder: "twilio" },
    { key: "account_sid", label: "Account SID", placeholder: "ACxxxxxxxx" },
    { key: "auth_token", label: "Auth token", placeholder: "••••••••", secret: true },
    { key: "from", label: "From number", placeholder: "+14155238886" },
    { key: "to", label: "To (comma-sep)", placeholder: "+919876543210" },
  ],
  webhook: [
    { key: "url", label: "Webhook URL", placeholder: "https://hooks.slack.com/services/..." },
    { key: "secret", label: "Secret (optional)", placeholder: "my-webhook-secret", secret: true },
  ],
};

function AddModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ChannelType>("email");
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setCfg((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!name) return;
    setLoading(true);
    try { await createChannel({ name, type, config: cfg }); onAdded(); onClose(); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1e2130] rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-[#1e2130]">
          <h2 className="font-bold text-gray-900 dark:text-white">Add alert channel</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 text-xl">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Channel name</label>
            <input className="input" placeholder="e.g. Engineering on-call" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Channel type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CHANNEL_LABELS) as ChannelType[]).map((t) => {
                const Icon = CHANNEL_ICONS[t];
                return (
                  <button key={t} onClick={() => { setType(t); setCfg({}); }}
                    className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${type === t ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>
                    <Icon className="w-4 h-4" />{CHANNEL_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>
          {name && FIELDS[type].map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input type={f.secret ? "password" : "text"} className="input" placeholder={f.placeholder}
                value={cfg[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />
              {f.hint && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{f.hint}</p>}
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={!name || loading} className="btn-primary flex-1 justify-center">
              {loading ? "Saving..." : "Save channel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, "ok" | "fail">>({});
  const me = getUser();

  const load = () => { setLoading(true); fetchChannels().then((d) => setChannels(d.channels || [])).catch(console.error).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => { if (!confirm("Delete this channel?")) return; await deleteChannel(id); load(); };
  const toggle = async (id: string) => { await toggleChannel(id); load(); };
  const test = async (id: string) => {
    setTesting(id);
    try { await testChannel(id); setTestResult((p) => ({ ...p, [id]: "ok" })); }
    catch { setTestResult((p) => ({ ...p, [id]: "fail" })); }
    finally { setTesting(null); setTimeout(() => setTestResult((p) => { const n = { ...p }; delete n[id]; return n; }), 5000); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alert channels</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Configure where crash alerts are delivered</p>
        </div>
        {me?.role === "admin" && (
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add channel</button>
        )}
      </div>
      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdded={load} />}
      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="card p-5 animate-pulse bg-gray-100 dark:bg-slate-800 h-20" />)}</div>
      ) : channels.length === 0 ? (
        <div className="card py-20 text-center">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><Bell className="w-8 h-8 text-indigo-400" /></div>
          <p className="font-bold text-gray-800 dark:text-white mb-1">No channels configured yet</p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mb-6">Add Email, Teams, WhatsApp or Webhook to start receiving alerts</p>
          {me?.role === "admin" && (
            <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add your first channel</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map((ch) => {
            const Icon = CHANNEL_ICONS[ch.type as ChannelType] || Bell;
            const colorClass = CHANNEL_COLORS[ch.type as ChannelType] || "bg-gray-100 text-gray-600";
            const testRes = testResult[ch.channel_id];
            return (
              <div key={ch.channel_id} className="card p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}><Icon className="w-6 h-6" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white">{ch.name}</span>
                    <span className="badge bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 text-xs capitalize">{CHANNEL_LABELS[ch.type as ChannelType] || ch.type}</span>
                    {!ch.enabled && <span className="badge bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 text-xs">paused</span>}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 flex gap-3 flex-wrap">
                    <span>Added {timeAgo(ch.created_at)}</span>
                    {ch.last_success_at && <span className="text-green-600 dark:text-green-400">✓ Last sent {timeAgo(ch.last_success_at)}</span>}
                    {ch.last_error && <span className="text-red-500 dark:text-red-400 truncate max-w-xs">⚠ {ch.last_error}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {["member", "admin"].includes(me?.role || "") && (
                    <>
                      <button onClick={() => test(ch.channel_id)} disabled={testing === ch.channel_id} className="btn-secondary text-xs py-1.5 px-3">
                        {testing === ch.channel_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : testRes === "ok" ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : testRes === "fail" ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> : "Test"}
                      </button>
                      <button onClick={() => toggle(ch.channel_id)} className={`relative w-10 rounded-full transition-colors ${ch.enabled ? "bg-indigo-600" : "bg-gray-200 dark:bg-slate-700"}`} style={{ height: "22px" }}>
                        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow transition-transform" style={{ backgroundColor: "#ffffff", transform: ch.enabled ? "translateX(20px)" : "translateX(0px)" }} />
                      </button>
                    </>
                  )}
                  {me?.role === "admin" && (
                    <button onClick={() => remove(ch.channel_id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
