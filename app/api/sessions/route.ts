import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabaseServer';
import { REASON_CODES } from '@/lib/tasks';

/**
 * POST /api/sessions — timer lifecycle (single endpoint, action-based).
 * start → pause ⇄ resume → complete | giveup
 * Har pause/giveup par reason MANDATORY (FR1), har complete par feedback MANDATORY (FR2).
 */

const uuid = z.string().uuid();
const reasonCode = z.enum(REASON_CODES);
const mood = z.number().int().min(1).max(5).optional();
const optText = (max: number) =>
  z.string().trim().max(max).optional().default('');

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), task_id: uuid }),
  z.object({
    action: z.literal('pause'),
    session_id: uuid,
    reason_code: reasonCode,
    reason_text: optText(1000),
    mood,
  }),
  z.object({ action: z.literal('resume'), session_id: uuid }),
  z.object({
    action: z.literal('complete'),
    session_id: uuid,
    difficulty: z.number().int().min(1).max(5),
    focus_percent: z.number().int().min(0).max(100),
    what_helped: optText(1000),
    what_distracted: optText(1000),
    notes: optText(1000),
  }),
  z.object({
    action: z.literal('giveup'),
    session_id: uuid,
    reason_code: reasonCode,
    reason_text: optText(1000),
    mood,
  }),
]);

interface Db {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (t: string) => any;
}

function err(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Session close karte waqt paused time + focus time settle karo. */
function settleClose(
  session: {
    started_at: string;
    paused_total_sec: number;
    last_pause_at: string | null;
    status: string;
  },
  nowMs: number
) {
  let paused = session.paused_total_sec ?? 0;
  if (session.status === 'paused' && session.last_pause_at) {
    paused += Math.max(
      0,
      Math.floor((nowMs - new Date(session.last_pause_at).getTime()) / 1000)
    );
  }
  const total = Math.max(
    0,
    Math.floor((nowMs - new Date(session.started_at).getTime()) / 1000) - paused
  );
  return { paused_total_sec: paused, total_focus_sec: total };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err('Valid JSON bhejo');
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    return err(msg);
  }

  const db = createServerClient() as Db;
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const a = parsed.data;

  // ---------- START ----------
  if (a.action === 'start') {
    const { data: task, error: tErr } = await db
      .from('tasks')
      .select('*')
      .eq('id', a.task_id)
      .single();
    if (tErr || !task) return err('Task nahi mila', 404);
    if (task.status === 'completed') return err('Complete task dobara start nahi ho sakta');

    // idempotent: khula session hai to wahi wapas
    const { data: open } = await db
      .from('task_sessions')
      .select('*')
      .eq('task_id', a.task_id)
      .in('status', ['running', 'paused'])
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (open) {
      await db.from('tasks').update({ status: 'running' }).eq('id', a.task_id);
      const { data: s } = await db
        .from('task_sessions')
        .select('*')
        .eq('id', open.id)
        .single();
      return NextResponse.json({ ok: true, data: s ?? open, reused: true });
    }

    const { data: session, error: sErr } = await db
      .from('task_sessions')
      .insert({ task_id: a.task_id })
      .select()
      .single();
    if (sErr) return err(sErr.message, 500);
    await db.from('tasks').update({ status: 'running' }).eq('id', a.task_id);
    return NextResponse.json({ ok: true, data: session }, { status: 201 });
  }

  // ---------- session wale actions: session lao ----------
  if (!('session_id' in a)) return err('session_id chahiye');
  const { data: session, error: sErr } = await db
    .from('task_sessions')
    .select('*')
    .eq('id', a.session_id)
    .single();
  if (sErr || !session) return err('Session nahi mila', 404);

  // ---------- PAUSE ----------
  if (a.action === 'pause') {
    if (session.status !== 'running') return err('Sirf chal raha timer pause ho sakta hai');
    const { data: updated, error: uErr } = await db
      .from('task_sessions')
      .update({ status: 'paused', last_pause_at: nowIso })
      .eq('id', session.id)
      .select()
      .single();
    if (uErr) return err(uErr.message, 500);
    const { data: interruption, error: iErr } = await db
      .from('interruptions')
      .insert({
        task_id: session.task_id,
        session_id: session.id,
        reason_code: a.reason_code,
        reason_text: a.reason_text ?? '',
        mood: a.mood ?? null,
      })
      .select()
      .single();
    if (iErr) return err(iErr.message, 500);
    await db.from('tasks').update({ status: 'paused' }).eq('id', session.task_id);
    return NextResponse.json({ ok: true, data: { session: updated, interruption } });
  }

  // ---------- RESUME ----------
  if (a.action === 'resume') {
    if (session.status !== 'paused' || !session.last_pause_at)
      return err('Sirf ruka hua timer resume ho sakta hai');
    const paused =
      (session.paused_total_sec ?? 0) +
      Math.max(0, Math.floor((nowMs - new Date(session.last_pause_at).getTime()) / 1000));
    const { data: updated, error: uErr } = await db
      .from('task_sessions')
      .update({ status: 'running', last_pause_at: null, paused_total_sec: paused })
      .eq('id', session.id)
      .select()
      .single();
    if (uErr) return err(uErr.message, 500);
    await db.from('tasks').update({ status: 'running' }).eq('id', session.task_id);
    return NextResponse.json({ ok: true, data: { session: updated } });
  }

  // ---------- COMPLETE / GIVEUP ----------
  if (a.action !== 'complete' && a.action !== 'giveup') return err('Unknown action');
  if (session.status !== 'running' && session.status !== 'paused')
    return err('Ye session pehle hi band ho chuka hai');

  const settled = settleClose(session, nowMs);
  const done = a.action === 'complete';
  const { data: updated, error: uErr } = await db
    .from('task_sessions')
    .update({
      status: done ? 'completed' : 'failed',
      ended_at: nowIso,
      last_pause_at: null,
      ...settled,
    })
    .eq('id', session.id)
    .select()
    .single();
  if (uErr) return err(uErr.message, 500);

  if (done) {
    const { data: completion, error: cErr } = await db
      .from('completions')
      .insert({
        task_id: session.task_id,
        session_id: session.id,
        difficulty: a.difficulty,
        focus_percent: a.focus_percent,
        what_helped: a.what_helped ?? '',
        what_distracted: a.what_distracted ?? '',
        notes: a.notes ?? '',
      })
      .select()
      .single();
    if (cErr) return err(cErr.message, 500);
    await db.from('tasks').update({ status: 'completed' }).eq('id', session.task_id);
    return NextResponse.json({ ok: true, data: { session: updated, completion } });
  }

  const { data: interruption, error: iErr } = await db
    .from('interruptions')
    .insert({
      task_id: session.task_id,
      session_id: session.id,
      reason_code: a.reason_code,
      reason_text: a.reason_text ?? '',
      mood: a.mood ?? null,
    })
    .select()
    .single();
  if (iErr) return err(iErr.message, 500);
  await db.from('tasks').update({ status: 'failed' }).eq('id', session.task_id);
  return NextResponse.json({ ok: true, data: { session: updated, interruption } });
}

