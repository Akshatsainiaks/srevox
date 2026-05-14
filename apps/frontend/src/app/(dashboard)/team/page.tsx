"use client";
import { useEffect, useState } from "react";
import {
  Users, Plus, Trash2, Shield, Crown, Eye,
  Mail, CheckCircle, Clock, Copy, Check, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";

interface TeamUser {
  id: string; email: string; full_name: string;
  role: string; is_active: boolean;
  created_at: string; last_login_at?: string;
}

interface Invitation {
  id: string; email: string; role: string;
  accepted: boolean; expires_at: string;
  created_at: string; invited_by_name?: string;
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  admin: Crown, member: Shield, viewer: Eye,
};
const ROLE_COLORS: Record<string, string> = {
  admin:  "bg-purple-50 text-purple-700 border-purple-200",
  member: "bg-blue-50 text-blue-700 border-blue-200",
  viewer: "bg-gray-100 text-gray-600 border-gray-200",
};

function InviteModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [email,   setEmail]   = useState("");
  const [role,    setRole]    = useState("member");
  const [result,  setResult]  = useState<{ invite_url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [copied,  setCopied]  = useState(false);

  const submit = async () => {
    if (!email) return;
    setLoading(true); setError("");
    try {
      const res = await api.post("/api/users/invite", { email, role });
      setResult(res.data);
      onAdded();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create invitation");
    } finally { setLoading(false); }
  };

  const copy = () => {
    if (result?.invite_url) {
      navigator.clipboard.writeText(result.invite_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Invite team member</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-xl">&times;</button>
        </div>

        {result ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">Invitation created!</p>
                <p className="text-sm text-green-600">Share this link with {email}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Invite link:</p>
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 border border-gray-200">
                <code className="text-xs text-gray-600 flex-1 break-all">{result.invite_url}</code>
                <button onClick={copy} className="shrink-0 text-gray-500 hover:text-indigo-600 transition-colors">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Link expires in 7 days</p>
            </div>
            <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="colleague@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Role</label>
              <div className="space-y-2">
                {[
                  { value: "admin",  label: "Admin",  desc: "Full access — manage clusters, channels, users" },
                  { value: "member", label: "Member", desc: "Can view and acknowledge/resolve incidents" },
                  { value: "viewer", label: "Viewer", desc: "Read-only access to incidents and dashboard" },
                ].map((r) => (
                  <label key={r.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${role === r.value ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:bg-gray-50"}`}>
                    <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-800 text-sm">{r.label}</div>
                      <div className="text-xs text-gray-500">{r.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-sm text-red-600">{error}</div>}
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button onClick={submit} disabled={!email || loading} className="btn-primary flex-1 justify-center">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send invite
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [users,       setUsers]       = useState<TeamUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showInvite,  setShowInvite]  = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const currentUser = getUser();

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, invRes] = await Promise.all([
        api.get("/api/users"),
        api.get("/api/users/invitations"),
      ]);
      setUsers(usersRes.data.users || []);
      setInvitations(invRes.data.invitations || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    try {
      await api.patch(`/api/users/${userId}/role`, { role: newRole });
      load();
    } catch (e) { console.error(e); }
    finally { setChangingRole(null); }
  };

  const removeUser = async (userId: string, email: string) => {
    if (!confirm(`Remove ${email} from your organization?`)) return;
    await api.delete(`/api/users/${userId}`);
    load();
  };

  const cancelInvite = async (id: string) => {
    await api.delete(`/api/users/invitations/${id}`);
    load();
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your organization members and roles</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowInvite(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Invite member
          </button>
        )}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onAdded={load} />}

      {/* Role legend */}
      <div className="card p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Role permissions</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { role: "admin",  icon: Crown,  label: "Admin",  perms: ["Full access", "Manage users", "Add/remove clusters", "Configure channels"] },
            { role: "member", icon: Shield, label: "Member", perms: ["View everything", "Acknowledge incidents", "Resolve incidents", "Run AI diagnosis"] },
            { role: "viewer", icon: Eye,    label: "Viewer", perms: ["View dashboard", "View incidents", "View clusters", "Read-only access"] },
          ].map(({ role, icon: Icon, label, perms }) => (
            <div key={role} className={`rounded-xl p-3 border ${ROLE_COLORS[role]}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" />
                <span className="font-semibold text-sm">{label}</span>
              </div>
              <ul className="space-y-1">
                {perms.map((p) => <li key={p} className="text-xs opacity-80">· {p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Members */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          <h2 className="font-semibold text-gray-900">Members ({users.length})</h2>
        </div>
        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(3)].map((_, i) => <div key={i} className="px-5 py-4 animate-pulse h-16" />)}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map((user) => {
              const RoleIcon = ROLE_ICONS[user.role] || Shield;
              const isCurrentUser = user.id === currentUser?.id;
              return (
                <div key={user.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                    {user.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{user.full_name || user.email}</span>
                      {isCurrentUser && <span className="badge bg-indigo-50 text-indigo-600 border-indigo-100 text-xs">You</span>}
                      {!user.is_active && <span className="badge bg-gray-100 text-gray-500 border-gray-200 text-xs">Inactive</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex gap-3">
                      <span>{user.email}</span>
                      {user.last_login_at && <span>Last login {timeAgo(user.last_login_at)}</span>}
                    </div>
                  </div>

                  {/* Role selector */}
                  {isAdmin && !isCurrentUser ? (
                    <div className="flex items-center gap-2">
                      {changingRole === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => changeRole(user.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                      <button
                        onClick={() => removeUser(user.id, user.email)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className={`badge text-xs ${ROLE_COLORS[user.role]}`}>
                      <RoleIcon className="w-3 h-3 mr-1" />
                      {user.role}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending invitations */}
      {isAdmin && invitations.filter(i => !i.accepted).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-900">Pending invitations</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {invitations.filter(i => !i.accepted).map((inv) => (
              <div key={inv.id} className="px-5 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm">{inv.email}</div>
                  <div className="text-xs text-gray-400 mt-0.5 flex gap-3">
                    <span>Invited {timeAgo(inv.created_at)}</span>
                    <span>Expires {timeAgo(inv.expires_at)}</span>
                    {inv.invited_by_name && <span>by {inv.invited_by_name}</span>}
                  </div>
                </div>
                <span className={`badge text-xs ${ROLE_COLORS[inv.role]}`}>{inv.role}</span>
                <button
                  onClick={() => cancelInvite(inv.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}