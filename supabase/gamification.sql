-- FailTrail gamification: XP ledger.
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Re-runnable. Score/streak compute hote hain (tables nahi) — sirf XP persist hota hai.
create table if not exists xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('task_complete', 'backfill', 'bonus')),
  points int not null check (points >= 0),
  task_id uuid null references tasks (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_xp_user on xp_events (user_id);

alter table xp_events enable row level security;
drop policy if exists owner_all on xp_events;
create policy owner_all on xp_events for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
