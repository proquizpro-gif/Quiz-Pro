-- ═══════════════════════════════════════════════════════════════════
--  QuizPro — STEP 6 (recommended)
--  Exam security: answer keys stay on the server, and the server marks
--  every paper.
--
--  WHAT IT FIXES
--  1. Every student's browser downloaded the whole question bank with
--     the correct answer to every question. Anyone who opened the
--     browser's developer tools could read the key of any quiz, before
--     and during the exam. After this step students cannot read the
--     questions table at all; the exam screen gets its paper — without
--     answers — from a new function, quiz_paper().
--  2. The score was worked out in the student's browser and stored as
--     sent. After this step the database re-marks every submitted paper
--     against the answer key, and sets the attempt number and the
--     submission time itself.
--  3. The attempt limit was only checked in the browser. It is now
--     enforced by the database.
--  4. A student could reset their own exam clock by deleting or editing
--     their live-invigilation row. The start time is now protected.
--
--  SAFE TO RUN
--  • Run after STEP1–STEP4 (STEP3 and STEP4 are optional; the parts that
--    need them are skipped if their tables or columns are missing).
--  • Safe to run more than once. Nothing is deleted. Existing attempts
--    are not changed — only new submissions are marked by the server.
--  • ORDER MATTERS: deploy the new app (v4.1) FIRST and check it loads,
--    then run this. The old app reads questions directly, so with this
--    step in place it would show students "Not enough questions in
--    bank" and they could not start a quiz.
--  • Run it when no quiz is being written.
--
--  TO UNDO (if ever needed) — run the block at the very bottom.
-- ═══════════════════════════════════════════════════════════════════


-- ── 0. Who is staff ────────────────────────────────────────────────
create or replace function public.qp_is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('faculty', 'admin')
  );
$$;
grant execute on function public.qp_is_staff() to authenticated;


-- ── 1. Students can no longer read the questions table ─────────────
-- A RESTRICTIVE policy narrows whatever permissive policies already
-- exist (it is ANDed with them), so it works without knowing their
-- names. Faculty and admins keep full access.
drop policy if exists "questions: staff only read (step6)" on public.questions;
create policy "questions: staff only read (step6)"
  on public.questions as restrictive for select to authenticated
  using (public.qp_is_staff());


-- ── 2. A quiz's paper, without the answer key ──────────────────────
-- Returns the quiz's questions as JSON rows with no "correct" field.
-- A student gets them only for a quiz they can sit: its classroom is
-- theirs (or it is open to all), and it is open now — or they already
-- have a sitting in progress, so a paper reopened after the close time
-- (a crash, a dropped connection) can still be finished and submitted.
create or replace function public.quiz_paper(p_quiz_id uuid)
returns setof json
language plpgsql stable security definer set search_path = public
as $$
declare
  z        public.quizzes%rowtype;
  v_staff  boolean := public.qp_is_staff();
  v_member boolean;
  v_open   boolean;
  v_live   boolean := false;
  v_units  text[];
begin
  select * into z from public.quizzes where id = p_quiz_id;
  if not found then
    raise exception 'Quiz not found' using errcode = 'P0002';
  end if;

  if not v_staff then
    v_member := z.classroom_id is null or exists (
      select 1 from public.classroom_members m
      where m.classroom_id = z.classroom_id and m.user_id = auth.uid());
    if not v_member then
      raise exception 'This quiz is not shared with you' using errcode = '42501';
    end if;

    v_open := coalesce(z.is_open, true)
          and (z.open_at  is null or z.open_at  <= now() + interval '5 minutes')
          and (z.close_at is null or z.close_at >  now());
    if not v_open then
      begin
        select exists (
          select 1 from public.live_sessions s
          where s.quiz_id = p_quiz_id and s.user_id = auth.uid() and s.status <> 'submitted'
        ) into v_live;
      exception when undefined_table then v_live := false;
      end;
      if not v_live then
        raise exception 'This quiz is not open' using errcode = '42501';
      end if;
    end if;
  end if;

  -- Works whether quizzes.units is text[] or jsonb.
  select coalesce(array_agg(u), '{}') into v_units
    from jsonb_array_elements_text(coalesce(to_jsonb(z.units), '[]'::jsonb)) as u;

  return query
    select json_build_object(
      'id', q.id, 'question', q.question, 'options', q.options,
      'unit', q.unit, 'topic', q.topic, 'subject', q.subject,
      'difficulty', q.difficulty, 'points', q.points)
    from public.questions q
    where (coalesce(cardinality(z.question_ids), 0) > 0 and q.id = any(z.question_ids))
       or (coalesce(cardinality(z.question_ids), 0) = 0 and q.unit = any(v_units));
