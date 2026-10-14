/* Exam logic with no React in it, so the build-time tests can run it. */

/* Where the exam clock should stand when the exam screen opens.

   The clock is a deadline, not a counter. The old counter took a
   second off every second the page was open, so closing the tab
   stopped it: a student could close the quiz, look things up and come
   back with the same time left. It also ran slow, because browsers
   delay timers in background tabs and every tick added a little lag.

   Order of evidence:
     1. this browser's saved draft (its deadline, or for drafts saved by
        the previous version, when it was saved plus what was left);
     2. the server's record of an unfinished sitting of this quiz —
        so starting again in another browser, or after clearing site
        data, picks up the same clock instead of a fresh one;
     3. otherwise a fresh start now.
   Exported for the tests. */
export function examClock({ draft, anchor, quiz, attempts = [], userId, now = Date.now() }) {
  const dur = (Number(quiz.duration_sec) || 0) * 1000;
  if (draft) {
    if (Number.isFinite(draft.deadline)) return { deadline: draft.deadline, fresh: false, source: "draft" };
    if (Number.isFinite(draft.remaining) && Number.isFinite(draft.savedAt)) return { deadline: draft.savedAt + draft.remaining * 1000, fresh: false, source: "draft" };
  }
  const started = anchor?.started_at ? new Date(anchor.started_at).getTime() : NaN;
  if (anchor && anchor.status !== "submitted" && Number.isFinite(started)) {
    /* A sitting that ended in a submitted attempt is over, even if the
       "submitted" status never reached the server. */
    const endedLater = attempts.some(a => a.quiz_id === quiz.id && a.user_id === userId && new Date(a.submitted_at).getTime() >= started);
    if (!endedLater) {
      if (started + dur > now) return { deadline: started + dur, fresh: false, source: "server", startedAt: started };
      return { deadline: now + dur, fresh: true, source: "restart", startedAt: started };
    }
  }
  return { deadline: now + dur, fresh: true, source: "new" };
}

export const remainingAt = (deadline, now = Date.now()) => Math.max(0, Math.ceil((deadline - now) / 1000));

/* Settings that would make a quiz unusable: 0 minutes auto-submits the
   moment it opens, 0 attempts means nobody can start it, and a close
   time before the open time means it is never open. */
export function quizSettingsProblem({ minutes, maxAttempts, openAt, closeAt }) {
  const m = Number(minutes), a = Number(maxAttempts);
  if (!Number.isFinite(m) || m < 1) return "Set a time limit of at least 1 minute.";
  if (m > 600) return "A time limit over 10 hours is almost certainly a typo.";
  if (!Number.isInteger(a) || a < 1) return "Allow at least 1 attempt.";
  if (openAt && closeAt && new Date(closeAt).getTime() <= new Date(openAt).getTime()) return "The close time must be after the open time.";
  return null;
}
