"use client";
import { useLayoutEffect } from "react";
import Link from "next/link";
import { useState } from "react";
import {
  Radio, Bell, Zap, Shield, Server, ArrowRight, CheckCircle,
  Mail, MessageSquare, Webhook, Menu, X, Star, ChevronDown,
  Eye, Clock, Sparkles, Globe, Lock, TrendingUp,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Features",    href: "#features" },
  { label: "How it works",href: "#how-it-works" },
  { label: "Pricing",     href: "#pricing" },
  { label: "About",       href: "#about" },
  { label: "Docs",        href: "/docs" },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Instant crash detection",
    desc: "K8s Watch API — single persistent connection. No polling, near-zero cluster load. Alerts in under 5 seconds.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Bell,
    title: "Multi-channel alerts",
    desc: "Email, Microsoft Teams, WhatsApp, Slack, and generic webhooks. Alerts where your team already works.",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: Sparkles,
    title: "AI-powered diagnosis",
    desc: "On-demand AI analysis of each crash. Root cause, fix steps, kubectl commands — in seconds, not hours.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Shield,
    title: "Noise control built-in",
    desc: "Cooldown periods, restart thresholds, namespace filters. Only the alerts that matter. No alert fatigue.",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: Server,
    title: "Any K8s — cloud or on-prem",
    desc: "EKS, GKE, AKS, on-prem. Agent-based (outbound only) or kubeconfig. No inbound firewall rules needed.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Lock,
    title: "Self-hostable",
    desc: "Run entirely inside your infrastructure. Docker image provided. No data ever leaves your network.",
    color: "bg-red-50 text-red-600",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Connect your cluster",
    desc: "Install the lightweight Srevox agent with one kubectl command. Agent connects outbound only — no inbound firewall rules.",
    icon: Server,
  },
  {
    step: "02",
    title: "Configure alert channels",
    desc: "Add your Email, Teams, or WhatsApp in under 2 minutes. Test with one click before going live.",
    icon: Bell,
  },
  {
    step: "03",
    title: "Set alert rules",
    desc: "Define which namespaces, crash reasons, and restart thresholds trigger alerts. Noise filters built in.",
    icon: Shield,
  },
  {
    step: "04",
    title: "Stay calm — we watch 24/7",
    desc: "When a pod crashes, you get notified instantly. Click 'Diagnose' for AI-powered fix suggestions.",
    icon: Eye,
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    desc: "Perfect for hobby projects and small teams",
    features: [
      "1 cluster",
      "Up to 100 incidents/month",
      "Email alerts",
      "Basic AI diagnosis (10/month)",
      "7-day incident history",
    ],
    cta: "Get started free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    desc: "For growing teams that need reliability",
    features: [
      "Up to 5 clusters",
      "Unlimited incidents",
      "Email + Teams + WhatsApp",
      "Unlimited AI diagnosis",
      "90-day incident history",
      "Priority support",
      "Custom alert rules",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For large teams with compliance needs",
    features: [
      "Unlimited clusters",
      "Unlimited incidents",
      "All alert channels",
      "Self-hosted option",
      "SSO / SAML",
      "SLA guarantee",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Contact us",
    highlighted: false,
  },
];

const TESTIMONIALS = [
  {
    name: "Rahul Sharma",
    role: "Platform Engineer @ TechCorp",
    text: "Srevox caught a CrashLoopBackOff in our payment service at 3am. The WhatsApp alert woke me up before any customer noticed. Game changer.",
    stars: 5,
  },
  {
    name: "Priya Nair",
    role: "DevOps Lead @ StartupXYZ",
    text: "The AI diagnosis saved us 2 hours on an OOMKilled issue. It pinpointed the exact memory leak and gave us the kubectl commands to verify.",
    stars: 5,
  },
  {
    name: "Alex Chen",
    role: "SRE @ ScaleUp",
    text: "Setup took 8 minutes. Connected our EKS cluster, configured Slack webhook, created a rule. First real alert came through perfectly.",
    stars: 5,
  },
];

const CRASH_REASONS = ["CrashLoopBackOff", "OOMKilled", "ImagePullBackOff", "Error", "BackOff"];
const CHANNELS = ["Gmail", "MS Teams", "WhatsApp", "Slack", "PagerDuty", "Webhook"];

export default function LandingPage() {
  // Landing page always light — never affected by dark mode
  useLayoutEffect(() => {
    // Run synchronously before paint
    const el = document.documentElement;
    el.classList.remove('dark');
    el.style.cssText = 'background-color:#ffffff !important';
    document.body.style.cssText = 'background-color:#ffffff !important; color:#111827 !important';
    // Keep watching for 500ms in case something re-adds dark
    const t = setInterval(() => {
      if (el.classList.contains('dark')) {
        el.classList.remove('dark');
        el.style.cssText = 'background-color:#ffffff !important';
      }
    }, 50);
    setTimeout(() => clearInterval(t), 500);
    return () => clearInterval(t);
    document.documentElement.classList.remove("dark");
    document.documentElement.style.backgroundColor = "#ffffff";
  }, []);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                <Radio className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg">Srevox</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  {l.label}
                </a>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Sign in</Link>
              <Link href="/signup" className="btn-primary text-sm py-2">
                Get started free <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile menu button */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg text-gray-600">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="block text-gray-600 py-2" onClick={() => setMobileOpen(false)}>
                {l.label}
              </a>
            ))}
            <Link href="/login"  className="block btn-secondary text-center">Sign in</Link>
            <Link href="/signup" className="block btn-primary  text-center">Get started free</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4 text-center bg-gradient-to-b from-indigo-50/50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="section-tag mb-6">
            <Zap className="w-3.5 h-3.5" />
            Kubernetes crash alerting, reimagined
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Stay calm.<br />
            <span className="gradient-text">We'll catch the crash loops.</span>
          </h1>

          <p className="text-xl text-gray-600 leading-relaxed mb-10 max-w-2xl mx-auto">
            Srevox watches your Kubernetes pods 24/7 and instantly alerts you on Email, Teams, or WhatsApp
            when crash loops happen — so you don't have to constantly check dashboards.
          </p>

          {/* Alert preview pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {CRASH_REASONS.map((r) => (
              <span key={r} className="badge bg-red-50 text-red-700 border-red-100 text-xs">{r}</span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="btn-primary text-base px-8 py-3 shadow-lg shadow-indigo-200">
              Start monitoring free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#how-it-works" className="btn-secondary text-base px-8 py-3">
              See how it works
            </Link>
          </div>

          <p className="text-xs text-gray-400 mt-4">No credit card required · Setup in 8 minutes · Cancel anytime</p>

          {/* Alert channels pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            <span className="text-sm text-gray-500">Alerts via:</span>
            {CHANNELS.map((c) => (
              <span key={c} className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">{c}</span>
            ))}
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="text-xs text-gray-400 ml-2">app.srevox.io/dashboard</span>
            </div>
            <div className="p-6 grid grid-cols-4 gap-4">
              {[
                { label: "Open incidents", value: "3", color: "text-red-600", bg: "bg-red-50" },
                { label: "Critical open",  value: "1", color: "text-orange-600", bg: "bg-orange-50" },
                { label: "Last 24h",       value: "7", color: "text-indigo-600", bg: "bg-indigo-50" },
                { label: "Resolved",       value: "24", color: "text-green-600", bg: "bg-green-50" },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                  <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 space-y-2">
              {[
                { pod: "payment-service-7d9f8b", ns: "production", reason: "OOMKilled",        sev: "critical" },
                { pod: "auth-worker-5f8b9c",     ns: "production", reason: "CrashLoopBackOff", sev: "warning" },
                { pod: "job-runner-3a2b1c",      ns: "staging",    reason: "BackOff",          sev: "info" },
              ].map((inc) => (
                <div key={inc.pod} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                  <div className={`w-2 h-2 rounded-full ${inc.sev === "critical" ? "bg-red-500" : inc.sev === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
                  <span className="text-sm font-medium text-gray-800 flex-1">{inc.pod}</span>
                  <span className="text-xs text-gray-400">{inc.ns}</span>
                  <span className={`badge text-xs ${inc.sev === "critical" ? "badge-critical" : inc.sev === "warning" ? "badge-warning" : "badge-info"}`}>{inc.reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="section-tag mb-4"><Bell className="w-3.5 h-3.5" /> Features</div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need to stay zen</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From crash detection to AI diagnosis — built for DevOps teams who value their peace of mind.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="section-tag mb-4"><TrendingUp className="w-3.5 h-3.5" /> How it works</div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Up and running in 8 minutes</h2>
            <p className="text-lg text-gray-600">No complex setup. No agents with write permissions. No dashboards to check constantly.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-indigo-100 z-0" />
                )}
                <div className="card p-6 relative z-10">
                  <div className="text-xs font-bold text-indigo-400 mb-3">{step.step}</div>
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                    <step.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Alert channels showcase ──────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="section-tag mb-4"><Bell className="w-3.5 h-3.5" /> Alert channels</div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Alerts where your team already works
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                We don't believe in "check your dashboard". When a pod crashes at 3am, you need to know
                on the channel you actually use — not another tool to log into.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Mail,          label: "Email (Gmail, SMTP, SendGrid)", desc: "Beautifully formatted HTML alerts with incident details" },
                  { icon: MessageSquare, label: "WhatsApp (Twilio or Meta API)", desc: "Instant WhatsApp messages to your on-call phone" },
                  { icon: Globe,         label: "Microsoft Teams",                desc: "Rich Adaptive Cards with one-click incident link" },
                  { icon: Webhook,       label: "Webhook (Slack, PagerDuty...)", desc: "Generic JSON webhook works with any tool" },
                ].map((ch) => (
                  <div key={ch.label} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center shrink-0">
                      <ch.icon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 text-sm">{ch.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{ch.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Email preview */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="bg-red-600 p-5">
                  <div className="text-white font-bold text-lg">🔔 Pod Crash Detected — CRITICAL</div>
                </div>
                <div className="p-5 space-y-3">
                  {[["Pod", "payment-service-7d9f8b"], ["Namespace", "production"], ["Reason", "OOMKilled"], ["Restarts", "8"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium text-gray-800">{v}</span>
                    </div>
                  ))}
                  <button className="w-full bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium mt-2">
                    View Incident &amp; AI Diagnosis →
                  </button>
                </div>
                <div className="p-3 bg-gray-50 text-center text-xs text-gray-400 border-t">
                  Srevox — Stay calm. We'll catch the crash loops.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="section-tag mb-4"><Star className="w-3.5 h-3.5" /> Testimonials</div>
            <h2 className="text-4xl font-bold text-gray-900">Loved by DevOps teams</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="section-tag mb-4"><Zap className="w-3.5 h-3.5" /> Pricing</div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-600">Start free. Upgrade when you need more clusters or channels.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING.map((plan) => (
              <div key={plan.name} className={`card p-6 flex flex-col ${plan.highlighted ? "border-2 border-indigo-500 shadow-lg shadow-indigo-100 relative" : ""}`}>
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <div className="mb-6">
                  <div className="font-bold text-gray-900 text-lg mb-1">{plan.name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{plan.desc}</p>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === "Enterprise" ? "mailto:hello@srevox.io" : "/signup"}
                  className={`text-center py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    plan.highlighted
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About / Approach ─────────────────────────────────────────────── */}
      <section id="about" className="py-24 px-4 bg-indigo-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="section-tag mb-6 mx-auto w-fit">
            <Radio className="w-3.5 h-3.5" /> Our approach
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Built by engineers, for engineers</h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-8">
            We've been on-call. We know the anxiety of watching dashboards at 2am, wondering if something
            is about to break. Srevox was built to eliminate that anxiety — not by adding another dashboard,
            but by making sure the right person gets notified, immediately, where they already are.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-12">
            {[
              { title: "The problem", desc: "Teams miss pod crashes because alerts go to email inboxes nobody checks, or dashboards require constant babysitting.", icon: "😰" },
              { title: "Our solution", desc: "Srevox watches 24/7 using the K8s Watch API and sends instant alerts to where your team already works.", icon: "🎯" },
              { title: "The result", desc: "Faster incident response, less stress, and the confidence to close your laptop knowing Srevox is watching.", icon: "🧘" },
            ].map((item) => (
              <div key={item.title} className="card p-5">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900">Frequently asked questions</h2>
          </div>
          {[
            { q: "Does Srevox need write access to my cluster?", a: "No. Srevox only uses read-only RBAC permissions — get, list, watch on pods and events. It never modifies your cluster." },
            { q: "How does the agent connect — do I need to open firewall ports?", a: "No inbound ports needed. The agent connects outbound to Srevox via a secure WebSocket. Your cluster's firewall stays unchanged." },
            { q: "Can I self-host Srevox?", a: "Yes. We provide a Docker image and Helm chart for full self-hosted deployment. Everything runs inside your infrastructure, including the AI service using local Ollama." },
            { q: "What AI provider does Srevox use for diagnosis?", a: "You choose: OpenAI (GPT-4o-mini), Anthropic (Claude Haiku), or a local Ollama model for air-gapped environments. AI diagnosis is on-demand only — never automatic." },
            { q: "How is the noise controlled?", a: "You set minimum restart thresholds (e.g. alert after 3+ restarts) and cooldown periods (e.g. no repeat alert for 15 minutes for the same pod). Namespace filters let you ignore dev/staging." },
          ].map((faq, i) => (
            <div key={i} className="border-b border-gray-100">
              <button
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                className="w-full flex items-center justify-between py-5 text-left"
              >
                <span className="font-medium text-gray-900">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${faqOpen === i ? "rotate-180" : ""}`} />
              </button>
              {faqOpen === i && (
                <p className="pb-5 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-gradient-to-br from-indigo-600 to-violet-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to stay zen?</h2>
          <p className="text-indigo-200 text-lg mb-10">
            Join DevOps teams who sleep better knowing Srevox is watching their clusters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-white text-indigo-600 font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-50 transition-colors text-sm">
              Start monitoring free →
            </Link>
            <Link href="/login" className="border border-white/30 text-white font-medium px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm">
              Sign in
            </Link>
          </div>
          <p className="text-indigo-300 text-xs mt-4">No credit card required · Setup in 8 minutes</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <Radio className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white text-lg">Srevox</span>
              </div>
              <p className="text-sm leading-relaxed">
                Stay calm. We'll catch the crash loops.
              </p>
              <p className="text-xs mt-3 text-gray-600">
                Kubernetes pod crash alerting with AI diagnostics.
              </p>
            </div>
            {/* Links */}
            {[
              { title: "Product", links: [{ l: "Features", h: "#features" }, { l: "How it works", h: "#how-it-works" }, { l: "Pricing", h: "#pricing" }, { l: "Changelog", h: "#" }] },
              { title: "Company", links: [{ l: "About", h: "#about" }, { l: "Blog", h: "#" }, { l: "Careers", h: "#" }, { l: "Contact", h: "mailto:hello@srevox.io" }] },
              { title: "Legal", links: [{ l: "Privacy Policy", h: "#" }, { l: "Terms of Service", h: "#" }, { l: "Security", h: "#" }] },
            ].map((col) => (
              <div key={col.title}>
                <div className="font-semibold text-white text-sm mb-4">{col.title}</div>
                <ul className="space-y-2.5">
                  {col.links.map((lnk) => (
                    <li key={lnk.l}>
                      <a href={lnk.h} className="text-sm hover:text-white transition-colors">{lnk.l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <span>© 2026 Srevox. All rights reserved.</span>
            <span>Built with ❤️ for DevOps teams</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
