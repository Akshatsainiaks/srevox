<!-- # 🔭 Loopzen

**Stay calm. We'll catch the crash loops.**

Loopzen is a Kubernetes pod crash alerting platform with AI-powered diagnostics.
Instant alerts via Email, Microsoft Teams, WhatsApp, and Webhooks when your pods fail.

## Architecture

| Service | Language | Role |
|---|---|---|
| `apps/api` | Node.js + Fastify | Main REST API + JWT auth + Redis sessions |
| `apps/backend` | Python + FastAPI | AI diagnosis microservice |
| `apps/alert-worker` | Node.js | Redis subscriber → Email/Teams/WhatsApp sender |
| `apps/watcher` | Go | K8s Watch API stream (zero cluster load) |
| `apps/frontend` | Next.js TypeScript | Full web platform + landing page |

## Quick Start

```bash
cp .env.example .env
# Edit .env with your DB/Redis/AI credentials

# 1. Start API
cd apps/api && npm install && npm run dev

# 2. Start AI service
cd apps/backend && pip install -r requirements.txt && uvicorn ai_service:app --port 8000 --reload

# 3. Start Alert Worker
cd apps/alert-worker && npm install && npm run dev

# 4. Start Frontend
cd apps/frontend && npm install && npm run dev
```

Open http://localhost:3000

Default login: `admin@loopzen.local` / `admin123`

## Database Setup

```bash
# On your PostgreSQL server:
psql -U loopzen -d loopzen < infra/docker/postgres/init.sql
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:
- `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `REDIS_URL`
- `BACKEND_SECRET_KEY` (32+ chars)
- `ENCRYPTION_KEY` (32 chars exactly)
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` (for AI diagnosis)
- Alert channel credentials (SMTP, Teams webhook, Twilio)

## Redis Channel

The Go watcher and alert worker communicate via Redis pub/sub on channel `loopzen:crashes`.

Test manually:
```bash
redis-cli PUBLISH loopzen:crashes '{"cluster_id":"YOUR_CLUSTER_ID","pod_name":"test-pod","namespace":"production","container_name":"app","crash_reason":"OOMKilled","restart_count":5,"pod_labels":{},"raw_event":{},"detected_at":"2026-03-22T10:00:00Z"}'
``` -->

<div align="center">

<br/>

<img src="https://img.shields.io/badge/-%E2%9A%A1%20LOOPZEN-6366f1?style=for-the-badge&logoColor=white&labelColor=0d0f17" height="52"/>

<h3>Kubernetes Pod Crash Alerting — Self-Hosted</h3>
<p><i>Loop = CrashLoopBackOff &nbsp;·&nbsp; Zen = staying calm.</i></p>

<br/>

[![Docker Pulls](https://img.shields.io/docker/pulls/akshatsaini08/loopzen-api?style=flat-square&logo=docker&label=Docker%20Pulls&color=0ea5e9)](https://hub.docker.com/u/akshatsaini08)
[![GitHub Release](https://img.shields.io/github/v/release/Akshatsainiaks/loopzen?style=flat-square&color=6366f1)](https://github.com/Akshatsainiaks/loopzen/releases)
[![License](https://img.shields.io/badge/License-Source%20Available-6366f1.svg?style=flat-square)](#license)
[![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?style=flat-square&logo=go)](https://golang.org)
[![Node](https://img.shields.io/badge/Node-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org)

<br/>

```
Pod crashes → Go watcher → Redis → Alert worker → Your team notified in seconds
```

<br/>

> 🐳 **No clone needed. Just Docker + your `.env` file.**

<br/>

</div>

---

## What is Loopzen?

Loopzen watches your Kubernetes clusters 24/7 using the **K8s Watch API** — a single persistent connection, no polling — and instantly notifies your team the moment a pod crashes.

Built for teams running **on-premises, VMware, bare metal, private cloud, or air-gapped** infrastructure. No data leaves your network.

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| ⚡ | **Instant detection** | Sub-5s crash detection via K8s Watch API |
| 🔔 | **Multi-channel alerts** | Email, Microsoft Teams, Slack, WhatsApp, Webhook |
| 🤖 | **AI diagnosis** | Root cause + fix steps via OpenAI, Anthropic, or local Ollama |
| 🛡️ | **Noise control** | Cooldowns, restart thresholds, namespace filters |
| 👤 | **Service owners** | Route alerts to the team that owns the crashing service |
| ☁️ | **Any cluster** | EKS, GKE, AKS, on-prem, minikube, k3s, RKE |
| 🔒 | **Self-hosted** | Runs entirely in your own infrastructure |
| 🐳 | **Docker-native** | One `docker-compose.yml` — no build required |

---

## 🚀 Quick Start

**Requirements:** Docker & Docker Compose — nothing else.

### 1. Download config files

```bash
mkdir loopzen && cd loopzen

