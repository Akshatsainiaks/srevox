"use client";
import { useState, useEffect } from "react";
import { User, Key, Server, Bell, CheckCircle, Loader2, Trash2, Plus, Palette, Sun, Moon, Monitor } from "lucide-react";
import { apiUpdateMe, apiGetMe } from "@/lib/api";
import { getUser, setUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { useTheme } from "@/components/ThemeProvider";
import type { Theme } from "@/components/ThemeProvider";

type ChannelType = "email" | "teams" | "whatsapp" | "webhook";

const CHANNEL_LABELS: Record<ChannelType, string> = {
  email: "Email (SMTP / Gmail)", teams: "Microsoft Teams",
  whatsapp: "WhatsApp", webhook: "Webhook / Slack",
};

const CHANNEL_FIELDS: Record<ChannelType, Array<{ key: string; label: string; placeholder: string; secret?: boolean }>> = {
  email: [
    { key: "smtp_host", label: "SMTP host",      placeholder: "smtp.gmail.com" },
    { key: "smtp_port", label: "SMTP port",      placeholder: "587" },
    { key: "smtp_user", label: "SMTP user",      placeholder: "you@gmail.com" },
    { key: "smtp_pass", label: "App password",   placeholder: "••••••••", secret: true },
    { key: "to",        label: "Send alerts to", placeholder: "you@gmail.com" },
  ],
  teams:    [{ key: "webhook_url", label: "Teams webhook URL", placeholder: "https://company.webhook.office.com/..." }],
  whatsapp: [
    { key: "provider",    label: "Provider",    placeholder: "twilio" },
    { key: "account_sid",label: "Account SID", placeholder: "ACxxxxxxxx" },
    { key: "auth_token", label: "Auth token",  placeholder: "••••••••", secret: true },
    { key: "from",       label: "From number", placeholder: "+14155238886" },
    { key: "to",         label: "Your number", placeholder: "+919876543210" },
  ],
  webhook: [
    { key: "url",    label: "Webhook URL",           placeholder: "https://hooks.slack.com/..." },
    { key: "secret", label: "HMAC secret (optional)", placeholder: "my-secret" },
  ],
};

const THEMES: { value: Theme; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "light",  label: "Light",  icon: Sun,     desc: "Clean white interface" },
  { value: "dark",   label: "Dark",   icon: Moon,    desc: "Easy on the eyes at night" },
  { value: "system", label: "System", icon: Monitor, desc: "Follows your OS setting" },
];

