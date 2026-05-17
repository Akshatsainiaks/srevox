<div align="center">

<br/>

<img src="https://raw.githubusercontent.com/Akshatsainiaks/srevox/main/public/logo.svg" width="80" height="80" alt="Srevox"/>

<h2>Srevox</h2>
<p><b>Catch crashes before your users do.</b></p>

<br/>

[![Docker Pulls](https://img.shields.io/docker/pulls/akshatsaini08/srevox-api?style=flat-square&logo=docker&label=Docker%20Pulls&color=0ea5e9)](https://hub.docker.com/u/akshatsaini08)
[![GitHub Release](https://img.shields.io/github/v/release/Akshatsainiaks/srevox?style=flat-square&color=6366f1)](https://github.com/Akshatsainiaks/srevox/releases)
[![License](https://img.shields.io/badge/License-Source%20Available-6366f1.svg?style=flat-square)](#license)
[![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?style=flat-square&logo=go)](https://golang.org)
[![Node](https://img.shields.io/badge/Node-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org)

<br/>

> 🐳 **No clone needed. Just Docker + your `.env` file.**

</div>

---

## What is Srevox?

Srevox watches your Kubernetes clusters 24/7 using the **K8s Watch API** and instantly notifies your team the moment a pod crashes — with AI-powered root cause analysis.

Built for **on-premises, VMware, bare metal, private cloud, and air-gapped** environments. No data leaves your network.

---

## ✨ Features

| Feature | Description |
|---|---|
| ⚡ **Instant detection** | Sub-5s crash detection via K8s Watch API — no polling |
| 🔔 **Multi-channel alerts** | Email, Microsoft Teams, Slack, WhatsApp, Webhook |
| 🤖 **AI diagnosis** | Root cause + fix steps via Groq, OpenAI, Anthropic, or local Ollama |
| 🛡️ **Noise control** | Cooldowns, restart thresholds, namespace filters |
| 👤 **Service owners** | Route alerts to the team that owns the crashing service |
| ☁️ **Any cluster** | EKS, GKE, AKS, on-prem, minikube, k3s, RKE |
| 🔒 **Self-hosted** | Runs entirely in your own infrastructure |
| 🐳 **Docker-native** | One `docker-compose.yml` — no build required |
| 👥 **Team management** | Invite team members, assign roles (admin/member/viewer) |
| 🔑 **Per-user AI settings** | Each user configures their own AI provider and API key |

> ⚠️ **Note:** Team management and user invitation features are currently under active development. Basic team viewing works but invite flows may have issues. This will be fully stable in v1.1.0.

---

## 🚀 Quick Start — No Clone Needed

**Requirements:** Docker & Docker Compose only.

### 1. One-command setup

```bash
curl -fsSL https://raw.githubusercontent.com/Akshatsainiaks/srevox/main/setup.sh | bash
```

This downloads everything, creates your `.env`, and pulls all images.

### 2. Edit `.env`

```bash
cd srevox
nano .env
```

Minimum required:

```env
POSTGRES_PASSWORD=your_secure_password
BACKEND_SECRET_KEY=any_random_32_char_string_here__
ENCRYPTION_KEY=exactly_32_chars_here____________
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:4000
FRONTEND_URL=http://YOUR_SERVER_IP:3000
```

### 3. Start

```bash
docker compose up -d
```

| Service | URL |
|---|---|
| Dashboard | `http://YOUR_SERVER_IP:3000` |
| API | `http://YOUR_SERVER_IP:4000` |

**Default login:** `admin@srevox.local` / `admin123`

> ⚠️ Change the default password immediately after first login.

---

## 🔌 Connect Your K8s Cluster

```bash
kubectl apply -f \
  https://raw.githubusercontent.com/Akshatsainiaks/srevox/main/srevox-agent.yml
```

Set your cluster details:

```bash
kubectl set env deployment/srevox-agent -n kube-system \
  REDIS_URL=redis://YOUR_SREVOX_IP:6379 \
  CLUSTER_ID=YOUR_UUID_FROM_DASHBOARD \
  CLUSTER_NAME=production
```

Get `CLUSTER_ID` from: **Dashboard → Clusters → Add Cluster**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   YOUR INTERNAL NETWORK                      │
│                                                             │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────┐   │
│  │  Kubernetes │   │  Go Watcher  │   │    Redis 7     │   │
│  │  Cluster    │──▶│  (agent)     │──▶│  (pub/sub)     │   │
│  └─────────────┘   └──────────────┘   └───────┬────────┘   │
│                                               │             │
│  ┌─────────────┐   ┌──────────────┐   ┌───────▼────────┐   │
│  │  Dashboard  │   │  API :4000   │   │  Alert Worker  │   │
│  │  :3000      │◀──│  (Fastify)   │◀──│  (Node.js)     │   │
│  └─────────────┘   └──────┬───────┘   └────────────────┘   │
│                           │                                 │
│                   ┌───────▼──────────┐                      │
│                   │   PostgreSQL 16  │                      │
│                   │   AI Service     │                      │
│                   └──────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

**Crash flow:**
1. Go watcher opens Watch stream on K8s Pods API
2. Pod enters `OOMKilled` / `CrashLoopBackOff` / `Error`
3. Watcher publishes JSON → Redis `srevox:crashes`
4. Alert worker matches rules, applies filters, sends alerts
5. Incident saved to PostgreSQL — view, acknowledge, AI diagnose

---

## 🐳 Docker Images

| Image | Tag |
|---|---|
| `akshatsaini08/srevox-api` | `latest` / `v1.0.0` |
| `akshatsaini08/srevox-frontend` | `latest` / `v1.0.0` |
| `akshatsaini08/srevox-worker` | `latest` / `v1.0.0` |
| `akshatsaini08/srevox-ai` | `latest` / `v1.0.0` |
| `akshatsaini08/srevox-agent` | `latest` / `v1.0.0` |

---

## ⚙️ Environment Variables

### Required

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | Database password |
| `BACKEND_SECRET_KEY` | JWT signing key — min 32 characters |
| `ENCRYPTION_KEY` | Channel config encryption — **exactly** 32 characters |
| `NEXT_PUBLIC_API_URL` | API URL as seen from the browser |
| `FRONTEND_URL` | Dashboard URL — used for CORS |

### Optional — AI Diagnosis

| Variable | Description |
|---|---|
| `AI_PROVIDER` | `groq` / `openai` / `anthropic` / `ollama` |
| `GROQ_API_KEY` | Groq key — free at console.groq.com |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OLLAMA_BASE_URL` | Ollama URL for local/offline AI |

### Optional — Email Alerts

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server |
| `SMTP_PORT` | SMTP port (`587` for TLS) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password or app password |

---

## 🔔 Alert Channels

### Email / Gmail
```
smtp_host → smtp.gmail.com
smtp_port → 587
smtp_user → you@gmail.com
smtp_pass → App Password (Google Account → Security → App passwords)
to        → oncall@yourcompany.com
```

### Microsoft Teams
```
webhook_url → https://your-org.webhook.office.com/webhookb2/...
```

### Slack
```
webhook_url → https://hooks.slack.com/services/...
```

### WhatsApp (via Twilio)
```
account_sid → ACxxxxxxxx
auth_token  → your_token
from        → whatsapp:+14155238886
to          → whatsapp:+91XXXXXXXXXX
```

---

## 🤖 AI Diagnosis

When an incident appears, click **AI Diagnosis** to get:
- Root cause analysis
- Step-by-step fix commands
- kubectl commands with exact pod/namespace
- Prevention recommendations

**Supported providers:**
- **Groq** — free, fast (recommended for self-hosted)
- **OpenAI** — GPT-4o, GPT-4o-mini
- **Anthropic** — Claude models
- **Ollama** — fully local, no internet required

Configure per-user in **Dashboard → Settings → AI Diagnosis**.

---

## 🧪 Testing Your Setup

### Verify alert worker is connected
```bash
redis-cli -h YOUR_REDIS_IP -p 6379 PUBSUB NUMSUB srevox:crashes
# (integer) 1  ← worker connected
```

### Send a test crash event
```bash
redis-cli -h YOUR_REDIS_IP -p 6379 PUBLISH srevox:crashes '{
  "cluster_id":     "YOUR_CLUSTER_UUID",
  "pod_name":       "test-pod",
  "namespace":      "default",
  "container_name": "app",
  "crash_reason":   "OOMKilled",
  "restart_count":  5,
  "exit_code":      137,
  "pod_labels":     {},
  "raw_event":      {},
  "detected_at":    "2026-05-16T14:00:00Z"
}'
```

### Simulate a real pod crash
```bash
kubectl run crash-test --image=busybox --restart=Always -- /bin/sh -c "exit 1"
kubectl get pod crash-test -w
kubectl delete pod crash-test
```

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `PUBSUB NUMSUB` → `0` | Worker not connected | Check `REDIS_URL` in `.env` |
| `PUBLISH` returns `0` | No subscribers | Start alert worker |
| `All channels filtered` | Rule has no channels | Dashboard → Alert Rules → add channel |
| Agent can't reach Redis | Firewall or bind | Open port 6379; `bind 0.0.0.0` |
| No incidents in dashboard | `CLUSTER_ID` mismatch | Must match UUID exactly |

---

## 💰 Pricing

| | **Community** | **Pro** *(coming soon)* | **Enterprise** *(coming soon)* |
|---|---|---|---|
| Clusters | 3 | Unlimited | Unlimited |
| Alert channels | 2 | Unlimited | Unlimited |
| AI diagnosis | ✅ | ✅ | ✅ |
| Service owners | ❌ | ✅ | ✅ |
| SSO / SAML | ❌ | ❌ | ✅ |
| Audit logs | ❌ | ✅ | ✅ |
| Price | **Free** | **Coming soon** | **Contact us** |

> ⭐ Star the repo to get notified when Pro launches.

---

## 🔐 Security

- Channel configs encrypted at rest in PostgreSQL
- JWT tokens signed with `BACKEND_SECRET_KEY`
- Redis should be **LAN-only** — never expose port `6379` to internet
- Use nginx/Caddy with TLS for production

---

## 📄 License

Srevox is **source-available**. You may self-host for personal or internal company use. Commercial redistribution or managed service requires a commercial license.

---

<div align="center">

**Built for teams that run their own infrastructure.**

*No cloud. No SaaS. No data leaving your network.*

⚡ **Srevox** — Catch crashes before your users do.

[🐳 Docker Hub](https://hub.docker.com/u/akshatsaini08) · [🐛 Issues](https://github.com/Akshatsainiaks/srevox/issues)

</div>
