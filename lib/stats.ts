import type { Completion, Interruption, Task, TaskSession } from './types';
import { toMinutes } from './tasks';

export interface WeekStats {
  range: { from: string; to: string };
  total_planned: number;
  completed: number;
  failed: number;
  missed: number;
  skipped: number;
  completion_rate: number;
  total_focus_min: number;
  total_interruptions: number;
  fails_by_reason: Record<string, number>;
  fails_by_hour_slot: Record<string, number>;
  fails_by_category: Record<string, number>;
  avg_mood_on_fail: number | null;
  repeat_failed_titles: string[];
  avg_difficulty_completed: number | null;
  avg_focus_completed: number | null;
}

const FAILED_STATES = new Set(['failed', 'missed', 'skipped']);

/** 4-hour buckets: "00-04" … "20-24". */
function slotOf(time: string): string {
  const h = Math.floor(toMinutes(time) / 60);
  const start = Math.floor(h / 4) * 4;
  return `${String(start).padStart(2, '0')}-${String(start + 4).padStart(2, '0')}`;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

/** Week ka data → compact JSON (token-safe: sirf aggregates, koi free-text nahi). */
export function buildWeekStats(
  from: string,
  to: string,
  tasks: Task[],
  sessions: TaskSession[],
  interruptions: Interruption[],
  completions: Completion[]
): WeekStats {
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const failedTasks = tasks.filter((t) => FAILED_STATES.has(t.status));

  const fails_by_reason: Record<string, number> = {};
  for (const i of interruptions) {
    fails_by_reason[i.reason_code] = (fails_by_reason[i.reason_code] ?? 0) + 1;
  }

  const fails_by_hour_slot: Record<string, number> = {};
  const fails_by_category: Record<string, number> = {};
  for (const t of failedTasks) {
    const slot = slotOf(t.planned_start_time);
    fails_by_hour_slot[slot] = (fails_by_hour_slot[slot] ?? 0) + 1;
    fails_by_category[t.category] = (fails_by_category[t.category] ?? 0) + 1;
  }

  // 2+ baar fail/missed/skip hue titles (repeat offender)
  const titleCounts: Record<string, number> = {};
  const titleOrig: Record<string, string> = {};
  for (const t of failedTasks) {
    const key = t.title.trim().toLowerCase();
    titleCounts[key] = (titleCounts[key] ?? 0) + 1;
    titleOrig[key] = t.title.trim();
  }
  const repeat_failed_titles = Object.entries(titleCounts)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => titleOrig[k]);

  const total_focus_min = Math.floor(
    sessions.reduce((s, x) => s + (x.total_focus_sec ?? 0), 0) / 60
  );

  return {
    range: { from, to },
    total_planned: tasks.length,
    completed,
    failed: tasks.filter((t) => t.status === 'failed').length,
    missed: tasks.filter((t) => t.status === 'missed').length,
    skipped: tasks.filter((t) => t.status === 'skipped').length,
    completion_rate:
      tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100),
    total_focus_min,
    total_interruptions: interruptions.length,
    fails_by_reason,
    fails_by_hour_slot,
    fails_by_category,
    avg_mood_on_fail: avg(
      interruptions.map((i) => i.mood).filter((m): m is number => m != null)
    ),
    repeat_failed_titles,
    avg_difficulty_completed: avg(completions.map((c) => c.difficulty)),
    avg_focus_completed: avg(completions.map((c) => c.focus_percent)),
  };
}
