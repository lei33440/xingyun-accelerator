#!/usr/bin/env bash
###############################################################################
# update.sh — Pull latest code, rebuild, and restart (zero-ish downtime).
#
# Usage (from the project root on the server):
#   sudo bash deploy/update.sh
###############################################################################

set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

GRN=$'\033[0;32m'; YLW=$'\033[0;33m'; BLU=$'\033[0;34m'; NC=$'\033[0m'
say() { printf "%b\n" "$1"; }

say "${BLU}==>${NC} Pulling latest code"
git pull --rebase --autostash

say "${BLU}==>${NC} Installing dependencies"
npm install --no-audit --no-fund --silent
npm --prefix web install --no-audit --no-fund --silent

say "${BLU}==>${NC} Rebuilding Strapi admin"
( cd cms && NODE_ENV=production npm run build ) 2>&1 | tail -3

say "${BLU}==>${NC} Restarting Strapi"
pm2 reload cms

say "${BLU}==>${NC} Rebuilding public site"
CMS_BASE_URL="${CMS_BASE_URL:-http://127.0.0.1:1337}" \
WEB_SITE_URL="${WEB_SITE_URL:-http://localhost}" \
  npm --prefix web run build 2>&1 | tail -3

say "${GRN}✓${NC} Update complete"
say "${YLW}Tip:${NC} If you have a revalidation host hook configured, fire it now:"
say "  bash deploy/revalidate.sh"
