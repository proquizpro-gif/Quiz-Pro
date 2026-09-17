-- ═══════════════════════════════════════════════════════════════════
--  QuizPro — STEP 4
--  Live invigilation: see students while they are still writing.
--
--  WHY THIS IS NEEDED
--  An `attempts` row is only created when a student presses submit, so
--  until then the faculty dashboard has nothing to show. Integrity
--  flags raised mid-exam were likewise invisible until afterwards,
--  which is exactly when they are no longer actionable.
--
--  This table carries one row per in-progress sitting, updated by the
--  student's browser every few seconds. It is deliberately separate
--  from `attempts`: that table is the official grade record and must
--  not be written to repeatedly during an exam.
--
--  Safe to run more than once. Safe to run on a live database.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.live_sessions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  user_id       uuid not null references auth.users(id)     on delete cascade,
  student_name  text,
  student_course text,
  student_cu_id  text,
  started_at    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  answered      int  not null default 0,
  total         int  not null default 0,
  violations    int  not null default 0,
  last_flag     text,
  remaining_sec int,
  status        text not null default 'active',   -- active | submitted | abandoned
  unique (quiz_id, user_id)
);

alter table public.live_sessions enable row level security;

-- ── Policies ───────────────────────────────────────────────────────
-- A student may create and update only their own session row.
drop policy if exists "live: student upsert own" on public.live_sessions;
create policy "live: student upsert own"
  on public.live_sessions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "live: student update own" on public.live_sessions;
create policy "live: student update own"
  on public.live_sessions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Read access mirrors who may see the quiz: the student themselves,
-- plus staff who own or co-own the classroom the quiz belongs to.
-- Scoping through the quiz keeps this consistent with the attempts
-- policy rather than inventing a second, divergent rule.
drop policy if exists "live: read scoped" on public.live_sessions;
create policy "live: read scoped"
  on public.live_sessions for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.quizzes q
      where q.id = live_sessions.quiz_id
        and (
          public.is_admin()
          or q.created_by = auth.uid()
          or (q.classroom_id is not null and public.is_classroom_staff(q.classroom_id))
        )
    )
  );

drop policy if exists "live: staff delete" on public.live_sessions;
create policy "live: staff delete"
  on public.live_sessions for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.quizzes q
      where q.id = live_sessions.quiz_id
        and (public.is_admin() or q.created_by = auth.uid()
             or (q.classroom_id is not null and public.is_classroom_staff(q.classroom_id)))
    )
  );

-- ── Realtime ───────────────────────────────────────────────────────
-- Without this the table exists but broadcasts nothing, which looks
-- identical to "no students writing" from the dashboard.
do $$
begin
  alter publication supabase_realtime add table public.live_sessions;
exception
  when duplicate_object then null;   -- already published
  when undefined_object then null;   -- publication absent on this project
end $$;

-- `attempts` is also needed for the submitted-row broadcast.
do $$
begin
  alter publication supabase_realtime add table public.attempts;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- Dashboards query by quiz and sort by recency.
create index if not exists live_sessions_quiz_idx
  on public.live_sessions (quiz_id, last_seen desc);

-- ── Verify ─────────────────────────────────────────────────────────
-- Expect: the table, 4 policies, and both tables in the publication.
select 'table'  as kind, tablename as name from pg_tables
  where schemaname = 'public' and tablename = 'live_sessions'
union all
select 'policy', policyname from pg_policies
  where schemaname = 'public' and tablename = 'live_sessions'
union all
select 'realtime', tablename from pg_publication_tables
  where pubname = 'supabase_realtime' and tablename in ('live_sessions','attempts');
