-- ═══════════════════════════════════════════════════════════════════
--  QuizPro — STEP 3
--  Student identification on attempt records.
--
--  WHY THIS IS REQUIRED
--  The app collects Course / Semester / CU ID / Phone before a
--  student's first quiz and writes those fields onto each attempt so
--  the results export identifies who actually sat the paper. Without
--  these columns the app still works (it strips the fields and saves
--  the score), but your CSV export will have empty identity columns.
--
--  Safe to run more than once. Safe to run on a live database.
--  Nothing is deleted and no existing row is modified.
-- ═══════════════════════════════════════════════════════════════════

alter table public.attempts
  add column if not exists student_course   text;

alter table public.attempts
  add column if not exists student_semester text;

alter table public.attempts
  add column if not exists student_cu_id    text;

alter table public.attempts
  add column if not exists student_phone    text;

-- Full profile snapshot, kept as JSON so future profile fields do not
-- require another migration.
alter table public.attempts
  add column if not exists meta             jsonb not null default '{}'::jsonb;

-- Roster lookups by university ID are the common query in a results
-- screen, so index it. Partial index keeps it small: rows predating
-- this migration have no CU ID and are not worth indexing.
create index if not exists attempts_student_cu_id_idx
  on public.attempts (student_cu_id)
  where student_cu_id is not null;

-- ── Verify ─────────────────────────────────────────────────────────
-- Expect 5 rows: meta, student_course, student_cu_id,
--                student_phone, student_semester
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'attempts'
  and column_name in (
    'student_course', 'student_semester',
    'student_cu_id', 'student_phone', 'meta'
  )
order by column_name;
