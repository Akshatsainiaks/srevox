#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Loopzen Setup Script
#  Run: curl -fsSL https://raw.githubusercontent.com/Akshatsainiaks/loopzen/main/setup.sh | bash
# ═══════════════════════════════════════════════════════════════

set -e

BOLD="\033[1m"
GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

echo ""
echo -e "${CYAN}${BOLD}⚡ Loopzen — Self-Hosted Setup${RESET}"
echo -e "${CYAN}   Kubernetes Pod Crash Alerting${RESET}"
echo ""

# ── Check Docker ──────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ Docker not found. Install Docker first: https://docs.docker.com/get-docker/${RESET}"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo -e "${RED}✗ Docker Compose not found. Install Docker Desktop or docker-compose-plugin.${RESET}"
  exit 1
fi

echo -e "${GREEN}✓ Docker found${RESET}"

# ── Create loopzen directory ──────────────────────────────────
mkdir -p loopzen && cd loopzen
echo -e "${GREEN}✓ Created loopzen/ directory${RESET}"

# ── Download docker-compose.yml ───────────────────────────────
echo -e "${CYAN}→ Downloading docker-compose.yml...${RESET}"
curl -fsSL \
  https://raw.githubusercontent.com/Akshatsainiaks/loopzen/main/docker-compose.yml \
  -o docker-compose.yml
echo -e "${GREEN}✓ docker-compose.yml downloaded${RESET}"

# ── Create .env from example if not exists ────────────────────
if [ ! -f .env ]; then
  echo -e "${CYAN}→ Downloading .env template...${RESET}"
  curl -fsSL \
    https://raw.githubusercontent.com/Akshatsainiaks/loopzen/main/.env.example \
    -o .env
  echo -e "${GREEN}✓ .env created from template${RESET}"
  echo ""
  echo -e "${YELLOW}${BOLD}⚠️  Before starting, edit .env with your values:${RESET}"
  echo -e "${YELLOW}   Required:${RESET}"
  echo -e "${YELLOW}   • POSTGRES_PASSWORD=your_secure_password${RESET}"
  echo -e "${YELLOW}   • BACKEND_SECRET_KEY=any_32_char_string_here_xxxx${RESET}"
  echo -e "${YELLOW}   • ENCRYPTION_KEY=exactly_32_chars_here__________${RESET}"
  echo -e "${YELLOW}   • NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:4000${RESET}"
  echo -e "${YELLOW}   • FRONTEND_URL=http://YOUR_SERVER_IP:3000${RESET}"
  echo ""
  echo -e "   Run: ${BOLD}nano .env${RESET}"
  echo ""
else
  echo -e "${GREEN}✓ .env already exists — skipping${RESET}"
fi

# ── Pull images ───────────────────────────────────────────────
echo -e "${CYAN}→ Pulling Loopzen images from Docker Hub...${RESET}"
docker compose pull
echo -e "${GREEN}✓ All images pulled${RESET}"

echo ""
echo -e "${GREEN}${BOLD}✅ Loopzen is ready!${RESET}"
echo ""
echo -e "   Edit your .env first, then run:"
echo -e "   ${BOLD}cd loopzen && docker compose up -d${RESET}"
echo ""
echo -e "   Dashboard:  ${CYAN}http://YOUR_SERVER_IP:3000${RESET}"
echo -e "   API:        ${CYAN}http://YOUR_SERVER_IP:4000${RESET}"
echo -e "   Login:      ${CYAN}admin@loopzen.local / admin123${RESET}"
echo ""
echo -e "   ${YELLOW}⚠️  Change default password after first login!${RESET}"
echo ""
