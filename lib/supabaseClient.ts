// Browser-side Supabase client (anon key — v1 single-user, RLS off).
// Kabhi bhi service-role key yahan mat lao; AI key sirf /api routes me.
'use client';

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Supabase env missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local check karo)'
  );
}

export const supabase = createClient(url, anonKey);
