-- ═══════════════════════════════════════════════════════════════════
--  QuizPro — STEP 7 (required from v4.6)
--  Exam confidentiality: answers stay hidden until you release them.
--
--  WHAT IT FIXES
--  1. The built-in QAAPF bank — every question, answer and explanation
--     — used to ship inside the website's JavaScript, readable by any
--     student with the browser's developer tools. From v4.6 the site
--     publishes it encrypted. This step stores the passphrase in the
--     database and hands it only to faculty and admins.
--  2. After submitting, a student could read the answer key of their
--     own paper through the API at once, even when the quiz releases
--     answers only after it closes, and pass it to classmates who had
--     not sat yet. Keys now live in a separate table, attempt_keys,
--     that a student can read only once the quiz's answers are released.
--  3. Explanations are stored with each built-in question (column
--     questions.explanation, filled by QAAPF → Question bank → Repair)
--     and shown to a student only after release.
--  4. A student cannot make themselves faculty or admin by editing
--     their own profile row.
--
--  HOW TO RUN
--  Supabase → SQL Editor → paste this whole file → Run. Safe to run
--  more than once. Run it when no quiz is being written. Run STEP6
--  first if you have not. Keep this file private: it contains the
--  passphrase for the question bank.
-- ═══════════════════════════════════════════════════════════════════

-- ── 0. Who is staff (same as STEP6; repeated so this file stands alone)
create or replace function public.qp_is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('faculty', 'admin'));
$$;
grant execute on function public.qp_is_staff() to authenticated;


-- ── 1. The passphrase for the sealed question bank (staff only) ─────
create or replace function public.qaapf_bank_secret()
returns text
language sql stable security definer set search_path = public
as $$
  select case when public.qp_is_staff() then '0ryjviBwlPUV3hGEj_uNFcSYC6BdArENx-BVvcFk' else null end;
$$;
revoke all on function public.qaapf_bank_secret() from public, anon;
grant execute on function public.qaapf_bank_secret() to authenticated;


-- ── 2. Explanations stored with each question ──────────────────────
alter table public.questions add column if not exists explanation text;


-- ── 3. Answer keys of submitted papers, released by the quiz's rule ─
create table if not exists public.attempt_keys (
  attempt_id uuid primary key
    references public.attempts(id) on delete cascade
    deferrable initially deferred,
  keys       jsonb not null default '[]'::jsonb,   -- [{ "qid": ..., "correct": n }, …] in item order
  created_at timestamptz not null default now()
);
alter table public.attempt_keys enable row level security;

-- Released = the same rule the app has always shown on screen:
-- "immediate", or "after_close" once the quiz has a close time that has
-- passed. "never" is never released to students.
create or replace function public.qp_answers_released(p_attempt_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
      from public.attempts a
      join public.quizzes z on z.id = a.quiz_id
     where a.id = p_attempt_id
       and a.user_id = auth.uid()
       and (coalesce(to_jsonb(z)->>'show_answers_policy', 'after_close') = 'immediate'
            or (coalesce(to_jsonb(z)->>'show_answers_policy', 'after_close') = 'after_close'
                and z.close_at is not null and z.close_at < now())));
$$;
grant execute on function public.qp_answers_released(uuid) to authenticated;

drop policy if exists "attempt_keys: staff or released" on public.attempt_keys;
create policy "attempt_keys: staff or released"
  on public.attempt_keys for select to authenticated
  using (public.qp_is_staff() or public.qp_answers_released(attempt_id));
-- No insert, update or delete for anyone through the API: the trigger
-- below writes the rows, and deleting an attempt deletes its keys.
revoke insert, update, delete on public.attempt_keys from authenticated, anon;
grant select on public.attempt_keys to authenticated;

-- Runs after STEP6's marking trigger (triggers fire in name order:
-- qp_mark_attempt, then qp_zz_split_keys). Moves every item's key out of
-- the attempt into attempt_keys, so the row returned to the student
-- after submitting carries no answers.
create or replace function public.qp_split_keys()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_items jsonb := coalesce(to_jsonb(new.items), '[]'::jsonb);
  v_keys  jsonb := '[]'::jsonb;
  v_out   jsonb := '[]'::jsonb;
  it      jsonb;
