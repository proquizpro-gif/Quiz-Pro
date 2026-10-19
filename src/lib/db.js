import { supabase } from "./supabase";

/* ──────────────────────────────────────────────────────────────────
   Column-tolerant writes.

   Optional columns are added by later migrations. If a deployment is
   running ahead of its database, a raw insert fails outright — and for
   an exam submission that means a student loses a completed paper
   because of a missing metadata column. Unacceptable.

   retryStrip drops one unknown optional column at a time and retries,
   so the core record always lands. Dropped names are attached as a
   non-enumerable __droppedColumns so the UI can warn the operator
   without polluting the row.
   ────────────────────────────────────────────────────────────────── */
async function retryStrip(table, op, payload, optionalCols) {
  let p = { ...payload };
  const stripped = [];
  for (let i = 0; i <= optionalCols.length; i++) {
    const { data, error } = await op(p);
    if (!error) {
      if (stripped.length) {
        console.warn(`[${table}] database is missing: ${stripped.join(", ")}. Record saved without them. Run the latest SQL migration.`);
        if (data && typeof data === "object") {
          try { Object.defineProperty(data, "__droppedColumns", { value: stripped, enumerable: false }); } catch (_) {}
        }
      }
      return data;
    }
    const msg = (error.message || "").toLowerCase();
    const next = optionalCols.find(c => c in p && msg.includes(c.toLowerCase()));
    if (!next) throw error;                       // a real error, not a schema gap
    const { [next]: _drop, ...rest } = p;
    p = rest;
    stripped.push(next);
  }
  throw new Error(`${table}: could not reconcile schema`);
}

// `items` is deliberately NOT strippable — it powers answer review and
// question analysis, and silently dropping it would hide a real schema
// problem behind apparently-working submissions. `log` is cosmetic
// (the integrity event list) so it can be shed if the column is absent.
const ATTEMPT_OPTIONAL  = ["log", "student_course", "student_semester", "student_cu_id", "student_phone", "meta"];
const QUIZ_OPTIONAL     = ["question_ids", "show_answers_policy", "subject", "purpose"];
const QUESTION_OPTIONAL = ["subject", "difficulty", "topic", "points"];

/* ── Reading past the 1,000-row cap ───────────────────────────────
   Supabase returns at most `max_rows` rows per request (1,000 by
   default) and says nothing when it truncates. A bank of 589 built-in
   questions plus a teacher's own, or a term's worth of attempts,
   crosses that line and rows silently vanish from every screen.

   Pages are read until one comes back empty rather than until one
   comes back short, so a project configured with a lower max_rows is
   still read in full. Callers order by a unique column last so pages
   neither overlap nor skip. */
const PAGE = 1000;
async function fetchAllRows(build) {
  const out = [];
  let from = 0;
  for (let guard = 0; guard < 500; guard++) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data || [];
    if (!rows.length) break;
    out.push(...rows);
    from += rows.length;
  }
  return out;
}


/* ── Questions ─────────────────────────────────────────────────── */
export async function fetchQuestions() {
  return fetchAllRows(() => supabase.from("questions").select("*")
    .order("unit", { ascending: true }).order("id", { ascending: true }));
}

/* The questions of one quiz, without answer keys, from the quiz_paper
   function that STEP6 adds. Once STEP6 is run, students can no longer
   read the questions table (the answer key lives there), so this is
   how the exam screen gets its paper.

   Returns null when the function does not exist, so callers fall back
   to the question list they already hold — the app keeps working on a
   database where STEP6 has not been run. */
