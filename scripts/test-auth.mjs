// Auth guard test: bina login har protected API 401 de.
// Run: koi bhi server (local/prod), `node scripts/test-auth.mjs` / `BASE=https://... node scripts/test-auth.mjs`
const BASE = process.env.BASE || 'http://localhost:3000';
const ID = '00000000-0000-0000-0000-000000000000';
let pass = 0;
let fail = 0;

async function check(name, fn, want) {
  try {
    const status = await fn();
    if (status === want) {
      pass++;
      console.log(`PASS: ${name} → ${status}`);
    } else {
      fail++;
      console.log(`FAIL: ${name} → ${status} (chahiye ${want})`);
    }
  } catch (e) {
    fail++;
    console.log(`FAIL: ${name} → ${e.message}`);
  }
}

async function main() {
  const get = async (p) => (await fetch(`${BASE}${p}`)).status;
  const post = async (p, b) =>
    (await fetch(`${BASE}${p}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(b),
    })).status;

  await check('GET tasks bina login → 401', () => get('/api/tasks?date=2026-09-03'), 401);
  await check('POST tasks bina login → 401', () => post('/api/tasks', { title: 'x' }), 401);
  await check('PATCH task bina login → 401', async () =>
    (await fetch(`${BASE}/api/tasks/${ID}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  await check('DELETE task bina login → 401', async () =>
    (await fetch(`${BASE}/api/tasks/${ID}`, { method: 'DELETE' })).status, 401);
  await check('POST sessions bina login → 401', () => post('/api/sessions', { action: 'start', task_id: ID }), 401);
  await check('POST interruptions bina login → 401', () => post('/api/interruptions', { task_id: ID }), 401);
  await check('GET stats bina login → 401', () => get('/api/stats?date=2026-09-03'), 401);
  await check('GET history bina login → 401', () => get('/api/history?from=2026-09-01&to=2026-09-03'), 401);
  await check('POST analyze bina login → 401', () => post('/api/analyze', {}), 401);
  await check('GET analyze bina login → 401', () => get('/api/analyze'), 401);
  await check('POST claim bina login → 401', () => post('/api/auth/claim', {}), 401);
  await check('/login page → 200', () => get('/login'), 200);

  console.log(`\nTOTAL: ${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.log('FATAL', e.message);
  process.exit(1);
});
