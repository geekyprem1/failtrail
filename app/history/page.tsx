'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDaysISO, todayISO } from '@/lib/tasks';
import RequireAuth from '@/components/RequireAuth';
import { useLang } from '@/components/LanguageProvider';
import type {
  Category,
  Completion,
  Interruption,
  ReasonCode,
  Task,
  TaskStatus,
} from '@/lib/types';

interface HistoryData {
  tasks: Task[];
  interruptions: Interruption[];
  completions: Completion[];
}

const CATEGORIES: Category[] = ['study', 'work', 'health', 'other'];
const STATUSES: TaskStatus[] = [
  'planned',
  'ringing',
  'running',
  'paused',
  'completed',
  'failed',
  'skipped',
  'missed',
];

function shortDate(iso: string, lang: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'en' ? 'en-US' : 'hi-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export default function HistoryPage() {
  const { t, lang } = useLang();
  const [preset, setPreset] = useState<7 | 30>(7);
  const [data, setData] = useState<HistoryData>({ tasks: [], interruptions: [], completions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cat, setCat] = useState<'all' | Category>('all');
  const [status, setStatus] = useState<'all' | TaskStatus>('all');
  const [reason, setReason] = useState<'all' | ReasonCode>('all');

  const to = todayISO();
  const from = addDaysISO(to, -(preset - 1));
  const REASONS = Object.keys(t.reasons) as ReasonCode[];

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/history?from=${from}&to=${to}`);
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Load fail ho gaya');
      setData(j.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load fail ho gaya');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const taskById = useMemo(() => {
    const m: Record<string, Task> = {};
    for (const task of data.tasks) m[task.id] = task;
    return m;
  }, [data.tasks]);

  const filteredTasks = useMemo(
    () =>
      data.tasks.filter(
        (task) =>
          (cat === 'all' || task.category === cat) && (status === 'all' || task.status === status)
      ),
    [data.tasks, cat, status]
  );

  const failures = useMemo(
    () =>
      data.interruptions.filter((i) => {
        if (reason !== 'all' && i.reason_code !== reason) return false;
        const task = taskById[i.task_id];
        if (!task) return false;
        return cat === 'all' || task.category === cat;
      }),
    [data.interruptions, reason, cat, taskById]
  );

  const successes = useMemo(
    () =>
      data.completions.filter((c) => {
        const task = taskById[c.task_id];
        if (!task) return false;
        return cat === 'all' || task.category === cat;
      }),
    [data.completions, cat, taskById]
  );

  const topReason = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of data.interruptions) counts[i.reason_code] = (counts[i.reason_code] ?? 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? { code: top[0] as ReasonCode, n: top[1] } : null;
  }, [data.interruptions]);

  const selCls = 'input rounded-xl py-2 text-xs font-semibold';

  return (
    <RequireAuth>
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-10 pt-6">
      <header className="mb-5">
        <h1 className="bg-gradient-to-r from-indigo-700 via-violet-600 to-indigo-700 bg-clip-text text-[1.7rem] font-black leading-tight tracking-tight text-transparent">
          {t.history.title}
        </h1>
        <p className="mt-0.5 text-xs font-medium text-zinc-500">{t.history.sub}</p>
      </header>

      <div className="mb-4 flex gap-2">
        {[7, 30].map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p as 7 | 30)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
              preset === p
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-white/80 text-zinc-600 shadow-sm hover:bg-white'
            }`}
          >
            {p === 7 ? t.history.last7 : t.history.last30}
          </button>
        ))}
      </div>

      {error && (
        <p className="banner border border-red-200 bg-red-50 font-medium text-red-700">{error}</p>
      )}

      {loading ? (
        <div className="card flex items-center justify-center gap-2 p-6 text-sm font-medium text-zinc-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
          {t.common.loading}
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { v: data.tasks.length, l: t.history.tasks, g: 'from-slate-500 to-zinc-600' },
              { v: data.completions.length, l: t.history.complete, g: 'from-emerald-500 to-green-600' },
              { v: data.interruptions.length, l: t.history.interruptions, g: 'from-red-500 to-orange-500' },
            ].map((s) => (
              <div key={s.l} className="card animate-rise p-2.5 text-center">
                <p className={`bg-gradient-to-r ${s.g} bg-clip-text text-2xl font-black tabular-nums text-transparent`}>
                  {s.v}
                </p>
                <p className="text-[11px] font-semibold text-zinc-500">{s.l}</p>
              </div>
            ))}
          </div>

          {topReason && (
            <p className="banner animate-rise border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 font-medium text-red-800">
              <span>
                {t.history.topFail}: <b>{t.reasons[topReason.code]}</b> ({topReason.n} {t.history.times})
              </span>
            </p>
          )}

          <div className="mb-5 grid grid-cols-3 gap-2">
            <select value={cat} onChange={(e) => setCat(e.target.value as 'all' | Category)} className={selCls}>
              <option value="all">{t.history.allCat}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{t.cats[c]}</option>
              ))}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'all' | TaskStatus)} className={selCls}>
              <option value="all">{t.history.allStatus}</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>{t.status[st]}</option>
              ))}
            </select>
            <select value={reason} onChange={(e) => setReason(e.target.value as 'all' | ReasonCode)} className={selCls}>
              <option value="all">{t.history.allReasons}</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>{t.reasons[r]}</option>
              ))}
            </select>
          </div>

          <h2 className="mb-2 text-sm font-black tracking-tight text-red-600">
            {t.history.failLog} ({failures.length})
          </h2>
          {failures.length === 0 ? (
            <p className="card mb-5 border-dashed p-4 text-center text-xs font-medium text-zinc-500">
              {t.history.emptyFail}
            </p>
          ) : (
            <div className="mb-6 flex flex-col gap-2">
              {failures.map((i) => {
                const task = taskById[i.task_id];
                return (
                  <div key={i.id} className="card animate-rise border-red-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-zinc-900">{task?.title ?? '—'}</p>
                      <span className="shrink-0 rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                        {t.reasons[i.reason_code]}
                      </span>
                    </div>
                    {i.reason_text && <p className="mt-1 text-xs leading-5 text-zinc-600">“{i.reason_text}”</p>}
                    <p className="mt-1 text-[11px] font-medium tabular-nums text-zinc-400">
                      {task ? `${shortDate(task.planned_date, lang)}` : ''}{' '}
                      {i.mood ? `· ${t.history.energy} ${i.mood}/5` : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <h2 className="mb-2 text-sm font-black tracking-tight text-emerald-600">
            {t.history.successLog} ({successes.length})
          </h2>
          {successes.length === 0 ? (
            <p className="card border-dashed p-4 text-center text-xs font-medium text-zinc-500">
              {t.history.emptySuccess}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {successes.map((c) => {
                const task = taskById[c.task_id];
                return (
                  <div key={c.id} className="card animate-rise border-emerald-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-zinc-900">{task?.title ?? '—'}</p>
                      <span className="shrink-0 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-2.5 py-1 text-[11px] font-bold tabular-nums text-white shadow-sm">
                        {t.history.focus} {c.focus_percent}%
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-medium tabular-nums text-zinc-400">
                      {task ? `${shortDate(task.planned_date, lang)}` : ''} · {t.history.difficulty}{' '}
                      {c.difficulty}/5
                      {c.what_distracted ? ` · ${t.history.distract}: ${c.what_distracted}` : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <h2 className="mb-2 mt-6 text-sm font-black tracking-tight text-zinc-700">
            {t.history.allTasks} ({filteredTasks.length})
          </h2>
          <div className="flex flex-col gap-2">
            {filteredTasks.map((task) => (
              <div key={task.id} className="card flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">{task.title}</p>
                  <p className="text-[11px] font-medium tabular-nums text-zinc-400">
                    {shortDate(task.planned_date, lang)} · {t.cats[task.category]}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-zinc-500">{t.status[task.status]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
    </RequireAuth>
  );
}
