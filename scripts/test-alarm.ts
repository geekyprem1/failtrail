// Phase 3 unit test: alarm pure helpers. Run: npx --yes tsx scripts/test-alarm.ts
import {
  MAX_SNOOZE,
  findMissed,
  findRinging,
  snoozeTime,
} from '../lib/alarm';
import { sessionRemainingSec } from '../lib/tasks';
import type { Task } from '../lib/types';

const DAY = '2026-09-03';

function T(over: Partial<Task> = {}): Task {
  return {
    id: `id-${Math.random().toString(36).slice(2)}`,
    user_id: null,
    title: 't',
    description: '',
    planned_date: DAY,
    planned_start_time: '10:00:00',
    planned_duration_min: 25,
    category: 'study',
    priority: 'medium',
    status: 'planned',
    snooze_count: 0,
    created_at: '',
    ...over,
  };
}

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log(`PASS: ${name}`);
  } else {
    fail++;
    console.log(`FAIL: ${name}`);
  }
}

// ringing window (10:00 start → 600 min)
check('start time par baje', findRinging([T()], DAY, 600).length === 1);
check('1 min baad bhi baje', findRinging([T()], DAY, 601).length === 1);
check('2 min baad na baje', findRinging([T()], DAY, 602).length === 0);
check('pehle na baje', findRinging([T()], DAY, 599).length === 0);
check('running dobara na baje', findRinging([T({ status: 'running' })], DAY, 600).length === 0);
check('ringing state dobara queue na ho', findRinging([T({ status: 'ringing' })], DAY, 600).length === 0);
check('3 snooze ke baad na baje', findRinging([T({ snooze_count: 3 })], DAY, 600).length === 0);
check('kal ka task aaj na baje', findRinging([T({ planned_date: '2026-09-04' })], '2026-09-03', 600).length === 0);

// missed (10:00 + 10 min → 610 se missed)
check('11 min late → missed', findMissed([T()], DAY, 611).length === 1);
check('9 min late → missed nahi', findMissed([T()], DAY, 609).length === 0);
check('completed missed nahi', findMissed([T({ status: 'completed' })], DAY, 611).length === 0);
check('skipped missed nahi', findMissed([T({ status: 'skipped' })], DAY, 611).length === 0);
check('kal ka planned → missed', findMissed([T({ planned_date: '2026-09-02' })], DAY, 60).length === 1);

// snooze
check('snooze +5 min', snoozeTime('10:00:00') === '10:05:00');
check('snooze midnight clamp', snoozeTime('23:58:00') === '23:59:00');
check('MAX_SNOOZE=3', MAX_SNOOZE === 3);

// timer math (reload-proof recalc)
const agoSec = (s: number) => new Date(Date.now() - s * 1000).toISOString();
check(
  'running 60s chala → 1440 bacha',
  sessionRemainingSec(
    { started_at: agoSec(60), paused_total_sec: 0, last_pause_at: null, status: 'running' },
    25
  ) === 1440
);
check(
  'paused frozen rehta',
  sessionRemainingSec(
    { started_at: agoSec(300), paused_total_sec: 100, last_pause_at: agoSec(60), status: 'paused' },
    25
  ) === 1500 - (240 - 100)
);
check(
  'overtime negative',
  sessionRemainingSec(
    { started_at: agoSec(2000), paused_total_sec: 0, last_pause_at: null, status: 'running' },
    25
  ) === -500
);

console.log(`\nTOTAL: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