begin
  if jsonb_typeof(v_items) <> 'array' then return new; end if;
  for it in select * from jsonb_array_elements(v_items) loop
    v_keys := v_keys || jsonb_build_array(jsonb_build_object('qid', it->'qid', 'correct', it->'correct'));
    v_out  := v_out  || jsonb_build_array(it - 'correct');
  end loop;
  insert into public.attempt_keys(attempt_id, keys) values (new.id, v_keys)
    on conflict (attempt_id) do update set keys = excluded.keys;
  new.items := v_out;
  return new;
end;
$$;

drop trigger if exists qp_zz_split_keys on public.attempts;
create trigger qp_zz_split_keys
  before insert on public.attempts
  for each row execute function public.qp_split_keys();

-- Existing attempts: move their keys too (skips any already moved).
do $$
declare r record; v_keys jsonb; v_out jsonb; it jsonb;
begin
  for r in select a.id, to_jsonb(a.items) as items from public.attempts a
            where not exists (select 1 from public.attempt_keys k where k.attempt_id = a.id) loop
    v_keys := '[]'::jsonb; v_out := '[]'::jsonb;
    if r.items is not null and jsonb_typeof(r.items) = 'array' then
      for it in select * from jsonb_array_elements(r.items) loop
        v_keys := v_keys || jsonb_build_array(jsonb_build_object('qid', it->'qid', 'correct', it->'correct'));
        v_out  := v_out  || jsonb_build_array(it - 'correct');
      end loop;
    end if;
    insert into public.attempt_keys(attempt_id, keys) values (r.id, v_keys);
    update public.attempts set items = v_out where id = r.id;
  end loop;
end $$;


-- ── 4. Explanations for a student's own paper, after release ───────
create or replace function public.attempt_explanations(p_attempt_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare v jsonb;
begin
  if not (public.qp_is_staff() or public.qp_answers_released(p_attempt_id)) then
    return null;
  end if;
  select coalesce(jsonb_agg(
           (select q.explanation from public.questions q
             where (k.e->>'qid') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
               and q.id = (k.e->>'qid')::uuid)
           order by k.ord), '[]'::jsonb)
    into v
    from public.attempt_keys ak,
         jsonb_array_elements(ak.keys) with ordinality as k(e, ord)
   where ak.attempt_id = p_attempt_id;
  return v;
end;
$$;
revoke all on function public.attempt_explanations(uuid) from public, anon;
grant execute on function public.attempt_explanations(uuid) to authenticated;


-- ── 5. Nobody promotes themselves ──────────────────────────────────
-- Only an admin may change a role. A new profile created by its own
-- user always starts as a student. The SQL Editor (no signed-in user)
-- is unaffected, so you can still set roles there.
create or replace function public.qp_guard_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_admin boolean;
begin
  if auth.uid() is null then return new; end if;
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') into v_admin;
  if v_admin then return new; end if;
  if tg_op = 'INSERT' then
    new.role := 'student';
  elsif new.role is distinct from old.role then
    new.role := old.role;
  end if;
  return new;
end;
$$;
drop trigger if exists qp_guard_profile_role on public.profiles;
create trigger qp_guard_profile_role
  before insert or update on public.profiles
  for each row execute function public.qp_guard_profile_role();


-- ── Verify ─────────────────────────────────────────────────────────
-- Expect 6 rows: the four functions, both triggers' names appear once each.
select 'function' as kind, proname as name from pg_proc
 where pronamespace = 'public'::regnamespace
   and proname in ('qaapf_bank_secret', 'qp_split_keys', 'attempt_explanations', 'qp_guard_profile_role')
union all
select 'trigger', tgname from pg_trigger where tgname in ('qp_zz_split_keys', 'qp_guard_profile_role')
order by 1, 2;
