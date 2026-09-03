// Pending-status check: migrations run hui? keys hain? prod auth pages live?
// Run: node scripts/check-prod-status.mjs [BASE]
// Sirf booleans/status print karta hai — koi secret print nahi hota.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || process.env.BASE || 'https://failtrail-tau.vercel.app';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env.local'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' };
const out = (k, v) => console.log(`${v === true ? 'YES' : v === false ? 'NO ' : 'INF'}: ${k}${typeof v === 'string' ? ` (${v})` : ''}`);

console.log('--- local env ---');
out('local service-role key', !!env.SUPABASE_SERVICE_ROLE_KEY);
out('local cron secret', !!env.CRON_SECRET);

console.log('--- supabase schema (anon key se probe) ---');
// a. weekly_insights.user_id column?
try {
  const r = await fetch(`${url}/rest/v1/weekly_insights?select=user_id&limit=1`, { headers: H });
  out('auth migration (user_id col)', r.ok);
} catch { out('auth migration (user_id col)', false); }
// b. xp_events table?
try {
  const r = await fetch(`${url}/rest/v1/xp_events?select=id&limit=1`, { headers: H });
  out('gamification migration (xp_events)', r.ok);
} catch { out('gamification migration (xp_events)', false); }
// c. claim_my_data function?
try {
  const r = await fetch(`${url}/rest/v1/rpc/claim_my_data`, { method: 'POST', headers: H, body: '{}' });
  const b = await r.text();
  out('claim function', r.ok ? true : `HTTP ${r.status} ${b.slice(0, 80)}`);
} catch (e) { out('claim function', `ERR ${e.message}`); }
// d. anon INSERT — success = purani v1_open policies (migration PENDING), 42501 = nayi RLS active
try {
  const r = await fetch(`${url}/rest/v1/tasks`, {
    method: 'POST', headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ title: '__probe__', planned_date: '2026-09-03', planned_start_time: '10:00', planned_duration_min: 25 }),
  });
  if (r.ok) {
    const rows = await r.json();
    await fetch(`${url}/rest/v1/tasks?id=eq.${rows[0].id}`, { method: 'DELETE', headers: H });
    out('RLS enforced (anon insert blocked)', false);
  } else {
    out('RLS enforced (anon insert blocked)', r.status === 401 || r.status === 403);
  }
} catch (e) { out('RLS enforced (anon insert blocked)', `ERR ${e.message}`); }

console.log('--- prod app ---');
for (const p of ['/login', '/api/gamification?date=2026-09-03']) {
  try {
    const r = await fetch(`${BASE}${p}`);
    out(`GET ${p}`, `HTTP ${r.status}`);
  } catch (e) { out(`GET ${p}`, `ERR ${e.message}`); }
}
try {
  const r = await fetch(`${BASE}/auth/callback`, { redirect: 'manual' });
  const loc = r.headers.get('location') || '';
  out('callback redirects to login', r.status >= 300 && r.status < 400 && loc.includes('/login') ? true : `HTTP ${r.status} -> ${loc}`);
} catch (e) { out('callback redirects to login', `ERR ${e.message}`); }
