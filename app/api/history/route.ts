import { NextRequest, NextResponse } from 'next/server';
import { createAuthedClient } from '@/lib/supabaseServer';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 62;

/**
 * GET /api/history?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Range ke tasks + unke interruptions + completions (max 62 din).
 * Filtering client-side (category/status/reason) — data chhota hai.
 */
export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from') ?? '';
  const to = req.nextUrl.searchParams.get('to') ?? '';
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json(
      { ok: false, error: '?from=YYYY-MM-DD&to=YYYY-MM-DD required' },
      { status: 400 }
    );
  }
  if (from > to) {
    return NextResponse.json({ ok: false, error: 'from, to se pehle hona chahiye' }, { status: 400 });
  }
  const days =
    Math.round(
      (new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000
    ) + 1;
  if (days > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { ok: false, error: `Range max ${MAX_RANGE_DAYS} din` },
      { status: 400 }
    );
  }

  const db = await createAuthedClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Login karo — session nahi mili' }, { status: 401 });
  }
  const { data: tasks, error: tErr } = await db
    .from('tasks')
    .select('*')
    .gte('planned_date', from)
    .lte('planned_date', to)
    .order('planned_date', { ascending: false })
    .order('planned_start_time', { ascending: true });
  if (tErr) {
    return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 });
  }
  const list = tasks ?? [];
  const ids = list.map((t: { id: string }) => t.id);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, data: { tasks: [], interruptions: [], completions: [] } });
  }
  const [{ data: interruptions, error: iErr }, { data: completions, error: cErr }] =
    await Promise.all([
      db.from('interruptions').select('*').in('task_id', ids).order('occurred_at', { ascending: false }),
      db.from('completions').select('*').in('task_id', ids).order('created_at', { ascending: false }),
    ]);
  if (iErr) {
    return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });
  }
  if (cErr) {
    return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    data: { tasks: list, interruptions: interruptions ?? [], completions: completions ?? [] },
  });
}
