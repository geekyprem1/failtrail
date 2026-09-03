// Phase 2 E2E: /api/tasks CRUD roundtrip against dev server (http://localhost:3000).
// Run: dev server chal raha ho, phir `node scripts/test-tasks.mjs`
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

async function main() {
  // 1. GET bina date → 400
  let r = await fetch(`${BASE}/api/tasks`);
  check('GET bina date → 400', r.status === 400);

  // 2. GET galat date → 400
  r = await fetch(`${BASE}/api/tasks?date=tomorrow`);
  check('GET galat date → 400', r.status === 400);

  // 3. GET sahi date → 200 {ok:true, array}
  r = await fetch(`${BASE}/api/tasks?date=${DATE}`);
  let j = await r.json();
  check('GET sahi date → 200 + array', r.status === 200 && j.ok === true && Array.isArray(j.data), JSON.stringify(j).slice(0, 120));

  // 4. POST khali title → 400
  r = await fetch(`${BASE}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '', planned_date: DATE, planned_start_time: '10:00', planned_duration_min: 25 }),
  });
  j = await r.json();
  check('POST khali title → 400', r.status === 400 && j.ok === false);

  // 5. POST duration 2 min → 400
  r = await fetch(`${BASE}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'x', planned_date: DATE, planned_start_time: '10:00', planned_duration_min: 2 }),
  });
  check('POST duration<5 → 400', r.status === 400);

  // 6. POST valid → 201 (policies chahiye — RLS fix ke baad pass)
  r = await fetch(`${BASE}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '__e2e_test__',
      planned_date: DATE,
      planned_start_time: '10:00',
      planned_duration_min: 25,
      category: 'study',
      priority: 'high',
    }),
  });
  j = await r.json();
  check('POST valid → 201', r.status === 201 && j.ok === true, JSON.stringify(j).slice(0, 160));
  if (!j.ok) {
    console.log('\nWRITE-PATH BLOCKED (policies pending). Baaki tests skip.');
    console.log(`\nTOTAL: ${pass} pass, ${fail} fail`);
    process.exit(2);
  }
  const id = j.data.id;

  // 7. PATCH title → 200
  r = await fetch(`${BASE}/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '__e2e_test_edited__' }),
  });
  j = await r.json();
  check('PATCH title → 200 + updated', r.status === 200 && j.data.title === '__e2e_test_edited__', JSON.stringify(j).slice(0, 120));

  // 8. DELETE → 200, phir GET me na dikhe
  r = await fetch(`${BASE}/api/tasks/${id}`, { method: 'DELETE' });
  j = await r.json();
  check('DELETE → 200', r.status === 200 && j.ok === true);
  r = await fetch(`${BASE}/api/tasks?date=${DATE}`);
  j = await r.json();
  check('DELETE ke baad list me nahi', !j.data.some((t) => t.id === id));

  console.log(`\nTOTAL: ${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.log('FATAL', e.message);
  process.exit(1);
});
