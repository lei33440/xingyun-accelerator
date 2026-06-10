#!/usr/bin/env bash
###############################################################################
# install.sh — One-shot deployment for the proxy-ip accelerator site.
#
# Target: a fresh Ubuntu 22.04 / Debian 12 VPS with root access.
# Idempotent: re-running on a partially-installed host will pick up where it left off.
#
# Usage (from the project root on the server):
#   sudo bash deploy/install.sh
#
# Optional env vars (otherwise auto-generated or prompted):
#   DOMAIN            e.g. example.com
#   CMS_SUBDOMAIN     e.g. cms-9f3a2b   (becomes cms-9f3a2b.example.com)
#   ADMIN_EMAIL       e.g. you@example.com (for Let's Encrypt)
#   SKIP_SSL          set to 1 to skip certbot (e.g. behind Cloudflare)
#   SKIP_FIREWALL     set to 1 to skip ufw config
###############################################################################

set -euo pipefail

# ---------- Pretty output ----------
RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YLW=$'\033[0;33m'; BLU=$'\033[0;34m'; NC=$'\033[0m'
say()  { printf "%b\n" "$1"; }
ok()   { say "${GRN}✓${NC} $1"; }
warn() { say "${YLW}!${NC} $1"; }
fail() { say "${RED}✗${NC} $1"; exit 1; }

# ---------- Pre-flight ----------
[[ $EUID -eq 0 ]] || fail "Please run with sudo: sudo bash deploy/install.sh"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

say "${BLU}==>${NC} Project root: $PROJECT_ROOT"

# ---------- Detect OS ----------
. /etc/os-release
case "$ID" in
  ubuntu)  PM=apt; UFW=ufw ;;
  debian)  PM=apt; UFW=ufw ;;
  *) fail "Unsupported distro: $ID. This script targets Ubuntu 22.04 / Debian 12." ;;
esac

# ---------- Prompt for missing config ----------
if [[ -z "${DOMAIN:-}" ]]; then
  read -rp "Your primary domain (e.g. example.com): " DOMAIN
fi
if [[ -z "${CMS_SUBDOMAIN:-}" ]]; then
  read -rp "CMS subdomain prefix (e.g. cms-9f3a2b): " CMS_SUBDOMAIN
fi
if [[ -z "${ADMIN_EMAIL:-}" ]]; then
  read -rp "Admin email (for SSL certs, optional): " ADMIN_EMAIL
fi

CMS_HOST="$CMS_SUBDOMAIN.$DOMAIN"
WEB_HOST="$DOMAIN"
ok "DOMAIN=$DOMAIN  CMS_HOST=$CMS_HOST  WEB_HOST=$WEB_HOST"

# ---------- Step 1: base packages ----------
say "${BLU}==>${NC} Installing base packages"
$PM update -y >/dev/null
$PM install -y curl git nginx ufw software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# ---------- Step 2: Node.js 20 (skip if already 20+) ----------
if ! command -v node >/dev/null || ! node -v | grep -qE '^v20\.'; then
  say "${BLU}==>${NC} Installing Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  $PM install -y nodejs
fi
ok "Node $(node -v), npm $(npm -v)"

# ---------- Step 3: pm2 ----------
if ! command -v pm2 >/dev/null; then
  say "${BLU}==>${NC} Installing pm2"
  npm install -g pm2
fi
ok "pm2 $(pm2 -v)"

# ---------- Step 4: Firewall ----------
if [[ "${SKIP_FIREWALL:-0}" != "1" ]]; then
  say "${BLU}==>${NC} Configuring firewall (ufw)"
  ufw --force reset >/dev/null
  ufw default deny incoming >/dev/null
  ufw default allow outgoing >/dev/null
  ufw allow OpenSSH >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw --force enable >/dev/null
  ok "Firewall active (22, 80, 443 open; 1337 closed to the public)"
fi

# ---------- Step 5: Generate secrets if missing ----------
say "${BLU}==>${NC} Preparing env files"
if [[ ! -f cms/.env ]]; then
  cp cms/.env.example cms/.env
  APP_KEYS=$(for i in 1 2 3 4; do openssl rand -base64 32 | tr -d '\n'; echo; done | paste -sd ',' -)
  SALT=$(openssl rand -base64 32)
  REV=$(openssl rand -hex 16)
  sed -i "s|^APP_KEYS=.*|APP_KEYS=$APP_KEYS|"        cms/.env
  sed -i "s|^API_TOKEN_SALT=.*|API_TOKEN_SALT=$SALT|" cms/.env
  sed -i "s|^ADMIN_JWT_SECRET=.*|ADMIN_JWT_SECRET=$SALT|" cms/.env
  sed -i "s|^TRANSFER_TOKEN_SALT=.*|TRANSFER_TOKEN_SALT=$SALT|" cms/.env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$SALT|"        cms/.env
  sed -i "s|^REVALIDATE_SECRET=.*|REVALIDATE_SECRET=$REV|" cms/.env
  ok "Generated cms/.env (unique secrets per install)"
  warn "Remember to set the public read-only API token in cms/.env after first boot."
else
  ok "cms/.env already exists, leaving untouched"
