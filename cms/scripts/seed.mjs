/**
 * Seed the Strapi DB with sample Articles, PricingPlans, and GlobalSettings.
 * Requires a FULL-ACCESS API token (not the read-only web-read token).
 *
 * Usage:
 *   1. Start CMS:    npm run cms:dev
 *   2. Create the first admin user in the browser at http://localhost:1337/admin
 *   3. In Strapi admin: Settings -> API Tokens -> Create new
 *        Name:        seed-script
 *        Type:        Full access
 *        Duration:    Unlimited (or 24h for safety)
 *        Copy token   ->  put in cms/.env as STRAPI_READ_TOKEN
 *   4. Then run:     npm run cms:seed
 *
 *   5. After seeding, create a SECOND token of Type "Read-only" called
 *      "web-read" and use THAT for the public Astro build via web/.env
 *      (CMS_READ_TOKEN). The full-access token is only used by this script.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const BASE = process.env.STRAPI_URL || 'http://localhost:1337';
const TOKEN = process.env.STRAPI_READ_TOKEN;
if (!TOKEN) {
  console.error('STRAPI_READ_TOKEN is missing in cms/.env');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
};

async function api(method, url, body) {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`${method} ${url} -> ${res.status}`);
    console.error(text);
    throw new Error('Strapi request failed');
  }
  return text ? JSON.parse(text) : null;
}

async function upsertGlobal() {
  const data = {
    siteName: 'NovaProxy',
    siteTagline: 'Residential & Datacenter Proxies, Engineered for Engineers.',
    supportEmail: 'support@novaproxy.example',
    telegramLink: 'https://t.me/novaproxy_support',
    discordInvite: 'https://discord.gg/novaproxy',
    whatsappNumber: '+1-555-0100',
    wechatId: 'novaproxy_cs',
    noticeBanner: 'New Year Promo: extra 20% traffic on 100GB+ plans — contact sales.',
    noticeEnabled: true,
    showPricingModule: true,
    showBlogModule: true,
    showMockGenerator: true,
    defaultSeoTitle: 'NovaProxy — High-quality Residential & Datacenter Proxies',
    defaultSeoDescription:
      '190+ countries, unlimited concurrency, sub-second latency. Trusted by data teams and indie engineers.',
    footerCopy: '© NovaProxy. All rights reserved.',
  };
  await api('PUT', '/api/global-setting', { data });
  console.log('Global settings updated.');
}

async function seedPlans() {
  const plans = [
    {
      name: 'Starter',
      subtitle: 'For solo developers & small scripts.',
      ipType: 'Dynamic Residential',
      price: 4.5,
      unit: 'GB',
      minVolume: 1,
      highlight: false,
      features: ['190+ countries', 'SOCKS5 / HTTP(s)', 'Unlimited concurrency', 'IP rotation every request'],
      ctaLabel: 'Get Started',
      ctaLink: 'https://t.me/novaproxy_support?text=Starter',
      order: 1,
    },
    {
      name: 'Pro',
      subtitle: 'For scraping teams running 24/7.',
      ipType: 'Dynamic Residential',
      price: 3.8,
      unit: 'GB',
      minVolume: 10,
      highlight: true,
      badge: 'Most Popular',
      features: [
        'Everything in Starter',
        'Sticky sessions up to 30 min',
        'City-level targeting',
        'Priority queue',
        'Dedicated account manager',
      ],
      ctaLabel: 'Apply for Trial',
      ctaLink: 'https://t.me/novaproxy_support?text=Pro',
      order: 2,
    },
    {
      name: 'Enterprise',
      subtitle: 'For platform-grade workloads.',
      ipType: 'AnyTLS High-Anonymity',
      price: 99,
      unit: 'Month',
      minVolume: 1,
      highlight: false,
      features: [
        'Dedicated AnyTLS pool',
        '99.95% uptime SLA',
        'Custom rotation rules',
        'Whitelisted IPs',
        'On-prem deployment option',
      ],
      ctaLabel: 'Contact Sales',
      ctaLink: 'https://t.me/novaproxy_sales?text=Enterprise',
      order: 3,
    },
  ];

  for (const data of plans) {
    await api('POST', '/api/pricing-plans', { data });
  }
  console.log(`Seeded ${plans.length} pricing plans.`);
}

async function seedArticles() {
  const articles = [
    {
      title: 'What is a Residential Proxy and How Does It Work?',
      slug: 'what-is-residential-proxy',
      excerpt:
        'A plain-English walkthrough of residential IPs, ISP-issued addresses, and why they look like real users to the target site.',
      category: 'Guides',
      tags: ['residential', 'fundamentals'],
      readingMinutes: 6,
      content: `## What makes a proxy "residential"?\n\nA residential proxy is an IP address issued by an ISP to a real homeowner. When you route traffic through it, the destination website sees a request coming from an ordinary household connection instead of a datacenter.\n\n### Why it matters\n- **Trust score:** most anti-bot systems tier datacenter IPs lower.\n- **Geo fidelity:** you can pick a city, not just a country.\n- **Lower ban rate:** legitimate fingerprint = fewer CAPTCHAs.\n\n## How the pool works\n\n1. NovaProxy peers with vetted SDK partners who explicitly opt in.\n2. Each session is logged, encrypted, and rate-limited per node.\n3. You authenticate with `user:pass` or IP whitelisting, then call the gateway.\n\n## Quick start\n\n\`\`\`bash\ncurl -x user:pass@gw.novaproxy.example:8000 https://httpbin.org/ip\n\`\`\`\n\nThat's it — the response will be the IP of a real residential node, rotated per request.`,
      seoTitle: 'What is a Residential Proxy? (Plain English Guide)',
      seoDescription:
        'Learn what residential proxies are, how they differ from datacenter IPs, and how to start using one in 60 seconds.',
      seoKeywords: 'residential proxy, what is residential ip, proxy fundamentals',
    },
    {
      title: 'Sticky vs Rotating Sessions: When to Use Each',
      slug: 'sticky-vs-rotating-sessions',
      excerpt:
        'Rotating every request is great for scraping, but logins and carts need stickiness. Here is how to pick.',
      category: 'Engineering',
      tags: ['sessions', 'scraping'],
      readingMinutes: 5,
      content: `## The two modes\n\n- **Rotating:** new IP per request. Great for price aggregation.\n- **Sticky:** same IP for N seconds/minutes. Required for any multi-step flow.\n\n## In NovaProxy\n\nJust pass a session id:\n\n\`\`\`\ncurl -x user:pass-session=abc123@gw:8000 https://example.com/cart\n\`\`\`\n\nThe session persists for up to 30 minutes on the Pro plan.`,
      seoTitle: 'Sticky vs Rotating Proxy Sessions',
      seoDescription: 'Pick the right proxy session mode for your scraping workload.',
      seoKeywords: 'sticky session, rotating proxy, scraping',
    },
    {
      title: 'Geo-targeting 190+ Countries Without Breaking the Bank',
      slug: 'geo-targeting-without-breaking-the-bank',
      excerpt: 'Country-level targeting sounds expensive. With the right routing it does not have to be.',
      category: 'Tips',
      tags: ['geo', 'cost'],
      readingMinutes: 4,
      content: `## Tiered pricing, not blanket pricing\n\nNovaProxy routes tier-1 countries (US, DE, JP, GB) over premium pools and tier-2/3 countries over community pools — both are residential, but cost differs.\n\n## Force country in your request\n\n\`\`\`\ncurl -x user:pass-country-DE@gw:8000 https://example.de\n\`\`\`\n\nYou can combine: \`country-DE-session=xyz-city-berlin\`.`,
      seoTitle: 'Geo-targeting Proxies Cost-effectively',
      seoDescription: 'How to target specific countries with residential proxies while keeping cost low.',
      seoKeywords: 'geo targeting, country proxy, residential ip cost',
    },
  ];

  for (const data of articles) {
    await api('POST', '/api/articles', { data });
  }
  console.log(`Seeded ${articles.length} articles.`);
}

async function main() {
  await upsertGlobal();
  await seedPlans();
  await seedArticles();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
