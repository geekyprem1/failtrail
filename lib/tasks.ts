// Task validation (zod) + time helpers — server aur client dono me shared.
import { z } from 'zod';
import type { Task } from './types';

export const taskInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Kaam ka naam likho')
    .max(200, 'Naam 200 aksharon se chhota rakho'),
  description: z.string().trim().max(1000).optional().default(''),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date YYYY-MM-DD format me'),
  planned_start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Time HH:MM format me'),
  planned_duration_min: z.coerce
    .number()
    .int()
    .min(5, 'Kam se kam 5 min')
    .max(480, 'Zyada se zyada 480 min'),
  category: z.enum(['study', 'work', 'health', 'other']).optional().default('other'),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
});

export type TaskInput = z.infer<typeof taskInputSchema>;

/** DB reason codes — single source (types.ts union ka mirror). */
export const REASON_CODES = [
  'phone_social_media',
  'neend_aalsi',
  'mood_nahi',
  'mushkil_laga',
  'bhookh',
  'guest_shor',
  'urgent_kaam',
  'light_net_issue',
  'tabiyat',
  'other',
] as const;

/** 'HH:MM' → 'HH:MM:SS' (Postgres time column ke liye). */
export function normalizeTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t;
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** 'HH:MM:SS' → 'HH:MM' (display ke liye). */
export function formatTime(t: string): string {
  return t.slice(0, 5);
}

export function taskEndLabel(
  task: Pick<Task, 'planned_start_time' | 'planned_duration_min'>
): string {
  const end = toMinutes(task.planned_start_time) + task.planned_duration_min;
  const h = String(Math.floor(end / 60) % 24).padStart(2, '0');
  const m = String(end % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** Local timezone me aaj ki date → 'YYYY-MM-DD'. */
export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return todayISO(dt);
}

/** Us date wale week ka Monday (YYYY-MM-DD). Pure — client/server dono me safe. */
export function weekMonday(todayIso: string): string {
  const [y, m, d] = todayIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return todayISO(dt);
}

interface Candidate {
  id?: string;
  planned_date: string;
  planned_start_time: string;
  planned_duration_min: number;
}

/**
 * Same date par time overlap karne wale tasks (khud ko exclude karke).
 * Block nahi karta — sirf warning dikhane ke liye.
 */
export function findOverlaps<T extends Candidate>(candidate: Candidate, others: T[]): T[] {
  const cStart = toMinutes(candidate.planned_start_time);
  const cEnd = cStart + candidate.planned_duration_min;
  return others.filter((o) => {
    if (o.planned_date !== candidate.planned_date) return false;
    if (candidate.id && o.id === candidate.id) return false;
    const oStart = toMinutes(o.planned_start_time);
    const oEnd = oStart + o.planned_duration_min;
    return cStart < oEnd && oStart < cEnd;
  });
}

interface SessionLike {
  started_at: string;
  paused_total_sec: number;
  last_pause_at: string | null;
  status: string;
}

/**
 * Reload-proof remaining seconds: server ke started_at/paused_total se,
 * client clock se recalc. Paused ho to last_pause_at par frozen.
 */
export function sessionRemainingSec(
  session: SessionLike,
  durationMin: number,
  nowMs = Date.now()
): number {
  const start = new Date(session.started_at).getTime();
  const endRef =
    session.status === 'paused' && session.last_pause_at
      ? new Date(session.last_pause_at).getTime()
      : nowMs;
  const elapsed =
    Math.max(0, Math.floor((endRef - start) / 1000)) - (session.paused_total_sec ?? 0);
  return durationMin * 60 - elapsed;
}
