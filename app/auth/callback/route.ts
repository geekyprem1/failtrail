import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createAuthedClient } from '@/lib/supabaseServer';

/**
 * GET /auth/callback — Supabase email links (magic link / signup confirm / recovery) yahin land hote hain.
 * signInWithOtp me emailRedirectTo set hai, isliye code na mile to link dabane se bhi login ho jata hai.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  const db = await createAuthedClient();
  let authed = false;

  try {
    if (token_hash && type) {
      const { error } = await db.auth.verifyOtp({ token_hash, type });
      authed = !error;
    } else if (code) {
      const { error } = await db.auth.exchangeCodeForSession(code);
      authed = !error;
    }
  } catch {
    authed = false;
  }

  if (authed) {
    // v1 ka purana data isi account se jodo (first login par rows milengi)
    try {
      await db.rpc('claim_my_data');
    } catch {
      /* ignore — login success hai */
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=link', url.origin));
}
