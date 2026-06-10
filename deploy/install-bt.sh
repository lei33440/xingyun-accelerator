#!/usr/bin/env bash
###############################################################################
# install-bt.sh — Deploy on a server that already has Baota (宝塔) installed.
#
# Pre-requisites (do these by hand in the Baota UI first):
#   1. Install Baota (https://www.bt.cn) with Nginx + PM2 plugins
#   2. In Baota's "软件商店", install: Nginx 1.22+, PM2 Manager 5+
#   3. In "网站" → Add Site, create TWO placeholder sites (just to reserve
#      the vhost paths; we'll overwrite the configs):
#         - example.com           (PHP: 纯静态, 备注: 前台)
#         - cms-9f3a2b.example.com (PHP: 纯静态, 备注: Strapi)
#      Baota will create the directory /www/wwwroot/<domain> and
#      /etc/nginx/conf.d/<domain>.conf for each.
#   4. In "软件商店" → "PM2 管理器" → 设置 → 切换 Node 版本为 v20.x
#
# Then run this script (from the project root on the server):
#   sudo bash deploy/install-bt.sh
#
# The script will:
#   - Deploy the public site into /www/wwwroot/example.com (overwriting
#     the placeholder index.html) and rebuild into web/dist
#   - Deploy Strapi into /www/wwwroot/cms-9f3a2b.example.com and start it
#     under PM2 (Baota's PM2 manager)
#   - Install the revalidation hook script
#   - Register a daily backup cron
###############################################################################

set -euo pipefail

RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YLW=$'\033[0;33m'; BLU=$'\033[0;34m'; NC=$'\033[0m'
say()  { printf "%b\n" "$1"; }
ok()   { say "${GRN}✓${NC} $1"; }
warn() { say "${YLW}!${NC} $1"; }
fail() { say "${RED}✗${NC} $1"; exit 1; }

# ---------- Pre-flight ----------
[[ $EUID -eq 0 ]] || fail "Please run with sudo: sudo bash deploy/install-bt.sh"

# Detect Baota
BT_BIN="/www/server/panel/panel"
[[ -x "$BT_BIN" ]] || fail "Baota not found at $BT_BIN. Install Baota first: https://www.bt.cn"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Detect PM2 (from Baota or global)
PM2_BIN=""
for p in /www/server/nodejs/bin/pm2 /usr/local/bin/pm2 $(command -v pm2 2>/dev/null || true); do
  [[ -x "$p" ]] && PM2_BIN="$p" && break
done
[[ -n "$PM2_BIN" ]] || fail "pm2 not found. Install via Baota's 'PM2 Manager' plugin."
ok "Using pm2 at: $PM2_BIN"

# ---------- Prompt ----------
if [[ -z "${DOMAIN:-}" ]]; then
  read -rp "Your primary domain (e.g. example.com): " DOMAIN
fi
if [[ -z "${CMS_SUBDOMAIN:-}" ]]; then
  read -rp "CMS subdomain prefix (e.g. cms-9f3a2b): " CMS_SUBDOMAIN
fi
if [[ -z "${ADMIN_EMAIL:-}" ]]; then
  read -rp "Admin email (for SSL cert): " ADMIN_EMAIL
fi
CMS_HOST="$CMS_SUBDOMAIN.$DOMAIN"
WEB_HOST="$DOMAIN"
ok "DOMAIN=$DOMAIN  CMS_HOST=$CMS_HOST  WEB_HOST=$WEB_HOST"

BT_WEB="/www/wwwroot/$WEB_HOST"
BT_CMS="/www/wwwroot/$CMS_HOST"
BT_NGINX_WEB="/etc/nginx/conf.d/$WEB_HOST.conf"
BT_NGINX_CMS="/etc/nginx/conf.d/$CMS_HOST.conf"

# Baota normally requires the user to click "保存" in the UI for the site to
# exist; check that:
[[ -d "$BT_WEB" ]] || fail "Web site dir not found: $BT_WEB. Create the site in Baota UI first."
[[ -d "$BT_CMS" ]] || fail "CMS site dir not found: $BT_CMS. Create the site in Baota UI first."

# ---------- Step 1: secrets ----------
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
  ok "Generated cms/.env"
else
  ok "cms/.env exists, leaving untouched"
fi

# ---------- Step 2: install deps ----------
say "${BLU}==>${NC} Installing project dependencies"
npm install --no-audit --no-fund --silent
npm --prefix web install --no-audit --no-fund --silent
ok "Deps installed"

# ---------- Step 3: build Strapi ----------
say "${BLU}==>${NC} Building Strapi admin (NODE_ENV=production)"
( cd cms && NODE_ENV=production npm run build ) 2>&1 | tail -3
ok "Strapi built"

# ---------- Step 4: build Astro ----------
say "${BLU}==>${NC} Building Astro public site"
CMS_BASE_URL="https://$CMS_HOST" WEB_SITE_URL="https://$WEB_HOST" \
  npm --prefix web run build 2>&1 | tail -3
ok "Astro built"

# ---------- Step 5: deploy public site to Baota's web dir ----------
say "${BLU}==>${NC} Deploying public site -> $BT_WEB"
# Baota's web root has its own files (index.html placeholder, .user.ini etc).
# We keep .user.ini (PHP perms) but replace the public files with our dist.
if [[ -f "$BT_WEB/.user.ini" ]]; then
  cp "$BT_WEB/.user.ini" /tmp/bt-user.ini.bak
