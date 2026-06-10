// Test login + create read-only API token + write to web/.env
const BASE = 'http://127.0.0.1:1337';

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:1337',
      Referer: 'http://localhost:1337/admin',
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`  ${opts.method || 'GET'} ${path} -> ${res.status}`);
    console.error('  ' + text.slice(0, 400));
    throw new Error('Strapi request failed');
  }
  return text ? JSON.parse(text) : null;
}

console.log('1. Logging in as admin@local...');
const login = await api('/admin/login', {
  method: 'POST',
  body: { email: 'admin@local', password: 'admin1234' },
});
console.log('   Logged in. Token starts with:', login.data.token.slice(0, 20) + '...');
const jwt = login.data.token;

console.log('\n2. Creating (or fetching) read-only API token...');
let accessKey;
try {
  const tok = await api('/admin/api-tokens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: {
      name: 'web-read',
      description: 'Public site read-only access (used by /web at build time)',
      type: 'read-only',
      permissions: null,
      lifespan: null,
    },
  });
  accessKey = tok.data.accessKey;
  console.log('   Token created. Access key:', accessKey.slice(0, 20) + '...');
} catch (e) {
  console.log('   Name taken — fetching existing token...');
  const list = await api('/admin/api-tokens', { headers: { Authorization: `Bearer ${jwt}` } });
  const found = list.data.find((t) => t.name === 'web-read');
  if (!found) throw new Error('Could not find or create web-read token');
  console.log('   Found existing token id:', found.id);
  // Delete the old one and re-create (since the accessKey isn't returned on list)
  await api(`/admin/api-tokens/${found.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const recreated = await api('/admin/api-tokens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: {
      name: 'web-read',
      description: 'Public site read-only access (used by /web at build time)',
      type: 'read-only',
      permissions: null,
      lifespan: null,
    },
  });
  accessKey = recreated.data.accessKey;
  console.log('   Re-created. Access key:', accessKey.slice(0, 20) + '...');
}

console.log('\n3. Writing to web/.env...');
const fs = await import('node:fs');
const envPath = 'web/.env';
let env = fs.readFileSync(envPath, 'utf8');
env = env.replace(/^CMS_READ_TOKEN=.*$/m, `CMS_READ_TOKEN=${accessKey}`);
env = env.replace(/^CMS_MODE=.*$/m, `CMS_MODE=strapi`);
fs.writeFileSync(envPath, env);
console.log('   Updated web/.env');
console.log('   CMS_READ_TOKEN=' + accessKey);
console.log('   CMS_MODE=strapi');

console.log('\n4. Sanity: fetch /api/global-setting with the new token...');
const g = await fetch(`${BASE}/api/global-setting?populate=*`, {
  headers: { Authorization: `Bearer ${accessKey}` },
});
console.log('   GET /api/global-setting ->', g.status);
const gj = await g.json();
console.log('   data:', gj.data ? 'present' : 'empty (expected — DB is fresh)');