end;
$$;
revoke all on function public.quiz_paper(uuid) from public, anon;
grant execute on function public.quiz_paper(uuid) to authenticated;


-- ── 3. The server marks every paper ────────────────────────────────
-- Runs before each new attempt is stored. For every item it looks up
-- the question, finds the correct answer by its text among the options
-- the student was shown, and recomputes score, max_score and percent.
-- Items that are not questions of this quiz score nothing, and the
-- maximum is the whole quiz, so a doctored submission cannot raise a
-- score. Optional columns (meta) are read through to_jsonb(new) so the
-- trigger also works where STEP3 was never run.
create or replace function public.qp_mark_attempt()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  z         public.quizzes%rowtype;
  v_staff   boolean := public.qp_is_staff();
  v_used    int;
  v_items   jsonb := '[]'::jsonb;
  v_in      jsonb;
  it        jsonb;
  q         record;
  v_qid     uuid;
  v_key     int;
  v_keytext text;
  v_chosen  int;
  v_pts     numeric;
  v_score   numeric := 0;
  v_max     numeric := 0;
  v_seen    uuid[] := '{}';
  v_units   text[];
  v_exact   boolean;
  v_scored  int := 0;
  v_expect  int;
begin
  select * into z from public.quizzes where id = new.quiz_id;
  if not found then
    raise exception 'Quiz not found' using errcode = 'P0002';
  end if;

  if not v_staff then
    if new.user_id is distinct from auth.uid() then
      raise exception 'An attempt can only be submitted by the student who sat it' using errcode = '42501';
    end if;
    if z.classroom_id is not null and not exists (
      select 1 from public.classroom_members m
      where m.classroom_id = z.classroom_id and m.user_id = new.user_id) then
      raise exception 'This quiz is not shared with you' using errcode = '42501';
    end if;
  end if;

  -- Attempt limit and numbering. Serialised per student and quiz so two
  -- submissions sent at the same moment cannot both pass the check.
  perform pg_advisory_xact_lock(hashtextextended(new.quiz_id::text || ':' || new.user_id::text, 0));
  select count(*) into v_used from public.attempts a
   where a.quiz_id = new.quiz_id and a.user_id = new.user_id;
  if not v_staff and v_used >= greatest(coalesce(z.max_attempts, 1), 1) then
    raise exception 'No attempts left on this quiz (% of % used)', v_used, greatest(coalesce(z.max_attempts, 1), 1)
      using errcode = 'P0001';
  end if;
  new.attempt_number := v_used + 1;
  new.submitted_at   := now();

  -- Re-mark.
  v_exact := coalesce(cardinality(z.question_ids), 0) > 0;
  select coalesce(array_agg(u), '{}') into v_units
    from jsonb_array_elements_text(coalesce(to_jsonb(z.units), '[]'::jsonb)) as u;

  v_in := to_jsonb(new.items);
  if v_in is null or jsonb_typeof(v_in) <> 'array' then v_in := '[]'::jsonb; end if;

  for it in select * from jsonb_array_elements(v_in) loop
    v_qid := null; v_key := null;
    if (it->>'qid') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_qid := (it->>'qid')::uuid;
    end if;

    select qq.correct, qq.points, to_jsonb(qq.options) as opts, qq.unit
      into q
      from public.questions qq
     where qq.id = v_qid
       and (case when v_exact then qq.id = any(z.question_ids) else qq.unit = any(v_units) end);

    if v_qid is null or not found or v_qid = any(v_seen) then
      -- Not a question of this quiz (or a repeat): kept for the record, never scored.
      v_items := v_items || jsonb_build_array(it || jsonb_build_object('correct', null, 'unscored', true));
      continue;
    end if;
    v_seen := v_seen || v_qid;

    -- The key, located by its text among the options as shown.
    v_keytext := q.opts ->> q.correct;
    select (o.ord - 1)::int into v_key
      from jsonb_array_elements_text(case when jsonb_typeof(it->'options') = 'array' then it->'options' else q.opts end)
           with ordinality as o(txt, ord)
     where v_keytext is not null and lower(btrim(o.txt)) = lower(btrim(v_keytext))
     limit 1;
    if v_key is null then v_key := q.correct; end if;

    v_pts := greatest(coalesce(q.points, 1), 0);
    v_max := v_max + v_pts;
    v_scored := v_scored + 1;
    v_chosen := case when (it->>'chosen') ~ '^-?\d+$' then (it->>'chosen')::int else null end;
    if v_chosen is not null and v_chosen = v_key then v_score := v_score + v_pts; end if;

    v_items := v_items || jsonb_build_array(it || jsonb_build_object('correct', v_key));
  end loop;

  -- The maximum is the whole paper, not only what was sent back.
  if v_exact then
    select coalesce(sum(greatest(coalesce(qq.points, 1), 0)), 0) into v_max
      from public.questions qq where qq.id = any(z.question_ids);
  else
    v_expect := greatest(coalesce(z.draw_count, 0), 0);
    if v_scored < v_expect then v_max := v_max + (v_expect - v_scored); end if;
  end if;

  new.items     := v_items;
  new.score     := v_score;
  new.max_score := v_max;
  new.percent   := case when v_max > 0 then round(v_score * 100.0 / v_max) else 0 end;
  return new;
