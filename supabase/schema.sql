-- FailTrail v1 schema (Supabase Postgres)
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → New query → paste full file → Run.
-- Re-runnable: sab kuch IF NOT EXISTS guards ke saath hai.
-- v1: no auth, RLS off. user_id nullable → Phase 2 me auth.users FK banega.

create extension if not exists "pgcrypto";

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '',
  planned_date date not null,
  planned_start_time time not null,
  planned_duration_min int not null check (planned_duration_min between 5 and 480),
  category text not null default 'other' check (category in ('study', 'work', 'health', 'other')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'planned'
    check (status in ('planned', 'ringing', 'running', 'paused', 'completed', 'failed', 'skipped', 'missed')),
  snooze_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists task_sessions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  paused_total_sec int not null default 0,
  last_pause_at timestamptz null,
  total_focus_sec int not null default 0,
  status text not null default 'running'
    check (status in ('running', 'paused', 'completed', 'failed'))
);

create table if not exists interruptions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  session_id uuid null references task_sessions (id) on delete set null,
  reason_code text not null check (reason_code in
    ('phone_social_media', 'neend_aalsi', 'mood_nahi', 'mushkil_laga', 'bhookh',
     'guest_shor', 'urgent_kaam', 'light_net_issue', 'tabiyat', 'other')),
  reason_text text not null default '',
  mood int null check (mood between 1 and 5),
  occurred_at timestamptz not null default now()
);

create table if not exists completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  session_id uuid null references task_sessions (id) on delete set null,
  difficulty int not null check (difficulty between 1 and 5),
  focus_percent int not null check (focus_percent between 0 and 100),
  what_helped text not null default '',
  what_distracted text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists weekly_insights (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  stats_json jsonb not null,
  ai_summary text not null,
  patterns text[] not null default '{}',
  recommendations text[] not null default '{}',
  model_used text not null,
  created_at timestamptz not null default now(),
  unique (week_start, week_end)
);

create index if not exists idx_tasks_date on tasks (planned_date);
create index if not exists idx_interruptions_task on interruptions (task_id);
create index if not exists idx_sessions_task on task_sessions (task_id);

-- v1 policies: single-user, anon key se full access (Supabase default RLS ON rehta hai).
-- Phase 2 (Supabase Auth) me inhe `auth.uid() = user_id` policies se REPLACE karna.
do $$
declare t text;
begin
  foreach t in array array['tasks', 'task_sessions', 'interruptions', 'completions', 'weekly_insights'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists v1_open on %I', t);
    execute format('create policy v1_open on %I for all to anon using (true) with check (true)', t);
  end loop;
end $$;
