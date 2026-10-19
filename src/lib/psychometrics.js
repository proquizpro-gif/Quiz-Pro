/* ══════════════════════════════════════════════════════════════════
   PSYCHOMETRICS — how well a paper and its questions are working
   ══════════════════════════════════════════════════════════════════
   Pure functions, no React, so scripts/test-app.mjs can check them.

   Classical test theory, the standard used by exam boards that do not
   run an IRT model:
   • p (facility)      share of students who answered correctly.
   • D (discrimination) correct rate in the top 27% of scorers minus
                        the bottom 27%. Negative = strong students get
                        it wrong more often than weak ones: almost always
                        a wrong key or an ambiguous stem.
   • r (point-biserial) correlation between getting the item right and
                        the score on the REST of the paper. Same idea as
                        D, using every student, not only the extremes.
   • KR-20             internal-consistency reliability of the whole
                        paper (0–1). With it comes the standard error of
                        measurement (SEM): how many marks a student's
                        score could move on a retest by chance alone.
   Items need enough answers before any of this means something; below
   MIN_N the numbers are shown but no verdict is given. */

export const MIN_N = 15;          // answers before an item gets a verdict
export const MIN_N_CALIBRATE = 20; // answers before a bank item's level is questioned

const mean = xs => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
const variance = xs => { const m = mean(xs); return mean(xs.map(x => (x - m) ** 2)); };

/* Scored 0/1 matrix from attempts. items in an attempt carry
   { qid?, question, chosen, correct, void? }. Voided items are left out. */
function responses(attempts) {
  const rows = [];
  for (const a of attempts || []) {
    if (!Array.isArray(a.items) || !a.items.length) continue;
    const r = new Map();
    for (const it of a.items) {
      if (it.void) continue;
      const key = it.qid ?? it.question;
      if (key === undefined || key === null || r.has(key)) continue;
      const ok = it.chosen !== null && it.chosen !== undefined && Number(it.chosen) === Number(it.correct);
      r.set(key, { ok: ok ? 1 : 0, it });
    }
    if (r.size) rows.push({ id: a.id, r });
  }
  return rows;
}

/* Per-item statistics. levelOf(item) → 1 | 2 | 3 | null, the label the
   item carries (bank level or the teacher's difficulty), for the label
   check. */
export function itemStatistics(attempts, levelOf = () => null) {
  const rows = responses(attempts);
  if (!rows.length) return { items: [], students: 0 };
  const total = new Map(rows.map(x => [x.id, [...x.r.values()].reduce((s, v) => s + v.ok, 0)]));
  const ranked = [...rows].sort((a, b) => total.get(b.id) - total.get(a.id));
  const g = Math.max(1, Math.round(ranked.length * 0.27));
  const top = new Set(ranked.slice(0, g).map(x => x.id)), bot = new Set(ranked.slice(-g).map(x => x.id));

  const by = new Map();
  for (const row of rows) for (const [key, v] of row.r) {
    if (!by.has(key)) by.set(key, { key, question: v.it.question, options: v.it.options || [], correct: v.it.correct, sample: v.it, scores: [], rest: [], picks: new Array((v.it.options || []).length).fill(0), skipped: 0, topN: 0, topOk: 0, botN: 0, botOk: 0 });
    const s = by.get(key);
    s.scores.push(v.ok); s.rest.push(total.get(row.id) - v.ok);
    if (v.it.chosen === null || v.it.chosen === undefined) s.skipped++; else if (s.picks[v.it.chosen] !== undefined) s.picks[v.it.chosen]++;
    if (top.has(row.id)) { s.topN++; s.topOk += v.ok; }
    if (bot.has(row.id)) { s.botN++; s.botOk += v.ok; }
  }

  const items = [...by.values()].map(s => {
    const n = s.scores.length, p = mean(s.scores);
    const d = (s.topN ? s.topOk / s.topN : 0) - (s.botN ? s.botOk / s.botN : 0);
    /* corrected point-biserial: item vs rest-of-paper score */
    const sdR = Math.sqrt(variance(s.rest)), sdI = Math.sqrt(p * (1 - p));
    let rpb = null;
    if (sdR > 0 && sdI > 0) {
      const mR = mean(s.rest);
      rpb = mean(s.scores.map((x, i) => (x - p) * (s.rest[i] - mR))) / (sdI * sdR);
    }
    /* The wrong option that strong students pick most: a sign the key or
       the stem needs a second look when it beats the key among them. */
    const level = levelOf(s.sample);
    const enough = n >= MIN_N;
    let verdict = "few", note = `Only ${n} answer${n === 1 ? "" : "s"} so far — too few to judge (need ${MIN_N}).`;
    if (enough) {
      if (d < 0 || (rpb !== null && rpb < 0)) { verdict = "inverted"; note = "Strong students get this wrong more often than weak ones. Check the answer key and the wording."; }
      else if (p >= 0.95) { verdict = "tooEasy"; note = "Nearly everyone gets it right; it adds little information."; }
      else if (p <= 0.15) { verdict = "tooHard"; note = "Almost nobody gets it right. Check it is answerable from the stem; if so, keep it for strong groups only."; }
      else if (d < 0.15 && (rpb === null || rpb < 0.15)) { verdict = "weak"; note = "Barely separates strong from weak students."; }
      else { verdict = "good"; note = "Working as intended."; }
    }
    const labelCheck = enough ? labelVersusData(level, p) : null;
    return { key: s.key, question: s.question, options: s.options, correct: s.correct, picks: s.picks, skipped: s.skipped, n, seen: n, right: s.scores.reduce((a, b) => a + b, 0), p, d, rpb, topRate: s.topN ? s.topOk / s.topN : 0, botRate: s.botN ? s.botOk / s.botN : 0, level, verdict, note, labelCheck };
  }).sort((a, b) => a.p - b.p);
  return { items, students: rows.length };
}

