import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthedClient } from '@/lib/supabaseServer';
import { REASON_CODES } from '@/lib/tasks';

/**
 * POST /api/interruptions — bina session ke kaaran (Skip / Missed tasks ke liye).
 * Timer wale pause/giveup reasons /api/sessions me save hote hain.
 */
const schema = z.object({
  task_id: z.string().uuid(),
  session_id: z.string().uuid().nullable().optional(),
  reason_code: z.enum(REASON_CODES),
  reason_text: z.string().trim().max(1000).optional().default(''),
  mood: z.number().int().min(1).max(5).optional(),
});

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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
  const v = parsed.data;
  const { data: task } = await db.from('tasks').select('id').eq('id', v.task_id).single();
  if (!task) {
    return NextResponse.json({ ok: false, error: 'Task nahi mila' }, { status: 404 });
  }
  const { data, error } = await db
    .from('interruptions')
    .insert({
      task_id: v.task_id,
      session_id: v.session_id ?? null,
      reason_code: v.reason_code,
      reason_text: v.reason_text ?? '',
      mood: v.mood ?? null,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data }, { status: 201 });
}
