'use client';

import { useEffect, useRef, useState } from 'react';
import type { Task, TaskSession } from '@/lib/types';
import { formatTime, sessionRemainingSec, taskEndLabel } from '@/lib/tasks';
import { startAlarmSound, stopAlarmSound } from '@/lib/alarm';
import { useLang } from './LanguageProvider';

interface Props {
  task: Task;
  session: TaskSession;
  onPause: (task: Task, session: TaskSession) => void;
  onResume: (task: Task, session: TaskSession) => void;
  onComplete: (task: Task, session: TaskSession) => void;
  onGiveUp: (task: Task, session: TaskSession) => void;
}

function fmt(totalSec: number): string {
  const s = Math.max(0, totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(ss).padStart(2, '0')}`;
}

/** Reload-proof countdown: server timestamps se recalc, har 1s tick. */
export default function FocusTimer({
  task,
  session,
  onPause,
  onResume,
  onComplete,
  onGiveUp,
}: Props) {
  const { t } = useLang();
  const total = task.planned_duration_min * 60;
  const [remaining, setRemaining] = useState(() =>
    sessionRemainingSec(session, task.planned_duration_min)
  );
  const firedRef = useRef(false);

  useEffect(() => {
    setRemaining(sessionRemainingSec(session, task.planned_duration_min));
    firedRef.current = false;
  }, [session.id, session.status, session.last_pause_at, task.planned_duration_min]);

  useEffect(() => {
    if (session.status !== 'running') return;
    const id = window.setInterval(() => {
      setRemaining(sessionRemainingSec(session, task.planned_duration_min));
    }, 1000);
    return () => window.clearInterval(id);
  }, [session, task.planned_duration_min]);

  // time-up → ding + Complete flow kholo (ek baar)
  useEffect(() => {
    if (remaining <= 0 && !firedRef.current) {
      firedRef.current = true;
      startAlarmSound();
      window.setTimeout(stopAlarmSound, 3000);
      onComplete(task, session);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const progress = Math.min(1, Math.max(0, 1 - remaining / total));
  const R = 54;
  const C = 2 * Math.PI * R;
  const paused = session.status === 'paused';

  return (
    <div
      className={`card animate-rise border-2 ${
        paused
          ? '!border-amber-300 shadow-amber-500/10'
          : '!border-indigo-400 shadow-indigo-500/15'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90 drop-shadow">
            <circle cx="60" cy="60" r={R} fill="none" stroke="#ececf1" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={paused ? '#f59e0b' : 'url(#timerGrad)'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="timerGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-xl font-black tabular-nums tracking-tight text-zinc-900">
              {fmt(remaining)}
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold tracking-tight text-zinc-900">{task.title}</p>
          <p className="mt-0.5 text-xs font-medium tabular-nums text-zinc-500">
            {formatTime(task.planned_start_time)} – {taskEndLabel(task)}
          </p>
          <span
            className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              paused ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-700'
            }`}
          >
            {paused ? t.timer.paused : t.timer.running}
          </span>
          {paused && <p className="mt-1.5 text-xs leading-5 text-amber-700">{t.timer.pausedHint}</p>}
          {remaining <= 0 && (
            <p className="mt-1.5 text-xs font-bold text-emerald-600">{t.timer.timeUp}</p>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {paused ? (
          <button onClick={() => onResume(task, session)} className="btn-primary">
            {t.timer.resume}
          </button>
        ) : (
          <button
            onClick={() => onPause(task, session)}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            {t.timer.pause}
          </button>
        )}
        <button onClick={() => onComplete(task, session)} className="btn-green">
          {t.timer.complete}
        </button>
      </div>
      <button
        onClick={() => {
          if (window.confirm(t.timer.giveUpConfirm(task.title))) onGiveUp(task, session);
        }}
        className="mt-2 w-full rounded-xl px-4 py-2 text-xs font-semibold text-red-400 transition-all hover:bg-red-50 hover:text-red-600 active:scale-[0.99]"
      >
        {t.timer.giveUp}
      </button>
    </div>
  );
}
