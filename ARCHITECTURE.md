# ARCHITECTURE — FailTrail Web App

## 1. Stack Overview
```
Frontend : Next.js 14 (App Router) + TypeScript + Tailwind CSS + PWA (next-pwa / Serwist)
Backend  : Next.js Route Handlers (/api/*) — thin layer, no ORM (supabase-js server client)
Database : Supabase Postgres (single project, RLS OFF in v1, user_id nullable for Phase 2 auth)
AI       : OpenRouter (https://openrouter.ai/api/v1/chat/completions) via server route only
Cron     : Vercel Cron (1/week) → /api/cron/weekly
Deploy   : Vercel (frontend+API) + Supabase Cloud (DB)
Alarm    : Browser Notification API + Web Audio API + Service Worker (foreground checker)
```

> Kyun Next.js? Ek hi repo me UI + `/api/analyze` (key hiding) + cron + PWA. Supabase direct client se simple CRUD, server route sirf AI ke liye.

## 2. Project Structure
```
app/
  layout.tsx, page.tsx               # Today dashboard (planner + timer + stats)
  history/page.tsx                   # Calendar + failure/success logs + filters
  insights/page.tsx                  # Weekly AI reports list + detail
  api/
    tasks/route.ts                   # GET/POST tasks
    tasks/[id]/route.ts              # PATCH/DELETE
    sessions/route.ts                # POST start | pause | resume | complete | giveup
    interruptions/route.ts           # POST reason
    completions/route.ts             # POST feedback
    analyze/route.ts                 # POST on-demand AI (rate-limited)
    cron/weekly/route.ts             # GET (Vercel Cron secret) weekly AI
components/
  TaskForm.tsx, TaskList.tsx, TaskCard.tsx
  AlarmRinger.tsx                    # full-screen ringing + sound loop
  FocusTimer.tsx                     # countdown + controls (reload-proof)
  ReasonModal.tsx                    # pause/giveup/missed reason form
  CompleteModal.tsx                  # completion feedback form
  StatsStrip.tsx, FailureLog.tsx, InsightCard.tsx
lib/
  supabaseClient.ts (browser), supabaseServer.ts (server), types.ts
  alarm.ts (checker + sound + notify), timer.ts (remaining calc), stats.ts (week aggregator)
  openrouter.ts (chat call + prompt builder)
public/
  manifest.webmanifest, icons/*, sounds/alarm.mp3
supabase/
  schema.sql                         # single source of truth (neeche §3)
```

## 3. Database Schema (Supabase Postgres)

```sql
-- v1: no auth, RLS off. user_id nullable → Phase 2 me auth.users FK banega.
create extension if not exists "pgcrypto";

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  title text not null check (char_length(title) between 1 and 200),
  description text default '',
  planned_date date not null,
  planned_start_time time not null,
  planned_duration_min int not null check (planned_duration_min between 5 and 480),
  category text not null default 'other' check (category in ('study','work','health','other')),
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  status text not null default 'planned'
    check (status in ('planned','ringing','running','paused','completed','failed','skipped','missed')),
  snooze_count int not null default 0,
  created_at timestamptz default now()
);

create table task_sessions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  paused_total_sec int not null default 0,
  last_pause_at timestamptz null,
  total_focus_sec int not null default 0,
  status text not null default 'running'
    check (status in ('running','paused','completed','failed'))
);

create table interruptions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  session_id uuid null references task_sessions(id) on delete set null,
  reason_code text not null check (reason_code in
    ('phone_social_media','neend_aalsi','mood_nahi','mushkil_laga','bhookh',
     'guest_shor','urgent_kaam','light_net_issue','tabiyat','other')),
  reason_text text default '',
  mood int null check (mood between 1 and 5),
  occurred_at timestamptz default now()
);

create table completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  session_id uuid null references task_sessions(id) on delete set null,
  difficulty int not null check (difficulty between 1 and 5),
  focus_percent int not null check (focus_percent between 0 and 100),
  what_helped text default '',
  what_distracted text default '',
  notes text default '',
  created_at timestamptz default now()
);

create table weekly_insights (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  stats_json jsonb not null,
  ai_summary text not null,
  patterns text[] not null default '{}',
  recommendations text[] not null default '{}',
  model_used text not null,
  created_at timestamptz default now(),
  unique (week_start, week_end)
);

create index idx_tasks_date on tasks(planned_date);
create index idx_interruptions_task on interruptions(task_id);
create index idx_sessions_task on task_sessions(task_id);
```

**Relations:** tasks 1→N sessions, tasks 1→N interruptions, sessions 1→N interruptions, tasks 1→1 completions (last wins).

## 4. API Design (Next.js Route Handlers)

