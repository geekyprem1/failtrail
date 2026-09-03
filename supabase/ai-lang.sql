-- FailTrail: AI report language column.
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Re-runnable. Purani reports NULL lang = Hinglish (default).
alter table weekly_insights add column if not exists lang text not null default 'hinglish';