export default function SettingsPage() {
  const localUser = getUser();
  const { theme, setTheme } = useTheme();

  const [fullName,   setFullName]   = useState(localUser?.full_name || "");
  const [orgName,    setOrgName]    = useState("");
  const [orgPlan,    setOrgPlan]    = useState("");
  const [curPass,    setCurPass]    = useState("");
  const [newPass,    setNewPass]    = useState("");
  const [chType,     setChType]     = useState<ChannelType>("email");
  const [chConfig,   setChConfig]   = useState<Record<string, string>>({});
  const [existingCh, setExistingCh] = useState<{ id: string; type: string } | null>(null);
  const [showChForm, setShowChForm] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState("");
  const [error,      setError]      = useState("");

  useEffect(() => {
    apiGetMe().then((data) => {
      setFullName(data.full_name || "");
      setOrgName(data.org?.name || "");
      setOrgPlan(data.org?.plan || "free");
    }).catch(console.error);

    api.get("/api/auth/me/personal-channel").then((res) => {
      setExistingCh(res.data.channel);
    }).catch(console.error);
  }, []);

  const setChCfg = (k: string, v: string) => setChConfig((p) => ({ ...p, [k]: v }));

  const saveProfile = async () => {
    setSaving(true); setError(""); setSaved("");
    try {
      await apiUpdateMe({ full_name: fullName });
      if (localUser) setUser({ ...localUser, full_name: fullName });
      setSaved("profile"); setTimeout(() => setSaved(""), 3000);
    } catch { setError("Failed to save profile"); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (!curPass || !newPass) return;
    if (newPass.length < 8) { setError("New password must be at least 8 characters"); return; }
    setSaving(true); setError(""); setSaved("");
    try {
      await apiUpdateMe({ current_password: curPass, new_password: newPass });
      setCurPass(""); setNewPass("");
      setSaved("password"); setTimeout(() => setSaved(""), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update password");
    } finally { setSaving(false); }
  };

  const savePersonalChannel = async () => {
    setSaving(true); setError(""); setSaved("");
    try {
      const res = await apiUpdateMe({
        personal_channel: {
          type: chType,
          name: `${localUser?.full_name || localUser?.email}'s personal channel`,
          config: chConfig,
        },
      });
      setExistingCh({ id: res.personal_channel_id, type: chType });
      setShowChForm(false); setChConfig({});
      setSaved("channel"); setTimeout(() => setSaved(""), 3000);
    } catch { setError("Failed to save personal channel"); }
    finally { setSaving(false); }
  };

  const removePersonalChannel = async () => {
    if (!confirm("Remove your personal alert channel?")) return;
    await apiUpdateMe({ personal_channel: null });
    setExistingCh(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Manage your account and personal preferences</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Organization */}
      {orgName && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-indigo-500" />
            <h2 className="font-bold text-gray-800 dark:text-white">Organization</h2>
            <span className="badge bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20 text-xs capitalize ml-auto">{orgPlan} plan</span>
          </div>
          <div className="text-sm text-gray-700 dark:text-slate-300 font-medium">{orgName}</div>
        </div>
      )}

      {/* Appearance */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-4 h-4 text-indigo-500" />
          <h2 className="font-bold text-gray-800 dark:text-white">Appearance</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400">Choose how Srevox looks for you.</p>

        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const isActive = theme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  isActive
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                    : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                }`}
              >
                {/* Preview */}
                <div className={`w-full h-16 rounded-xl overflow-hidden border ${
                  t.value === "dark"   ? "bg-[#0d0f17] border-slate-700"
                  : t.value === "light" ? "bg-white border-gray-200"
                  : "border-gray-200"
                }`}
                  style={t.value === "system" ? { background: "linear-gradient(135deg, #ffffff 50%, #0d0f17 50%)" } : {}}
                >
                  <div className={`h-4 w-full ${t.value === "dark" ? "bg-[#151823]" : t.value === "system" ? "transparent" : "bg-gray-50"}`} />
                  <div className="p-2 space-y-1.5">
                    <div className={`h-1.5 rounded-full w-3/4 ${t.value === "dark" ? "bg-slate-700" : "bg-gray-200"}`} />
                    <div className={`h-1.5 rounded-full w-1/2 ${t.value === "dark" ? "bg-slate-800" : "bg-gray-100"}`} />
                  </div>
                </div>

                <div className="text-center">
                  <div className={`text-sm font-semibold flex items-center gap-1.5 justify-center ${isActive ? "text-indigo-700 dark:text-indigo-400" : "text-gray-700 dark:text-slate-300"}`}>
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t.desc}</div>
                </div>

                {isActive && (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Profile */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-indigo-500" />
          <h2 className="font-bold text-gray-800 dark:text-white">Profile</h2>
        </div>
        <div>
          <label className="label">Full name</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <label className="label">Email address</label>
          <input className="input opacity-60 cursor-not-allowed" value={localUser?.email || ""} disabled />
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Email cannot be changed</p>
        </div>
        <div>
          <label className="label">Role</label>
          <input className="input opacity-60 cursor-not-allowed capitalize" value={localUser?.role || ""} disabled />
        </div>
        <button onClick={saveProfile} disabled={saving} className="btn-primary">
          {saved === "profile" ? <><CheckCircle className="w-4 h-4" /> Saved!</>
            : saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            : "Save profile"}
        </button>
      </div>

      {/* Password */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-4 h-4 text-indigo-500" />
          <h2 className="font-bold text-gray-800 dark:text-white">Change password</h2>
        </div>
        <div>
          <label className="label">Current password</label>
          <input type="password" className="input" value={curPass} onChange={(e) => setCurPass(e.target.value)} placeholder="••••••••" />
        </div>
        <div>
          <label className="label">New password</label>
          <input type="password" className="input" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Min. 8 characters" />
        </div>
        <button onClick={savePassword} disabled={!curPass || !newPass || saving} className="btn-primary">
          {saved === "password" ? <><CheckCircle className="w-4 h-4" /> Updated!</> : "Update password"}
        </button>
      </div>

      {/* Personal alert channel */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-500" />
            <h2 className="font-bold text-gray-800 dark:text-white">Personal alert channel</h2>
          </div>
          {saved === "channel" && <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Saved!</span>}
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400">When assigned as a service owner, crash alerts come directly here.</p>

        {existingCh && !showChForm ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-100 dark:border-green-500/20">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-green-800 dark:text-green-300 text-sm capitalize">{existingCh.type} channel configured</div>
              <div className="text-xs text-green-600 dark:text-green-500 mt-0.5">Personal crash alerts come here</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowChForm(true)} className="btn-secondary text-xs py-1.5 px-3">Change</button>
              <button onClick={removePersonalChannel} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : !showChForm ? (
          <button onClick={() => setShowChForm(true)} className="btn-secondary w-full justify-center">
            <Plus className="w-4 h-4" /> Set up personal channel
          </button>
        ) : (
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
            <div>
              <label className="label">Channel type</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(CHANNEL_LABELS) as ChannelType[]).map((t) => (
                  <button key={t} onClick={() => { setChType(t); setChConfig({}); }}
                    className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${chType === t
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                      : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"}`}>
                    {CHANNEL_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            {CHANNEL_FIELDS[chType].map((f) => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input type={f.secret ? "password" : "text"} className="input"
                  placeholder={f.placeholder} value={chConfig[f.key] || ""}
                  onChange={(e) => setChCfg(f.key, e.target.value)} />
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={() => { setShowChForm(false); setChConfig({}); }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={savePersonalChannel} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save channel"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Platform info */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-indigo-500" />
          <h2 className="font-bold text-gray-800 dark:text-white">Platform info</h2>
        </div>
        <dl className="space-y-3 text-sm">
          {[["Platform","Srevox v1.0.0"],["API","Node.js + Fastify"],["AI service","Python + FastAPI"],["K8s watcher","Go"],["Alert worker","Node.js"],["Database","PostgreSQL 16"],["Cache/Queue","Redis 7"]].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-gray-50 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
              <dt className="text-gray-500 dark:text-slate-400">{k}</dt>
              <dd className="font-medium text-gray-800 dark:text-slate-200">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}