"use client";
import { useEffect, useState } from "react";
import { Users, Plus, Trash2, Crown, Shield, Eye, Mail, Copy, RefreshCw, CheckCircle, Pencil, Key } from "lucide-react";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmModal";

interface Member { id: string; email: string; full_name?: string; role: string; is_active: boolean; created_at: string; last_login_at?: string; }

const ROLE_ICONS: Record<string,React.ElementType> = { admin: Crown, member: Shield, viewer: Eye };
const ROLE_COLORS: Record<string,string> = {
  admin:  "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20",
  member: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
  viewer: "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600",
};

function generatePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function CreateUserModal({ onClose, onCreated }: { onClose:()=>void; onCreated:()=>void }) {
  const [form, setForm] = useState({ full_name:"", email:"", role:"member" });
  const [generatedPass, setGeneratedPass] = useState(generatePassword());
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sentEmail, setSentEmail] = useState(false);
  const [successData, setSuccessData] = useState<{email?: string, previewUrl?: string}>({});
  const { success, error } = useToast();
  const set = (k:string,v:string) => setForm(p=>({...p,[k]:v}));

  const copyPass = () => { navigator.clipboard.writeText(generatedPass); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  const regen = () => setGeneratedPass(generatePassword());
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);

  const submit = async (sendEmail: boolean) => {
    if (!isValidEmail) return;
    setLoading(true);
    setSentEmail(sendEmail);
    try {
      const res = await api.post("/api/users/create", { ...form, password: generatedPass, send_welcome_email: sendEmail });
      setSuccessData({ email: form.email, previewUrl: res.data.preview_url });
      success("User created!", sendEmail ? `Welcome email sent to ${form.email}` : undefined);
      onCreated();
      setDone(true);
    } catch (err: any) {
      error("Failed to create user", err?.response?.data?.detail || "Please try again");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1e2130] rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Create team member</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">A welcome email with credentials will be sent</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {done ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-100 dark:border-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0"/>
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300">User created successfully!</p>
                {sentEmail && <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">Welcome email sent to {successData.email}</p>}
                {successData.previewUrl && (
                  <a href={successData.previewUrl} target="_blank" className="text-xs text-indigo-600 dark:text-indigo-400 underline mt-2 block bg-white dark:bg-[#151823] p-2 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                    Open Ethereal Email Preview ↗
                  </a>
                )}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Generated password (shared in email):</p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm text-gray-800 dark:text-slate-200 flex-1">{generatedPass}</code>
                <button onClick={copyPass} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                  {copied?<CheckCircle className="w-4 h-4 text-green-500"/>:<Copy className="w-4 h-4"/>}
                </button>
              </div>
            </div>
            <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" placeholder="Rahul Sharma" value={form.full_name} onChange={e=>set("full_name",e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="rahul@company.com" value={form.email} onChange={e=>set("email",e.target.value)} />
              {form.email && !isValidEmail && <p className="text-xs text-red-500 mt-1">Please enter a valid email address.</p>}
            </div>
            <div>
              <label className="label">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {(["admin","member","viewer"] as const).map(r=>{
                  const Icon = ROLE_ICONS[r];
                  return (
                    <button type="button" key={r} onClick={()=>set("role",r)} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all capitalize ${form.role===r?"border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400":"border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>
                      <Icon className="w-4 h-4 shrink-0"/>{r}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="label">Generated password</label>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5">
                <code className="font-mono text-sm text-gray-800 dark:text-slate-200 flex-1 truncate">{generatedPass}</code>
                <button onClick={regen} title="Regenerate" className="text-gray-400 hover:text-indigo-500 transition-colors shrink-0"><RefreshCw className="w-3.5 h-3.5"/></button>
                <button onClick={copyPass} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors shrink-0">
                  {copied?<CheckCircle className="w-4 h-4 text-green-500"/>:<Copy className="w-4 h-4"/>}
                </button>
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">This password will be emailed to the user. They should change it on first login.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button onClick={() => submit(false)} disabled={!isValidEmail||loading} className="btn-secondary flex-1 justify-center">
                {loading?"Creating...":"Create user"}
              </button>
              <button onClick={() => submit(true)} disabled={!isValidEmail||loading} className="btn-primary flex-1 justify-center gap-2">
                <Mail className="w-4 h-4"/>
                {loading?"Sending...":"Create & send email"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditRoleModal({ member, onClose, onSaved }: { member:Member; onClose:()=>void; onSaved:()=>void }) {
  const [role, setRole] = useState(member.role);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const save = async () => {
    setLoading(true);
    try {
      await api.patch(`/api/users/${member.id}/role`, { role });
      success("Role updated", `${member.email} is now ${role}`);
      onSaved();
      onClose();
      onSaved(); onClose();
    } catch { error("Failed to update role"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1e2130] rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-sm">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white">Edit role</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-400">Change role for <span className="font-semibold text-gray-800 dark:text-slate-200">{member.email}</span></p>
          <div className="grid grid-cols-3 gap-2">
            {(["admin","member","viewer"] as const).map(r=>{
              const Icon = ROLE_ICONS[r];
              return (
                <button type="button" key={r} onClick={()=>setRole(r)} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium capitalize transition-all ${role===r?"border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400":"border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400"}`}>
                  <Icon className="w-3.5 h-3.5 shrink-0"/>{r}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={save} disabled={loading||role===member.role} className="btn-primary flex-1 justify-center">{loading?"Saving...":"Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Member|null>(null);
  const me = getUser();
  const { success, error } = useToast();
  const { confirm } = useConfirm();

  const load = () => {
    setLoading(true);
    api.get("/api/users").then(r=>setMembers(r.data.users||[])).catch(console.error).finally(()=>setLoading(false));
  };
  useEffect(()=>{load();},[]);

  const remove = async (m: Member) => {
    if (m.id === me?.id) { error("Cannot remove yourself"); return; }
    const { confirmed } = await confirm({
      title: `Remove ${m.full_name||m.email}?`,
      message: "They will lose access to the dashboard immediately. This cannot be undone.",
      confirmLabel: "Remove member",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/users/${m.id}`);
      success("Member removed", m.email);
      load();
    } catch { error("Failed to remove member"); }
  };

  const resetPassword = async (m: Member) => {
    const { confirmed } = await confirm({
      title: `Reset password for ${m.email}?`,
      message: "A new temporary password will be generated and sent to their email.",
      confirmLabel: "Reset & send email",
      variant: "warning",
    });
    if (!confirmed) return;
    try {
      const res = await api.post(`/api/users/${m.id}/reset-password`);
      if (res.data.preview_url) {
        success("Password reset", `New password: ${res.data.new_password}. Email Preview: ${res.data.preview_url}`);
      } else {
        success("Password reset", `New password: ${res.data.new_password}`);
      }
    } catch { error("Failed to reset password"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Manage your organization members and roles</p>
        </div>
        {me?.role === "admin" && (
          <button onClick={()=>setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4"/>Create member</button>
        )}
      </div>

      {showCreate && <CreateUserModal onClose={()=>setShowCreate(false)} onCreated={load}/>}
      {editing && <EditRoleModal member={editing} onClose={()=>setEditing(null)} onSaved={load}/>}

      {/* Role permissions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { role:"Admin",  Icon:Crown,  color:"text-purple-600 dark:text-purple-400", bg:"bg-purple-50 dark:bg-purple-500/10",  perms:["Full access","Manage users","Add/remove clusters","Configure channels"] },
          { role:"Member", Icon:Shield, color:"text-blue-600 dark:text-blue-400",     bg:"bg-blue-50 dark:bg-blue-500/10",      perms:["View everything","Acknowledge incidents","Resolve incidents","Run AI diagnosis"] },
          { role:"Viewer", Icon:Eye,    color:"text-gray-600 dark:text-slate-400",    bg:"bg-gray-50 dark:bg-slate-800",       perms:["View dashboard","View incidents","View clusters","Read-only access"] },
        ].map(({role,Icon,color,bg,perms})=>(
          <div key={role} className="card p-4">
            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl ${bg} mb-3`}>
              <Icon className={`w-4 h-4 ${color}`}/><span className={`text-sm font-bold ${color}`}>{role}</span>
            </div>
            <ul className="space-y-1">
              {perms.map(p=><li key={p} className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><span className="text-indigo-400">·</span>{p}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* Members list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500"/>
          <span className="font-semibold text-gray-900 dark:text-white">Members</span>
          <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">({members.length})</span>
        </div>
        {loading ? (
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {[...Array(3)].map((_,i)=><div key={i} className="px-5 py-4 animate-pulse bg-gray-100 dark:bg-slate-800 h-14"/>)}
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {members.map(m=>{
              const Icon = ROLE_ICONS[m.role]||Shield;
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                    {(m.full_name||m.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800 dark:text-slate-200 text-sm">{m.full_name||m.email}</span>
                      {m.id===me?.id&&<span className="text-xs bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-medium">You</span>}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{m.email}</span>
                      {m.last_login_at&&<span>· Last login {timeAgo(m.last_login_at)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge text-xs ${ROLE_COLORS[m.role]}`}><Icon className="w-3 h-3 mr-1"/>{m.role}</span>
                    {me?.role==="admin"&&m.id!==me?.id&&(
                      <>
                        <button onClick={()=>setEditing(m)} title="Edit role" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 dark:text-slate-600 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"><Pencil className="w-3.5 h-3.5"/></button>
                        <button onClick={()=>resetPassword(m)} title="Reset password" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 dark:text-slate-600 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"><Key className="w-3.5 h-3.5"/></button>
                        <button onClick={()=>remove(m)} title="Remove member" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}