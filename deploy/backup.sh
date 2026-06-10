#!/usr/bin/env bash
###############################################################################
# backup.sh — Snapshot the Strapi SQLite DB and built site for safekeeping.
#
# Usage:
#   sudo bash deploy/backup.sh
#
# Crontab suggestion (daily at 03:13, keep 14 days):
#   13 3 * * * /var/www/proxy-ip/deploy/backup.sh >> /var/log/proxy-ip-backup.log 2>&1
###############################################################################

set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

STAMP=$(date -u +"%Y%m%dT%H%M%SZ")
DEST="/var/backups/proxy-ip"
mkdir -p "$DEST"

# 1. SQLite DB
if [[ -f cms/.tmp/data.db ]]; then
  cp cms/.tmp/data.db "$DEST/cms-$STAMP.db"
  echo "✓ cms db -> $DEST/cms-$STAMP.db"
fi

# 2. Built site (so we can roll back the static output too)
if [[ -d web/dist ]]; then
  tar -czf "$DEST/web-$STAMP.tar.gz" -C web dist
  echo "✓ web dist -> $DEST/web-$STAMP.tar.gz"
fi

# 3. Rotate: keep last 14 days
find "$DEST" -mtime +14 -type f -delete
echo "✓ rotated (kept last 14 days)"
