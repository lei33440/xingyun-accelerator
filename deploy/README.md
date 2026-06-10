# Server Deployment

One-shot deployment for the proxy-ip accelerator site on a fresh Ubuntu 22.04 / Debian 12 VPS.

## Architecture

```
                          ┌──────────────────────────────────┐
   Visitors ──► CF CDN ──►│  Nginx (web/dist) — public site  │  :80/:443
                          └──────────────────────────────────┘

   Admin     ──► CF DNS-only ──► Nginx (:1338) ──► Strapi :1337   (loopback)
                                                  ▲
                                                  │ pm2 daemon
                                                  │
                                              ecosystem.config.cjs
```

- **Public site** is a folder of static files served by Nginx, fronted by Cloudflare (orange-cloud Proxied).
- **Strapi** listens on `127.0.0.1:1337`, fronted by Nginx on `127.0.0.1:1338`, and reached via a **non-proxied** (grey-cloud) subdomain that's IP-allowlisted through Cloudflare Zero Trust or your firewall.
- **Strapi DB** is SQLite at `cms/.tmp/data.db` — fine for low-to-mid traffic. Migrate to Postgres for high-traffic / multi-instance setups.

## One-time setup

### 1. Buy / prepare a VPS

Recommended minimum: **2 vCPU / 2 GB RAM / 40 GB SSD** (Vultr / DigitalOcean / BandwagonHost / 阿里云 / 腾讯云 ≈ $5–$10/month).

### 2. Point your domain to the server

In your DNS provider (Cloudflare recommended):
| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `@` | `<server-ip>` | **Proxied** (orange) |
| A | `www` | `<server-ip>` | **Proxied** (orange) |
| A | `cms-9f3a2b` | `<server-ip>` | **DNS only** (grey) — keep this off Cloudflare's proxy |

### 3. Push code to a Git repo

```bash
git init && git add . && git commit -m "initial"
git remote add origin git@github.com:you/proxy-ip.git
git push -u origin main
```

### 4. SSH in and run the installer

```bash
ssh root@your-server-ip
git clone https://github.com/you/proxy-ip.git /var/www/proxy-ip
cd /var/www/proxy-ip
sudo bash deploy/install.sh
```

The script will:
- Install Node 20, nginx, pm2, ufw
- Generate unique secrets into `cms/.env`
- Build Strapi + Astro
- Start Strapi under pm2
- Configure nginx for both web and CMS
- Open only :22, :80, :443 in the firewall
- (Optionally) issue Let's Encrypt certificates

### 5. First-time Strapi setup

Open **https://cms-9f3a2b.example.com/admin** (or `http://<server-ip>:1338/admin` if DNS isn't pointed yet) and create the first admin user.

Then:

**5.1. Create the read-only API token**

`Settings → API Tokens → Create new API Token`
- Name: `web-read`
- Type: **Read-only**
- Duration: **Unlimited**
- Copy the access key into `cms/.env` as `STRAPI_READ_TOKEN=...`
- Copy the same key into `web/.env` (on the server) as `CMS_READ_TOKEN=...`
- Reload Strapi: `pm2 reload cms`

**5.2. Set up the revalidation webhook**

`Settings → Webhooks → Create new webhook`
- Name: `revalidate`
- URL: `https://cms-9f3a2b.example.com/api/revalidate`
- Headers: `x-revalidate-secret: <paste REVALIDATE_SECRET from cms/.env>`
- Events: `entry.create / entry.update / entry.publish / entry.unpublish / entry.delete`

**5.3. (Optional) Seed sample content**

```bash
STRAPI_READ_TOKEN=... STRAPI_URL=https://cms-9f3a2b.example.com node scripts/seed-accelerator.mjs
```

### 6. Configure Cloudflare access for the CMS subdomain

The CMS is intentionally **not** behind Cloudflare's proxy. Add an IP allowlist at your firewall level, OR move it behind Cloudflare Zero Trust:

1. Cloudflare Zero Trust → Access → Applications → Add an application → Self-hosted
2. Add the CMS hostname
3. Policy: Allow only your email / specific IPs

## Day-to-day operations

| Task | Command |
|---|---|
| Pull latest code & rebuild | `sudo bash deploy/update.sh` |
| Trigger revalidation (after CMS edit) | `sudo bash deploy/revalidate.sh` |
| Tail Strapi logs | `pm2 logs cms` |
| Restart Strapi | `pm2 restart cms` |
| Live process monitor | `pm2 monit` |
| Backup (DB + dist) | `sudo bash deploy/backup.sh` |
| Rollback to a timestamp | `sudo bash deploy/rollback.sh latest` |
| Renew SSL certs | `sudo certbot renew` (auto-renewed by certbot timer) |

### Daily backup crontab

```bash
sudo crontab -e
# Add this line:
13 3 * * * /var/www/proxy-ip/deploy/backup.sh >> /var/log/proxy-ip-backup.log 2>&1
```

## Production checklist

- [ ] Server firewall: only 22, 80, 443 open to the world
- [ ] Strapi is bound to `127.0.0.1` only (never public)
- [ ] CMS subdomain is grey-cloud in Cloudflare + IP allowlist / Zero Trust
- [ ] Public subdomain is orange-cloud (gets DDoS protection + CDN)
- [ ] SSL: `Full (Strict)` mode in Cloudflare, real certs via certbot or CF Origin cert
- [ ] `cms/.env` secrets generated with `openssl rand` (not the placeholders)
- [ ] `STRAPI_READ_TOKEN` created and pasted into both `cms/.env` and `web/.env`
- [ ] Revalidate webhook fires host hook after content edits
- [ ] Daily SQLite backup to `/var/backups/proxy-ip/`
- [ ] pm2 startup enabled (`pm2 startup && pm2 save`) so it survives reboots
- [ ] DNS CAA record optionally set to `0 issue "letsencrypt.org"`
- [ ] Server SSH: password auth disabled, key auth only

## When to upgrade from SQLite to Postgres

SQLite is fine up to ~50k MAU and ~5 GB of content (Articles + Plans). Move to Postgres when:
- You start seeing DB lock errors in `pm2 logs cms`
- The `cms/.tmp/data.db` file exceeds 1 GB
- You want to run multiple Strapi instances behind a load balancer

Migration:
```bash
# 1. Install postgres + create db/user
apt install -y postgresql
sudo -u postgres psql -c "CREATE DATABASE strapi;"
sudo -u postgres psql -c "CREATE USER strapi WITH PASSWORD '...';"

# 2. Change cms/config/database.js connection client to 'pg' and add credentials
# 3. pm2 reload cms
# 4. Re-seed (no auto-migration in v4 — re-import or write a script)
```

## Files in this directory

| File | Purpose |
|---|---|
| `install.sh` | One-shot first-time setup |
| `update.sh` | Pull + rebuild + restart (idempotent) |
| `revalidate.sh` | Fire the host deploy hook |
| `backup.sh` | Snapshot DB + dist |
| `rollback.sh` | Restore from a backup |
| `nginx/web.conf` | Public site vhost template |
| `nginx/cms.conf` | Strapi vhost template (127.0.0.1 only) |