fi

# ---------- Step 6: Install deps ----------
say "${BLU}==>${NC} Installing dependencies (this can take 1-3 minutes)"
npm install --no-audit --no-fund --silent
npm --prefix web install --no-audit --no-fund --silent
ok "Dependencies installed"

# ---------- Step 7: Build Strapi admin ----------
say "${BLU}==>${NC} Building Strapi admin panel"
( cd cms && NODE_ENV=production npm run build ) 2>&1 | tail -5
ok "Strapi built"

# ---------- Step 8: Build the public site ----------
say "${BLU}==>${NC} Building public site (Astro)"
CMS_BASE_URL="https://$CMS_HOST" WEB_SITE_URL="https://$WEB_HOST" \
  npm --prefix web run build 2>&1 | tail -5
ok "Astro built -> web/dist/"

# ---------- Step 9: pm2 ecosystem ----------
say "${BLU}==>${NC} Configuring pm2"
cat > ecosystem.config.cjs <<EOF
module.exports = {
  apps: [{
    name: 'cms',
    cwd: '$PROJECT_ROOT/cms',
    script: 'npm',
    args: 'run start',
    env: { NODE_ENV: 'production', PORT: 1337, HOST: '127.0.0.1' },
    max_memory_restart: '512M',
    autorestart: true,
    watch: false,
  }],
};
EOF
pm2 start ecosystem.config.cjs 2>&1 | tail -3 || pm2 reload ecosystem.config.cjs
pm2 save
ok "pm2: cms running on 127.0.0.1:1337"

# ---------- Step 10: Nginx ----------
say "${BLU}==>${NC} Configuring Nginx"
cat > /etc/nginx/sites-available/cms <<EOF
server {
    listen 127.0.0.1:1338;
    server_name $CMS_HOST;
    client_max_body_size 50M;
    location / {
        proxy_pass http://127.0.0.1:1337;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
cat > /etc/nginx/sites-available/web <<EOF
server {
    listen 80;
    server_name $WEB_HOST www.$WEB_HOST;
    root $PROJECT_ROOT/web/dist;
    index index.html;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    location / { try_files \$uri \$uri/ /index.html; }
    location ~* \.(?:css|js|svg|woff2?)$ { expires 30d; add_header Cache-Control "public, max-age=2592000"; }
}
EOF
ln -sf /etc/nginx/sites-available/cms /etc/nginx/sites-enabled/cms
ln -sf /etc/nginx/sites-available/web /etc/nginx/sites-enabled/web
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ok "Nginx reloaded (web on :80, cms internal on :1338)"

# ---------- Step 11: SSL (optional) ----------
if [[ "${SKIP_SSL:-0}" != "1" && -n "${ADMIN_EMAIL:-}" ]]; then
  say "${BLU}==>${NC} Installing certbot (only if DNS is pointing here)"
  $PM install -y certbot python3-certbot-nginx
  if certbot --nginx -d "$WEB_HOST" -d "www.$WEB_HOST" --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect 2>&1 | tail -3; then
    ok "SSL issued for $WEB_HOST"
  else
    warn "SSL issuance failed (DNS not yet pointing to this server?) — re-run later: sudo certbot --nginx"
  fi
fi

# ---------- Step 12: Done ----------
cat <<EOF

${GRN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
  ${GRN}Deployment complete!${NC}

  ${BLU}Public site:${NC}    http://$WEB_HOST
  ${BLU}Admin panel:${NC}    http://$CMS_HOST/admin  (Strapi will be reachable after Cloudflare DNS points here)
  ${BLU}Strapi port:${NC}    127.0.0.1:1337  (internal only, never exposed)

  ${YLW}NEXT STEPS:${NC}
  1. In Cloudflare DNS:
       $WEB_HOST        A    <server-ip>      Proxied (orange cloud)
       $CMS_HOST        A    <server-ip>      DNS only (grey cloud)  ← keep this OFF Cloudflare OR put behind Zero Trust
       www.$WEB_HOST    CNAME $WEB_HOST        Proxied

  2. Browse to https://$CMS_HOST/admin and create the first admin user.

  3. Settings -> API Tokens -> Create new (Type: Read-only, Duration: Unlimited)
     Copy the token into cms/.env as STRAPI_READ_TOKEN, then:
        pm2 reload cms

  4. Settings -> Webhooks -> Create new
       URL:    https://$CMS_HOST/api/revalidate
       Header: x-revalidate-secret: <paste REVALIDATE_SECRET from cms/.env>
       Events: entry.create / entry.update / entry.publish / entry.unpublish / entry.delete

  5. (Optional) Cloudflare Pages auto-deploys from Git. For revalidation, point
     one of the host hook URLs (NETLIFY_HOOK_URL / VERCEL_DEPLOY_HOOK / CF_PURGE_URL)
     in web/.env and re-run: bash deploy/update.sh

  ${GRN}Useful commands:${NC}
    pm2 logs cms         # tail Strapi logs
    pm2 restart cms      # restart Strapi
    pm2 monit            # live process monitor
    bash deploy/update.sh    # pull latest code + rebuild + restart

${GRN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
EOF
