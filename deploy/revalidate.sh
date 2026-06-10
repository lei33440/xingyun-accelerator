#!/usr/bin/env bash
###############################################################################
# revalidate.sh — Trigger the static-host deploy hook so the public site
# rebuilds with the latest CMS content. Wired to the same env vars as
# scripts/revalidate.mjs (NETLIFY_HOOK_URL / VERCEL_DEPLOY_HOOK / CF_PURGE_URL).
#
# Usage:
#   sudo bash deploy/revalidate.sh [<event>] [<model>]
###############################################################################

set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Load web/.env if present (NETLIFY_HOOK_URL etc.)
if [[ -f web/.env ]]; then
  set -a; . web/.env; set +a
fi

EVENT="${1:-manual}"
MODEL="${2:-global-setting}"

# Pull the latest CMS read token from Strapi config
# (in case the host hook is in cms/.env)
if [[ -f cms/.env ]]; then
  set -a; . cms/.env; set +a
fi

fired=0
for var in NETLIFY_HOOK_URL VERCEL_DEPLOY_HOOK CF_PURGE_URL; do
  url="${!var:-}"
  [[ -z "$url" ]] && continue
  echo "→ POST $url  (event=$event model=$MODEL)"
  if curl -fsS -X POST "$url" -o /dev/null; then
    echo "  ✓ ok"
    fired=$((fired + 1))
  else
    echo "  ✗ failed"
  fi
done

if [[ $fired -eq 0 ]]; then
  echo "No host hook URL configured. Set NETLIFY_HOOK_URL / VERCEL_DEPLOY_HOOK / CF_PURGE_URL in web/.env"
  exit 0
fi
