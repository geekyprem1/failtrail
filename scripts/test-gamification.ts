// Gamification pure-logic tests. Run: npx --yes tsx scripts/test-gamification.ts
import { dayScore, levelForXp, streaks, xpForNext, xpForTask } from '../lib/gamification';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) {
    pass++;
    console.log(`PASS: ${name}`);
  } else {
    fail++;
    console.log(`FAIL: ${name} ${extra}`);
  }
}

// score: 60% completion + 30% focus(60cap) + 10 clean bonus
let s = dayScore({ total: 4, completed: 4, focusMin: 60, failed: 0, missed: 0 });
check('perfect day = 100', s.score === 100, `got ${s.score}`);
s = dayScore({ total: 0, completed: 0, focusMin: 0, failed: 0, missed: 0 });
check('empty day = 0', s.score === 0);
s = dayScore({ total: 4, completed: 2, focusMin: 30, failed: 1, missed: 0 });
check('half day = 30+15+0', s.score === 45, `got ${s.score}`);
s = dayScore({ total: 2, completed: 1, focusMin: 600, failed: 0, missed: 0 });
check('focus capped 60', s.score === 30 + 30 + 10, `got ${s.score}`);

// streaks
check(
  '3-day run',
  JSON.stringify(streaks({ '2026-09-01': 1, '2026-09-02': 2, '2026-09-03': 1 }, '2026-09-03')) ===
    JSON.stringify({ current: 3, longest: 3, todayDone: true })
);
let st = streaks({ '2026-09-01': 1, '2026-09-02': 1 }, '2026-09-03');
check('today pending keeps streak', st.current === 2 && st.todayDone === false, JSON.stringify(st));
st = streaks({ '2026-08-28': 1, '2026-08-29': 1, '2026-08-30': 1, '2026-09-02': 1 }, '2026-09-03');
check('gap resets current, longest kept', st.current === 1 && st.longest === 3, JSON.stringify(st));
st = streaks({}, '2026-09-03');
check('no data = zeros', st.current === 0 && st.longest === 0 && !st.todayDone);

// levels
check('lvl 0 @0xp', levelForXp(0) === 0);
check('lvl 0 @99xp', levelForXp(99) === 0);
check('lvl 1 @100xp', levelForXp(100) === 1);
check('lvl 5 @3999xp', levelForXp(3999) === 5);
check('lvl 6 @4000xp', levelForXp(4000) === 6);
check('lvl cap', levelForXp(99999) === 6);
check('next @90xp = 10', xpForNext(90) === 10);
check('next @max = null', xpForNext(5000) === null);

// xp per task
check('xp diff3 focus25 = 36', xpForTask(3, 25) === 36);
check('xp diff1 focus0 = 12', xpForTask(1, 0) === 12);
check('xp focus capped', xpForTask(5, 500) === 10 + 10 + 20);

console.log(`\nTOTAL: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
