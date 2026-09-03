// Phase 4 E2E: /api/sessions lifecycle + /api/interruptions.
// Run: dev server chal raha ho, phir `node scripts/test-sessions.mjs`
const BASE = process.env.BASE || 'http://localhost:3000';
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
  const j = await r.json();
  return { status: r.status, j };
}

async function makeTask(title) {
  const { status, j } = await api('/api/tasks', {
    title,
    planned_date: DATE,
    planned_start_time: '10:00',
    planned_duration_min: 25,
  });
  if (status !== 201) throw new Error('task create fail: ' + JSON.stringify(j));
  return j.data.id;
}

async function cleanup(ids) {
  for (const id of ids) {
    await fetch(`${BASE}/api/tasks/${id}`, { method: 'DELETE' });
  }
}

async function main() {
  const created = [];
  try {
    // --- start validation ---
    let r = await api('/api/sessions', { action: 'start', task_id: '00000000-0000-0000-0000-000000000000' });
    check('start galat task → 404', r.status === 404);

    // --- start + idempotent ---
    const t1 = await makeTask('__sess_t1__');
    created.push(t1);
    r = await api('/api/sessions', { action: 'start', task_id: t1 });
    check('start → 201 running', r.status === 201 && r.j.data.status === 'running', JSON.stringify(r.j).slice(0, 120));
    const s1 = r.j.data.id;
    r = await api('/api/sessions', { action: 'start', task_id: t1 });
    check('dobara start → same session', r.status === 200 && r.j.data.id === s1);

    // --- pause validation + pause ---
    r = await api('/api/sessions', { action: 'pause', session_id: s1 });
    check('pause bina reason → 400', r.status === 400);
    r = await api('/api/sessions', {
      action: 'pause', session_id: s1, reason_code: 'phone_social_media', reason_text: 'reel dekhne laga', mood: 2,
    });
    check('pause reason ke saath → 200 + interruption', r.status === 200 && r.j.data.interruption?.reason_code === 'phone_social_media', JSON.stringify(r.j).slice(0, 160));
    r = await api('/api/sessions', { action: 'pause', session_id: s1, reason_code: 'bhookh' });
    check('ruki session dobara pause → 400', r.status === 400);

    // --- resume + resume-guard ---
    r = await api('/api/sessions', { action: 'resume', session_id: s1 });
    check('resume → 200 running', r.status === 200 && r.j.data.session.status === 'running');
    r = await api('/api/sessions', { action: 'resume', session_id: s1 });
    check('running resume → 400', r.status === 400);

    // --- complete validation + complete ---
    r = await api('/api/sessions', { action: 'complete', session_id: s1 });
    check('complete bina feedback → 400', r.status === 400);
    r = await api('/api/sessions', {
      action: 'complete', session_id: s1, difficulty: 4, focus_percent: 70,
      what_helped: 'chai', what_distracted: 'phone', notes: 'ok',
    });
    check('complete feedback ke saath → 200 + completion', r.status === 200 && r.j.data.completion?.difficulty === 4, JSON.stringify(r.j).slice(0, 160));
    check('focus time >= 0', r.j.data.session.total_focus_sec >= 0);
    r = await api('/api/sessions', { action: 'complete', session_id: s1, difficulty: 1, focus_percent: 10 });
    check('band session complete → 400', r.status === 400);
    const list = await (await fetch(`${BASE}/api/tasks?date=${DATE}`)).json();
    check('task completed mark', list.data.find((t) => t.id === t1)?.status === 'completed');

    // --- giveup flow ---
    const t2 = await makeTask('__sess_t2__');
    created.push(t2);
    r = await api('/api/sessions', { action: 'start', task_id: t2 });
    const s2 = r.j.data.id;
    r = await api('/api/sessions', { action: 'giveup', session_id: s2, reason_code: 'mood_nahi' });
    check('giveup → 200 + task failed', r.status === 200 && r.j.data.interruption?.reason_code === 'mood_nahi');
    const list2 = await (await fetch(`${BASE}/api/tasks?date=${DATE}`)).json();
    check('task failed mark', list2.data.find((t) => t.id === t2)?.status === 'failed');

    // --- standalone interruption (skip/missed) ---
    const t3 = await makeTask('__sess_t3__');
    created.push(t3);
    r = await api('/api/interruptions', { task_id: t3, reason_code: 'guest_shor', mood: 3 });
    check('standalone interruption → 201', r.status === 201 && r.j.data.reason_code === 'guest_shor', JSON.stringify(r.j).slice(0, 120));
    r = await api('/api/interruptions', { task_id: t3 });
    check('interruption bina reason → 400', r.status === 400);

    // --- GET open sessions ---
    r = await api('/api/sessions', { action: 'start', task_id: t3 });
    const openRes = await fetch(`${BASE}/api/sessions?date=${DATE}`);
    const openJ = await openRes.json();
    check('GET date → khula session mile', openJ.ok && openJ.data.some((s) => s.task_id === t3));
    const oneRes = await fetch(`${BASE}/api/sessions?task_id=${t3}`);
    const oneJ = await oneRes.json();
    check('GET task_id → session mile', oneJ.ok && oneJ.data?.task_id === t3);
  } finally {
    await cleanup(created);
  }

  console.log(`\nTOTAL: ${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.log('FATAL', e.message);
  process.exit(1);
});
