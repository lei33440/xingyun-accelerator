#!/usr/bin/env bash
###############################################################################
# update-bt.sh — Pull latest code and redeploy under Baota.
#
# Pre-condition: install-bt.sh was run at least once.
#
# Usage (from the project root on the server):
#   sudo bash deploy/update-bt.sh
###############################################################################

set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

GRN=$'\033[0;32m'; YLW=$'\033[0;33m'; BLU=$'\033[0;34m'; NC=$'\033[0m'
say() { printf "%b\n" "$1"; }

# Detect Baota web root by looking up the first site that has web/dist content
BT_WEB="/www/wwwroot/example.com"
BT_CMS="/www/wwwroot/cms-9f3a2b.example.com"

if [[ ! -d "$BT_CMS/app" ]]; then
  echo "ERROR: $BT_CMS/app not found. Has install-bt.sh been run?" >&2
  exit 1
fi

# Detect pm2
PM2_BIN=""
for p in /www/server/nodejs/bin/pm2 /usr/local/bin/pm2 $(command -v pm2 2>/dev/null || true); do
  [[ -x "$p" ]] && PM2_BIN="$p" && break
done
[[ -n "$PM2_BIN" ]] || { echo "pm2 not found"; exit 1; }

say "${BLU}==>${NC} Pulling latest code"
git pull --rebase --autostash

say "${BLU}==>${NC} Installing root + web dependencies"
npm install --no-audit --no-fund --silent
npm --prefix web install --no-audit --no-fund --silent

say "${BLU}==>${NC} Rebuilding Strapi admin"
( cd cms && NODE_ENV=production npm run build ) 2>&1 | tail -3

say "${BLU}==>${NC} Rebuilding Astro public site"
CMS_BASE_URL="${CMS_BASE_URL:-http://127.0.0.1:1337}" \
WEB_SITE_URL="${WEB_SITE_URL:-http://localhost}" \
  npm --prefix web run build 2>&1 | tail -3

say "${BLU}==>${NC} Syncing Strapi source to Baota CMS dir"
rsync -a --delete --exclude='.env' --exclude='.tmp' --exclude='node_modules' --exclude='build' \
  cms/ "$BT_CMS/app/"
( cd "$BT_CMS/app" && npm install --omit=dev --no-audit --no-fund --silent )
ok "Strapi source synced"

say "${BLU}==>${NC} Reloading Strapi under PM2"
"$PM2_BIN" reload cms

say "${BLU}==>${NC} Re-deploying public site files"
if [[ -d "$BT_WEB" ]]; then
  if [[ -f "$BT_WEB/.user.ini" ]]; then
    cp "$BT_WEB/.user.ini" /tmp/bt-user.ini.bak
  fi
  rm -rf "$BT_WEB"/*  "$BT_WEB"/.[!.]*  2>/dev/null || true
  cp -r web/dist/. "$BT_WEB/"
  chown -R www:www "$BT_WEB" 2>/dev/null || chmod -R a+rX "$BT_WEB"
  if [[ -f /tmp/bt-user.ini.bak ]]; then
    mv /tmp/bt-user.ini.bak "$BT_WEB/.user.ini"
  fi
  ok "Public site files refreshed"
else
  warn "Web root $BT_WEB not found, skipped"
fi

say "${GRN}✓${NC} Update complete"
say "${YLW}Tip:${NC} In Baota, click '重载配置' on Nginx if the nginx config changed."
