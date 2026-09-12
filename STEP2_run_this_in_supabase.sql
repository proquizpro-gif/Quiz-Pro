-- ═══════════════════════════════════════════════════════════════════════
-- QuizPro v3.2 — Fix migration
-- Adds fields required for:
--   • Subject-level organization of questions (Issue #1)
--   • Difficulty tagging (Issue #1, #5)
--   • Faculty-controlled post-submission answer visibility (Issue #4)
--   • Exact-pick quizzes — teacher-selected question IDs (Issue #2, #6)
--
-- Safe to run multiple times: every ALTER uses IF NOT EXISTS.
-- Run this in Supabase → SQL Editor after the original STEP1 migration.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Questions: add subject and difficulty
alter table public.questions
  add column if not exists subject     text not null default '';
alter table public.questions
  add column if not exists difficulty  text not null default 'medium'
  check (difficulty in ('easy', 'medium', 'hard'));

create index if not exists questions_subject_idx    on public.questions(subject);
create index if not exists questions_difficulty_idx on public.questions(difficulty);

-- 2. Quizzes: answer-visibility policy (critical security fix, Issue #4)
--    'immediate'    — show answers right after submission (legacy behaviour)
--    'after_close'  — show answers only after the quiz's close_at passes
--                      (or, if no close_at, when faculty flips is_open off)
--    'never'        — show score only; never reveal correct answers
alter table public.quizzes
  add column if not exists show_answers_policy text not null default 'after_close'
  check (show_answers_policy in ('immediate', 'after_close', 'never'));

-- 3. Quizzes: subject label (denormalized so quiz cards can show
--    "Marketing Management -> Unit 1" without joining every question)
alter table public.quizzes
  add column if not exists subject text not null default '';

-- 4. Quizzes: explicit list of question IDs the teacher picked
--    (Issue #2 + #6 - teacher's selection is now honored at runtime,
--    not overridden by random draw from the whole unit's bank)
alter table public.quizzes
  add column if not exists question_ids uuid[] not null default '{}';

create index if not exists quizzes_question_ids_idx on public.quizzes using gin(question_ids);

-- ═══════════════════════════════════════════════════════════════════════
-- Verification - should return one row per quiz with the new columns
-- populated for any new quizzes, and default values for old ones.
-- ═══════════════════════════════════════════════════════════════════════
-- select id, title, subject, show_answers_policy, array_length(question_ids, 1) as picked_count
-- from public.quizzes limit 5;
