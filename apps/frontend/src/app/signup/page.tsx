"use client";
import { useState, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import { apiSignup } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";
import { LoopzenLogo } from "@/components/Logo";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email:"", password:"", full_name:"", org_name:"" });
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const set = (k: string, v: string) => setForm(p => ({...p, [k]:v}));

  useLayoutEffect(() => { document.documentElement.classList.remove("dark"); }, []);

  const submit = async () => {
    if (!form.email||!form.password) return;
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    try {
      const data = await apiSignup(form);
      setToken(data.access_token);
      if (data.user) setUser(data.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Signup failed. Please try again.");
    } finally { setLoading(false); }
  };

  const inp = "block w-full rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 px-4 py-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 flex items-center justify-center p-4">
      <Link href="/" className="fixed top-5 left-5 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <LoopzenLogo size={52} />
            <div>
              <div className="font-bold text-gray-900 text-2xl">Loopzen</div>
              <div className="text-sm text-gray-400 mt-0.5">Start monitoring in 8 minutes</div>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm shadow-gray-100 p-7">
          <h1 className="text-lg font-bold text-gray-900 mb-0.5">Create your account</h1>
          <p className="text-sm text-gray-400 mb-4">Free forever · No credit card required</p>

          <div className="space-y-1.5 mb-5">
            {["Instant crash alerts via Email, Teams & WhatsApp","AI-powered root cause diagnosis","1 cluster free forever — no limits on incidents"].map(b => (
              <div key={b} className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0"/>{b}
              </div>
            ))}
          </div>

          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Name</label>
                <input className={inp} placeholder="Akshat Saini" value={form.full_name} onChange={e=>set("full_name",e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Company</label>
                <input className={inp} placeholder="Acme Inc." value={form.org_name} onChange={e=>set("org_name",e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Work email</label>
              <input type="email" className={inp} placeholder="you@company.com" value={form.email} onChange={e=>set("email",e.target.value)} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input type={showPass?"text":"password"} className={`${inp} pr-11`} placeholder="Min. 8 characters" value={form.password}
                  onChange={e=>set("password",e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} />
                <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                  {showPass?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-3.5 py-3 text-sm text-red-600">
                <span className="shrink-0 mt-0.5">⚠️</span><span>{error}</span>
              </div>
            )}
            <button onClick={submit} disabled={loading||!form.email||!form.password}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200">
              {loading?(<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Creating account...</>):"Create free account →"}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            By signing up you agree to our <a href="#" className="text-indigo-600 hover:underline">Terms</a> &amp; <a href="#" className="text-indigo-600 hover:underline">Privacy</a>
          </p>
          <p className="text-center text-sm text-gray-500 mt-3">
            Already have an account? <Link href="/login" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}