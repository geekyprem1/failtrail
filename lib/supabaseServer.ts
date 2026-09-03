// Server-side Supabase client — sirf Route Handlers / Server Components me import karo.
// 'use client' wali files me import mat karna (build-time leak hoga).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function createServerClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase env missing on server (.env.local check karo)');
  }
  cached = createClient(url, anonKey);
  return cached;
}
