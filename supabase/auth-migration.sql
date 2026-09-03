-- FailTrail Phase 2: multi-user auth migration.
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → New query → paste full file → Run.
-- Re-runnable hai. Iske baad anon key se purana open access band, sirf login users apna data dekhenge.
-- NOTE: pehle login karne ke baad app ka "Claim" button dabana — purana (user_id NULL) data tumhare account se jud jayega.

-- 1. weekly_insights me user_id (baaki child tables tasks se join par secured hain)
alter table weekly_insights add column if not exists user_id uuid;

-- 2. weekly unique ab per-user (pehle global tha)
alter table weekly_insights drop constraint if exists weekly_insights_week_start_week_end_key;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'weekly_insights_user_week_unique'
  ) then
    alter table weekly_insights
      add constraint weekly_insights_user_week_unique unique (user_id, week_start, week_end);
  end if;
end $$;

-- 3. v1 open policies hatao
drop policy if exists v1_open on tasks;
drop policy if exists v1_open on task_sessions;
drop policy if exists v1_open on interruptions;
drop policy if exists v1_open on completions;
drop policy if exists v1_open on weekly_insights;

-- 4. owner-only policies (authenticated role)
drop policy if exists owner_all on tasks;
create policy owner_all on tasks for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists owner_all on weekly_insights;
create policy owner_all on weekly_insights for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- child tables: parent task ke owner se secure (koi schema change nahi)
drop policy if exists owner_via_task on task_sessions;
create policy owner_via_task on task_sessions for all to authenticated
  using (exists (
    select 1 from tasks t where t.id = task_sessions.task_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from tasks t where t.id = task_sessions.task_id and t.user_id = auth.uid()
  ));

drop policy if exists owner_via_task on interruptions;
create policy owner_via_task on interruptions for all to authenticated
  using (exists (
    select 1 from tasks t where t.id = interruptions.task_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from tasks t where t.id = interruptions.task_id and t.user_id = auth.uid()
  ));

drop policy if exists owner_via_task on completions;
create policy owner_via_task on completions for all to authenticated
  using (exists (
    select 1 from tasks t where t.id = completions.task_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from tasks t where t.id = completions.task_id and t.user_id = auth.uid()
  ));

-- 5. one-time claim: v1 ka orphan (user_id NULL) data login user se jodo.
-- Sirf NULL rows update hoti hain — kisi aur ka data chhua nahi jata.
create or replace function claim_my_data()
returns json language plpgsql security definer set search_path = public as $$
declare
  tc int;
  wc int;
begin
  update tasks set user_id = auth.uid() where user_id is null;
  get diagnostics tc = row_count;
  update weekly_insights set user_id = auth.uid() where user_id is null;
  get diagnostics wc = row_count;
  return json_build_object('tasks_claimed', tc, 'insights_claimed', wc);
end $$;
