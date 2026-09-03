# FailTrail — Roz ki galti, ab data me

Daily tasks plan karo → alarm par start karo → timer chalao → ruko to **kaaran likho**,
complete ho to **feedback likho** → Sunday AI se **weekly pattern report** (Hindi me).

Stack: **Next.js 14 App Router + Supabase Postgres + OpenRouter AI + PWA.** Deploy: Vercel.

## 1. Local setup (5 min)

```bash
npm install
```

### Env (`.env.local`)

| Var | Kahan se |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | supabase.com → Project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | wahi (anon public key) |
| `OPENROUTER_API_KEY` | openrouter.ai/keys |
| `OPENROUTER_MODEL` | default `openai/gpt-4o-mini` |
| `SITE_URL` | local: `http://localhost:3000`, prod: Vercel URL |
| `CRON_SECRET` | koi lamba random string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

### Database (1 baar)

Supabase Dashboard → **SQL Editor → New query** → `supabase/schema.sql` ka poora content
paste → **Run**. Re-runnable hai (policies समेत — v1 me anon key se open access).

Verify:

```bash
npm run dev
node scripts/check-db.mjs   # ALL-TABLES-OK aana chahiye
```

## 2. Scripts

| Command | Kaam |
|---|---|
| `npm run dev` / `npm run build` | dev / prod build |
| `node scripts/check-db.mjs` | 5 tables reachable? |
| `node scripts/test-tasks.mjs` | tasks CRUD E2E (dev server chahiye) |
| `node scripts/test-sessions.mjs` | timer lifecycle E2E (19 checks) |
| `node scripts/test-history.mjs` | stats + history E2E |
| `node scripts/test-analyze.mjs` | analyze validations + **1 live AI call** |
| `npx tsx scripts/test-alarm.ts` | alarm window + timer math unit tests |
| `python scripts/make-icons.py` | PWA icons regenerate |

## 3. Kaise kaam karta hai (short)

- **Alarm:** foreground checker har 30s (`hooks/useAlarms`) — start time ±2 min me
  full-screen ringer + WebAudio beeps + Notification. 3 snooze max, 10 min late → missed.
- **Timer:** source of truth server timestamps (`started_at`, `paused_total_sec`) —
  reload par `sessionRemainingSec()` se recalc, data loss nahi.
- **Reasons:** pause/giveup/skip/missed sab par reason mandatory → `interruptions` table.
- **AI:** `lib/analyzeWeek.ts` pipeline (week data → aggregates → OpenRouter JSON →
  `weekly_insights` upsert). Manual max 3/day, cron Sunday 21:00 IST (`vercel.json`).

Docs: `PRD.md` (features), `ARCHITECTURE.md` (design + schema + API), `TASKS.md` (build checklist).

## 4. Vercel deploy

1. GitHub repo push → vercel.com → Import → Env vars (upar wali table, `SITE_URL` = prod URL).
2. Deploy → Cron auto-register (`/api/cron/weekly`, Sunday 21:00 IST).
3. Smoke: 1 task end-to-end (plan → ring → start → pause+reason → resume → complete+feedback → History → Insights me on-demand report).

## 5. Phase 2 plan (abhi nahi)

Supabase Auth (Email/Google) ON → RLS policies `auth.uid() = user_id` se replace
(`supabase/schema.sql` ke `v1_open` policies hatana) → anon client me `user_id` bhejna →
FCM mobile push, streaks, PDF export.
