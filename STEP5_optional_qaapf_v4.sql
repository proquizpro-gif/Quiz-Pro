-- ══════════════════════════════════════════════════════════════════
-- STEP 5 (optional) — QAAPF v4
-- Run in Supabase → SQL Editor. Safe to run more than once.
--
-- The app works without this: baseline papers are recognised by the
-- "Aptitude Baseline" title prefix that the generator sets. Adding the
-- column lets the app mark baselines explicitly, so renaming a paper
-- cannot drop it from QAAPF results.
-- ══════════════════════════════════════════════════════════════════

alter table public.quizzes
  add column if not exists purpose text;

-- Mark the baseline papers created so far.
update public.quizzes
   set purpose = 'baseline'
 where purpose is null
   and title ilike 'Aptitude Baseline%';

-- Verify: baseline papers and their question counts.
select id, title, purpose, array_length(question_ids, 1) as questions
  from public.quizzes
 where purpose = 'baseline'
 order by title;
