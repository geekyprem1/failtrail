'use client';

import { useLang } from './LanguageProvider';

export interface DayStats {
  date: string;
  total: number;
  completed: number;
  failed: number;
  missed: number;
  skipped: number;
  running: number;
  completion_rate: number;
  focus_min: number;
  interruptions: number;
}

/** Today strip: Completion % | Focus time | Fail count | Planned. */
export default function StatsStrip({ stats }: { stats: DayStats | null }) {
  const { t } = useLang();
  if (!stats || stats.total === 0) return null;
  const tiles = [
    { label: t.stats.complete, value: `${stats.completion_rate}%`, grad: 'from-emerald-500 to-green-500' },
    { label: t.stats.focus, value: `${stats.focus_min}${t.common.min}`, grad: 'from-blue-500 to-indigo-500' },
    { label: t.stats.fail, value: String(stats.failed + stats.missed), grad: 'from-red-500 to-orange-500' },
    { label: t.stats.planned, value: String(stats.total), grad: 'from-slate-500 to-zinc-600' },
  ];
  return (
    <div className="mb-4 grid grid-cols-4 gap-2">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="card animate-rise p-2.5 text-center"
        >
          <p
            className={`bg-gradient-to-r ${tile.grad} bg-clip-text text-xl font-black tabular-nums text-transparent`}
          >
            {tile.value}
          </p>
          <p className="text-[11px] font-semibold text-zinc-500">{tile.label}</p>
        </div>
      ))}
    </div>
  );
}
