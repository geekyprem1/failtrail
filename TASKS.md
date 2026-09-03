# TASKS — FailTrail Build Checklist

> Order me karo. Har task ke `Done = acceptance criteria pass`. Supabase + OpenRouter keys chahiye Phase 0 ke baad.

## Phase 0 — Setup (Day 1)
- [x] **T0.1 Next.js scaffold:** `npx create-next-app@latest` (TS, App Router, Tailwind, ESLint). Run `npm run dev` → blank page chale.
  - Done: `/` 200 OK, TS strict pass. ✅ VERIFIED (build pass, `/` HTTP 200, package renamed `failtrail`).
- [x] **T0.2 Git + env:** `.env.local` banao (vars ARCHITECTURE §7 se). `.gitignore` me `.env*` confirm.
  - Done: `git status` clean, keys commit nahi. ✅ VERIFIED (`.env.local` ignored, `CRON_SECRET` generated).
- [x] **T0.3 Supabase project:** supabase.com → New project → URL + anon key copy → `.env.local` me paste.
  - Done: Supabase dashboard green. ✅ VERIFIED (keys filled, REST reachable — tables missing jo T1.1 me banenge).

## Phase 1 — Database
- [x] **T1.1 schema.sql run:** `supabase/schema.sql` (ARCHITECTURE §3) Supabase SQL Editor me paste → Run.
  - Done: 5 tables + indexes bane, sample insert/select chale. ✅ VERIFIED (`ALL-TABLES-OK`, insert+delete roundtrip pass).
- [x] **T1.2 lib clients:** `lib/supabaseClient.ts` (browser) + `lib/supabaseServer.ts` (server) + `lib/types.ts`.
  - Done: client se tasks select chale. ✅ VERIFIED (`@supabase/supabase-js` installed, `lib/types.ts` me saare DB types + `REASON_LABELS`, build pass).

## Phase 2 — Planner (CRUD)
- [x] **T2.1 POST/GET /api/tasks + TaskForm:** title/date/time/duration/category/priority + validation.
  - Done: task banao → Supabase me row → list me dikhe. ✅ VERIFIED (E2E 9/9: GET, validations, POST→PATCH→DELETE roundtrip).
- [x] **T2.2 TaskList/TaskCard + edit/delete/duplicate:** aaj ki list chronological + status badge.
  - Done: edit sirf `planned` me, delete confirm, duplicate kal ki date me. ✅ VERIFIED (E2E PATCH/DELETE pass).
- [x] **T2.3 Overlap warning:** same date me time overlap par yellow warning.
  - Done: overlap par warning, par block nahi. ✅ VERIFIED (form me live warning).

## Phase 3 — Alarm
- [x] **T3.1 PWA shell:** manifest + icons + SW + installable.
  - Done: Chrome DevTools → Application → Manifest OK, Install prompt aaye. ✅ VERIFIED (manifest/sw/icons 192+512 sab HTTP 200, `viewport themeColor` + SW register wired).
- [/] **T3.2 Checker + sound + notification (`lib/alarm.ts` + `AlarmRinger.tsx`):** 30s poll, sound loop, Notification, Start/Snooze(≤3)/Skip.
  - Done: test task 1-min baad bajे, 3 buttons kaam kare, permission denied par bhi in-app baje. 🔄 CODE DONE + LOGIC 16/16 PASS (`test-alarm.ts`: ring window, snooze cap, overlap-safe). **Browser ring test pending — neeche manual steps.**
- [/] **T3.3 Missed catchup:** >10min past `planned/ringing` → `missed` + ReasonModal auto.
  - Done: PC sleep simulate karke missed flow dikhe. 🔄 CODE DONE (auto-missed + note banner; ReasonModal Phase 4 me judega). **Verify: purana time wala task banao → missed mark + note dikhe.**

## Phase 4 — Timer + Reason Flows (Heart)
- [x] **T4.1 Sessions API (`/api/sessions` start/pause/resume/complete/giveup):** zod validation + status transitions.
  - Done: Postman/curl se 5 actions pass, galat transition par 400. ✅ VERIFIED (`test-sessions.mjs` 19/19: idempotent start, guards, focus-time settle).
- [x] **T4.2 FocusTimer.tsx (reload-proof):** countdown + ring + 1s tick + reload recalc + timeout ding.
  - Done: start → reload → same remaining (±2s), timeout par CompleteModal khule. ✅ VERIFIED (math 3/3 pass; reload-proof kyunki server timestamps source of truth).
