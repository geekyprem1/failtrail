import { NextRequest, NextResponse } from 'next/server';
import { createAuthedClient } from '@/lib/supabaseServer';
import { normalizeTime, taskInputSchema } from '@/lib/tasks';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/tasks?date=YYYY-MM-DD — us din ke tasks, time-wise sorted. */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? '';
  if (!DATE_RE.test(date)) {
    return NextResponse.json(
      { ok: false, error: '?date=YYYY-MM-DD required' },
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
  const { data, error } = await db
    .from('tasks')
    .select('*')
    .eq('planned_date', date)
    .order('planned_start_time', { ascending: true });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}

/** POST /api/tasks — naya planned task. Overlap par warning client deta hai, server block nahi karta. */
export async function POST(req: NextRequest) {
  const db = await createAuthedClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Login karo — session nahi mili' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Valid JSON bhejo' }, { status: 400 });
  }
  const parsed = taskInputSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
  const v = parsed.data;
  const { data, error } = await db
    .from('tasks')
    .insert({
      user_id: user.id,
      title: v.title,
      description: v.description ?? '',
      planned_date: v.planned_date,
      planned_start_time: normalizeTime(v.planned_start_time),
      planned_duration_min: v.planned_duration_min,
      category: v.category,
      priority: v.priority,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data }, { status: 201 });
}
