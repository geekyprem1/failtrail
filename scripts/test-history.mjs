// Phase 5 E2E: /api/stats + /api/history.
// Run: dev server chal raha ho, phir `node scripts/test-history.mjs`
const BASE = 'http://localhost:3000';
const DATE = '2026-09-03';
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
  // validation
  let r = await fetch(`${BASE}/api/stats`);
  check('stats bina date → 400', r.status === 400);
  r = await fetch(`${BASE}/api/history?from=${DATE}`);
  check('history bina to → 400', r.status === 400);
  r = await fetch(`${BASE}/api/history?from=${DATE}&to=2026-09-02`);
  check('history from>to → 400', r.status === 400);
  r = await fetch(`${BASE}/api/history?from=2026-01-01&to=2026-12-31`);
  check('history bada range → 400', r.status === 400);

  // data banao: 1 complete (focus ke saath) + 1 interruption
  const t1 = await api('/api/tasks', {
    title: '__hist_complete__', planned_date: DATE, planned_start_time: '09:00', planned_duration_min: 25,
  });
  const t2 = await api('/api/tasks', {
    title: '__hist_fail__', planned_date: DATE, planned_start_time: '11:00', planned_duration_min: 25,
  });
  const id1 = t1.j.data.id;
  const id2 = t2.j.data.id;

  let s = await api('/api/sessions', { action: 'start', task_id: id1 });
  const s1 = s.j.data.id;
  await new Promise((res) => setTimeout(res, 1500));
  s = await api('/api/sessions', {
    action: 'pause', session_id: s1, reason_code: 'phone_social_media', mood: 2,
  });
  check('setup pause → interruption bani', s.status === 200 && !!s.j.data.interruption?.id);
  s = await api('/api/sessions', { action: 'resume', session_id: s1 });
  check('setup resume → 200', s.status === 200);
  s = await api('/api/sessions', { action: 'complete', session_id: s1, difficulty: 3, focus_percent: 80 });
  check('setup complete → 200', s.status === 200);

  // stats
  r = await fetch(`${BASE}/api/stats?date=${DATE}`);
  const st = await r.json();
  check('stats → 200 + shape', r.status === 200 && st.ok && typeof st.data.completion_rate === 'number', JSON.stringify(st.data).slice(0, 160));
  check('stats completed>=1', st.data.completed >= 1);
  check('stats interruptions>=1', st.data.interruptions >= 1);
  check('stats rate 0-100', st.data.completion_rate >= 0 && st.data.completion_rate <= 100);

  // history
  r = await fetch(`${BASE}/api/history?from=${DATE}&to=${DATE}`);
  const h = await r.json();
  check('history → 200 + 3 arrays', r.status === 200 && h.ok && Array.isArray(h.data.tasks) && Array.isArray(h.data.interruptions) && Array.isArray(h.data.completions));
  check('history me task dikhe', h.data.tasks.some((t) => t.id === id1 || t.id === id2));
  check('history me interruption dikhe', h.data.interruptions.some((i) => i.task_id === id1 && i.reason_code === 'phone_social_media'));
  check('history me completion dikhe', h.data.completions.some((c) => c.task_id === id1 && c.focus_percent === 80));

  // history page SSR
  r = await fetch(`${BASE}/history`);
  check('/history page → 200', r.status === 200);

  // cleanup
  for (const id of [id1, id2]) await fetch(`${BASE}/api/tasks/${id}`, { method: 'DELETE' });

  console.log(`\nTOTAL: ${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.log('FATAL', e.message);
  process.exit(1);
});
