// DB connectivity check: .env.local padhkar Supabase REST ko ping karta hai.
// Run: node scripts/check-db.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env.local'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('MISSING-ENV: Supabase URL/key .env.local me nahi mile');
  process.exit(1);
}

const tables = ['tasks', 'task_sessions', 'interruptions', 'completions', 'weekly_insights'];
let allOk = true;
for (const t of tables) {
  try {
    const res = await fetch(`${url}/rest/v1/${t}?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const body = await res.text();
    if (res.ok) {
      console.log(`OK: ${t} reachable`);
    } else {
      allOk = false;
      console.log(`FAIL: ${t} → HTTP ${res.status} ${body.slice(0, 120)}`);
    }
  } catch (e) {
    allOk = false;
    console.log(`FAIL: ${t} → ${e.message}`);
  }
}
if (!allOk) {
  console.log('\nHINT: supabase/schema.sql ko Supabase Dashboard → SQL Editor me paste karke Run karo, phir dobara chalao.');
  process.exit(2);
}
console.log('\nALL-TABLES-OK');
