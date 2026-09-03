// Phase 6 E2E: /api/analyze (empty-week skip + validations + LIVE AI call) + cron auth.
// Run: dev server chal raha ho, phir `node scripts/test-analyze.mjs`
// Note: 1 real OpenRouter call hota hai (cheap model). Daily cap 3 ka dhyan rakho.
const BASE = 'http://localhost:3000';
const TODAY = '2026-09-03';
const MONDAY = '2026-08-31';
let pass = 0;
let fail = 0;

function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`PASS: ${name}`);
  } else {
    fail++;
    console.log(`FAIL: ${name} ${extra}`);
  }
}

async function api(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, j: await r.json() };
}

async function main() {
  // 1. khali week → skipped, AI call nahi
  let r = await api('/api/analyze', { from: '2020-01-06', to: '2020-01-12' });
  check('khali week → skipped', r.status === 200 && r.j.ok === true && r.j.data.skipped === true, JSON.stringify(r.j).slice(0, 120));

  // 2. validations
  r = await api('/api/analyze', { from: 'kal', to: TODAY });
  check('galat date → 400', r.status === 400);
  r = await api('/api/analyze', { from: '2026-01-01', to: '2026-12-31' });
  check('lambi range → 400', r.status === 400);

  // 3. cron auth
  let c = await fetch(`${BASE}/api/cron/weekly`);
  check('cron bina auth → 401', c.status === 401);
  c = await fetch(`${BASE}/api/cron/weekly`, { headers: { Authorization: 'Bearer galat-secret' } });
  check('cron galat secret → 401', c.status === 401);

  // 4. setup: is week me 1 complete + 1 giveup
  const mk = (title) => api('/api/tasks', {
    title, planned_date: TODAY, planned_start_time: '09:00', planned_duration_min: 25,
    category: 'study', priority: 'high',
  });
  const t1 = (await mk('__ai_complete__')).j.data.id;
  const t2 = (await mk('__ai_giveup__')).j.data.id;
  let s = await api('/api/sessions', { action: 'start', task_id: t1 });
  const s1 = s.j.data.id;
  await api('/api/sessions', { action: 'pause', session_id: s1, reason_code: 'phone_social_media', mood: 2 });
  await api('/api/sessions', { action: 'resume', session_id: s1 });
  await api('/api/sessions', { action: 'complete', session_id: s1, difficulty: 4, focus_percent: 65 });
  s = await api('/api/sessions', { action: 'start', task_id: t2 });
  await api('/api/sessions', { action: 'giveup', session_id: s.j.data.id, reason_code: 'neend_aalsi' });
  console.log('setup done (1 complete + 1 giveup)');

  // 5. LIVE AI call
  console.log('live AI call ja rahi hai (30-60 sec)...');
  r = await api('/api/analyze', { from: MONDAY, to: TODAY });
  check('analyze → 200', r.status === 200 && r.j.ok === true, JSON.stringify(r.j).slice(0, 200));
  const ins = r.j.data?.insight;
  check('insight row mili', !!ins?.id);
  check('summary Hindi/non-empty', typeof ins?.ai_summary === 'string' && ins.ai_summary.length > 50, (ins?.ai_summary ?? '').slice(0, 120));
  check('patterns array', Array.isArray(ins?.patterns) && ins.patterns.length >= 1);
  check('recommendations array', Array.isArray(ins?.recommendations) && ins.recommendations.length >= 1);
  if (ins?.ai_summary) {
    console.log('\n----- AI SUMMARY -----');
    console.log(ins.ai_summary.slice(0, 800));
    console.log('----------------------\n');
  }

  // 6. insights page
  const p = await fetch(`${BASE}/insights`);
  check('/insights page → 200', p.status === 200);

  // cleanup tasks (insight sample ke liye rehne do)
  for (const id of [t1, t2]) await fetch(`${BASE}/api/tasks/${id}`, { method: 'DELETE' });

  console.log(`\nTOTAL: ${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.log('FATAL', e.message);
  process.exit(1);
});
