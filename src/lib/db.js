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
const QUIZ_OPTIONAL     = ["question_ids", "show_answers_policy", "subject"];
const QUESTION_OPTIONAL = ["subject", "difficulty", "topic", "points"];


/* ── Questions ─────────────────────────────────────────────────── */
export async function fetchQuestions() {
  const { data, error } = await supabase.from("questions").select("*").order("unit", { ascending: true });
  if (error) throw error;
  return data;
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
  const { data, error } = await supabase.from("quizzes").select("*").order("week", { ascending: true });
  if (error) throw error;
  return data;
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

/* ── Attempts ───────────────────────────────────────────────────── */
export async function fetchAttempts() {
  const { data, error } = await supabase.from("attempts").select("*").order("submitted_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function fetchMyAttempts(userId) {
  const { data, error } = await supabase.from("attempts").select("*").eq("user_id", userId).order("submitted_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function insertAttempt(attempt) {
  return retryStrip("attempts",
    p => supabase.from("attempts").insert(p).select().single(),
    attempt, ATTEMPT_OPTIONAL);
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
    await supabase.from("audit_log").insert({ actor_id, actor_name, action, target, meta });
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

export async function touchLiveSession(quizId, userId, patch) {
  try {
    await supabase
      .from("live_sessions")
      .update({ ...patch, last_seen: new Date().toISOString() })
      .eq("quiz_id", quizId).eq("user_id", userId);
  } catch (_) { /* observability only */ }
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