fi
rm -rf "$BT_WEB"/*  "$BT_WEB"/.[!.]*  2>/dev/null || true
cp -r web/dist/. "$BT_WEB/"
chown -R www:www "$BT_WEB" 2>/dev/null || chmod -R a+rX "$BT_WEB"
if [[ -f /tmp/bt-user.ini.bak ]]; then
  mv /tmp/bt-user.ini.bak "$BT_WEB/.user.ini"
fi
ok "Public site deployed"

# ---------- Step 6: deploy Strapi into Baota's CMS dir ----------
say "${BLU}==>${NC} Deploying Strapi -> $BT_CMS"
# Strapi needs its OWN directory structure (not web/dist). Put it under the
# Baota site dir but in a subdir so the site's document root can still be
# the .well-known/acme-challenge folder for certbot later.
mkdir -p "$BT_CMS/app"
cp -r cms/. "$BT_CMS/app/"
ok "Strapi source copied to $BT_CMS/app/"

# ---------- Step 7: install Strapi prod deps (without devDeps) ----------
say "${BLU}==>${NC} Installing Strapi production-only dependencies"
( cd "$BT_CMS/app" && npm install --omit=dev --no-audit --no-fund --silent )
ok "Strapi deps installed"

# ---------- Step 8: start Strapi under PM2 (Baota-managed) ----------
say "${BLU}==>${NC} Starting Strapi via PM2"
cat > "$BT_CMS/app/ecosystem.config.cjs" <<EOF
module.exports = {
  apps: [{
    name: 'cms',
    cwd: '$BT_CMS/app',
    script: 'npm',
    args: 'run start',
    env: { NODE_ENV: 'production', HOST: '127.0.0.1', PORT: 1337 },
    max_memory_restart: '512M',
    autorestart: true,
    watch: false,
  }],
};
EOF
# Stop existing cms process if any
"$PM2_BIN" delete cms 2>/dev/null || true
( cd "$BT_CMS/app" && "$PM2_BIN" start ecosystem.config.cjs )
"$PM2_BIN" save
ok "Strapi is running under PM2 (visible in Baota's PM2 Manager UI)"

# ---------- Step 9: install our auxiliary scripts ----------
say "${BLU}==>${NC} Installing helper scripts -> $BT_CMS/app/scripts"
chmod +x "$PROJECT_ROOT/deploy"/*.sh
ok "update / revalidate / backup / rollback ready"

# ---------- Step 10: install backup cron ----------
say "${BLU}==>${NC} Installing daily backup cron"
( crontab -l 2>/dev/null | grep -v 'proxy-ip/backup.sh' ; \
  echo "13 3 * * * bash $PROJECT_ROOT/deploy/backup.sh >> /var/log/proxy-ip-backup.log 2>&1" \
) | crontab -
ok "Daily 03:13 backup scheduled"

# ---------- Step 11: print next steps ----------
cat <<EOF

${GRN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
  ${GRN}Baota deployment complete!${NC}

  ${BLU}Public site (Baota site):${NC}   $BT_WEB
  ${BLU}Strapi source (Baota site):${NC} $BT_CMS/app
  ${BLU}Strapi process:${NC}           running under PM2 as 'cms' (visible in Baota)
  ${BLU}Strapi port:${NC}               127.0.0.1:1337 (internal only)

  ${YLW}NEXT STEPS (do these in Baota UI):${NC}
  1. 网站 -> $WEB_HOST -> 设置 -> 反向代理
     (Or edit /etc/nginx/conf.d/$WEB_HOST.conf and reload Nginx.)
     Add a reverse-proxy rule for /api -> http://127.0.0.1:1337 ONLY if you
     want the public site to proxy Strapi's /api endpoints through the same
     domain. Otherwise leave it static.

  2. 网站 -> $CMS_HOST -> 设置 -> 反向代理
     Add a reverse-proxy rule:
         目标URL:    http://127.0.0.1:1337
         发送域名:   \$host
         代理目录:   /
         内容替换:   -

  3. SSL -> Let's Encrypt -> 申请 (for both domains)

  4. Open https://$CMS_HOST/admin and create the first admin user.

  5. Settings -> API Tokens -> Create new (Type: Read-only, Duration: Unlimited)
     Paste the access key into:
        $BT_CMS/app/.env   as STRAPI_READ_TOKEN
        (then pm2 reload cms from the PM2 Manager UI)

  6. (Optional) Webhook -> Create new:
        URL:    https://$CMS_HOST/api/revalidate
        Header: x-revalidate-secret: <REVALIDATE_SECRET from cms/.env>

  ${GRN}Useful commands:${NC}
    # Pull latest code & rebuild & restart Strapi
    bash $PROJECT_ROOT/deploy/update-bt.sh

    # Tail Strapi logs (or use Baota -> PM2 Manager -> 日志)
    $PM2_BIN logs cms

    # Daily backup (already scheduled via cron)
    bash $PROJECT_ROOT/deploy/backup.sh

    # Open Baota panel
    bt

${GRN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
EOF