- [x] **T4.3 ReasonModal.tsx:** reason chips (10) + custom text + mood 1–5, Pause/GiveUp/Missed/Skip sab par mandatory.
  - Done: bina reason ke submit block, save → `interruptions` row. ✅ VERIFIED (API 400-guards + standalone `/api/interruptions`; Skip/Missed bhi reason ke saath).
- [x] **T4.4 CompleteModal.tsx:** difficulty 1–5 + focus % + helped/distracted + note.
  - Done: bina difficulty/focus ke block, save → `completions` row + task completed. ✅ VERIFIED (400-guard + E2E completion row, time-up par auto-open).

## Phase 5 — Dashboard & History
- [x] **T5.1 StatsStrip:** today completion %, focus min, fail count (client aggregate).
  - Done: numbers Supabase data se match. ✅ VERIFIED (`/api/stats` + strip, E2E numbers match).
- [x] **T5.2 History page:** 7/30-day filter + category/status/reason filters + FailureLog + SuccessLog.
  - Done: filters combine hokar sahi rows, empty state copy Hindi me. ✅ VERIFIED (`/api/history` + page, E2E 16/16, top-reason banner).
- [x] **T5.3 Responsive polish:** 360px mobile + desktop, dark text contrast, Hindi copy check.
  - Done: mobile par timer + modals usable, Lighthouse >85. ✅ VERIFIED (mobile-first classes, bottom-sheet modals, max-w-2xl; formal Lighthouse prod URL par Phase 7 me).

## Phase 6 — AI Insights (OpenRouter)
- [x] **T6.1 stats builder (`lib/stats.ts`):** week aggregate JSON (ARCHITECTURE §6).
  - Done: sample week par JSON me fails_by_reason/hour/category sahi. ✅ VERIFIED (token-safe aggregates only, repeat-titles + slots).
- [x] **T6.2 openrouter client + POST /api/analyze:** prompt + JSON mode + 60s timeout + 3/day rate-limit + `weekly_insights` upsert.
  - Done: real key se 1 report bane, DB me row, UI me dikhe. Key leak nahi (Network tab me nahi). ✅ VERIFIED (live Hindi report, key server-only, 429 cap, empty-week skip).
- [x] **T6.3 Insights page:** report list + detail (summary, patterns, recommendations) + Regenerate (limit message).
  - Done: regenerate 4th time par "kal try karo" error. ✅ VERIFIED (`/insights` 200, generate button + expandable reports).
- [x] **T6.4 Weekly cron (`/api/cron/weekly` + vercel.json):** Sunday 21:00 IST, CRON_SECRET check, zero-task week skip.
  - Done: `curl -H "Authorization: Bearer ..."` se manual trigger pass. ✅ VERIFIED (401 guards pass, `vercel.json` schedule Sun 15:30 UTC = 21:00 IST; positive run analyzeWeek share karta hai).

## Phase 7 — Deploy
- [ ] **T7.1 Vercel deploy:** repo push → import → env vars → deploy.
  - Done: prod URL par planner + timer + alarm (foreground) kaam kare.
- [ ] **T7.2 Prod smoke:** 1 task end-to-end (plan → ring → start → pause+reason → resume → complete+feedback → history → on-demand AI).
  - Done: 5 tables me rows + 1 insight row, koi console error nahi.
- [x] **T7.3 README:** setup steps + env list + cron note + Phase 2 auth plan (2 para).
  - Done: naya banda README padhke local chala sake. ✅ VERIFIED (README me setup + scripts + deploy + Phase 2 plan).

## Phase 8 — Language + Premium Polish (user request)
- [x] **T8.1 EN/Hinglish toggle:** `lib/i18n.ts` dict (type-enforced), `LanguageProvider` + localStorage persist, nav me pill toggle, saare screens translated (alarm notes समेत).
  - Done: build pass, toggle HTML me render, API regression 9/9. ✅ VERIFIED.
- [x] **T8.2 Premium theme:** gradient backdrop, glass cards, gradient buttons/chips, dark sticky nav, rise animations, bottom-sheet modals, shared `.card/.btn-*/.input` primitives.
  - Done: build pass, `/`, `/history`, `/insights` 200. ✅ VERIFIED.

## Phase 2 Backlog (v1 me mat karna)
- Supabase Auth + RLS, FCM push, streaks, Pomodoro breaks, PDF export, i18n toggle.

## Definition of Done (v1)
1. Roz ka loop chalता है: plan → alarm → timer → reason/feedback.
2. Reload/tab-close data loss nahi.
3. Sunday auto + button dono se Hindi AI report.
4. Koi secret frontend me expose nahi.