end;
$$;

drop trigger if exists qp_mark_attempt on public.attempts;
create trigger qp_mark_attempt
  before insert on public.attempts
  for each row execute function public.qp_mark_attempt();


-- ── 4. One stored attempt per sitting ──────────────────────────────
-- The app gives every sitting a token (meta.client_attempt_id). A
-- unique index makes a repeated save of the same paper impossible.
-- Needs the meta column from STEP3; skipped without it.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'attempts' and column_name = 'meta') then
    execute 'create unique index if not exists attempts_client_attempt_id_uidx
               on public.attempts ((meta->>''client_attempt_id''))
               where meta ? ''client_attempt_id''';
  end if;
end $$;


-- ── 5. Protect the exam clock in live_sessions (needs STEP4) ───────
-- The app anchors a student's exam clock to live_sessions.started_at.
-- A student could previously delete or edit their own row to get a
-- fresh clock. Now only staff can delete rows, a student cannot move
-- the start time of a sitting still in progress, and a sitting is only
-- marked submitted once an attempt actually exists.
do $$
begin
  if to_regclass('public.live_sessions') is null then
    raise notice 'live_sessions not found — STEP4 not run; clock protection skipped.';
    return;
  end if;

  execute 'drop policy if exists "live: staff delete" on public.live_sessions';
  execute $p$
    create policy "live: staff delete"
      on public.live_sessions for delete to authenticated
      using (exists (
        select 1 from public.quizzes q
        where q.id = live_sessions.quiz_id
          and (public.is_admin() or q.created_by = auth.uid()
               or (q.classroom_id is not null and public.is_classroom_staff(q.classroom_id)))))
  $p$;
end $$;

create or replace function public.qp_guard_live_session()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_dur int;
begin
  if public.qp_is_staff() then return new; end if;

  if new.started_at is distinct from old.started_at and old.status <> 'submitted' then
    select coalesce(duration_sec, 0) into v_dur from public.quizzes where id = old.quiz_id;
    if old.started_at + make_interval(secs => coalesce(v_dur, 0)) > now() then
      new.started_at := old.started_at;   -- a sitting in progress keeps its clock
    end if;
  end if;

  if new.status = 'submitted' and old.status <> 'submitted' and not exists (
       select 1 from public.attempts a
       where a.quiz_id = old.quiz_id and a.user_id = old.user_id
         and a.submitted_at >= old.started_at - interval '1 minute') then
    new.status := old.status;            -- no attempt, so not submitted
  end if;
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.live_sessions') is not null then
    execute 'drop trigger if exists qp_guard_live_session on public.live_sessions';
    execute 'create trigger qp_guard_live_session before update on public.live_sessions
               for each row execute function public.qp_guard_live_session()';
  end if;
end $$;


-- ── Verify ─────────────────────────────────────────────────────────
-- Expect: the policy, both functions, the trigger(s).
select 'policy'   as kind, policyname as name from pg_policies
 where schemaname = 'public' and tablename = 'questions' and policyname like '%step6%'
union all
select 'function', proname from pg_proc
 where pronamespace = 'public'::regnamespace and proname in ('quiz_paper', 'qp_mark_attempt', 'qp_is_staff', 'qp_guard_live_session')
union all
select 'trigger', tgname from pg_trigger
 where tgname in ('qp_mark_attempt', 'qp_guard_live_session');


-- ── To undo (do not run unless you need to) ────────────────────────
-- drop trigger  if exists qp_mark_attempt on public.attempts;
-- drop trigger  if exists qp_guard_live_session on public.live_sessions;
-- drop policy   if exists "questions: staff only read (step6)" on public.questions;
-- drop function if exists public.quiz_paper(uuid);
-- drop index    if exists public.attempts_client_attempt_id_uidx;