| Route | Method | Body | Action |
|---|---|---|---|
| `/api/tasks` | GET `?date=YYYY-MM-DD` | — | list by date |
| `/api/tasks` | POST | `{title, planned_date, planned_start_time, planned_duration_min, category, priority}` | create (status=planned) |
| `/api/tasks/[id]` | PATCH | `{...fields, status}` | edit / snooze++ / missed |
| `/api/sessions` | POST | `{action:start, task_id}` | create session, task→running |
| `/api/sessions` | POST | `{action:pause, session_id, reason_code, reason_text, mood}` | session→paused, insert interruption, task→paused |
| `/api/sessions` | POST | `{action:resume, session_id}` | paused_total += now-last_pause, →running |
| `/api/sessions` | POST | `{action:complete, session_id, difficulty, focus_percent, ...}` | close session, insert completion, task→completed |
| `/api/sessions` | POST | `{action:giveup, session_id, reason_code, reason_text, mood}` | close session failed, insert interruption, task→failed |
| `/api/analyze` | POST | `{week_start, week_end}` | rate-limit 3/day → build stats → OpenRouter → upsert weekly_insights |
| `/api/cron/weekly` | GET | `Authorization: Bearer CRON_SECRET` | last Mon–Sun window → same as analyze |

All responses: `{ ok:true, data }` ya `{ ok:false, error }`. Validation server-side with zod (light).

## 5. Alarm + Timer Design (Critical)

**Alarm checker (`lib/alarm.ts`):**
- Foreground `setInterval(30s)`: `planned` tasks jinka `planned_date=today && planned_start_time <= now < +2min && snooze_count<3` → status `ringing` + `<AlarmRinger/>` show + sound loop + `new Notification(...)`.
- Sound: `/sounds/alarm.mp3` via `Audio` loop; Stop on Start/Snooze/Skip. iOS silent-switch caveat documented.
- Permission: pehle visit par `Notification.requestPermission()` banner.
- Missed catchup: app open par `planned/ringing` tasks jinka time `>10min` past → `missed` + ReasonModal auto-open.

**Timer (`lib/timer.ts` + `FocusTimer.tsx`):**
- Source of truth: `sessions.started_at + paused_total_sec`. Client har 1s me `remaining = duration*60 - (now - started_at - paused_total)` render karta hai. Reload par server se session refetch → same formula → no loss.
- Pause: `last_pause_at=now`. Resume: `paused_total += now-last_pause`.
- Timeout (remaining≤0): alarm ding + auto-open CompleteModal.

## 6. AI Integration (`lib/openrouter.ts`)

```ts
POST https://openrouter.ai/api/v1/chat/completions
Headers: Authorization: Bearer OPENROUTER_API_KEY, HTTP-Referer: SITE_URL, X-Title: FailTrail
Body: { model: OPENROUTER_MODEL, messages: [system, user(statsJSON)], response_format: {type:'json_object'} }
```

**System prompt (locked Hindi coach):**
> "Tu ek strict par kind Hindi productivity coach hai. Sirf diye gaye JSON data se jawab de, guess mat kar. Output JSON: {summary, patterns[3], time_analysis, category_analysis, recommendations[3 actionable]}. Tone direct, blame-free, short."

**Stats builder (`lib/stats.ts`):** week ke tasks+sessions+interruptions+completions se `fails_by_reason/hour_slot/category`, `completion_rate`, `total_focus_min`, `avg_mood_on_fail`, `repeat_failed_titles` nikalta hai. Ye JSON hi prompt ka user message hai. Token bachane ke liye reason_text 200 chars/task truncate.

**Cost guard:** manual 3/day (in-memory + DB count), cron 1/week, model default `openai/gpt-4o-mini`, timeout 60s, fail par `ai_summary='AI fail, kal retry karo'` save nahi — error return.

## 7. Env Vars
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENROUTER_API_KEY=...            # server only, kabhi NEXT_PUBLIC_ mat banana
OPENROUTER_MODEL=openai/gpt-4o-mini
SITE_URL=http://localhost:3000   # prod: vercel url (OpenRouter header ke liye)
CRON_SECRET=...                   # vercel cron auth
```

## 8. PWA + Deploy
- `manifest.webmanifest` (name, icons 192/512, display standalone), theme-color.
- Service Worker: static cache + navigations fallback. Push nahi (v1 me nahi).
- Vercel: `vercel.json` cron `{ "path": "/api/cron/weekly", "schedule": "0 15 * * 0" }` (= Sun 21:00 IST). Env vars Vercel dashboard me.
- Supabase: `supabase/schema.sql` paste → Run. RLS off (v1). Backup weekly (manual export).

## 9. Security (v1 minimal, Phase 2 strict)
- v1: anon key se direct CRUD (single-user assumption). `/api/analyze` aur `/api/cron/weekly` server-only; key leak nahi. Cron secret check. Rate limit manual.
- Phase 2: Supabase Auth ON + RLS `auth.uid()=user_id` + service-role sirf cron me.

## 10. Edge Cases
- 2 tasks same time → dono ringe, queue me ek-ek karke (pehle wala Start/Skip ke baad dusra).
- Browser notification blocked → in-app ringer hi source of truth.
- Mid-timer tab close → reopen par session `running` milega, timer recalc, banner "tumhara timer chal raha tha".
- OpenRouter down → error toast + last insight dikhao, retry button.
- Sunday ko zero tasks → AI call skip, message "is week koi data nahi, pehle tasks plan karo."
