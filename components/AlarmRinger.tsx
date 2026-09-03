'use client';

import { useEffect } from 'react';
import type { Task } from '@/lib/types';
import { formatTime, taskEndLabel } from '@/lib/tasks';
import { startAlarmSound, stopAlarmSound, vibrate } from '@/lib/alarm';
import { useLang } from './LanguageProvider';

interface Props {
  task: Task;
  queueLength: number;
  onStart: (t: Task) => void;
  onSnooze: (t: Task) => void;
  onSkip: (t: Task) => void;
}

/** Full-screen ringing card — Start / Snooze / Skip. */
export default function AlarmRinger({ task, queueLength, onStart, onSnooze, onSkip }: Props) {
  const { t, lang } = useLang();

  useEffect(() => {
    startAlarmSound();
    vibrate();
    return () => stopAlarmSound();
  }, [task.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm animate-rise rounded-[2rem] border-2 border-red-200 bg-white p-6 text-center shadow-2xl shadow-red-900/30">
        <span className="animate-glow mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-2xl font-black text-white">
          !
        </span>
        <p className="text-[11px] font-black tracking-[0.2em] text-red-500">{t.alarm.timeUp}</p>
        <h2 className="mt-1.5 text-xl font-black tracking-tight text-zinc-900">{task.title}</h2>
        <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-500">
          {formatTime(task.planned_start_time)} – {taskEndLabel(task)} · {task.planned_duration_min}{' '}
          {lang === 'en' ? 'min' : t.common.min}
        </p>
        {queueLength > 1 && (
          <p className="mt-1 text-xs font-medium text-zinc-400">
            {t.alarm.moreInQueue(queueLength - 1)}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => onStart(task)}
            className="btn-green py-3.5 text-base"
          >
            {t.alarm.startNow}
          </button>
          <div className="flex gap-2">
            <button onClick={() => onSnooze(task)} className="btn-ghost flex-1">
              {t.alarm.snooze}
            </button>
            <button onClick={() => onSkip(task)} className="btn-ghost flex-1">
              {t.alarm.skip}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
