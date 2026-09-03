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
| `SUPABASE_SERVICE_ROLE_KEY` | supabase.com → Settings → API → `service_role` (server-only, cron ke liye) |
| `SITE_URL` | local: `http://localhost:3000`, prod: Vercel URL |
| `CRON_SECRET` | koi lamba random string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

### Database (1 baar + auth migration)

Supabase Dashboard → **SQL Editor → New query** → `supabase/schema.sql` paste → **Run**.
Phir wahi par `supabase/auth-migration.sql` paste → **Run** (login-required RLS policies).

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

## 5. Login (Email OTP + link)

`/login` par email dalo → OTP/code **ya email ka link** — dono se login hota hai
(`/auth/callback` link wale flow ko handle karta hai).
Dashboard me 1 setting: Supabase → **Authentication → URL Configuration** →
**Site URL** = prod URL + **Redirect URLs** me prod aur `http://localhost:3000/*` add karo,
warna email link block ho jayega.

`/login` par email dalo → 6-digit OTP → verify. Pehli login par purana
bina-user data auto-claim ho jata hai (`/api/auth/claim`). Bina login har API 401 deta hai.
Har user ka data RLS se isolated hai; Sunday cron har user ki alag report banata hai.

## 6. Android app (Capacitor)

Web code same rehta hai — `android/` native shell hai jo prod URL load karta hai.

```bash
npx cap sync android          # web/config change ke baad
# Android Studio me android/ kholo → Run, ya CLI:
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
Set-Location android; .\gradlew.bat assembleDebug   # APK: android/app/build/outputs/apk/debug/
```

- Native exact alarms: task plan karte hi schedule, change/delete par auto-fix (`hooks/useNativeAlarms.ts`). App killed ho tab bhi bajta hai.
- Phone par install: APK transfer → install (unknown apps allow) → **Notifications + Alarms & reminders** permission ON → future task banao → app band karo → time par notification aayega, tap se app khulegi.
- Local dev live-reload: `capacitor.config.ts` me `server.url` LAN IP se replace → `npx cap sync`.
- Release (Play Store): Android Studio → Build → Generate Signed Bundle/APK (upload key banao, sambhal ke rakho).

## 7. Aage (backlog)

Google OAuth login (Supabase → Authentication → Providers → Google, GCP credentials chahiye),
FCM mobile push alarm, streaks/gamification, Pomodoro auto-breaks, PDF export.