curl -o docker-compose.yml \
  https://raw.githubusercontent.com/Akshatsainiaks/loopzen/main/docker-compose.yml

curl -o .env \
  https://raw.githubusercontent.com/Akshatsainiaks/loopzen/main/.env.example
```

### 2. Configure your `.env`

```bash
nano .env
```

Minimum required:

```env
POSTGRES_PASSWORD=your_secure_password
BACKEND_SECRET_KEY=any_random_string_min_32_chars___
ENCRYPTION_KEY=exactly_32_chars_here____________
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:4000
FRONTEND_URL=http://YOUR_SERVER_IP:3000
```

### 3. Start

```bash
docker compose up -d
```

Docker pulls all images automatically. No Node, Go, or Python needed.

| Service | URL |
|---|---|
| Dashboard | `http://YOUR_SERVER_IP:3000` |
| API | `http://YOUR_SERVER_IP:4000` |

**Default login:** `admin@loopzen.local` / `admin123`
> ⚠️ Change the default password immediately after first login.

### 4. Connect your cluster

```bash
kubectl apply -f \
  https://raw.githubusercontent.com/Akshatsainiaks/loopzen/main/loopzen-agent.yml
```

Then set your cluster details:

```bash
kubectl set env deployment/loopzen-agent -n kube-system \
  REDIS_URL=redis://YOUR_LOOPZEN_IP:6379 \
  CLUSTER_ID=YOUR_UUID_FROM_DASHBOARD \
  CLUSTER_NAME=production
```

Get your `CLUSTER_ID` from: **Dashboard → Clusters → Add Cluster**

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
1. Go watcher opens a Watch stream on the K8s Pods API
2. Pod enters `OOMKilled` / `CrashLoopBackOff` / `Error`
3. Watcher publishes JSON → Redis `loopzen:crashes`
4. Alert worker matches rules, applies filters, sends alerts
5. Incident saved to PostgreSQL — view, acknowledge, AI diagnose

---

## 🐳 Docker Images

All images on Docker Hub — pulled automatically by `docker compose up`:

| Image | Tag |
|---|---|
| `akshatsaini08/loopzen-api` | `latest` / `v1.0.0` |
| `akshatsaini08/loopzen-frontend` | `latest` / `v1.0.0` |
| `akshatsaini08/loopzen-worker` | `latest` / `v1.0.0` |
| `akshatsaini08/loopzen-ai` | `latest` / `v1.0.0` |
| `akshatsaini08/loopzen-agent` | `latest` / `v1.0.0` |

Use pinned versions in production:

```yaml
image: akshatsaini08/loopzen-api:v1.0.0   # recommended for production
image: akshatsaini08/loopzen-api:latest    # always latest
```

---

## 🏢 On-Premises / Internal Network Setup

### Network requirements

```
K8s nodes     ──(outbound TCP 6379)──▶  Loopzen Redis host
Your browser  ──(TCP 3000 / 4000)────▶  Loopzen host
Loopzen host  ──(TCP 443, optional)──▶  OpenAI / Anthropic
                                        (skip — use Ollama for air-gapped)
```

No inbound ports needed on K8s nodes. The agent connects **outbound only**.

### Redis — open to internal network

```bash
# /etc/redis/redis.conf
bind 0.0.0.0
protected-mode no

sudo systemctl restart redis
redis-cli ping   # PONG
```

### Air-gapped / no internet

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
```

```bash
docker run -d --name ollama -p 11434:11434 ollama/ollama
docker exec ollama ollama pull llama3
```

Email alerts work with any internal SMTP relay — no internet required.

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
| `AI_PROVIDER` | `openai` / `anthropic` / `ollama` |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OLLAMA_BASE_URL` | Ollama URL for local/offline AI |

### Optional — Email Alerts

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (`587` for TLS) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password or app password |

### Watcher Agent (set per cluster)

