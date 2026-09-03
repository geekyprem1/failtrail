import { NextRequest, NextResponse } from 'next/server';
import { todayISO } from '@/lib/tasks';
import { analyzeWeek, weekMonday } from '@/lib/analyzeWeek';

/**
 * GET /api/cron/weekly — Vercel Cron, har Sunday 21:00 IST (vercel.json).
 * Auth: Authorization: Bearer CRON_SECRET. Zero tasks → skipped, AI call nahi.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const today = todayISO();
  try {
    const result = await analyzeWeek(weekMonday(today), today);
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Cron fail' },
      { status: 500 }
    );
  }
}
