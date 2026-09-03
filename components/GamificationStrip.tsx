'use client';

import { useLang } from './LanguageProvider';

export interface GamiData {
  score: number;
  focus_min: number;
  streak: { current: number; longest: number; todayDone: boolean };
  xp: number;
  level: { index: number; xp_for_next: number | null };
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
      <path d="M12 2c1 4-4 6.5-4 12a4.5 4.5 0 0 0 9 .5C17.5 11 14 8.5 14 5c-1 1-1.5 2-2 3z" opacity="0.45" />
      <path d="M12 2C9.5 6.5 6.5 9 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.5 14.5 7 12 2zm0 18.5a3.5 3.5 0 0 1-3.5-3.5c0-2.5 2-4 3.5-6 1.5 2 3.5 3.5 3.5 6A3.5 3.5 0 0 1 12 20.5z" />
    </svg>
  );
}

const LEVEL_BASE = [0, 100, 250, 500, 1000, 2000, 4000];

/** Streak + level + score strip (Today page). */
export default function GamificationStrip({ gami }: { gami: GamiData | null }) {
  const { t } = useLang();
  if (!gami) return null;

  const lvl = gami.level.index;
  const base = LEVEL_BASE[Math.min(lvl, LEVEL_BASE.length - 1)];
  const next = gami.level.xp_for_next;
  const span = next === null ? 1 : next + (gami.xp - base);
  const pct = next === null ? 100 : Math.min(100, Math.round(((gami.xp - base) / span) * 100));

  return (
    <div className="card animate-rise mb-4 flex items-center gap-3 p-3.5">
      <div className="flex shrink-0 flex-col items-center">
        <span className={gami.streak.current > 0 ? 'text-orange-500' : 'text-zinc-300'}>
          <FlameIcon />
        </span>
        <p className="font-display text-lg font-black leading-none tabular-nums text-zinc-900">
          {gami.streak.current}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
          {t.gami.streakLabel}
        </p>
      </div>

      <div className="h-12 w-px shrink-0 bg-zinc-100" />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-extrabold tracking-tight text-zinc-900">
            {t.gami.levels[Math.min(lvl, t.gami.levels.length - 1)]}
          </p>
          <p className="shrink-0 text-[11px] font-bold tabular-nums text-indigo-600">
            {gami.xp} XP{next !== null ? ` · ${t.gami.next(next)}` : ` · ${t.gami.maxed}`}
          </p>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] font-semibold text-zinc-500">
          {gami.streak.todayDone
            ? t.gami.todayDone
            : gami.streak.current > 0
              ? t.gami.todayPending
              : t.gami.noStreak}
          {gami.streak.longest > gami.streak.current &&
            ` · ${t.gami.best}: ${gami.streak.longest}`}
        </p>
      </div>

      <div className="h-12 w-px shrink-0 bg-zinc-100" />

      <div className="flex shrink-0 flex-col items-center">
        <p className="font-display bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-2xl font-black leading-none tabular-nums text-transparent">
          {gami.score}
        </p>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
          {t.gami.score}
        </p>
      </div>
    </div>
  );
}