| Variable | Description |
|---|---|
| `REDIS_URL` | Loopzen Redis URL from inside the cluster |
| `CLUSTER_ID` | UUID from Dashboard → Clusters → Add |
| `CLUSTER_NAME` | Friendly name for this cluster |
| `WATCH_NAMESPACES` | Comma-separated namespaces (empty = all) |

---

## 🔔 Alert Channels

### Email / Gmail
```
smtp_host  →  smtp.gmail.com
smtp_port  →  587
smtp_user  →  you@gmail.com
smtp_pass  →  App Password (Google Account → Security → App passwords)
to         →  oncall@yourcompany.com
```

### Microsoft Teams
```
webhook_url  →  https://your-org.webhook.office.com/webhookb2/...
```

### Slack
```
webhook_url  →  https://hooks.slack.com/services/...
```

### WhatsApp (via Twilio)
```
account_sid  →  ACxxxxxxxx
auth_token   →  your_token
from         →  whatsapp:+14155238886
to           →  whatsapp:+91XXXXXXXXXX
```

### Generic Webhook
Loopzen POSTs this JSON to any HTTP endpoint:
```json
{
  "pod_name": "payment-svc-abc",
  "namespace": "backend",
  "crash_reason": "OOMKilled",
  "restart_count": 5,
  "severity": "critical",
  "incident_id": "uuid",
  "detected_at": "2026-05-14T14:00:00Z"
}
```

---

## 🧪 Testing Your Setup

### Verify alert worker is connected
```bash
redis-cli -h YOUR_REDIS_IP -p 6379 PUBSUB NUMSUB loopzen:crashes
# (integer) 1  ← worker connected
# (integer) 0  ← worker not connected, check REDIS_URL
```

### Send a test crash event
```bash
redis-cli -h YOUR_REDIS_IP -p 6379 PUBLISH loopzen:crashes '{
  "cluster_id":     "YOUR_CLUSTER_UUID",
  "pod_name":       "test-pod",
  "namespace":      "default",
  "container_name": "app",
  "crash_reason":   "OOMKilled",
  "restart_count":  5,
  "exit_code":      137,
  "pod_labels":     {},
  "raw_event":      {},
  "detected_at":    "2026-05-14T14:00:00Z"
}'
```

### Simulate a real pod crash
```bash
# CrashLoopBackOff
kubectl run crash-test --image=busybox --restart=Always -- /bin/sh -c "exit 1"

# OOMKilled
kubectl run oom-test --image=polinux/stress --restart=Always \
  --limits='memory=64Mi' -- stress --vm 1 --vm-bytes 128M

# Watch
kubectl get pod crash-test -w

# Cleanup
kubectl delete pod crash-test oom-test
```

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `PUBSUB NUMSUB` → `0` | Worker not connected to Redis | Check `REDIS_URL` in `.env` |
| `PUBLISH` returns `0` | No subscribers | Start alert worker |
| `All channels filtered` | Rule has no channels attached | Dashboard → Alert Rules → add channel |
| Agent can't reach Redis | Firewall or Redis bind | Open port 6379; set `bind 0.0.0.0` |
| No incidents in dashboard | `CLUSTER_ID` mismatch | Must match UUID exactly from dashboard |

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
| Priority support | ❌ | ✅ | ✅ dedicated |
| Price | **Free** | **Coming soon** | **Contact us** |

> ⭐ Star the repo to get notified when Pro launches.

---

## 🔐 Security

- Channel configs (webhook URLs, passwords) encrypted at rest in PostgreSQL
- JWT tokens signed with `BACKEND_SECRET_KEY`
- Redis should be **LAN-only** — never expose port `6379` to the internet
- Run behind nginx / Caddy with TLS for production

---

## 📄 License

Loopzen is **source-available**. You may self-host it for personal or internal company use. Commercial redistribution, reselling, or offering it as a managed service requires a commercial license.

See [LICENSE](LICENSE) for full terms.

---

<div align="center">

**Built for teams that run their own infrastructure.**

*No cloud. No SaaS. No data leaving your network.*

<br/>

⚡ **Loopzen** — Stay calm when your pods don't.

<br/>

[🐳 Docker Hub](https://hub.docker.com/u/akshatsaini08) &nbsp;·&nbsp; [🐛 Issues](https://github.com/Akshatsainiaks/loopzen/issues)

</div>