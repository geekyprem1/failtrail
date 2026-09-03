import { NextRequest, NextResponse } from 'next/server';
import { createAuthedClient } from '@/lib/supabaseServer';
import { addDaysISO, todayISO } from '@/lib/tasks';
import { dayScore, levelForXp, streaks, xpForNext } from '@/lib/gamification';

/**
 * GET /api/gamification?date=YYYY-MM-DD — score + streak + XP + level.
 * Score/streak compute hote hain; XP ledger (xp_events) se aata hai.
 * Purane completions ka one-time backfill bhi yahin hota hai.
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: '?date=YYYY-MM-DD required' }, { status: 400 });
  }
  const db = await createAuthedClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Login karo — session nahi mili' }, { status: 401 });
  }

  // 60-din window (streak ke liye) + aaj ka score
  const from = addDaysISO(date, -59);
  const { data: tasks, error: tErr } = await db
    .from('tasks')
    .select('id,planned_date,status,planned_duration_min')
    .eq('user_id', user.id)
    .gte('planned_date', from)
    .lte('planned_date', date);
  if (tErr) {
    return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 });
  }
  const list = (tasks ?? []) as {
    id: string;
    planned_date: string;
    status: string;
    planned_duration_min: number;
  }[];

  const dayMap: Record<string, number> = {};
  for (const t of list) {
    if (t.status === 'completed') dayMap[t.planned_date] = (dayMap[t.planned_date] ?? 0) + 1;
  }
  const streak = streaks(dayMap, date);

  const todayTasks = list.filter((t) => t.planned_date === date);
  const ids = todayTasks.map((t) => t.id);
  let focusMin = 0;
  if (ids.length > 0) {
    const { data: sessions } = await db
      .from('task_sessions')
      .select('total_focus_sec')
      .in('task_id', ids);
    focusMin = Math.floor(
      (sessions ?? []).reduce((s: number, x: { total_focus_sec: number }) => s + (x.total_focus_sec ?? 0), 0) / 60
    );
  }
  const count = (s: string) => todayTasks.filter((t) => t.status === s).length;
  const { score, parts } = dayScore({
    total: todayTasks.length,
    completed: count('completed'),
    focusMin,
    failed: count('failed'),
    missed: count('missed'),
  });

  // XP (+ one-time backfill purane completions ka)
  let xp = 0;
  try {
    const { data: events } = await db.from('xp_events').select('points').eq('user_id', user.id);
    xp = (events ?? []).reduce((s: number, e: { points: number }) => s + (e.points ?? 0), 0);
    if (xp === 0) {
      const allIds = list.map((t) => t.id);
      if (allIds.length > 0) {
        const { data: comps } = await db
          .from('completions')
          .select('task_id,difficulty')
          .in('task_id', allIds);
        const rows = (comps ?? []).map((c: { task_id: string; difficulty: number }) => ({
          user_id: user.id,
          kind: 'backfill',
          points: 10 + c.difficulty * 2,
          task_id: c.task_id,
        }));
        if (rows.length > 0) {
          await db.from('xp_events').insert(rows);
          xp = rows.reduce((s, r) => s + r.points, 0);
        }
      }
    }
  } catch {
    xp = 0; // migration pending ho to bhi score/streak chale
  }

  const level = levelForXp(xp);
  return NextResponse.json({
    ok: true,
    data: {
      date,
      score,
      parts,
      focus_min: focusMin,
      streak,
      xp,
      level: { index: level, xp_for_next: xpForNext(xp) },
    },
  });
}
