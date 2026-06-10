/**
 * Build-time CMS client. Reads from Strapi over HTTP, with a graceful
 * fallback to a local mock store when CMS_MODE=mock or when no token
 * is configured (handy for local dev / first-run preview).
 *
 * NEVER bundle this into the client.
 */
import { mockCms } from './mock-cms';

// Astro exposes .env vars through import.meta.env. We also fall back to
// process.env so this module can be used outside Astro (scripts, etc).
const meta = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const env = {
  CMS_BASE_URL: meta.CMS_BASE_URL || process.env.CMS_BASE_URL,
  CMS_READ_TOKEN: meta.CMS_READ_TOKEN || process.env.CMS_READ_TOKEN,
  CMS_MODE: meta.CMS_MODE || process.env.CMS_MODE,
};
const useMock =
  (env.CMS_MODE || '').toLowerCase() === 'mock' || !env.CMS_READ_TOKEN;

if (useMock) {
  // eslint-disable-next-line no-console
  console.log('[cms] using local mock store (no Strapi token configured)');
}

const BASE = env.CMS_BASE_URL || 'http://localhost:1337';
const TOKEN = env.CMS_READ_TOKEN || '';

async function strapi(pathname, init = {}) {
  const url = `${BASE.replace(/\/$/, '')}${pathname}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`CMS ${res.status} ${url} :: ${text.slice(0, 200)}`);
  }
  return res.json();
}

const strip = (e) => (e ? { id: e.id, ...e.attributes } : null);

export async function getGlobalSettings() {
  if (useMock) return mockCms.getGlobalSettings();
  try {
    const json = await strapi('/api/global-setting?populate=*');
    return strip(json?.data) || {};
  } catch (e) {
    console.warn('[cms] global-setting unavailable, using defaults:', e.message);
    return {
      siteName: 'NovaProxy',
      siteTagline: 'Residential & Datacenter Proxies, Engineered for Engineers.',
    };
  }
}

export async function getAllArticles() {
  if (useMock) return mockCms.getAllArticles();
  try {
    const json = await strapi(
      '/api/articles?sort=publishedAt:desc&pagination[pageSize]=100&populate=*',
    );
    return (json?.data || []).map(strip);
  } catch (e) {
    console.warn('[cms] articles unavailable:', e.message);
    return [];
  }
}

export async function getArticleBySlug(slug) {
  if (useMock) return mockCms.getArticleBySlug(slug);
  try {
    const json = await strapi(
      `/api/articles?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`,
    );
    const item = (json?.data || [])[0];
    return item ? strip(item) : null;
  } catch (e) {
    console.warn(`[cms] article ${slug} unavailable:`, e.message);
    return null;
  }
}

export async function getAllPricingPlans() {
  if (useMock) return mockCms.getAllPricingPlans();
  try {
    const json = await strapi(
      '/api/pricing-plans?sort=order:asc&pagination[pageSize]=100',
    );
    return (json?.data || []).map(strip);
  } catch (e) {
    console.warn('[cms] pricing-plans unavailable:', e.message);
    return [];
  }
}

export async function getAllClientDownloads() {
  if (useMock) return mockCms.getAllClientDownloads();
  try {
    const json = await strapi(
      '/api/client-downloads?sort=order:asc&pagination[pageSize]=100&populate=*',
    );
    return (json?.data || []).map(strip);
  } catch (e) {
    console.warn('[cms] client-downloads unavailable:', e.message);
    return [];
  }
}

export const cmsMode = useMock ? 'mock' : 'strapi';
