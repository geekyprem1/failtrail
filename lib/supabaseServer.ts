// Server-side Supabase clients — sirf Route Handlers / Server Components me import karo.
// 'use client' wali files me import mat karna.
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase env missing on server (.env.local check karo)');
  }
  return { url, anonKey };
}

/** Logged-in user ka context (cookies se). Har protected API route isse shuru ho. */
export async function createAuthedClient(): Promise<SupabaseClient> {
  const { url, anonKey } = env();
  const store = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* Server Component me cookies read-only — browser client refresh karega */
        }
      },
    },
  });
}

let svc: SupabaseClient | null = null;

/** Service role — SIRF cron/admin kaam (/api/cron/weekly). Key kabhi client me mat bhejo. */
export function createServiceClient(): SupabaseClient {
  if (svc) return svc;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY missing — Supabase Dashboard → Settings → API se lo');
  }
  svc = createClient(url, key, { auth: { persistSession: false } });
  return svc;
}