/**
 * GET /api/sessions?task_id=… → khula session ya null.
 * GET /api/sessions?date=YYYY-MM-DD → us din ke saare khule sessions.
 */
export async function GET(req: NextRequest) {
  const db = createServerClient() as Db;
  const taskId = req.nextUrl.searchParams.get('task_id');
  const date = req.nextUrl.searchParams.get('date');

  if (taskId) {
    const { data, error } = await db
      .from('task_sessions')
      .select('*')
      .eq('task_id', taskId)
      .in('status', ['running', 'paused'])
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return err(error.message, 500);
    return NextResponse.json({ ok: true, data: data ?? null });
  }

  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return err('?date=YYYY-MM-DD required');
    const { data: tasks, error: tErr } = await db
      .from('tasks')
      .select('id')
      .eq('planned_date', date);
    if (tErr) return err(tErr.message, 500);
    const ids = (tasks ?? []).map((t: { id: string }) => t.id);
    if (ids.length === 0) return NextResponse.json({ ok: true, data: [] });
    const { data, error } = await db
      .from('task_sessions')
      .select('*')
      .in('task_id', ids)
      .in('status', ['running', 'paused'])
      .order('started_at', { ascending: true });
    if (error) return err(error.message, 500);
    return NextResponse.json({ ok: true, data: data ?? [] });
  }

  return err('task_id ya date chahiye');
}
