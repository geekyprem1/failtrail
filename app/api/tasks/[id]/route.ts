import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabaseServer';
import { normalizeTime, taskInputSchema } from '@/lib/tasks';
import type { TaskStatus } from '@/lib/types';

/** Sirf in states me title/date/time/duration edit allowed (T2.2 rule). */
const EDITABLE_STATES: TaskStatus[] = ['planned', 'missed', 'skipped'];

const patchSchema = taskInputSchema.partial().extend({
  status: z
    .enum([
      'planned',
      'ringing',
      'running',
      'paused',
      'completed',
      'failed',
      'skipped',
      'missed',
    ])
    .optional(),
  snooze_count: z.number().int().min(0).max(10).optional(),
});

/** PATCH /api/tasks/:id — edit fields / status / snooze_count. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Valid JSON bhejo' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
  const v = parsed.data;
  const db = createServerClient();
  const { data: existing, error: findErr } = await db
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  if (findErr || !existing) {
    return NextResponse.json({ ok: false, error: 'Task nahi mila' }, { status: 404 });
  }

  const touchesFields = (
    ['title', 'description', 'planned_date', 'planned_start_time', 'planned_duration_min', 'category', 'priority'] as const
  ).some((k) => v[k] !== undefined);
  if (touchesFields && !EDITABLE_STATES.includes(existing.status as TaskStatus)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Status '${existing.status}' wala task edit nahi ho sakta — pehle use roko ya naya task banao`,
      },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {};
  if (v.title !== undefined) update.title = v.title;
  if (v.description !== undefined) update.description = v.description;
  if (v.planned_date !== undefined) update.planned_date = v.planned_date;
  if (v.planned_start_time !== undefined)
    update.planned_start_time = normalizeTime(v.planned_start_time);
  if (v.planned_duration_min !== undefined)
    update.planned_duration_min = v.planned_duration_min;
  if (v.category !== undefined) update.category = v.category;
  if (v.priority !== undefined) update.priority = v.priority;
  if (v.status !== undefined) update.status = v.status;
  if (v.snooze_count !== undefined) update.snooze_count = v.snooze_count;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: 'Badalne ke liye kuch bhejo' }, { status: 400 });
  }

  const { data, error } = await db
    .from('tasks')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}

/** DELETE /api/tasks/:id — task + uske sessions/reasons cascade me delete. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServerClient();
  const { error } = await db.from('tasks').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data: { id } });
}
