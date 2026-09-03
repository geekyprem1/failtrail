// Browser-side Supabase client — Auth session cookies me persist hoti hai.
// Service-role key yahan KABHI mat lao; AI key sirf /api routes me.
'use client';

import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Supabase env missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local check karo)'
  );
}

export const supabase = createBrowserClient(url, anonKey);
