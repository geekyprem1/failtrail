import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';

/**
 * GET /api/stats?date=YYYY-MM-DD — Today strip ke numbers:
 * completion %, focus min, fail/missed counts, interruptions.
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: '?date=YYYY-MM-DD required' }, { status: 400 });
  }
  const db = createServerClient();

  const { data: tasks, error: tErr } = await db
    .from('tasks')
    .select('id,status')
    .eq('planned_date', date);
  if (tErr) {
    return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 });
  }
  const list = tasks ?? [];
  const ids = list.map((t: { id: string }) => t.id);
  const count = (s: string) => list.filter((t: { status: string }) => t.status === s).length;
  const completed = count('completed');
  const total = list.length;

  let focusSec = 0;
  let interruptions = 0;
  if (ids.length > 0) {
    const [{ data: sessions }, { data: intrs }] = await Promise.all([
      db.from('task_sessions').select('total_focus_sec').in('task_id', ids),
      db.from('interruptions').select('id').in('task_id', ids),
    ]);
    focusSec = (sessions ?? []).reduce(
      (sum: number, s: { total_focus_sec: number }) => sum + (s.total_focus_sec ?? 0),
      0
    );
    interruptions = (intrs ?? []).length;
  }

  return NextResponse.json({
    ok: true,
    data: {
      date,
      total,
      completed,
      failed: count('failed'),
      missed: count('missed'),
      skipped: count('skipped'),
      running: count('running') + count('paused') + count('ringing'),
      completion_rate: total === 0 ? 0 : Math.round((completed / total) * 100),
      focus_min: Math.floor(focusSec / 60),
      interruptions,
    },
  });
}
