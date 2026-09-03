'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import type { Task } from '@/lib/types';
import { STRINGS, type Lang } from '@/lib/i18n';

/** task.id (uuid) → stable positive int (plugin ids must be numbers). */
export function notifId(uuid: string): number {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) {
    h = (Math.imul(31, h) + uuid.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2147483647;
}

export function alarmAt(task: Pick<Task, 'planned_date' | 'planned_start_time'>): Date {
  return new Date(`${task.planned_date}T${task.planned_start_time}`);
}

/**
 * Native exact alarms (Android only, web par no-op).
 * Planned-future tasks ↔ scheduled notifications reconcile karta hai:
 * naya task → schedule, time change → reschedule, delete/complete → cancel.
 * App killed ho tab bhi notification aata hai; tap karne par app khulti hai
 * aur web ringer/timer sambhal leta hai.
 */
export function useNativeAlarms(tasks: Task[], lang: Lang = 'hinglish') {
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;

    (async () => {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      if (cancelled) return;
      const s = STRINGS[langRef.current];

      try {
        await LocalNotifications.requestPermissions();
      } catch {
        return; // permission denied — web alarm phir bhi chalega jab app khuli ho
      }

      // high-importance channel (sound + vibration)
      try {
        await LocalNotifications.createChannel({
          id: 'failtrail-alarms',
          name: s.alarm.notifTitle,
          importance: 5,
          vibration: true,
        });
      } catch {
        /* purane Android / pehle se bana — ignore */
      }

      const now = Date.now();
      const want = new Map<number, Task>();
      for (const t of tasks) {
        if (t.status !== 'planned') continue;
        if ((t.snooze_count ?? 0) >= 3) continue;
        if (alarmAt(t).getTime() <= now + 30_000) continue; // guzar gaya / abhi ka — web ringer dekhega
        want.set(notifId(t.id), t);
      }

      let pending: number[] = [];
      try {
        const { notifications } = await LocalNotifications.getPending();
        pending = notifications.map((n) => n.id as number);
      } catch {
        pending = [];
      }
      if (cancelled) return;

      const stale = pending.filter((id) => !want.has(id));
      if (stale.length > 0) {
        try {
          await LocalNotifications.cancel({ notifications: stale.map((id) => ({ id })) });
        } catch {
          /* ignore */
        }
      }

      const fresh = [...want.entries()].filter(([id]) => !pending.includes(id));
      if (fresh.length > 0) {
        try {
          await LocalNotifications.schedule({
            notifications: fresh.map(([id, t]) => ({
              id,
              title: s.alarm.notifTitle,
              body: s.alarm.notifBody(t.title),
              schedule: { at: alarmAt(t), allowWhileIdle: true },
              channelId: 'failtrail-alarms',
              autoCancel: true,
            })),
          });
        } catch {
          /* schedule fail — web alarm backup hai */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tasks]);
}
