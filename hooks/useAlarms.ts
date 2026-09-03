'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task } from '@/lib/types';
import { todayISO } from '@/lib/tasks';
import { STRINGS, type Lang } from '@/lib/i18n';
import {
  MAX_SNOOZE,
  findMissed,
  findRinging,
  nowMinutes,
  requestNotificationPermission,
  sendNotification,
  snoozeTime,
  stopAlarmSound,
} from '@/lib/alarm';

async function patchTask(id: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'Update fail ho gaya');
}

/**
 * Alarm engine hook.
 * - Har 30s + tasks badalne par scan: ringing → queue + notification, overdue → missed.
 * - Actions: startNow (running) / snooze (+5min, max 3) / skip (skipped).
 * - Timer + reason modals Phase 4 me judenge; tab tak status transitions yahin honge.
 */
export function useAlarms(tasks: Task[], onChanged: () => void, lang: Lang = 'hinglish') {
  const s = STRINGS[lang];
  const [queue, setQueue] = useState<Task[]>([]);
  const [note, setNote] = useState('');
  const [perm, setPerm] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );
  const handledRef = useRef<Set<string>>(new Set());
  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;
  const changedRef = useRef(onChanged);
  changedRef.current = onChanged;

  const current = queue[0] ?? null;

  const ring = useCallback(async (t: Task) => {
    handledRef.current.add(t.id);
    try {
      if (t.status === 'planned') await patchTask(t.id, { status: 'ringing' });
    } catch {
      /* dusri tab ne pehle handle kar liya — phir bhi bajao */
    }
    setQueue((q) => (q.some((x) => x.id === t.id) ? q : [...q, t]));
    await sendNotification(s.alarm.notifTitle, s.alarm.notifBody(t.title));
    changedRef.current();
  }, [lang]);

  const scan = useCallback(() => {
    const list = tasksRef.current;
    const today = todayISO();
    const now = nowMinutes();

    const missed = findMissed(list, today, now).filter((t) => !handledRef.current.has(t.id));
    if (missed.length > 0) {
      missed.forEach((t) => handledRef.current.add(t.id));
      void Promise.allSettled(missed.map((t) => patchTask(t.id, { status: 'missed' }))).then(
        () => {
          setNote(s.alarm.missedNote(missed.length));
          changedRef.current();
        }
      );
    }

    findRinging(list, today, now)
      .filter((t) => !handledRef.current.has(t.id))
      .forEach((t) => void ring(t));
  }, [ring]);

  useEffect(() => {
    scan();
    const timer = window.setInterval(scan, 30_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan, tasks]);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((q) => q.filter((x) => x.id !== id));
  }, []);

  const startNow = useCallback(
    async (t: Task) => {
      stopAlarmSound();
      removeFromQueue(t.id);
      try {
        // session banao (idempotent — khula session hai to wahi), task → running
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start', task_id: t.id }),
        });
      } catch {
        setNote(s.alarm.startFail);
      }
      changedRef.current();
    },
    [removeFromQueue, lang]
  );

  const snooze = useCallback(
    async (t: Task) => {
      stopAlarmSound();
      removeFromQueue(t.id);
      const count = (t.snooze_count ?? 0) + 1;
      try {
        if (count > MAX_SNOOZE) {
          await patchTask(t.id, { status: 'missed' });
          setNote(s.alarm.snoozeDone);
        } else {
          // dobara ring ke liye handled se nikalo
          handledRef.current.delete(t.id);
          await patchTask(t.id, {
            planned_start_time: snoozeTime(t.planned_start_time),
            snooze_count: count,
            status: 'planned',
          });
        }
      } catch (e) {
        setNote(e instanceof Error ? e.message : 'Snooze fail ho gaya');
      }
      changedRef.current();
    },
    [removeFromQueue, lang]
  );

  const skip = useCallback(
    async (t: Task) => {
      stopAlarmSound();
      removeFromQueue(t.id);
      try {
        await patchTask(t.id, { status: 'skipped' });
      } catch (e) {
        setNote(e instanceof Error ? e.message : 'Skip fail ho gaya');
      }
      changedRef.current();
    },
    [removeFromQueue, lang]
  );

  const askPermission = useCallback(async () => {
    setPerm(await requestNotificationPermission());
  }, []);

  return {
    current,
    queueLength: queue.length,
    dequeue: removeFromQueue,
    note,
    dismissNote: () => setNote(''),
    perm,
    askPermission,
    startNow,
    snooze,
    skip,
  };
}
