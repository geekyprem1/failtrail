'use client';

import { useCallback, useEffect, useState } from 'react';
import AlarmRinger from '@/components/AlarmRinger';
import CompleteModal, { type CompletionResult } from '@/components/CompleteModal';
import FocusTimer from '@/components/FocusTimer';
import ReasonModal, { type ReasonMode, type ReasonResult } from '@/components/ReasonModal';
import RequireAuth from '@/components/RequireAuth';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import StatsStrip, { type DayStats } from '@/components/StatsStrip';
import GamificationStrip, { type GamiData } from '@/components/GamificationStrip';
import TaskForm from '@/components/TaskForm';
import TaskList from '@/components/TaskList';
import { useAlarms } from '@/hooks/useAlarms';
import { useLang } from '@/components/LanguageProvider';
import { addDaysISO, todayISO } from '@/lib/tasks';
import type { Task, TaskSession } from '@/lib/types';

function toDateLabel(iso: string, lang: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'en' ? 'en-US' : 'hi-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

async function postJson(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'Save fail ho gaya');
  return j.data;
}

export default function Home() {
  const { t, lang } = useLang();
  const [date, setDate] = useState(todayISO());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Record<string, TaskSession>>({});
  const [stats, setStats] = useState<DayStats | null>(null);
  const [gami, setGami] = useState<GamiData | null>(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [reasonFor, setReasonFor] = useState<{
    mode: ReasonMode;
    task: Task;
    session: TaskSession | null;
  } | null>(null);
  const [completeFor, setCompleteFor] = useState<{
    task: Task;
    session: TaskSession;
  } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/tasks?date=${date}`, { cache: 'no-store' }),
        fetch(`/api/sessions?date=${date}`, { cache: 'no-store' }),
      ]);
      const t = await tRes.json();
      const s = await sRes.json();
      if (!t.ok) throw new Error(t.error || 'Tasks load fail');
      if (!s.ok) throw new Error(s.error || 'Sessions load fail');
      setTasks(t.data);
      const map: Record<string, TaskSession> = {};
      for (const sess of s.data as TaskSession[]) map[sess.task_id] = sess;
      setSessions(map);
      // stats fail ho to page mat roko
      try {
        const stRes = await fetch(`/api/stats?date=${date}`, { cache: 'no-store' });
        const st = await stRes.json();
        setStats(st.ok ? st.data : null);
      } catch {
        setStats(null);
      }
      // gamification fail ho to page mat roko (migration pending ho sakta hai)
      try {
        const gRes = await fetch(`/api/gamification?date=${date}`, { cache: 'no-store' });
        const g = await gRes.json();
        setGami(g.ok ? g.data : null);
      } catch {
        setGami(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load fail ho gaya');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setEditing(null);
    setReasonFor(null);
    setCompleteFor(null);
    refresh();
  }, [refresh]);

  const alarms = useAlarms(tasks, refresh, lang);

  async function handleDelete(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Delete fail');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete fail ho gaya');
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate(t: Task) {
    setBusy(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: t.title,
          description: t.description,
          planned_date: addDaysISO(t.planned_date, 1),
          planned_start_time: t.planned_start_time.slice(0, 5),
          planned_duration_min: t.planned_duration_min,
          category: t.category,
          priority: t.priority,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Copy fail');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Copy fail ho gaya');
    } finally {
      setBusy(false);
    }
  }

  async function handleStart(task: Task) {
    setBusy(true);
    try {
      await postJson('/api/sessions', { action: 'start', task_id: task.id });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Start fail ho gaya');
    } finally {
      setBusy(false);
    }
  }

  async function submitReason(r: ReasonResult) {
    if (!reasonFor) return;
    const { mode, task, session } = reasonFor;
    if (mode === 'pause' && session) {
      await postJson('/api/sessions', { action: 'pause', session_id: session.id, ...r });
    } else if (mode === 'giveup' && session) {
      await postJson('/api/sessions', { action: 'giveup', session_id: session.id, ...r });
    } else if (mode === 'skip') {
      await postJson('/api/interruptions', { task_id: task.id, ...r });
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'skipped' }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Skip fail ho gaya');
    } else {
      // missed — sirf kaaran save, status missed hi rahega
      await postJson('/api/interruptions', { task_id: task.id, ...r });
    }
    setReasonFor(null);
    await refresh();
  }

  async function submitComplete(f: CompletionResult) {
    if (!completeFor) return;
    const d = (await postJson('/api/sessions', {
      action: 'complete',
      session_id: completeFor.session.id,
      ...f,
    })) as { xp_awarded?: number } | null;
    if (d && typeof d.xp_awarded === 'number' && d.xp_awarded > 0) {
      setToast(t.gami.xpToast(d.xp_awarded));
      window.setTimeout(() => setToast(''), 4000);
    }
    setCompleteFor(null);
    await refresh();
  }

  const doneCount = tasks.filter((task) => task.status === 'completed').length;
  const activeTimers = tasks.filter(
    (task) => (task.status === 'running' || task.status === 'paused') && sessions[task.id]
  );
  const missedTask = tasks.find((task) => task.status === 'missed');

  return (
    <RequireAuth>
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-6 sm:pb-10">
      <header className="mb-5">
        <h1 className="font-display bg-gradient-to-r from-indigo-700 via-violet-600 to-indigo-700 bg-clip-text text-[1.7rem] font-black leading-tight tracking-tight text-transparent">
          {toDateLabel(date, lang)}
        </h1>
        <p className="mt-0.5 text-xs font-medium text-zinc-500">
          {tasks.length} {t.summary.tasks}
          {tasks.length > 0 && ` · ${doneCount} ${t.summary.complete}`}
        </p>
      </header>

      <StatsStrip stats={stats} />

      <GamificationStrip gami={gami} />

      <div className="card animate-rise mb-4 p-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(addDaysISO(date, -1))}
            className="btn-chip border-0 bg-zinc-100 px-3.5 py-2 text-sm"
            aria-label="Previous day"
          >
            ←
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border-0 bg-transparent px-2 py-2 text-center text-sm font-bold text-zinc-900 outline-none"
          />
          <button
            onClick={() => setDate(addDaysISO(date, 1))}
            className="btn-chip border-0 bg-zinc-100 px-3.5 py-2 text-sm"
            aria-label="Next day"
          >
            →
          </button>
          {date !== todayISO() && (
            <button
              onClick={() => setDate(todayISO())}
              className="shrink-0 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25"
            >
              {t.common.todayBtn}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="banner border border-red-200 bg-red-50 font-medium text-red-700">{error}</p>
      )}

      {alarms.perm === 'default' && (
        <div className="banner border border-blue-200 bg-blue-50/90 font-medium text-blue-800">
          <p>{t.perm.text}</p>
          <button
            onClick={alarms.askPermission}
            className="shrink-0 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow"
          >
            {t.perm.allow}
          </button>
        </div>
      )}

      {alarms.note && (
        <div className="banner border border-orange-200 bg-orange-50/90 font-medium text-orange-800">
          <p>{alarms.note}</p>
          <button
            onClick={alarms.dismissNote}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-orange-600 hover:bg-orange-100"
          >
            {t.common.ok}
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 animate-rise rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-black text-white shadow-xl shadow-orange-500/30 sm:bottom-8">
          {toast}
        </div>
      )}

      {activeTimers.length > 0 && (
        <div className="mb-4 flex flex-col gap-3">
          {activeTimers.map((task) => (
            <FocusTimer
              key={task.id}
              task={task}
              session={sessions[task.id]}
              onPause={(t2, session) => setReasonFor({ mode: 'pause', task: t2, session })}
              onResume={async (_t, session) => {
                try {
                  await postJson('/api/sessions', { action: 'resume', session_id: session.id });
                  await refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Resume fail ho gaya');
                }
              }}
              onComplete={(t2, session) => setCompleteFor({ task: t2, session })}
              onGiveUp={(t2, session) => setReasonFor({ mode: 'giveup', task: t2, session })}
            />
          ))}
        </div>
      )}

      <TaskForm
        key={editing?.id ?? `new-${date}`}
        date={date}
        tasks={tasks}
        editing={editing}
        onDone={() => {
          setEditing(null);
          refresh();
        }}
        onCancelEdit={() => setEditing(null)}
      />

      <div className="mt-4">
        {loading || busy ? (
          <div className="card flex items-center justify-center gap-2 p-6 text-sm font-medium text-zinc-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
            {t.common.loading}
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            onEdit={(task) => {
              setEditing(task);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onStart={handleStart}
          />
        )}
      </div>

      {missedTask && !reasonFor && (
        <button
          onClick={() => setReasonFor({ mode: 'missed', task: missedTask, session: null })}
          className="mt-3 w-full rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3 text-xs font-bold text-orange-800 shadow-sm transition-all hover:shadow active:scale-[0.99]"
        >
          {t.alarm.missedCta(missedTask.title)}
        </button>
      )}

      <ServiceWorkerRegister />

      {alarms.current && (
        <AlarmRinger
          task={alarms.current}
          queueLength={alarms.queueLength}
          onStart={(task) => alarms.startNow(task)}
          onSnooze={(task) => alarms.snooze(task)}
          onSkip={(task) => {
            alarms.dequeue(task.id);
            setReasonFor({ mode: 'skip', task, session: null });
          }}
        />
      )}

      {reasonFor && (
        <ReasonModal
          mode={reasonFor.mode}
          onSubmit={submitReason}
          onCancel={() => setReasonFor(null)}
        />
      )}

      {completeFor && (
        <CompleteModal
          taskTitle={completeFor.task.title}
          onSubmit={submitComplete}
          onCancel={() => setCompleteFor(null)}
        />
      )}
    </main>
    </RequireAuth>
  );
}
