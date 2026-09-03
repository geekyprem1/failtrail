// AI language toggle test: EN report live + validation.
// Run: dev server chal raha ho (LOGGED-IN session chahiye — browser me login ho to
// devtools se cookie copy karke COOKIE env me do), phir `node scripts/test-ai-lang.mjs`
// Bina session: sirf validation checks chalte hain (401 expected).
// Note: 1 real OpenRouter call hota hai.
const BASE = process.env.BASE || 'http://localhost:3000';
const COOKIE = process.env.COOKIE || '';
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

const H = { 'Content-Type': 'application/json', ...(COOKIE ? { Cookie: COOKIE } : {}) };
async function api(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  return { status: r.status, j: await r.json() };
}
function mondayISO() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  // validation bina session ke bhi 401 se pehle aani chahiye? (auth-first hai → 401)
  // isliye validation test session ke saath hi meaningful hai.
  if (!COOKIE) {
    const r = await api('/api/analyze', { from: mondayISO(), to: todayISO(), lang: 'en' });
    check('bina session analyze → 401', r.status === 401);
    console.log('SKIP: live EN test (COOKIE env me login session cookie do)');
    console.log(`\nTOTAL: ${pass} pass, ${fail} fail`);
    process.exit(fail ? 1 : 0);
  }

  const MON = mondayISO();
  const TODAY = todayISO();

  // setup: 1 task complete
  let r = await api('/api/tasks', {
    title: '__ai_lang_en__', planned_date: TODAY, planned_start_time: '09:00', planned_duration_min: 25,
  });
  if (r.status !== 201) {
    console.log('SETUP-FAIL task', r.status, JSON.stringify(r.j).slice(0, 120));
    process.exit(1);
  }
  const tid = r.j.data.id;
  r = await api('/api/sessions', { action: 'start', task_id: tid });
  const sid = r.j.data.id;
  await api('/api/sessions', { action: 'complete', session_id: sid, difficulty: 3, focus_percent: 75 });

  // bad lang → default hinglish (graceful), range validation still 400
  r = await api('/api/analyze', { from: '2026-01-01', to: '2026-12-31', lang: 'fr' });
  check('lambi range → 400', r.status === 400);

  console.log('live EN call (30-60 sec)...');
  r = await api('/api/analyze', { from: MON, to: TODAY, lang: 'en' });
  check('EN analyze → 200', r.status === 200 && r.j.ok === true, JSON.stringify(r.j).slice(0, 160));
  const ins = r.j.data?.insight;
  check('row lang=en', ins?.lang === 'en', `got ${ins?.lang}`);
  const summary = ins?.ai_summary ?? '';
  const hasDevanagari = /[\u0900-\u097F]/.test(summary);
  check('summary English (no Devanagari)', summary.length > 50 && !hasDevanagari, summary.slice(0, 120));
  if (summary) {
    console.log('\n----- EN SUMMARY -----');
    console.log(summary.slice(0, 600));
    console.log('----------------------\n');
  }

  await fetch(`${BASE}/api/tasks/${tid}`, { method: 'DELETE', headers: H });
  console.log(`\nTOTAL: ${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.log('FATAL', e.message);
  process.exit(1);
});
