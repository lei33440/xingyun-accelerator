#!/usr/bin/env node
/**
 * Pulls fresh data from Strapi and writes a JSON snapshot to web/src/content/.
 * The Astro site can read either:
 *   - directly from Strapi at build time (current default), or
 *   - from this snapshot for fully offline builds / PR previews.
 *
 * Usage:
 *   node scripts/sync-cms.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'web', '.env');
const OUT_DIR = path.join(ROOT, 'web', 'src', 'content');

if (fs.existsSync(ENV_PATH)) {
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const BASE = process.env.CMS_BASE_URL || 'http://localhost:1337';
const TOKEN = process.env.CMS_READ_TOKEN || '';

async function get(pathname) {
  const res = await fetch(`${BASE}${pathname}`, {
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
  });
  if (!res.ok) throw new Error(`CMS ${res.status} ${pathname}`);
  return res.json();
}

function strip(e) {
  return e ? { id: e.id, ...e.attributes } : null;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

try {
  const g = await get('/api/global-setting?populate=*');
  fs.writeFileSync(path.join(OUT_DIR, 'global.json'), JSON.stringify(strip(g.data), null, 2));
  console.log('wrote global.json');
} catch (e) {
  console.warn('global-setting skipped:', e.message);
}

try {
  const a = await get('/api/articles?populate=*&pagination[pageSize]=200&sort=publishedAt:desc');
  const arr = (a.data || []).map(strip);
  fs.writeFileSync(path.join(OUT_DIR, 'articles.json'), JSON.stringify(arr, null, 2));
  console.log(`wrote articles.json (${arr.length})`);
} catch (e) {
  console.warn('articles skipped:', e.message);
}

try {
  const p = await get('/api/pricing-plans?sort=order:asc&pagination[pageSize]=200');
  const arr = (p.data || []).map(strip);
  fs.writeFileSync(path.join(OUT_DIR, 'pricing-plans.json'), JSON.stringify(arr, null, 2));
  console.log(`wrote pricing-plans.json (${arr.length})`);
} catch (e) {
  console.warn('pricing-plans skipped:', e.message);
}
