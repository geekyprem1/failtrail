import { NextResponse } from 'next/server';
import { createAuthedClient } from '@/lib/supabaseServer';

/**
 * POST /api/auth/claim — v1 ka bina-user data (user_id NULL) login user se jodo.
 * One-time migration step; security-definer function sirf NULL rows claim karta hai.
 */
export async function POST() {
  const db = await createAuthedClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Login karo — session nahi mili' }, { status: 401 });
  }
  const { data, error } = await db.rpc('claim_my_data');
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}