export async function fetchQuizPaper(quizId) {
  const { data, error } = await supabase.rpc("quiz_paper", { p_quiz_id: quizId });
  if (error) {
    const missing = error.code === "PGRST202" || error.code === "42883" || /could not find the function|does not exist/i.test(error.message || "");
    if (missing) return null;
    throw error;
  }
  return Array.isArray(data) ? data : null;
}
export async function insertQuestion(q) {
  const { data, error } = await supabase.from("questions").insert(q).select().single();
  if (error) throw error;
  return data;
}
export async function insertQuestions(qs) {
  // Array payload: strip the same key from every row together.
  let rows = qs.map(q => ({ ...q }));
  const stripped = [];
  for (let i = 0; i <= QUESTION_OPTIONAL.length; i++) {
    const { data, error } = await supabase.from("questions").insert(rows).select();
    if (!error) {
      if (stripped.length) console.warn(`[questions] database is missing: ${stripped.join(", ")}. Rows saved without them.`);
      return data;
    }
    const msg = (error.message || "").toLowerCase();
    const next = QUESTION_OPTIONAL.find(c => c in (rows[0] || {}) && msg.includes(c.toLowerCase()));
    if (!next) throw error;
    rows = rows.map(({ [next]: _d, ...rest }) => rest);
    stripped.push(next);
  }
  throw new Error("questions: could not reconcile schema");
}
export async function updateQuestion(id, patch) {
  const { data, error } = await supabase.from("questions").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
/* Same as updateQuestion, but drops optional columns the database does
   not have (topic, difficulty…) instead of failing — used when repairing
   built-in QAAPF questions across deployments of different ages. */
export async function updateQuestionSafe(id, patch) {
  return retryStrip("questions",
    p => supabase.from("questions").update(p).eq("id", id).select().single(),
    patch, QUESTION_OPTIONAL);
}
export async function deleteQuestion(id) {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

/* Batched rather than a loop of single deletes: one round trip instead
   of N, and it either removes the whole selection or none of it rather
   than leaving a partially-cleared bank if the connection drops midway. */
export async function deleteQuestions(ids) {
  if (!ids?.length) return;
  const { error } = await supabase.from("questions").delete().in("id", ids);
  if (error) throw error;
}

/* ── Quizzes ────────────────────────────────────────────────────── */
export async function fetchQuizzes() {
  return fetchAllRows(() => supabase.from("quizzes").select("*")
    .order("week", { ascending: true }).order("id", { ascending: true }));
}
export async function insertQuiz(quiz) {
  return retryStrip("quizzes",
    p => supabase.from("quizzes").insert(p).select().single(),
    quiz, QUIZ_OPTIONAL);
}
export async function updateQuiz(id, patch) {
  const { data, error } = await supabase.from("quizzes").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteQuiz(id) {
  const { error } = await supabase.from("quizzes").delete().eq("id", id);
  if (error) throw error;
}

/* ── Answer keys of submitted papers (STEP7) ─────────────────────
   After STEP7 the attempts table holds no answer keys; they sit in
   attempt_keys, which staff can always read and a student only once
   their quiz's answers are released. These helpers put the keys back
   into each attempt's items for whoever is allowed to see them, so the
   rest of the app reads item.correct exactly as before. Before STEP7
   the table does not exist and attempts still carry their keys. */
let keysTable = null;            // null = unknown, false = no STEP7 table
const isMissingTable = e => e && (e.code === "42P01" || e.code === "PGRST205" || /attempt_keys|does not exist|could not find the table/i.test(e.message || ""));

async function fetchKeysFor(ids) {
  if (keysTable === false || !ids.length) return new Map();
  const out = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from("attempt_keys").select("attempt_id, keys").in("attempt_id", ids.slice(i, i + 200));
    if (error) { if (isMissingTable(error)) { keysTable = false; return out; } throw error; }
    keysTable = true;
    for (const r of data || []) out.set(r.attempt_id, r.keys);
  }
  return out;
}
async function fetchAllKeys() {
  if (keysTable === false) return new Map();
  try {
    const rows = await fetchAllRows(() => supabase.from("attempt_keys").select("attempt_id, keys").order("attempt_id", { ascending: true }));
    keysTable = true;
    return new Map(rows.map(r => [r.attempt_id, r.keys]));
  } catch (e) { if (isMissingTable(e)) { keysTable = false; return new Map(); } throw e; }
}
export function mergeKeys(attempt, keys) {
  if (!attempt || !Array.isArray(keys) || !Array.isArray(attempt.items)) return attempt;
  const items = attempt.items.map((it, i) => {
    const k = keys[i];
    if (!k || k.correct === undefined || k.correct === null) return it;
    if (k.qid !== undefined && k.qid !== null && it.qid !== undefined && String(k.qid) !== String(it.qid)) return it;
    return { ...it, correct: k.correct };
  });
  return { ...attempt, items, keysReleased: true };
}
const withKeys = (rows, map) => rows.map(a => map.has(a.id) ? mergeKeys(a, map.get(a.id)) : a);

/* Explanations for a student's own paper, once released (STEP7). An
   array in item order, or null when not released or not available. */
export async function fetchAttemptExplanations(attemptId) {
  const { data, error } = await supabase.rpc("attempt_explanations", { p_attempt_id: attemptId });
  if (error) return null;
  return Array.isArray(data) ? data : null;
}

/* The passphrase for the sealed built-in bank (STEP7). Staff get it;
   anyone else gets null. { missing: true } before STEP7 is run. */
export async function fetchBankSecret() {
  const { data, error } = await supabase.rpc("qaapf_bank_secret");
  if (error) {
    const missing = error.code === "PGRST202" || error.code === "42883" || /could not find the function|does not exist/i.test(error.message || "");
    if (missing) return { missing: true };
    throw error;
  }
  return { secret: data || null };
}

/* ── Attempts ───────────────────────────────────────────────────── */
export async function fetchAttempts() {
  const [rows, keys] = await Promise.all([
    fetchAllRows(() => supabase.from("attempts").select("*")
      .order("submitted_at", { ascending: false }).order("id", { ascending: true })),
    fetchAllKeys(),
  ]);
  return withKeys(rows, keys);
}
export async function fetchMyAttempts(userId) {
  const rows = await fetchAllRows(() => supabase.from("attempts").select("*").eq("user_id", userId)
    .order("submitted_at", { ascending: false }).order("id", { ascending: true }));
  return withKeys(rows, await fetchKeysFor(rows.map(r => r.id)));
}
/* One attempt's released keys merged in (used after a realtime insert
   and right after a student submits). */
export async function attachKeys(attempt) {
  if (!attempt?.id) return attempt;
  const map = await fetchKeysFor([attempt.id]);
  return map.has(attempt.id) ? mergeKeys(attempt, map.get(attempt.id)) : attempt;
}

/* Attempts submitted recently, for the faculty dashboard's refresh.
   The dashboard used to re-download every attempt every 20 seconds —
   each one carrying its full question list — which on a test day is
   megabytes per refresh per open tab and quickly eats the free tier's
   bandwidth. Only ids are read for the window; full rows are fetched
   just for the ones the dashboard has not seen.

   The window is generous (a day) because, until STEP6 is run,
   submitted_at comes from the student's own clock, which can be off. */
export async function fetchNewAttempts(knownIds, windowHours = 24) {
  const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
  const { data, error } = await supabase.from("attempts").select("id").gte("submitted_at", since).limit(5000);
  if (error) throw error;
  const missing = (data || []).map(r => r.id).filter(id => !knownIds.has(id));
  if (!missing.length) return [];
  const rows = [];
  for (let i = 0; i < missing.length; i += 200) {
    const { data: part, error: e2 } = await supabase.from("attempts").select("*").in("id", missing.slice(i, i + 200));
    if (e2) throw e2;
    rows.push(...(part || []));
  }
  return withKeys(rows, await fetchKeysFor(rows.map(r => r.id)));
}

/* Saving a finished paper must be safe to repeat. When the network
   drops after the database has stored the attempt but before the reply
   arrives, the student sees an error and presses Retry — which used to
   store the same paper twice, counting as two attempts. Each sitting
   now carries a token in meta.client_attempt_id; a retry first looks
   for an attempt with that token and returns it instead of inserting
   again. Works whatever type the attempts.id column is. */
export async function insertAttempt(attempt, { retry = false } = {}) {
  const token = attempt?.meta?.client_attempt_id;
  if (retry && token) {
    try {
      const { data } = await supabase.from("attempts").select("*")
        .eq("quiz_id", attempt.quiz_id).eq("user_id", attempt.user_id)
        .contains("meta", { client_attempt_id: token }).limit(1);
      if (data && data.length) return attachKeys(data[0]).catch(() => data[0]);
    } catch (_) { /* meta column absent — fall through and insert */ }
  }
  const saved = await retryStrip("attempts",
    p => supabase.from("attempts").insert(p).select().single(),
    attempt, ATTEMPT_OPTIONAL);
  return attachKeys(saved).catch(() => saved);
}
export async function deleteAttempt(id) {
  const { error } = await supabase.from("attempts").delete().eq("id", id);
  if (error) throw error;
}

/* ── Profiles ───────────────────────────────────────────────────── */
export async function fetchProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}
export async function upsertProfile(profile) {
  const { data, error } = await supabase.from("profiles").upsert(profile, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}

/**
 * Paginated profile listing for admin panel.
 * @param {number} page - 0-indexed page number
 * @param {number} pageSize - rows per page (default 50)
 * @param {string} search - optional name/email filter
 * @returns {{ data: Array, count: number }}
 */
export async function fetchAllProfiles(page = 0, pageSize = 50, search = "") {
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url, created_at", { count: "exact" });

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query
    .order("full_name")
    .range(from, to);

  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

/* Exact head counts per role. The admin panel used to fetch every
   profile and count in the browser, which stops at 1,000 rows. */
export async function countProfilesByRole() {
  const roles = ["admin", "faculty", "student"];
  const res = await Promise.all(roles.map(r =>
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", r)));
  const out = {};
  res.forEach(({ count, error }, i) => { if (error) throw error; out[roles[i]] = count || 0; });
  return out;
}

export async function updateProfileRole(id, role) {
  const { data, error } = await supabase.from("profiles").update({ role }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/* ── Classrooms ─────────────────────────────────────────────────── */
// RLS scopes automatically: students get joined rooms, faculty get
// owned + co-owned rooms, admin gets everything (incl. soft-deleted).
export async function fetchMyClassrooms() {
  const { data, error } = await supabase
    .from("classrooms")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertClassroom({ name, section, year, owner_id }) {
  const { data, error } = await supabase.from("classrooms").insert({ name, section, year, owner_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateClassroom(id, patch) {
  const { data, error } = await supabase.from("classrooms").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/**
 * Soft-delete a classroom via server-side RPC.
 * Detaches quizzes (sets classroom_id to NULL) so student attempts
 * are preserved. The classroom row gets deleted_at + is_archived.
 */
export async function softDeleteClassroom(id) {
  const { error } = await supabase.rpc("soft_delete_classroom", { p_classroom_id: id });
  if (error) throw error;
}

/**
 * Hard-delete — admin only. Cascades into members and co-owners.
 * Quizzes should already be detached by a prior soft-delete; if not,
 * the FK cascade will remove them and their attempts.
 */
export async function hardDeleteClassroom(id) {
  const { error } = await supabase.from("classrooms").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Admin view: rooms joined with owner name, member count, co-owners.
 * Includes soft-deleted rooms so admin can see everything.
 */
export async function fetchClassroomsWithMeta() {
  const { data, error } = await supabase
    .from("classrooms")
    .select("*, owner:profiles!classrooms_owner_id_fkey(full_name, email), classroom_members(count), classroom_co_owners(user_id)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/* ── Classroom members ──────────────────────────────────────────── */
export async function fetchClassroomMembers(classroomId) {
  const { data, error } = await supabase
    .from("classroom_members")
    .select("user_id, joined_at, profile:profiles(id, full_name, email, avatar_url)")
    .eq("classroom_id", classroomId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Add a student to a classroom by email.
 * Uses the server-side find_student_by_email RPC which only returns
 * profiles with role='student', preventing account-existence oracles
 * for faculty/admin accounts.
 */
export async function addMemberByEmail(classroomId, email) {
  // Use the secure RPC that restricts to student role
  const { data: profJson, error: e1 } = await supabase.rpc("find_student_by_email", { p_email: email.trim() });
  if (e1) throw e1;
  if (!profJson) throw new Error("No student with that email has signed in to QuizPro yet.");

  const prof = typeof profJson === "string" ? JSON.parse(profJson) : profJson;

  const { error: e2 } = await supabase
    .from("classroom_members").insert({ classroom_id: classroomId, user_id: prof.id });
  if (e2 && e2.code !== "23505") throw e2; // 23505 = already a member
  return prof;
}

export async function removeMember(classroomId, userId) {
  const { error } = await supabase
    .from("classroom_members").delete()
    .eq("classroom_id", classroomId).eq("user_id", userId);
  if (error) throw error;
}

// Student joins with the 6-char code shared by faculty.
export async function joinClassroomByCode(code) {
  const { data, error } = await supabase.rpc("join_classroom_by_code", { p_code: code });
  if (error) throw error;
  return data; // the classroom row as json
}

/* ── Classroom co-owners ───────────────────────────────────────── */

export async function fetchCoOwners(classroomId) {
  const { data, error } = await supabase
    .from("classroom_co_owners")
    .select("user_id, added_at, profile:profiles(id, full_name, email, avatar_url)")
    .eq("classroom_id", classroomId)
    .order("added_at", { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Add a faculty/admin user as co-owner via secure RPC.
 * Only the classroom owner or admin can call this.
 */
export async function addCoOwner(classroomId, email) {
  const { data, error } = await supabase.rpc("add_co_owner", {
    p_classroom_id: classroomId,
    p_email: email.trim(),
  });
  if (error) throw error;
  return typeof data === "string" ? JSON.parse(data) : data;
}

/**
 * Remove a co-owner from a classroom.
 */
export async function removeCoOwner(classroomId, userId) {
  const { error } = await supabase.rpc("remove_co_owner", {
    p_classroom_id: classroomId,
    p_user_id: userId,
  });
  if (error) throw error;
}

/* ── Audit log ──────────────────────────────────────────────────── */
export async function logAudit({ actor_id, actor_name, action, target, meta = {} }) {
  // Best-effort — never let a logging failure break the calling action.
  try {
    const { error } = await supabase.from("audit_log").insert({ actor_id, actor_name, action, target, meta });
    if (error) console.warn("[audit] not recorded:", error.message);
  } catch (_) {}
}

export async function fetchAuditLog(limit = 100) {
  const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

/* ── Realtime ───────────────────────────────────────────────────── */
/**
 * Subscribes to new attempt rows. Uses an *authorized* channel
 * (private:true) so Supabase enforces the SELECT RLS policy on
 * each broadcast — a faculty member only receives INSERT events
 * for attempts they are allowed to SELECT.
 *
 * Falls back to a standard channel if private channels are not
 * supported by the project's Supabase version.
 */
export function subscribeToAttempts(onInsert) {
  const channel = supabase
    .channel("attempts-realtime", { config: { private: true } })
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "attempts" },
      (payload) => onInsert(payload.new)
    )
    .subscribe((status, err) => {
      // If private channels aren't supported, fall back to public
      if (status === "CHANNEL_ERROR" && err?.message?.includes("private")) {
        console.warn("Private realtime channel not supported; falling back to public channel.");
        const fallback = supabase
          .channel("attempts-realtime-fallback")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "attempts" }, (p) => onInsert(p.new))
          .subscribe();
        // Replace cleanup
        channel._fallback = fallback;
      }
    });

  return () => {
    supabase.removeChannel(channel);
    if (channel._fallback) supabase.removeChannel(channel._fallback);
  };
}

export async function leaveClassroomAsStudent(classroomId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("classroom_members")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("user_id", user.id);
  if (error) throw error;
}

/* ── Live invigilation ─────────────────────────────────────────────
   An attempts row appears only at submit, so nothing exists to watch
   while a student is still writing. live_sessions carries one row per
   in-progress sitting, refreshed by the student's browser.

   Every call here fails silently. Invigilation is an observability
   feature: if the table is missing because STEP4 has not been run, or
   the network drops, the student must still be able to sit and submit
   the exam. Never let telemetry break the thing it is observing. */

export async function startLiveSession(row) {
  try {
    const { data, error } = await supabase
      .from("live_sessions")
      .upsert({ ...row, status: "active", last_seen: new Date().toISOString() },
              { onConflict: "quiz_id,user_id" })
      .select().single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("Live session unavailable (run STEP4 SQL):", e.message);
    return null;
  }
}

/* status is always re-asserted as active: `pagehide` marks a session
   abandoned, and on phones it also fires when the browser is merely
   backgrounded and later resumed. Without this the student showed as
   "Left the exam" for the rest of the sitting while still writing. */
export async function touchLiveSession(quizId, userId, patch) {
  try {
    await supabase
      .from("live_sessions")
      .update({ ...patch, status: "active", last_seen: new Date().toISOString() })
      .eq("quiz_id", quizId).eq("user_id", userId);
  } catch (_) { /* observability only */ }
}

/* The student's own session row for a quiz, or null. Used to anchor the
   exam clock to the server: a sitting that was started, closed and
   reopened keeps counting down from when it really began. */
export async function fetchMyLiveSession(quizId, userId) {
  try {
    const { data, error } = await supabase
      .from("live_sessions").select("*")
      .eq("quiz_id", quizId).eq("user_id", userId).limit(1);
    if (error) throw error;
    return data?.[0] || null;
  } catch (_) { return null; }
}

export async function endLiveSession(quizId, userId, status = "submitted") {
  try {
    await supabase
      .from("live_sessions")
      .update({ status, last_seen: new Date().toISOString() })
      .eq("quiz_id", quizId).eq("user_id", userId);
  } catch (_) { /* observability only */ }
}

export async function fetchLiveSessions(quizId) {
  try {
    const { data, error } = await supabase
      .from("live_sessions").select("*")
      .eq("quiz_id", quizId)
      .order("last_seen", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (_) { return []; }
}

/* Subscribes to every change on a quiz's live sessions. Returns an
   unsubscribe function, or a no-op if realtime is unavailable, so the
   caller can always treat the result as a cleanup callback. */
export function subscribeToLiveSessions(quizId, onChange) {
  try {
    const channel = supabase
      .channel(`live-${quizId}`)
      .on("postgres_changes",
          { event: "*", schema: "public", table: "live_sessions", filter: `quiz_id=eq.${quizId}` },
          payload => onChange(payload.new || payload.old, payload.eventType))
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch (_) {} };
  } catch (e) {
    console.warn("Live realtime unavailable:", e.message);
    return () => {};
  }
}
