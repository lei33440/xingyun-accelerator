#!/usr/bin/env node
/**
 * On-demand revalidation: ask the static host to invalidate the site's cache
 * (or trigger a rebuild) after content changes in Strapi.
 *
 * Configure one of the following env vars to match your host:
 *   - NETLIFY_HOOK_URL   (Netlify build hook)
 *   - VERCEL_DEPLOY_HOOK (Vercel deploy hook)
 *   - CF_PURGE_URL       (Cloudflare cache purge endpoint)
 *
 * Exit code 0 = success. Strapi will retry on non-zero.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', 'web', '.env');
if (fs.existsSync(ENV_PATH)) {
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const event = process.argv[2] || 'unknown';
const model = process.argv[3] || 'unknown';

const targets = [
  ['NETLIFY_HOOK_URL',    'Netlify',    (url) => fetch(url, { method: 'POST' })],
  ['VERCEL_DEPLOY_HOOK',  'Vercel',     (url) => fetch(url, { method: 'POST' })],
  ['CF_PURGE_URL',        'Cloudflare', (url) => fetch(url, { method: 'POST' })],
];

const runs = [];
for (const [key, label, send] of targets) {
  const url = process.env[key];
  if (!url) continue;
  runs.push(
    send(url)
      .then((r) => console.log(`[${label}] ${r.status}`))
      .catch((e) => console.error(`[${label}] failed: ${e.message}`)),
  );
}

if (runs.length === 0) {
  console.log(`[revalidate] no host hook configured. event=${event} model=${model}`);
  process.exit(0);
}

await Promise.allSettled(runs);
console.log(`[revalidate] done for event=${event} model=${model}`);