/* The level the data suggest, from facility. Cut-offs suit a placement
   cohort: three in four solve an easy item, fewer than half a hard one. */
export const empiricalLevel = p => (p >= 0.75 ? 1 : p >= 0.45 ? 2 : 3);
export function labelVersusData(level, p) {
  if (!level) return null;
  const e = empiricalLevel(p);
  if (e === level) return null;
  const name = { 1: "easy", 2: "medium", 3: "hard" };
  const pct = Math.round(p * 100);
  return e < level
    ? { direction: "easier", text: `Labelled ${name[level]}, but ${pct}% get it right — it behaves like a${e === 1 ? "n easy" : " medium"} item.` }
    : { direction: "harder", text: `Labelled ${name[level]}, but only ${pct}% get it right — it behaves like a${e === 3 ? " hard" : " medium"} item.` };
}

/* KR-20 reliability of a paper, with the standard error of measurement.
   Needs every student to have sat the same questions (a fixed paper);
   papers drawn at random per student are reported as not comparable. */
export function paperReliability(attempts) {
  const rows = responses(attempts);
  if (rows.length < 10) return { ok: false, reason: `Needs at least 10 submitted papers (has ${rows.length}).` };
  const counts = new Map();
  for (const row of rows) for (const k of row.r.keys()) counts.set(k, (counts.get(k) || 0) + 1);
  const common = [...counts.entries()].filter(([, c]) => c === rows.length).map(([k]) => k);
  if (common.length < 5 || common.length < 0.8 * Math.max(...rows.map(r => r.r.size))) {
    return { ok: false, reason: "Students did not all get the same questions, so the paper's reliability cannot be measured." };
  }
  const k = common.length;
  const totals = rows.map(row => common.reduce((s, q) => s + row.r.get(q).ok, 0));
  const vt = variance(totals);
  if (vt === 0) return { ok: false, reason: "Every student has the same score, so reliability is undefined." };
  const pq = common.reduce((s, q) => { const p = mean(rows.map(row => row.r.get(q).ok)); return s + p * (1 - p); }, 0);
  const r = (k / (k - 1)) * (1 - pq / vt);
  const sd = Math.sqrt(vt);
  const sem = sd * Math.sqrt(Math.max(0, 1 - r));
  const verdict = r >= 0.8 ? "Good enough to place individual students" : r >= 0.7 ? "Fine for group trends and diagnosis; treat individual scores near a band edge with care" : "Too noisy to act on individual scores — use it for group trends only";
  return { ok: true, k, n: rows.length, r, sem, sd, mean: mean(totals), verdict };
}

/* Bank-wide calibration: every built-in item's statistics across all
   baseline papers, keyed by bank id. idOf(item) → bank id or null. */
export function bankCalibration(attempts, idOf, levelOf) {
  const keyed = (attempts || []).map(a => ({ ...a, items: (a.items || []).map(it => { const id = idOf(it); return id ? { ...it, qid: `bank:${id}` } : { ...it, void: true }; }) }));
  /* Each paper is a different form, so totals are not comparable across
     forms: discrimination is computed within each paper, then pooled. */
  const byQuiz = new Map();
  for (const a of keyed) { if (!byQuiz.has(a.quiz_id)) byQuiz.set(a.quiz_id, []); byQuiz.get(a.quiz_id).push(a); }
  const pooled = new Map();
  for (const group of byQuiz.values()) {
    for (const it of itemStatistics(group, levelOf).items) {
      const id = String(it.key).replace(/^bank:/, "");
      const s = pooled.get(id) || { id, question: it.question, level: it.level, n: 0, right: 0, dSum: 0, dW: 0, rSum: 0, rW: 0 };
      s.n += it.n; s.right += it.right;
      if (group.length >= 10) { s.dSum += it.d * it.n; s.dW += it.n; if (it.rpb !== null) { s.rSum += it.rpb * it.n; s.rW += it.n; } }
      pooled.set(id, s);
    }
  }
  return [...pooled.values()].map(s => {
    const p = s.n ? s.right / s.n : 0;
    const d = s.dW ? s.dSum / s.dW : null, rpb = s.rW ? s.rSum / s.rW : null;
    const enough = s.n >= MIN_N_CALIBRATE;
    const labelCheck = enough ? labelVersusData(s.level, p) : null;
    const flag = !enough ? null : (d !== null && d < 0) || (rpb !== null && rpb < 0) ? "inverted" : labelCheck ? labelCheck.direction : (d !== null && d < 0.15) ? "weak" : null;
    return { ...s, p, d, rpb, enough, labelCheck, flag, empirical: empiricalLevel(p) };
  }).sort((a, b) => (b.flag ? 1 : 0) - (a.flag ? 1 : 0) || b.n - a.n);
}
