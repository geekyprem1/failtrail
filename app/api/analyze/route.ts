import { NextRequest, NextResponse } from 'next/server';
import { createAuthedClient } from '@/lib/supabaseServer';
import { todayISO } from '@/lib/tasks';
import { analyzeWeek, weekMonday } from '@/lib/analyzeWeek';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 14; // token guard
const DAILY_CAP = 3; // cost guard per user (manual + cron milakar)

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'Login karo — session nahi mili' }, { status: 401 });
}

/**
 * POST /api/analyze {from?, to?} — on-demand AI report (login required).
 * Default: is week ka Monday → aaj. Zero tasks → { skipped: true }, AI call nahi.
 */
export async function POST(req: NextRequest) {
  let body: { from?: string; to?: string; lang?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const today = todayISO();
  const from = body.from ?? weekMonday(today);
  const to = body.to ?? today;
  const lang = body.lang === 'en' ? 'en' : 'hinglish';

  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
    return NextResponse.json({ ok: false, error: 'from/to YYYY-MM-DD me, from ≤ to' }, { status: 400 });
  }
  const days =
    Math.round(new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) /
      86400000 +
    1;
  if (days > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { ok: false, error: `AI report max ${MAX_RANGE_DAYS} din ki range par` },
      { status: 400 }
    );
  }

  const db = await createAuthedClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return unauthorized();

  // cost guard: is user ki aaj 3 reports ban chuki to block
  try {
    const { count } = await db
      .from('weekly_insights')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`);
    if ((count ?? 0) >= DAILY_CAP) {
      return NextResponse.json(
        { ok: false, error: 'Aaj ki 3 AI reports puri — kal try karo (cost guard)' },
        { status: 429 }
      );
    }
  } catch {
    /* count fail ho to bhi aage badho */
  }

  try {
    const result = await analyzeWeek(from, to, { db, userId: user.id, lang });
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI fail ho gaya';
    const status = msg.startsWith('OpenRouter') ? 502 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

/** GET /api/analyze — isi week ki saved report (bina AI call, login required). */
export async function GET() {
  const db = await createAuthedClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return unauthorized();

  const today = todayISO();
  const from = weekMonday(today);
  const { data, error } = await db
    .from('weekly_insights')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', from)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data: data ?? null });
}
