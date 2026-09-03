import { addDaysISO } from './tasks';

/**
 * Gamification pure logic — UI aur API dono yahi use karte hain.
 * - Score 0–100: 60% completion + 30% focus (60min cap) + 10% clean-day bonus.
 * - Streak: lagatar aise din jinme ≥1 task complete hua (aaj pending chalega).
 * - XP: task complete par 10 + difficulty×2 + focus bonus (20 cap).
 */

export interface ScoreParts {
  completion: number;
  focus: number;
  cleanBonus: number;
}

export function dayScore(args: {
  total: number;
  completed: number;
  focusMin: number;
  failed: number;
  missed: number;
}): { score: number; parts: ScoreParts } {
  const { total, completed, focusMin, failed, missed } = args;
  if (total === 0) return { score: 0, parts: { completion: 0, focus: 0, cleanBonus: 0 } };
  const completion = Math.round((completed / total) * 60);
  const focus = Math.round((Math.min(focusMin, 60) / 60) * 30);
  const cleanBonus = failed === 0 && missed === 0 ? 10 : 0;
  return { score: Math.min(100, completion + focus + cleanBonus), parts: { completion, focus, cleanBonus } };
}

/** days: date(YYYY-MM-DD) → us din completed tasks. */
export function streaks(
  days: Record<string, number>,
  today: string
): { current: number; longest: number; todayDone: boolean } {
  const qual = (d: string) => (days[d] ?? 0) >= 1;
  const todayDone = qual(today);

  let current = 0;
  let cursor = todayDone ? today : addDaysISO(today, -1);
  while (qual(cursor)) {
    current++;
    cursor = addDaysISO(cursor, -1);
  }

  // longest run (poori window me)
  const dates = Object.keys(days).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    if (!qual(d)) {
      run = 0;
      prev = null;
      continue;
    }
    run = prev !== null && addDaysISO(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest, todayDone };
}

export const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 4000];

/** XP → level index (0-based). */
export function levelForXp(xp: number): number {
  let lvl = 0;
  for (let i = 0; i < LEVEL_XP.length; i++) {
    if (xp >= LEVEL_XP[i]) lvl = i;
  }
  return lvl;
}

/** Agle level tak kitna XP baki (max level par null). */
export function xpForNext(xp: number): number | null {
  const lvl = levelForXp(xp);
  if (lvl >= LEVEL_XP.length - 1) return null;
  return LEVEL_XP[lvl + 1] - xp;
}

export function xpForTask(difficulty: number, focusMin: number): number {
  return 10 + difficulty * 2 + Math.min(20, Math.max(0, focusMin));
}
