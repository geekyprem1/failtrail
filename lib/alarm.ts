// Alarm logic: pure helpers (testable) + browser sound/notification (client only).
import type { Task } from './types';
import { toMinutes } from './tasks';

/** Start time ke itne min andar alarm baje. */
export const RING_WINDOW_MIN = 2;
/** Itne min nikal jaye aur start na ho → missed. */
export const MISSED_AFTER_MIN = 10;
/** Max snooze, uske baad auto-missed. */
export const MAX_SNOOZE = 3;

export function nowMinutes(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Jin tasks ka alarm ABHI bajna chahiye (time-wise sorted). */
export function findRinging(tasks: Task[], today: string, nowMin: number): Task[] {
  return tasks
    .filter(
      (t) =>
        t.status === 'planned' &&
        t.planned_date === today &&
        (t.snooze_count ?? 0) < MAX_SNOOZE &&
        toMinutes(t.planned_start_time) <= nowMin &&
        nowMin < toMinutes(t.planned_start_time) + RING_WINDOW_MIN
    )
    .sort((a, b) => (a.planned_start_time < b.planned_start_time ? -1 : 1));
}

/** Jinka time nikal gaya aur start/ring handle nahi hua. */
export function findMissed(tasks: Task[], today: string, nowMin: number): Task[] {
  return tasks.filter(
    (t) =>
      (t.status === 'planned' || t.status === 'ringing') &&
      (t.planned_date < today ||
        (t.planned_date === today &&
          toMinutes(t.planned_start_time) + MISSED_AFTER_MIN <= nowMin))
  );
}

/** '+5 min' — output 'HH:MM:SS', 23:59 par clamp. */
export function snoozeTime(time: string, mins = 5): string {
  const total = Math.min(toMinutes(time) + mins, 23 * 60 + 59);
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}:00`;
}

// ---- browser-only (window) ----

let ctx: AudioContext | null = null;
let stopLoop: (() => void) | null = null;

/** File-free alarm: WebAudio beeps ka loop. stopAlarmSound() se band. */
export function startAlarmSound(): void {
  stopAlarmSound();
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    let stopped = false;
    const beep = (freq: number, at: number, dur = 0.28) => {
      if (!ctx || stopped) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(at);
      o.stop(at + dur + 0.05);
    };
    const pattern = () => {
      if (!ctx || stopped) return;
      const t = ctx.currentTime + 0.05;
      beep(880, t);
      beep(880, t + 0.36);
      beep(1175, t + 0.72);
    };
    pattern();
    const timer = window.setInterval(pattern, 1600);
    stopLoop = () => {
      stopped = true;
      window.clearInterval(timer);
    };
    // page chhodne par khud band
    window.addEventListener('beforeunload', stopAlarmSound, { once: true });
  } catch {
    /* audio blocked — notification/visual ringer phir bhi dikhega */
  }
}

export function stopAlarmSound(): void {
  try {
    stopLoop?.();
    ctx?.close().catch(() => {});
  } catch {
    /* ignore */
  }
  stopLoop = null;
  ctx = null;
}

export function vibrate(): void {
  try {
    navigator.vibrate?.([400, 200, 400, 200, 600]);
  } catch {
    /* desktop par no-op */
  }
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/** Pehle SW showNotification, fallback plain Notification. */
export async function sendNotification(title: string, body: string): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        tag: 'failtrail-alarm',
      });
      return;
    }
  } catch {
    /* fallback neeche */
  }
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, tag: 'failtrail-alarm' });
    }
  } catch {
    /* visual ringer hi kaafi */
  }
}
