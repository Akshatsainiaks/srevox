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

<img src="https://img.shields.io/badge/-%E2%9A%A1%20LOOPZEN-6366f1?style=for-the-badge&logoColor=white&labelColor=0d0f17" height="48"/>

### **Kubernetes Pod Crash Alerting — Self-Hosted**
*Loop = CrashLoopBackOff. Zen = staying calm.*

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg?style=flat-square)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ready-0ea5e9?style=flat-square&logo=docker)](https://hub.docker.com/r/loopzen)
[![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat-square&logo=go)](https://golang.org)
[![Node](https://img.shields.io/badge/Node-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)](https://redis.io)

<br/>

```
Pod crashes → Go watcher detects → Redis pub/sub → Alert worker → Your team gets notified
```

<br/>

</div>

---

## 📖 What is Loopzen?

Loopzen is a **100% self-hosted**, open-source Kubernetes pod crash alerting platform built for teams that run their own infrastructure — on-prem, VMware, bare metal, private cloud, or air-gapped environments.

It watches your K8s clusters 24/7 using the **Kubernetes Watch API** (a single persistent connection — no polling), and instantly notifies your team via **Email, Teams, Slack, WhatsApp, or Webhooks** the moment a pod crashes.

> ✅ No cloud dependency. No SaaS. No data leaves your network. Ever.

---

## ✨ Features

| Feature | Description |
|---|---|
| ⚡ **Instant detection** | Sub-5s via K8s Watch API — not polling |
| 🔔 **Multi-channel alerts** | Email, Microsoft Teams, Slack, WhatsApp, Webhook |
| 🤖 **AI diagnosis** | Root cause + fix steps (OpenAI, Anthropic, or local Ollama) |
| 🛡️ **Noise control** | Cooldowns, restart thresholds, namespace filters |
| 👤 **Service owners** | Route alerts to the team that owns the crashing service |
| ☁️ **Any cluster** | EKS, GKE, AKS, on-prem, minikube, k3s, RKE |
| 🔒 **Self-hostable** | Runs entirely in your own infra — no external calls |
| 🐳 **Docker images** | One `docker-compose.yml` — no code required |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR INTERNAL NETWORK                        │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Kubernetes  │    │  Go Watcher  │    │     Redis 7      │   │
│  │   Cluster    │───▶│  (per cluster│───▶│   (pub/sub bus)  │   │
│  │              │    │   agent)     │    │                  │   │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘   │
│                                                    │             │
│  ┌──────────────┐    ┌──────────────┐    ┌────────▼─────────┐   │
│  │  Next.js     │    │  Fastify API │    │  Alert Worker    │   │
│  │  Dashboard   │◀───│  (Node 18)   │◀───│  (Node 18)       │   │
│  │  :3000       │    │  :4000       │    │                  │   │
│  └──────────────┘    └──────┬───────┘    └──────────────────┘   │
│                             │                                     │
│                    ┌────────▼─────────┐                          │
│                    │   PostgreSQL 16   │                          │
│                    │   (incidents,     │                          │
│                    │    rules, users)  │                          │
│                    └──────────────────┘                          │
│                                                                   │
│  ┌──────────────────────────────────────────────┐                │
│  │  AI Service (optional)                        │                │
│  │  OpenAI / Anthropic / Ollama (local/offline) │                │
│  └──────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

**How a crash flows:**
1. Go watcher opens a Watch stream on the K8s Pods API
2. Pod enters `OOMKilled` / `CrashLoopBackOff` / `Error` state
3. Watcher publishes JSON to Redis channel `loopzen:crashes`
4. Alert worker picks it up, matches your rules, applies noise filters
5. Sends alert to your configured channels (Teams, Email, Slack, etc.)
6. Incident saved to PostgreSQL — view, acknowledge, resolve, get AI diagnosis

---

## 🚀 Quick Start — Docker Compose (No Code Required)

### Prerequisites

- Docker + Docker Compose
- A Kubernetes cluster (any — EKS, GKE, on-prem, minikube)
- `kubectl` access to the cluster

### 1. Clone & configure

```bash
git clone https://github.com/Akshatsainiaks/loopzen.git
cd loopzen
cp .env.example .env
```

Edit `.env` — **this is the only file you need to touch:**

```env
# Required
POSTGRES_PASSWORD=your_secure_password
BACKEND_SECRET_KEY=your_32_char_secret_key_here____
ENCRYPTION_KEY=your_32_chars_exactly_here______

# Optional — for AI diagnosis
OPENAI_API_KEY=sk-...          # OR
ANTHROPIC_API_KEY=sk-ant-...   # OR leave blank to use Ollama (local)

# Optional — for email alerts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your_app_password
```

### 2. Start everything

```bash
docker compose up -d
```

That's it. Services started:

| Service | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| API | http://localhost:4000 |
| AI Service | http://localhost:8000 |

Default login: `admin@loopzen.local` / `admin123`

> ⚠️ Change the default password immediately after first login.

### 3. Connect your cluster

```bash
# Install the watcher agent into your cluster
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loopzen-agent
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels: { app: loopzen-agent }
  template:
    metadata:
      labels: { app: loopzen-agent }
    spec:
      serviceAccountName: loopzen-agent
      containers:
      - name: agent
        image: ghcr.io/Akshatsainiaks/loopzen-agent:latest
        env:
        - name: REDIS_URL
          value: "redis://YOUR_LOOPZEN_HOST:6379"
        - name: CLUSTER_ID
          value: "YOUR_CLUSTER_UUID_FROM_DASHBOARD"
        - name: CLUSTER_NAME
          value: "production"
        resources:
          requests: { cpu: 5m, memory: 16Mi }
          limits:   { cpu: 50m, memory: 64Mi }
EOF
```

Get your `CLUSTER_UUID` from: Dashboard → Clusters → Add Cluster → copy the UUID shown.

---

## 🏢 On-Premises / Internal Network Setup

This is the primary use case Loopzen is designed for.

### Network requirements

```
Your K8s nodes  ──(outbound TCP 6379)──▶  Loopzen Redis
Your browser    ──(TCP 3000/4000)────────▶  Loopzen host
Loopzen host    ──(TCP 443, optional)────▶  OpenAI/Anthropic (AI only)
                                            (skip if using Ollama)
```

**No inbound ports needed on K8s nodes.** The agent connects outbound only.

### Typical on-prem deployment

```
┌─────────────────┐         ┌──────────────────────────┐
│  K8s Cluster    │         │   Loopzen Server          │
│  (any network)  │         │   (VM / bare metal)       │
│                 │         │                           │
│  loopzen-agent  │──6379──▶│  Redis                   │
│  (Deployment)   │         │  PostgreSQL               │
│                 │         │  API + Dashboard          │
└─────────────────┘         │  Alert Worker             │
                            └──────────────────────────┘
                                         │
                            ┌────────────▼────────────┐
                            │  Alert destinations      │
                            │  (internal SMTP relay,   │
                            │   Teams webhook,         │
                            │   Slack webhook, etc.)   │
                            └─────────────────────────┘
```

### VMware / static IP setup

```bash
# On your Loopzen VM — open Redis to internal network
# Edit /etc/redis/redis.conf
bind 0.0.0.0
protected-mode no

sudo systemctl restart redis

# Verify from another machine on the network
redis-cli -h YOUR_VM_IP -p 6379 ping
# PONG
```

### Air-gapped / no internet setup

Use **Ollama** for local AI (no OpenAI/Anthropic needed):

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
# No OPENAI_API_KEY or ANTHROPIC_API_KEY needed
```

```bash
# On the Loopzen host
docker run -d --name ollama -p 11434:11434 ollama/ollama
docker exec ollama ollama pull llama3
```

Email alerts work with any internal SMTP relay — no internet required.

---

## 🐳 Docker Images

All images are available on GitHub Container Registry. **No code required — just pull and configure via environment variables.**

| Image | Description |
|---|---|
| `ghcr.io/Akshatsainiaks/loopzen-api:latest` | Fastify REST API |
| `ghcr.io/Akshatsainiaks/loopzen-frontend:latest` | Next.js dashboard |
| `ghcr.io/Akshatsainiaks/loopzen-worker:latest` | Alert worker |
| `ghcr.io/Akshatsainiaks/loopzen-ai:latest` | AI diagnosis service |
| `ghcr.io/Akshatsainiaks/loopzen-agent:latest` | Go K8s watcher agent |

Pull all at once:

```bash
docker compose pull
```

---

## ⚙️ Full Environment Variable Reference

### Core (required)

| Variable | Description | Example |
|---|---|---|
| `POSTGRES_HOST` | PostgreSQL host | `192.168.1.50` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_DB` | Database name | `loopzen` |
| `POSTGRES_USER` | DB username | `loopzen` |
| `POSTGRES_PASSWORD` | DB password | `your_secure_pass` |
| `REDIS_URL` | Redis connection URL | `redis://192.168.1.50:6379` |
| `BACKEND_SECRET_KEY` | JWT signing key (min 32 chars) | `change_me_in_production_xxxxx` |
| `ENCRYPTION_KEY` | Channel config encryption (32 chars exactly) | `change_me_32_chars_exactly____` |
| `FRONTEND_URL` | Dashboard URL (for CORS) | `http://192.168.1.50:3000` |
| `NEXT_PUBLIC_API_URL` | API URL seen by browser | `http://192.168.1.50:4000` |

### AI (optional)

| Variable | Description |
|---|---|
| `AI_PROVIDER` | `openai` / `anthropic` / `ollama` |
| `OPENAI_API_KEY` | OpenAI key (if using OpenAI) |
| `ANTHROPIC_API_KEY` | Anthropic key (if using Anthropic) |
| `OLLAMA_BASE_URL` | Ollama URL (if self-hosted AI) |

### Email alerts (optional)

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port (587 for TLS) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password / app password |

### Watcher agent (per cluster)

| Variable | Description |
|---|---|
| `REDIS_URL` | Loopzen Redis URL from agent's perspective |
| `CLUSTER_ID` | UUID from dashboard (Clusters → Add) |
| `CLUSTER_NAME` | Human-readable name |
| `KUBECONFIG` | Path to kubeconfig (optional — uses in-cluster if unset) |
| `WATCH_NAMESPACES` | Comma-separated namespaces (empty = all) |

---

## 🔔 Alert Channels

### Email / Gmail
```
smtp_host   → smtp.gmail.com
smtp_port   → 587
smtp_user   → you@gmail.com
smtp_pass   → 16-char App Password (myaccount.google.com → Security → App passwords)
to          → alert@yourcompany.com, oncall@yourcompany.com
```

### Microsoft Teams
```
webhook_url → https://Akshatsainiaks.webhook.office.com/webhookb2/...
```

### Slack
```
webhook_url → https://hooks.slack.com/services/...
```

### WhatsApp (via Twilio)
```
account_sid → ACxxxxx
auth_token  → your_token
from        → whatsapp:+14155238886
to          → whatsapp:+1234567890
```

### Generic Webhook
Any HTTP endpoint — Loopzen POSTs JSON:
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

### 1. Verify watcher is subscribed
```bash
redis-cli -h YOUR_REDIS_HOST -p 6379 PUBSUB NUMSUB loopzen:crashes
# Should return: (integer) 1  ← means alert worker is connected
```

### 2. Publish a test crash event
```bash
redis-cli -h YOUR_REDIS_HOST -p 6379 PUBLISH loopzen:crashes '{
  "cluster_id": "YOUR_CLUSTER_UUID",
  "pod_name": "test-pod",
  "namespace": "default",
  "container_name": "app",
  "crash_reason": "OOMKilled",
  "restart_count": 5,
  "exit_code": 137,
  "pod_labels": {},
  "raw_event": {},
  "detected_at": "2026-05-14T14:00:00Z"
}'
```

You should receive an alert within seconds.

### 3. Simulate a real pod crash
```bash
# CrashLoopBackOff
kubectl run crash-test \
  --image=busybox --restart=Always \
  -- /bin/sh -c "exit 1"

# OOMKilled
kubectl run oom-test \
  --image=polinux/stress \
  --restart=Always \
  --limits='memory=64Mi' \
  -- stress --vm 1 --vm-bytes 128M

# Watch it crash
kubectl get pod crash-test -w

# Clean up
kubectl delete pod crash-test oom-test
```

### Common issues

| Symptom | Cause | Fix |
|---|---|---|
| `PUBSUB NUMSUB` returns `0` | Alert worker not connected to Redis | Run worker from `alert-worker/` dir; check `REDIS_URL` |
| `PUBLISH` returns `(integer) 0` | No subscribers | See above |
| `All channels filtered` | Alert rule has no channels | Dashboard → Alert Rules → attach a channel |
| Agent can't reach Redis | Firewall / Redis bind | Open port 6379; set `bind 0.0.0.0` in redis.conf |
| No incidents in dashboard | Rule cluster_id mismatch | Check `CLUSTER_ID` env matches dashboard UUID exactly |

---

## 📋 Alert Rule Configuration

| Field | Description |
|---|---|
| **Cluster** | Which cluster to watch |
| **Namespaces** | Leave empty to watch all namespaces |
| **Crash reasons** | `OOMKilled`, `CrashLoopBackOff`, `Error`, etc. (empty = all) |
| **Min restarts** | Only alert after N restarts (noise filter) |
| **Cooldown** | Minutes to suppress duplicate alerts for same pod |
| **Severity** | `warning` / `critical` |
| **Channels** | Where to send alerts |

---

## 🤖 AI Diagnosis

When an incident appears in the dashboard, click **"AI Diagnosis"** to get:

- **Root cause analysis** — why the pod likely crashed
- **Fix steps** — concrete commands to resolve it
- **Prevention tips** — how to avoid recurrence

Works with **OpenAI GPT-4**, **Anthropic Claude**, or **Ollama** (fully local, no internet).

---

## 🔐 Security Notes

- All channel configs (webhook URLs, SMTP passwords) are **encrypted at rest** in PostgreSQL using `ENCRYPTION_KEY`
- JWT tokens signed with `BACKEND_SECRET_KEY`
- Redis should be **network-restricted** to your internal LAN — never expose port 6379 to the internet
- Run behind a reverse proxy (nginx/Caddy) with TLS for production

---

## 📁 Project Structure

```
loopzen/
├── apps/
│   ├── api/              # Fastify REST API (Node.js)
│   ├── frontend/         # Next.js dashboard
│   ├── alert-worker/     # Redis subscriber + alert dispatcher
│   ├── ai-service/       # Python FastAPI — AI diagnosis
│   └── watcher/          # Go K8s watcher agent
├── docker-compose.yml    # One-command deployment
├── .env.example          # All config variables documented
└── README.md
```

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feat/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT — free to use, modify, and self-host. See [LICENSE](LICENSE).

---

<div align="center">

**Built for teams that run their own infrastructure.**

*No cloud. No SaaS. No data leaving your network.*

<br/>

⚡ **Loopzen** — Stay calm when your pods don't.

</div>