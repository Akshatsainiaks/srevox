#!/bin/bash
set -e

BOLD="\033[1m"
GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

BASE="https://raw.githubusercontent.com/Akshatsainiaks/loopzen/main"

echo ""
echo -e "${CYAN}${BOLD}⚡ Loopzen — Self-Hosted Setup${RESET}"
echo -e "${CYAN}   Kubernetes Pod Crash Alerting${RESET}"
echo ""

# ── Check Docker ──────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ Docker not found. Install: https://docs.docker.com/get-docker/${RESET}"
  exit 1
fi
if ! docker compose version &> /dev/null; then
  echo -e "${RED}✗ Docker Compose not found.${RESET}"
  exit 1
fi
echo -e "${GREEN}✓ Docker found${RESET}"

# ── Create folder structure ───────────────────────────────────
mkdir -p loopzen/infra/docker/postgres
cd loopzen
echo -e "${GREEN}✓ Created loopzen/ directory${RESET}"

# ── Download all required files ───────────────────────────────
echo -e "${CYAN}→ Downloading files...${RESET}"

curl -fsSL "$BASE/docker-compose.yml"                        -o docker-compose.yml
curl -fsSL "$BASE/infra/docker/postgres/init.sql"            -o infra/docker/postgres/init.sql

echo -e "${GREEN}✓ docker-compose.yml downloaded${RESET}"
echo -e "${GREEN}✓ infra/docker/postgres/init.sql downloaded${RESET}"

# ── Create .env if not exists ─────────────────────────────────
if [ ! -f .env ]; then
  curl -fsSL "$BASE/.env.example" -o .env
  echo -e "${GREEN}✓ .env created from template${RESET}"
  echo ""
  echo -e "${YELLOW}${BOLD}⚠️  Edit .env before starting:${RESET}"
  echo -e "${YELLOW}   POSTGRES_PASSWORD=your_secure_password${RESET}"
  echo -e "${YELLOW}   BACKEND_SECRET_KEY=any_32_char_string_here_xxxx${RESET}"
  echo -e "${YELLOW}   ENCRYPTION_KEY=exactly_32_chars_here__________${RESET}"
  echo -e "${YELLOW}   NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:4000${RESET}"
  echo -e "${YELLOW}   FRONTEND_URL=http://YOUR_SERVER_IP:3000${RESET}"
  echo ""
  echo -e "   Run: ${BOLD}nano .env${RESET}"
  echo ""
else
  echo -e "${GREEN}✓ .env already exists — skipping${RESET}"
fi

# ── Pull all images ───────────────────────────────────────────
echo -e "${CYAN}→ Pulling Loopzen images from Docker Hub...${RESET}"
docker compose pull
echo -e "${GREEN}✓ All images pulled${RESET}"

echo ""
echo -e "${GREEN}${BOLD}✅ Loopzen is ready!${RESET}"
echo ""
echo -e "   1. Edit .env:          ${BOLD}nano .env${RESET}"
echo -e "   2. Start Loopzen:      ${BOLD}docker compose up -d${RESET}"
echo ""
echo -e "   Dashboard:  ${CYAN}http://YOUR_SERVER_IP:3000${RESET}"
echo -e "   API:        ${CYAN}http://YOUR_SERVER_IP:4000${RESET}"
echo -e "   Login:      ${CYAN}admin@loopzen.local / admin123${RESET}"
echo ""
echo -e "   ${YELLOW}⚠️  Change default password after first login!${RESET}"
echo ""
