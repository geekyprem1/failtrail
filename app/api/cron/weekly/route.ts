import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabaseServer';
import { todayISO } from '@/lib/tasks';
import { analyzeWeek, weekMonday } from '@/lib/analyzeWeek';

/**
 * GET /api/cron/weekly — Vercel Cron, har Sunday 21:00 IST (vercel.json).
 * Auth: Authorization: Bearer CRON_SECRET. Service-role se HAR user ki report.
 * Zero-task users skip (AI call nahi). SUPABASE_SERVICE_ROLE_KEY chahiye.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  let db;
  try {
    db = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Service key missing' },
      { status: 500 }
    );
  }
  const { data: users, error: uErr } = await db.auth.admin.listUsers();
  if (uErr) {
    return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
  }
  const today = todayISO();
  const from = weekMonday(today);
  const results = [];
  for (const u of users.users) {
    // user ki last report wali language (default hinglish) — bina migration ke bhi safe
    let lang: 'en' | 'hinglish' = 'hinglish';
    try {
      const { data: last } = await db
        .from('weekly_insights')
        .select('lang')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (last?.lang === 'en') lang = 'en';
    } catch {
      /* column missing — hinglish */
    }
    try {
      const r = await analyzeWeek(from, today, { db, userId: u.id, lang });
      results.push({ user_id: u.id, lang, skipped: r.skipped, insight_id: r.insight?.id ?? null });
    } catch (e) {
      results.push({ user_id: u.id, error: e instanceof Error ? e.message : 'fail' });
    }
  }
  return NextResponse.json({ ok: true, data: { week_start: from, week_end: today, results } });
}
