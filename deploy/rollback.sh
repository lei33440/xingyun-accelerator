#!/usr/bin/env bash
###############################################################################
# rollback.sh — Restore the Strapi DB and built site from a previous backup.
#
# Usage:
#   sudo bash deploy/rollback.sh [<timestamp>]   # e.g. 20260110T153000Z
#   sudo bash deploy/rollback.sh latest          # most recent
###############################################################################

set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="/var/backups/proxy-ip"

TS="${1:-latest}"
if [[ "$TS" == "latest" ]]; then
  CMS=$(ls -1t "$DEST"/cms-*.db 2>/dev/null | head -1)
  WEB=$(ls -1t "$DEST"/web-*.tar.gz 2>/dev/null | head -1)
else
  CMS="$DEST/cms-$TS.db"
  WEB="$DEST/web-$TS.tar.gz"
fi

[[ -f "$CMS" ]] || { echo "No DB backup: $CMS"; exit 1; }
[[ -f "$WEB" ]] || { echo "No site backup: $WEB"; exit 1; }

echo "About to:"
echo "  - Stop Strapi (pm2 stop cms)"
echo "  - Restore DB:    $CMS"
echo "  - Restore site:  $WEB"
echo "  - Restart Strapi + reload nginx"
read -rp "Continue? (yes/no): " OK
[[ "$OK" == "yes" ]] || { echo "Aborted."; exit 0; }

pm2 stop cms
cp "$CMS" "$PROJECT_ROOT/cms/.tmp/data.db"
tar -xzf "$WEB" -C "$PROJECT_ROOT/web"
pm2 start cms
systemctl reload nginx
echo "✓ Rollback to $TS complete"
