/* ══════════════════════════════════════════════════════════════════
   QAAPF CORE — keys, scoring, confidence and blueprint (no React)
   ══════════════════════════════════════════════════════════════════
   Everything that decides a number lives here, so it can be tested
   without a browser (npm test) and every screen — Results, Student
   profiles, Heatmap, Accreditation, the student's own view — reads the
   same figures.

   Three rules this file enforces:

   1. Score against the verified key. Built-in questions are scored
      against the current QAAPF bank by answer TEXT, never against the
      key stored in the question bank row or in the attempt. A stale
      database copy, an old attempt or a tampered submission cannot
      move a QAAPF score.
   2. Faulty items are void, not wrong. Earlier versions known to be
      faulty (wrong key, no correct option, two correct options…) are
      removed from the score entirely, for every student alike.
   3. One baseline. The headline is the percentage of framework
      questions answered correctly on the baseline paper, reported with
      its likely range. Difficulty, domains and sub-skills are separate
      diagnostic axes, not weights folded into the headline.
   ══════════════════════════════════════════════════════════════════ */

import { QAAPF_QUESTIONS, QAAPF_LEGACY, QAAPF_BANK_VERSION, QAAPF_BANK_DATE } from "./qaapf-bank.js";

export { QAAPF_QUESTIONS, QAAPF_LEGACY, QAAPF_BANK_VERSION, QAAPF_BANK_DATE };

/* ── Proficiency bands ───────────────────────────────────────────────
   Cut-points are unchanged from v3 so earlier classifications stay
   comparable. They are provisional until a standard-setting panel
   (modified Angoff or Bookmark) confirms them; the descriptors say
   what a typical student in the band can do on this paper. */
export const Q_LEVELS = [
  { level:"Q1", label:"Foundation",  color:"bg-rose-500",    light:"bg-rose-50   border-rose-200   text-rose-700",   min:0,  max:24, desc:"Below the level expected from guessing on this paper. Basic arithmetic is not yet secure; start with number facts and single-step calculation." },
  { level:"Q2", label:"Elementary",  color:"bg-orange-500",  light:"bg-orange-50 border-orange-200 text-orange-700", min:25, max:44, desc:"Can do single-step calculations with whole numbers, simple fractions and percentages when the question looks familiar." },
  { level:"Q3", label:"Developing",  color:"bg-amber-500",   light:"bg-amber-50  border-amber-200  text-amber-700",  min:45, max:59, desc:"Solves routine one- and two-step problems in percentages, ratios, simple equations and tables; errors rise when the context is unfamiliar." },
  { level:"Q4", label:"Proficient",  color:"bg-violet-500",  light:"bg-violet-50 border-violet-200 text-violet-700", min:60, max:74, desc:"Applies arithmetic, algebra and data reading to unfamiliar problems with reasonable accuracy." },
  { level:"Q5", label:"Advanced",    color:"bg-blue-500",    light:"bg-blue-50   border-blue-200   text-blue-700",   min:75, max:89, desc:"Reliable on multi-step quantitative reasoning, data interpretation and simple modelling." },
  { level:"Q6", label:"Expert",      color:"bg-emerald-500", light:"bg-emerald-50 border-emerald-200 text-emerald-700", min:90, max:100, desc:"Consistently solves complex multi-step problems, including modelling and evaluating quantitative claims." },
];

export function getQLevel(pct) {
  if (pct === null || pct === undefined || Number.isNaN(Number(pct))) return null;
  const p = Math.max(0, Math.min(100, Math.round(Number(pct))));
  return Q_LEVELS.find(l => p >= l.min && p <= l.max) || Q_LEVELS[0];
}

/* ── Domains and reporting clusters ─────────────────────────────────
   Eight domains are diagnostic detail: on a baseline paper each carries
   only three to six items, enough to point at a weakness but not to
   classify on. Decisions are reported on four clusters, each combining
   two domains. */
export const DOMAINS = [
  { id:"A", name:"Numerical Foundation",          short:"Numbers",  icon:"🔢", cluster:"N", units:["Number Sense","Whole Numbers","BODMAS","Fractions","Decimals","Approximation"] },
  { id:"B", name:"Commercial Arithmetic",         short:"Commerce", icon:"💹", cluster:"N", units:["Percentages","Profit & Loss","Discount","Simple Interest","Compound Interest","Ratio & Proportion","Averages"] },
  { id:"C", name:"Quantitative Reasoning",        short:"QR",       icon:"🧮", cluster:"P", units:["Number Series","Missing Numbers","Mathematical Patterns","Quantitative Comparisons","Estimation","Multi-step Reasoning"] },
  { id:"D", name:"Algebraic Thinking",            short:"Algebra",  icon:"📐", cluster:"P", units:["Basic Algebra","Linear Equations","Simultaneous Equations","Inequalities","Functions"] },
  { id:"E", name:"Data Interpretation",           short:"DI",       icon:"📊", cluster:"D", units:["Tables","Bar Charts","Pie Charts","Line Graphs","Percentage Change","Growth Rates","Multi-variable Data"] },
  { id:"F", name:"Logical & Analytical Reasoning",short:"Logic",    icon:"🔍", cluster:"R", units:["Logical Sequences","Arrangement","Classification","Conditional Reasoning","Deductive Reasoning","Analytical Puzzles","Coding-Decoding","Blood Relations","Direction Sense","Data Sufficiency"] },
  { id:"G", name:"Applied Quantitative Reasoning",short:"Applied",  icon:"🌍", cluster:"D", units:["Workplace Problems","Financial Literacy","Statistical Interpretation","Decision Making","Probability & Chance"] },
  { id:"H", name:"Mathematical Problem Solving",  short:"Solving",  icon:"🎯", cluster:"R", units:["Complex Multi-step","Modelling","Evaluation","Mathematical Reasoning","Measurement & Geometry"] },
];

export const CLUSTERS = [
  { id:"N", name:"Number & Commercial Arithmetic", short:"Number",    icon:"🔢", domains:["A","B"] },
  { id:"P", name:"Patterns & Algebra",             short:"Algebra",   icon:"📐", domains:["C","D"] },
  { id:"D", name:"Data & Applied Reasoning",       short:"Data",      icon:"📊", domains:["E","G"] },
  { id:"R", name:"Reasoning & Problem Solving",    short:"Reasoning", icon:"🎯", domains:["F","H"] },
];

/* Below this many items a domain score is shown but marked provisional. */
export const RELIABLE_MIN = 6;
/* Below this many items a cluster score is shown but marked provisional. */
export const CLUSTER_RELIABLE_MIN = 12;
/* An answer given faster than this is treated as a rapid guess: no
   question in the bank can be read and worked in under five seconds. */
export const RAPID_SECONDS = 5;
/* An unanswered question shown for less than this was never really
   looked at — on a timed paper, it was not reached. */
export const VIEWED_SECONDS = 3;

/* ── Cognitive demand (second axis) ─────────────────────────────────
   Derived from the item's skill tag — a framework-level mapping rule,
   reported as such, not a per-item expert rating. */
export const COGNITIVE = [
  { id:0, key:"recall",     label:"Recall",        desc:"Retrieve a fact or run a single known operation." },
  { id:1, key:"understand", label:"Understanding", desc:"Apply a routine procedure in a familiar form." },
  { id:2, key:"apply",      label:"Application",   desc:"Carry a known method into an unfamiliar context." },
  { id:3, key:"analyse",    label:"Analysis",      desc:"Decompose, compare or infer across several facts." },
  { id:4, key:"higher",     label:"Higher-order",  desc:"Model, evaluate or reason through an open problem." },
];

const TOPIC_DEMAND = {
  "number sense":0, "whole numbers":0, "bodmas":0, "fractions":0, "decimals":0, "approximation":0,
  "percentages":1, "profit & loss":1, "discount":1, "simple interest":1, "compound interest":1,
  "ratio & proportion":1, "averages":1, "tables":1, "bar charts":1, "pie charts":1, "line graph":1, "geometry":1,
  "algebra":2, "number series":2, "sequences":2, "missing numbers":2, "patterns":2,
  "estimation":2, "applied":2, "finance":2, "statistics":2, "% change":2, "probability":2,
  "qc":3, "multi-var":3, "growth":3, "arrangement":3, "classification":3,
  "conditional":3, "deductive":3, "puzzles":3, "reasoning":3, "multi-step":3, "decision":3,
  "modelling":4, "evaluation":4, "problem solving":4,
};

export const cognitiveOf = (topic) => {
  const d = TOPIC_DEMAND[String(topic || "").trim().toLowerCase()];
  return d === undefined ? null : d;
};

export const diffLabel = v => (v === 1 ? "Easy" : v === 2 ? "Medium" : "Hard");

/* ── Text helpers ────────────────────────────────────────────────── */
export const norm = t => String(t ?? "").trim().toLowerCase().replace(/\s+/g, " ");
export const optionSig = opts => (Array.isArray(opts) ? opts.map(norm).sort().join("␟") : "");

/* ══════════════════════════════════════════════════════════════════
   BASELINE PAPERS
   ══════════════════════════════════════════════════════════════════
   A baseline is the paper built by the generator. It is recognised by
   its title, which the generator sets ("Aptitude Baseline — …"), or by a
   `purpose` column if the database has one. Keep the prefix when
   renaming a baseline quiz. */
export const BASELINE_TITLE_PREFIX = "Aptitude Baseline";

export function isBaselineQuiz(quiz) {
  if (!quiz) return false;
  if (quiz.purpose === "baseline") return true;
  return norm(quiz.title).startsWith(norm(BASELINE_TITLE_PREFIX));
}

export function baselineQuizIds(quizzes) {
  return new Set((quizzes || []).filter(isBaselineQuiz).map(q => q.id));
}

/* Which attempts a profile is built from. "auto" uses baseline papers
   when there are any, otherwise every attempt (so a department that
   ran QAAPF items inside its own quizzes still sees profiles). */
export function selectProfileAttempts(attempts, quizzes, mode = "auto") {
  const all = attempts || [];
  const ids = baselineQuizIds(quizzes);
  const baseline = all.filter(a => ids.has(a.quiz_id));
  if (mode === "all") return { attempts: all, source: "all", baselineCount: baseline.length };
  if (mode === "baseline") return { attempts: baseline, source: "baseline", baselineCount: baseline.length };
  return baseline.length
    ? { attempts: baseline, source: "baseline", baselineCount: baseline.length }
    : { attempts: all, source: "all", baselineCount: 0 };
}

/* ══════════════════════════════════════════════════════════════════
   VERIFIED KEYS
   ══════════════════════════════════════════════════════════════════ */
const BANK_BY_STEM = new Map();
const BANK_BY_ID = new Map();
for (const q of QAAPF_QUESTIONS) {
  const entry = { ...q, sig: optionSig(q.o) };
  BANK_BY_STEM.set(norm(q.q), entry);
  BANK_BY_ID.set(q.id, entry);
}
const LEGACY_BY_STEM = new Map();
const LEGACY_BY_STEM_SIG = new Map();
for (const L of QAAPF_LEGACY) {
  const entry = { ...L, sig: optionSig(L.o) };
  const k = norm(L.q);
  if (!LEGACY_BY_STEM.has(k)) LEGACY_BY_STEM.set(k, []);
  LEGACY_BY_STEM.get(k).push(entry);
  LEGACY_BY_STEM_SIG.set(`${k}##${entry.sig}`, entry);
}

export const bankItemByStem = stem => BANK_BY_STEM.get(norm(stem)) || null;
export const bankItemById = id => BANK_BY_ID.get(id) || null;
export const isBuiltInStem = stem => BANK_BY_STEM.has(norm(stem)) || LEGACY_BY_STEM.has(norm(stem));

/* The worked explanation for a built-in question, or null. Looked up
   by the question's text, so it works for old attempts and bank rows. */
export function explanationFor(question) {
  const b = verifiedItemFor(typeof question === "string" ? question : question?.question);
  return b?.x || null;
}

/* The verified bank item for a question text: the item itself, or the
   item that replaced an earlier wording. null for teacher questions. */
export function verifiedItemFor(question) {
  const b = BANK_BY_STEM.get(norm(question));
  if (b) return b;
  const v = (LEGACY_BY_STEM.get(norm(question)) || []).find(x => x.next);
  return v ? BANK_BY_ID.get(v.next) || null : null;
}

const bankMeta = b => ({ id: b.id, domain: b.d, level: b.lv, unit: b.u, topic: b.t, cog: cognitiveOf(b.t), builtIn: true });
const legacyMeta = L => {
  const next = L.next ? BANK_BY_ID.get(L.next) : null;
  return { id: next ? next.id : `legacy:${norm(L.q)}`, domain: L.d, level: L.lv, unit: L.u, topic: L.t, cog: cognitiveOf(L.t), builtIn: true };
};

/* Teacher-authored questions join the framework only when their unit or
   topic names a framework unit as a whole word or phrase — "Timetables"
   must not fold into "Tables". */
function teacherMeta(row) {
  if (!row) return null;
  const u = norm(row.unit), t = norm(row.topic);
  const words = new Set([...u.split(" "), ...t.split(" ")]);
  const matches = vocab => {
    const n = norm(vocab);
    if (n === u || n === t) return true;
    if (n.includes(" ") && (u.includes(n) || t.includes(n))) return true;
    return !n.includes(" ") && words.has(n);
  };
  const dom = DOMAINS.find(d => d.units.some(matches));
  if (!dom) return null;
  const level = row.difficulty === "hard" ? 3 : row.difficulty === "easy" ? 1 : 2;
  return {
    id: null, domain: dom.id, level,
    unit: row.unit || row.topic || "Unspecified",
    topic: row.topic || row.unit || "",
    cog: cognitiveOf(row.topic) ?? cognitiveOf(row.unit),
    builtIn: false,
  };
}

/* The context is identical for every student in a cohort, so it is
   built once per question-bank array (React hands us the same array
   until the bank changes). */
const _ctxCache = new WeakMap();
let _emptyCtx = null;
function keyContext(allQuestions) {
  const key = Array.isArray(allQuestions) ? allQuestions : null;
  if (key) { const hit = _ctxCache.get(key); if (hit) return hit; }
  else if (_emptyCtx) return _emptyCtx;
  const rowsById = new Map();
  for (const r of allQuestions || []) if (r && r.id != null) rowsById.set(r.id, r);
  const ctx = { rowsById };
  if (key) _ctxCache.set(key, ctx); else _emptyCtx = ctx;
  return ctx;
}

const toIndex = v => (v === null || v === undefined || v === "" ? null : Number.isInteger(Number(v)) ? Number(v) : null);

/* Resolve one attempt item to { meta, key, void, why, source }.
   meta is null for questions outside the framework; key is the index
   of the correct option within it.options. */
export function resolveItem(it, allQuestionsOrCtx) {
  const ctx = allQuestionsOrCtx && allQuestionsOrCtx.rowsById ? allQuestionsOrCtx : keyContext(allQuestionsOrCtx);
  const stem = norm(it?.question);
  const opts = Array.isArray(it?.options) ? it.options : null;
  const sig = opts ? optionSig(opts) : null;
  const at = text => (opts && text !== null && text !== undefined ? opts.findIndex(o => norm(o) === norm(text)) : -1);
  const stored = toIndex(it?.correct);

  // 1. A current bank item.
  const b = BANK_BY_STEM.get(stem);
  if (b) {
    const meta = bankMeta(b);
    if (!opts) return { meta, key: stored, source: "stored" };
    if (sig === b.sig) {
      const k = at(b.o[b.c]);
      return k >= 0 ? { meta, key: k, source: "bank" } : { meta, void: true, why: "answer not among the options", source: "bank" };
    }
    const L = LEGACY_BY_STEM_SIG.get(`${stem}##${sig}`);
    if (L) {
      if (L.status === "void") return { meta, void: true, why: L.why, source: "legacy" };
      const k = at(L.a);
      return k >= 0 ? { meta, key: k, source: "legacy" } : { meta, void: true, why: "answer not among the options", source: "legacy" };
    }
    const k = at(b.o[b.c]);
    return k >= 0
      ? { meta, key: k, source: "bank-variant" }
      : { meta, void: true, why: "options differ from the verified item", source: "variant" };
  }

  // 2. An earlier wording of a built-in item.
  const versions = LEGACY_BY_STEM.get(stem);
  if (versions) {
    const exact = sig ? versions.find(v => v.sig === sig) : null;
    const ref = exact || versions.find(v => v.status === "ok") || versions[0];
    const meta = legacyMeta(ref);
    if (exact) {
      if (exact.status === "void") return { meta, void: true, why: exact.why, source: "legacy" };
      const k = at(exact.a);
      return k >= 0 ? { meta, key: k, source: "legacy" } : { meta, void: true, why: "answer not among the options", source: "legacy" };
    }
    if (ref.status === "ok") {
      const k = at(ref.a);
      if (k >= 0) return { meta, key: k, source: "legacy-variant" };
    }
    return { meta, void: true, why: ref.status === "void" ? ref.why : "unrecognised earlier version", source: "legacy" };
  }

  // 3. A teacher's own question: score against the bank row's current
  //    key (so a key fixed after the attempt applies retroactively).
  const row = it?.qid !== null && it?.qid !== undefined ? ctx.rowsById.get(it.qid) : null;
  let key = stored, source = "stored";
  if (row && Array.isArray(row.options)) {
    const rk = toIndex(row.correct);
    if (rk !== null && row.options[rk] !== undefined) {
      const k = at(row.options[rk]);
      if (k >= 0) { key = k; source = "bank-row"; }
    }
  }
  return { meta: teacherMeta(row), key, source };
}

/* An attempt with every item's key replaced by its verified key.
   Void items keep their place and carry void:true so a review screen
   can say "withdrawn" instead of marking the student wrong. */
export function rekeyAttempt(att, allQuestions) {
  if (!att || !Array.isArray(att.items)) return att;
  const ctx = keyContext(allQuestions);
  let changed = false, correct = 0, scored = 0;
  const items = att.items.map(it => {
    const r = resolveItem(it, ctx);
    if (r.void) { changed = true; return { ...it, void: true, voidReason: r.why }; }
    const key = r.key;
    if (key !== toIndex(it.correct)) changed = true;
    scored++;
    if (it.chosen !== null && it.chosen !== undefined && Number(it.chosen) === key) correct++;
    return key === toIndex(it.correct) ? it : { ...it, correct: key, rekeyed: true };
  });
  return {
    ...att,
    items,
    rekey: { changed, correct, scored, percent: scored ? Math.round((correct / scored) * 100) : null, voided: items.filter(i => i.void).length },
  };
}

export const rekeyAttempts = (attempts, allQuestions) => (attempts || []).map(a => rekeyAttempt(a, allQuestions));

/* ══════════════════════════════════════════════════════════════════
   SMALL STATISTICS
   ══════════════════════════════════════════════════════════════════ */
/* P(X ≥ k) for X ~ Binomial(n, p), summed in log space. */
export function binomUpperTail(k, n, p) {
  if (k <= 0) return 1;
  if (k > n) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const lp = Math.log(p), lq = Math.log(1 - p);
  let logC = 0;                                   // log C(n, 0)
  let total = 0;
  for (let i = 0; i <= n; i++) {
    if (i > 0) logC += Math.log(n - i + 1) - Math.log(i);
    if (i >= k) total += Math.exp(logC + i * lp + (n - i) * lq);
  }
  return Math.min(1, total);
}

/* Wilson 95% interval for a proportion, in percentage points. */
export function wilson(correct, n, z = 1.96) {
  if (!n) return null;
  const p = correct / n, z2 = z * z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return [Math.max(0, Math.round((centre - half) * 100)), Math.min(100, Math.round((centre + half) * 100))];
}

/* Whether a change between two proportions is larger than measurement
   error alone would produce (two-proportion z, |z| > 1.96). */
export function reliableChange(c1, n1, c2, n2) {
  if (!n1 || !n2) return { status: "na", z: null };
  const p1 = c1 / n1, p2 = c2 / n2;
  // Floor the variance so a perfect or zero score does not give an infinite z.
  const v = Math.max(p1 * (1 - p1), 0.25 / n1) / n1 + Math.max(p2 * (1 - p2), 0.25 / n2) / n2;
  const z = (p2 - p1) / Math.sqrt(v);
  return { status: z > 1.96 ? "improved" : z < -1.96 ? "declined" : "within-error", z };
}

/* ══════════════════════════════════════════════════════════════════
   BASELINE CONFIDENCE
   ══════════════════════════════════════════════════════════════════
   A classification is only worth acting on if the evidence behind it
   holds up. Confidence is computed from the response pattern, not the
   score. Every deduction is reported with the signal that caused it;
   a signal that cannot be evaluated costs nothing. */
export function computeConfidence({
  answered, presented, domainsCovered, tiersCovered, byLevel,
  correctAnswered = null, chanceRate = null, optionsRecorded = true,
  secPerItem = null, timedAnswers = 0, rapidAnswers = 0, rapidEnd = 0,
  integrityKnown = false, violations = 0, autoSubmitted = false,
  speedKnown = false, notReached = 0, skippedViewed = null, accuracyOnAttempted = null,
}) {
  const factors = [];
  let penalty = 0;
  const hit = (p, label, status, detail) => { penalty += p; factors.push({ label, status, detail }); };
  const na = (label, detail) => factors.push({ label, status: "na", detail });

  /* 1. Volume of evidence */
  if (answered < RELIABLE_MIN)            hit(35, "Evidence volume", "weak", `Only ${answered} items answered — below the ${RELIABLE_MIN}-item floor for any single finding.`);
  else if (answered < RELIABLE_MIN * 2)   hit(18, "Evidence volume", "thin", `${answered} items answered — enough for an indication, not a classification.`);
  else if (answered < RELIABLE_MIN * 4)   hit(6,  "Evidence volume", "ok",   `${answered} items answered.`);
  else                                    hit(0,  "Evidence volume", "good", `${answered} items answered — a solid base.`);

  /* 2. Breadth across domains */
  if (domainsCovered <= 1)      hit(25, "Domain breadth", "weak", `Evidence from ${domainsCovered} domain — this is a topic score, not an aptitude profile.`);
  else if (domainsCovered <= 3) hit(12, "Domain breadth", "thin", `Evidence from ${domainsCovered} of ${DOMAINS.length} domains.`);
  else if (domainsCovered <= 5) hit(5,  "Domain breadth", "ok",   `Evidence from ${domainsCovered} of ${DOMAINS.length} domains.`);
  else                          hit(0,  "Domain breadth", "good", `Evidence from ${domainsCovered} of ${DOMAINS.length} domains.`);

  /* 3. Difficulty spread */
  if (tiersCovered <= 1)       hit(22, "Difficulty spread", "weak", "Items came from a single difficulty tier — the ability ceiling cannot be located.");
  else if (tiersCovered === 2) hit(9,  "Difficulty spread", "thin", "Items spanned two of three difficulty tiers.");
  else                         hit(0,  "Difficulty spread", "good", "Items spanned all three difficulty tiers.");

  /* 4. Completion. On a timed paper, questions the student never reached
        are a speed result, reported under Speed below; only questions
        looked at and left blank count here. */
  const skipped = skippedViewed ?? Math.max(0, presented - answered);
  const skipRate = presented ? skipped / presented : 0;
  const where = speedKnown ? " after looking at them" : "";
  if (skipRate >= 0.4)       hit(20, "Completion", "weak", `${skipped} of ${presented} items left unanswered${where} — the score understates demonstrated ability.`);
  else if (skipRate >= 0.15) hit(9,  "Completion", "thin", `${skipped} of ${presented} items left unanswered${where}.`);
  else if (skipped > 0)      hit(2,  "Completion", "ok",   `${skipped} of ${presented} items left unanswered${where}.`);
  else                       hit(0,  "Completion", "good", speedKnown && notReached ? "Every question reached was attempted." : "Every item attempted.");

  /* 4b. Speed. Not reaching the end is part of a timed result, not a flaw
         in it — but when much of the paper went unseen, the diagnostic
         detail rests on fewer questions. */
  if (speedKnown && presented) {
    const share = notReached / presented;
    const acc = accuracyOnAttempted !== null ? ` Accuracy on the questions attempted was ${accuracyOnAttempted}%.` : "";
    if (share >= 0.4)      hit(9, "Speed", "thin", `${notReached} of ${presented} questions not reached in the time — the score reflects speed as much as accuracy.${acc}`);
    else if (notReached)   hit(0, "Speed", "ok",   `${notReached} of ${presented} questions not reached in the time.${acc}`);
    else                   hit(0, "Speed", "good", "Reached every question in the time.");
  } else {
    na("Speed", "Per-question timing was not recorded for this attempt.");
  }

  /* 5. Above chance? A one-sided binomial test against the guessing rate
        of the options actually shown. A pure guesser on 48 four-option
        items scores 25% on average and above 35% about one time in ten,
        so a margin rule alone cannot separate the two. */
  if (chanceRate && answered >= RELIABLE_MIN * 2 && correctAnswered !== null) {
    const pval = binomUpperTail(correctAnswered, answered, chanceRate);
    const acc = Math.round((correctAnswered / answered) * 100);
    const ch = Math.round(chanceRate * 100);
    if (pval > 0.05)       hit(30, "Above chance", "weak", `${correctAnswered} of ${answered} correct (${acc}%) is within what guessing alone produces at a ${ch}% chance rate (p = ${pval.toFixed(2)}).`);
    else if (pval > 0.001) hit(10, "Above chance", "thin", `${acc}% correct is above the ${ch}% chance rate, but only modestly (p = ${pval.toFixed(3)}).`);
    else                   hit(0,  "Above chance", "good", `${acc}% correct is clearly above the ${ch}% chance rate.`);
  } else {
    na("Above chance", !optionsRecorded
      ? "This attempt did not record the answer options, so the chance rate cannot be established."
      : `Fewer than ${RELIABLE_MIN * 2} answered items — too few to distinguish performance from chance.`);
  }

  /* 6. Difficulty coherence: accuracy should fall as difficulty rises. */
  const e = byLevel?.[1], h = byLevel?.[3];
  if (e && h && e.n >= 3 && h.n >= 3) {
    const ea = e.c / e.n, ha = h.c / h.n;
    if (ha - ea >= 0.25)      hit(18, "Difficulty coherence", "weak", `Hard-item accuracy (${(ha * 100).toFixed(0)}%) far exceeds easy-item accuracy (${(ea * 100).toFixed(0)}%) — likely guessing or careless slips on easy items.`);
    else if (ha - ea >= 0.10) hit(7,  "Difficulty coherence", "thin", "Hard items scored above easy items — unusual, worth a look.");
    else                      hit(0,  "Difficulty coherence", "good", "Accuracy falls as difficulty rises, as expected.");
  } else {
    na("Difficulty coherence", "Not enough items at both the easy and hard tiers to compare.");
  }

  /* 7. Working pace over the whole paper. */
  if (secPerItem !== null && secPerItem !== undefined && answered >= RELIABLE_MIN) {
    if (secPerItem < 10)      hit(20, "Working pace", "weak", `${secPerItem.toFixed(0)}s per item — too fast for the problems to have been worked.`);
    else if (secPerItem < 20) hit(8,  "Working pace", "thin", `${secPerItem.toFixed(0)}s per item — faster than these items usually take.`);
    else                      hit(0,  "Working pace", "good", `${secPerItem.toFixed(0)}s per item.`);
  } else {
    na("Working pace", "No timing recorded for this attempt.");
  }

  /* 8. Rapid guessing, question by question (recorded from v4). Quick
        guesses after the student's last worked answer are the instructed
        end-of-time behaviour on a timed paper (no negative marking), so
        only rapid answers scattered through the paper count against it. */
  if (timedAnswers >= RELIABLE_MIN) {
    const scattered = Math.max(0, rapidAnswers - rapidEnd);
    const share = scattered / timedAnswers;
    const tail = rapidEnd ? ` ${rapidEnd} quick guess${rapidEnd === 1 ? "" : "es"} as time ran out are not counted against the result.` : "";
    if (share >= 0.25)      hit(20, "Rapid answers", "weak", `${scattered} of ${timedAnswers} answers given in under ${RAPID_SECONDS}s while working through the paper — not enough time to read the question.${tail}`);
    else if (share >= 0.10) hit(8,  "Rapid answers", "thin", `${scattered} of ${timedAnswers} answers given in under ${RAPID_SECONDS}s while working through the paper.${tail}`);
    else                    hit(0,  "Rapid answers", "good", (scattered ? `${scattered} rapid answer${scattered === 1 ? "" : "s"} — within normal range.` : "No answers given faster than a question can be read.") + tail);
  } else {
    na("Rapid answers", "Per-question timing was not recorded for this attempt.");
  }

  /* 9. Integrity events from the proctored session. */
  if (integrityKnown) {
    if (autoSubmitted || violations >= 5) hit(20, "Session integrity", "weak", `${violations} integrity flags — the paper was auto-submitted or heavily interrupted.`);
    else if (violations >= 3)            hit(10, "Session integrity", "thin", `${violations} integrity flags during the session.`);
    else if (violations >= 1)            hit(3,  "Session integrity", "ok",   `${violations} integrity flag${violations === 1 ? "" : "s"} during the session.`);
    else                                 hit(0,  "Session integrity", "good", "No integrity flags during the session.");
  } else {
    na("Session integrity", "No proctoring record for this attempt.");
  }

  const score = Math.max(0, Math.min(100, 100 - penalty));
  const band  = score >= 75 ? "High" : score >= 50 ? "Moderate" : "Low";
  const advice = band === "High"
    ? "The classification is well supported by the response pattern."
    : band === "Moderate"
    ? "Treat the classification as indicative. Reassessment on a fuller paper is recommended before acting on it."
    : "The classification is not safe to act on. Reassess before assigning an intervention on this basis.";

  return { score, band, factors, advice };
}

/* ══════════════════════════════════════════════════════════════════
   STUDENT APTITUDE PROFILE
   ══════════════════════════════════════════════════════════════════ */
const pctOf = (c, n) => (n ? Math.round((c / n) * 100) : null);

export function computeQAAPFProfile(attempts, allQuestions) {
  const ctx = keyContext(allQuestions);

  const dom = {};
  for (const d of DOMAINS) dom[d.id] = { correct: 0, seen: 0, byLevel: { 1: { c: 0, n: 0 }, 2: { c: 0, n: 0 }, 3: { c: 0, n: 0 } } };
  const levelAgg = { 1: { c: 0, n: 0 }, 2: { c: 0, n: 0 }, 3: { c: 0, n: 0 } };
  const cogAgg = {};
  for (const c of COGNITIVE) cogAgg[c.id] = { c: 0, n: 0 };
  const unitAgg = new Map();

  let presented = 0, answered = 0, correctAnswered = 0;
  let chanceSum = 0, chanceItems = 0;
  let timedSec = 0, timedItems = 0, anyUntimed = false;
  let timedAnswers = 0, rapidAnswers = 0, rapidEnd = 0;
  let integrityKnown = false, violations = 0, autoSubmitted = false;
  let speedKnown = false, notReached = 0;
  const levelNotReached = { 1: 0, 2: 0, 3: 0 };
  const voided = new Map();

  /* Earliest attempt first, so the first response to a question is the
     one that counts — that is what makes this a baseline. */
  const ordered = [...(attempts || [])].sort((a, b) => new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0));
  const seenKeys = new Set();

  for (const att of ordered) {
    const items = Array.isArray(att.items) ? att.items : [];
    const t = Number(att.time_used_sec);
    if (Number.isFinite(t) && t > 0) { timedSec += t; timedItems += items.length; }
    else anyUntimed = true;

    const v = att.violations !== undefined && att.violations !== null ? Number(att.violations) : Array.isArray(att.log) ? att.log.length : NaN;
    if (Number.isFinite(v)) { integrityKnown = true; violations += v; if (v >= 5) autoSubmitted = true; }

    /* Where the student's worked answers stop on this paper (display
       position), to tell "not reached" and "end-of-time guess" apart. */
    const secOf = it => (it.sec !== undefined && it.sec !== null && Number.isFinite(Number(it.sec)) ? Number(it.sec) : null);
    const answeredIt = it => it.chosen !== null && it.chosen !== undefined;
    let lastAnsweredPos = null, lastEffortPos = null;
    for (const it of items) {
      if (!Number.isInteger(it.pos) || !answeredIt(it)) continue;
      lastAnsweredPos = lastAnsweredPos === null ? it.pos : Math.max(lastAnsweredPos, it.pos);
      const sv = secOf(it);
      if (sv === null || sv >= RAPID_SECONDS) lastEffortPos = lastEffortPos === null ? it.pos : Math.max(lastEffortPos, it.pos);
    }

    for (const it of items) {
      const r = resolveItem(it, ctx);
      const meta = r.meta;
      if (!meta || !dom[meta.domain]) continue;                  // outside the framework
      if (r.void) { voided.set(norm(it.question), { question: it.question, why: r.why }); continue; }

      const key = meta.id ? `id:${meta.id}` : it.qid !== null && it.qid !== undefined ? `q:${it.qid}` : `t:${norm(it.question)}`;
      if (seenKeys.has(key)) continue;                           // a later response to the same question
      seenKeys.add(key);

      const didAnswer = it.chosen !== null && it.chosen !== undefined;
      const hasKey = Number.isInteger(r.key) && r.key >= 0;
      const ok = didAnswer && hasKey && Number(it.chosen) === r.key;
      const sec = secOf(it);
      if (sec !== null || Number.isInteger(it.pos)) speedKnown = true;
      /* Not reached: left blank and never really looked at (or, without
         timing, positioned after the last answered question). It still
         scores zero — the paper is timed — but it is not evidence about
         difficulty, so it stays out of the difficulty profile. */
      const unreached = !didAnswer && (sec !== null ? sec < VIEWED_SECONDS : Number.isInteger(it.pos) && lastAnsweredPos !== null && it.pos > lastAnsweredPos);

      const bucket = dom[meta.domain];
      bucket.seen++; if (ok) bucket.correct++;
      const bl = bucket.byLevel[meta.level]; if (bl && !unreached) { bl.n++; if (ok) bl.c++; }

      presented++;
      if (unreached) { notReached++; if (levelNotReached[meta.level] !== undefined) levelNotReached[meta.level]++; }
      if (didAnswer) {
        answered++;
        if (ok) correctAnswered++;
        if (Array.isArray(it.options) && it.options.length >= 2) { chanceSum += 1 / it.options.length; chanceItems++; }
        if (sec !== null && sec >= 0) {
          timedAnswers++;
          if (sec < RAPID_SECONDS) {
            rapidAnswers++;
            if (Number.isInteger(it.pos) && lastEffortPos !== null && it.pos > lastEffortPos) rapidEnd++;
          }
        }
      }

      const la = levelAgg[meta.level]; if (la && !unreached) { la.n++; if (ok) la.c++; }
      if (meta.cog !== null && meta.cog !== undefined && cogAgg[meta.cog]) { cogAgg[meta.cog].n++; if (ok) cogAgg[meta.cog].c++; }

      const uKey = `${meta.domain}||${meta.unit || "Unspecified"}`;
      let ub = unitAgg.get(uKey);
      if (!ub) { ub = { domain: meta.domain, unit: meta.unit || "Unspecified", c: 0, n: 0 }; unitAgg.set(uKey, ub); }
      ub.n++; if (ok) ub.c++;
    }
  }

  const domainProfiles = DOMAINS.map(d => {
    const b = dom[d.id];
    const pct = pctOf(b.correct, b.seen);
    return {
      ...d,
      correct: b.correct, total: b.seen, pct,
      level: getQLevel(pct),
      reliable: b.seen >= RELIABLE_MIN,
      byLevel: b.byLevel,
      /* Where competence stops: the hardest tier still cleared at 60% on
         at least two items. */
      ceiling: [3, 2, 1].find(l => b.byLevel[l].n >= 2 && b.byLevel[l].c / b.byLevel[l].n >= 0.6) || null,
    };
  });

  const clusterProfiles = CLUSTERS.map(c => {
    const parts = c.domains.map(id => dom[id]);
    const correct = parts.reduce((s, b) => s + b.correct, 0);
    const total = parts.reduce((s, b) => s + b.seen, 0);
    const pct = pctOf(correct, total);
    return { ...c, correct, total, pct, level: getQLevel(pct), reliable: total >= CLUSTER_RELIABLE_MIN, range: total ? wilson(correct, total) : null };
  });

  const seen = presented;
  const correct = Object.values(dom).reduce((s, b) => s + b.correct, 0);
  const overallPct = pctOf(correct, seen);
  const overallLevel = getQLevel(overallPct);
  const overallRange = seen ? wilson(correct, seen) : null;

  const assessed = domainProfiles.filter(d => d.pct !== null);
  const firm = assessed.filter(d => d.reliable);
  const strengths = firm.filter(d => d.pct >= 70).sort((a, b) => b.pct - a.pct).slice(0, 3);
  const gaps = firm.filter(d => d.pct < 60).sort((a, b) => a.pct - b.pct).slice(0, 3);

  /* Difficulty is profiled on the questions the student reached, so a
     slow but able student is not read as unable to do hard questions. */
  const difficultyProfile = [1, 2, 3].map(l => ({
    level: l, label: diffLabel(l),
    correct: levelAgg[l].c, total: levelAgg[l].n,
    pct: pctOf(levelAgg[l].c, levelAgg[l].n),
    reliable: levelAgg[l].n >= 3,
    notReached: levelNotReached[l],
  }));
  const overallCeiling = [3, 2, 1].find(l => levelAgg[l].n >= 3 && levelAgg[l].c / levelAgg[l].n >= 0.6) || null;

  const cognitiveProfile = COGNITIVE.map(c => ({
    ...c, correct: cogAgg[c.id].c, total: cogAgg[c.id].n,
    pct: pctOf(cogAgg[c.id].c, cogAgg[c.id].n),
    reliable: cogAgg[c.id].n >= 3,
  }));

  const subDomains = [...unitAgg.values()]
    .map(u => ({ ...u, domainName: DOMAINS.find(d => d.id === u.domain)?.short || u.domain, pct: pctOf(u.c, u.n), reliable: u.n >= 3 }))
    .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));
  const weakSubDomains = subDomains.filter(u => u.reliable && u.pct < 50);
  const strongSubDomains = subDomains.filter(u => u.reliable && u.pct >= 80).slice().reverse();

  const tiersCovered = [1, 2, 3].filter(l => levelAgg[l].n > 0).length;
  const secPerItem = !anyUntimed && timedSec > 0 && timedItems > 0 ? timedSec / timedItems : null;

  const answeredAccuracy = pctOf(correctAnswered, answered);
  const skippedViewed = speedKnown ? Math.max(0, presented - answered - notReached) : null;

  /* Speed and accuracy, the two things a timed paper mixes together. */
  let speedProfile = null;
  if (speedKnown && presented && answered >= RELIABLE_MIN) {
    const completionPct = pctOf(presented - notReached, presented);
    const quick = completionPct >= 90, accurate = answeredAccuracy >= 60;
    const label = quick && accurate ? "Quick and accurate" : accurate ? "Accurate but slow" : quick ? "Quick but error-prone" : "Slow and error-prone";
    const advice = {
      "Quick and accurate": "Extend with harder, multi-step material.",
      "Accurate but slow": "Build speed: short timed sets on question types already mastered.",
      "Quick but error-prone": "Slow down: check working and read every option before answering.",
      "Slow and error-prone": "Secure the basics first, then add timed practice.",
    }[label];
    speedProfile = { completionPct, accuracyPct: answeredAccuracy, label, advice, reached: presented - notReached, notReached };
  }

  const confidence = computeConfidence({
    answered, presented,
    domainsCovered: assessed.length,
    tiersCovered, byLevel: levelAgg,
    correctAnswered,
    chanceRate: chanceItems ? chanceSum / chanceItems : null,
    optionsRecorded: chanceItems > 0,
    secPerItem, timedAnswers, rapidAnswers, rapidEnd,
    integrityKnown, violations, autoSubmitted,
    speedKnown, notReached, skippedViewed, accuracyOnAttempted: answeredAccuracy,
  });

  return {
    domainProfiles, clusterProfiles,
    overallPct, overallLevel, overallRange,
    strengths, gaps,
    totalSeen: seen, totalCorrect: correct,
    coverage: assessed.length,
    reliable: seen >= RELIABLE_MIN * 2,
    difficultyProfile, overallCeiling,
    cognitiveProfile,
    subDomains, weakSubDomains, strongSubDomains,
    confidence,
    presented, answered, skipped: Math.max(0, presented - answered),
    /* Accuracy over answered items only; the headline counts every item
       presented, which is the basis for classification. */
    answeredAccuracy,
    attemptCount: ordered.length,
    voided: [...voided.values()],
    rapidAnswers, rapidEnd, timedAnswers, violations,
    notReached, reached: presented - notReached, skippedViewed, speedProfile,
    scoredAgainst: `QAAPF bank v${QAAPF_BANK_VERSION}`,
  };
}

/* ══════════════════════════════════════════════════════════════════
   BLUEPRINT — the baseline paper
   ══════════════════════════════════════════════════════════════════
   Every paper has the same shape: an equal number of questions per
   domain, with easy, medium and hard questions in each, spread across
   the domain's sub-skills. Two papers built from the same blueprint
   are therefore comparable in coverage and difficulty mix.

   The baseline is a race against the clock: more than one question a
   minute, inside a 30–45 minute sitting.

   Paper lengths (questions per domain → questions, suggested time):
     4 → 32 questions, 30 min   1.07 a minute; shorter, less precise
     6 → 48 questions, 40 min   1.2 a minute; default, most precise
   On a shorter paper each score's likely range widens (about ±17 points
   at 50% on 32 questions, ±14 on 48) and each reporting area rests on 8
   rather than 12 questions. */
export const PAPER_SIZES = [4, 6];               // questions per domain
export const DEFAULT_PER_DOMAIN = 6;             // 48 questions, 40 minutes

/* Difficulty mixes.

   challenging (default from v4.1): 15% easy, 25% medium, 60% hard. Asked
     for by the aptitude trainers: on the balanced paper most students
     scored high and the ones genuinely behind did not stand out. The
     counts are fixed per reporting area (a pair of domains), so the four
     areas that decisions rest on are always equally hard; within a pair,
     which domain takes the extra hard item is drawn at random.
   balanced: equal easy, medium and hard in every domain (the v4.0 paper).

   Scores from the two mixes are not comparable — compare a cohort's
   start and end of term on the same mix. */
export const MIXES = {
  challenging: { id: "challenging", label: "Challenging", shares: { 1: 0.15, 2: 0.25, 3: 0.60 }, note: "15% easy · 25% medium · 60% hard" },
  balanced:    { id: "balanced",    label: "Balanced",    shares: null,                          note: "equal easy, medium and hard" },
};
export const DEFAULT_MIX = "challenging";

/* Easy/medium/hard counts for one reporting area (two domains of
   perDomain questions each) under a share-based mix. At least one easy
   question per area, so the weakest students still show something. */
export function clusterMix(perDomain, mixId = DEFAULT_MIX) {
  const mix = MIXES[mixId] || MIXES[DEFAULT_MIX];
  if (!mix.shares) { const d = difficultyMix(perDomain); return { 1: d[1] * 2, 2: d[2] * 2, 3: d[3] * 2 }; }
  const total = perDomain * 2;
  const e = Math.max(1, Math.round(total * mix.shares[1]));
  const m = Math.round(total * mix.shares[2]);
  return { 1: e, 2: m, 3: total - e - m };
}

/* Whole-paper counts, for labels. */
export function paperMix(perDomain, mixId = DEFAULT_MIX) {
  const c = clusterMix(perDomain, mixId), k = CLUSTERS.length;
  return { 1: c[1] * k, 2: c[2] * k, 3: c[3] * k, total: perDomain * DOMAINS.length };
}

export function difficultyMix(perDomain) {
  if (perDomain <= 3) return { 1: 1, 2: 1, 3: 1 };
  if (perDomain <= 4) return { 1: 1, 2: 2, 3: 1 };
  if (perDomain <= 6) return { 1: 2, 2: 2, 3: 2 };
  if (perDomain <= 8) return { 1: 2, 2: 3, 3: 3 };
  return { 1: 3, 2: 4, 3: 3 };
}

/* Race pacing: about 50 seconds a question (1.2 a minute), rounded to
   five minutes and kept inside the 30–45 minute window. Speed is part of
   what is measured, so students are told the pace up front and scoring
   separates questions not reached from questions answered wrongly. */
export const RACE_SECONDS_PER_QUESTION = 50;
export const MIN_MINUTES = 30, MAX_MINUTES = 45;
export const TIME_PRESETS = [30, 35, 40, 45];
/* Below this many seconds a question, many students will not reach the
   hard block and the difficulty profile rests on fewer questions. */
export const MIN_COMFORTABLE_SECONDS = 45;

export function minutesForCount(n) {
  const raw = Math.round((n * RACE_SECONDS_PER_QUESTION) / 60 / 5) * 5;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, raw));
}
/* Time allowed per question by difficulty. A balanced paper averages
   the race pace of 50 s; a hard-heavy paper gets more time, because a
   race that nobody can finish measures only speed. */
export const SECONDS_BY_LEVEL = { 1: 40, 2: 50, 3: 60 };
function minutesForLevels(counts) {
  const sec = [1, 2, 3].reduce((s, lv) => s + (counts[lv] || 0) * SECONDS_BY_LEVEL[lv], 0);
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(sec / 60 / 5) * 5));
}
/* Suggested minutes for a paper of `perDomain` questions per domain. */
export const suggestedMinutes = (perDomain, mixId = DEFAULT_MIX) => minutesForLevels(paperMix(perDomain, mixId));
/* Suggested minutes for an existing list of questions (bank items or rows). */
export function minutesForItems(items) {
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const it of items || []) {
    const lv = it?.lv ?? (it?.difficulty === "easy" ? 1 : it?.difficulty === "hard" ? 3 : 2);
    counts[lv]++;
  }
  return minutesForLevels(counts);
}

/* Seconds per question and questions per minute for a paper. */
export function paceOf(n, minutes) {
  if (!n || !minutes) return { secPerQuestion: null, perMinute: null, race: false, tight: false };
  const secPerQuestion = Math.round((minutes * 60) / n);
  const perMinute = Math.round((n / minutes) * 100) / 100;
  return { secPerQuestion, perMinute, race: n / minutes > 1, tight: secPerQuestion < MIN_COMFORTABLE_SECONDS };
}

/* Small seeded generator (mulberry32) so a paper can be rebuilt exactly. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWith(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Pick n items from one domain: the blueprint's difficulty mix, and
   within each tier the sub-skill used least so far, so a domain is not
   represented by four "Number Series" items. */
export function pickDomainItems(domId, n, rng = Math.random, mixCounts = null) {
  const pool = QAAPF_QUESTIONS.filter(q => q.d === domId);
  const mix = mixCounts || difficultyMix(n);
  const unitUse = new Map();
  const out = [];
  for (const lv of [1, 2, 3]) {
    let candidates = shuffleWith(pool.filter(q => q.lv === lv), rng);
    for (let k = 0; k < mix[lv] && candidates.length; k++) {
      candidates = candidates.slice().sort((a, b) => (unitUse.get(a.u) || 0) - (unitUse.get(b.u) || 0)); // stable: keeps shuffle order within ties
      const pick = candidates.shift();
      out.push(pick);
      unitUse.set(pick.u, (unitUse.get(pick.u) || 0) + 1);
    }
  }
  return out;
}

export function buildBlueprint(perDomain = DEFAULT_PER_DOMAIN, rng = Math.random, mixId = DEFAULT_MIX) {
  if (!MIXES[mixId]?.shares) return DOMAINS.flatMap(d => pickDomainItems(d.id, perDomain, rng));
  const out = [];
  for (const c of CLUSTERS) {
    const total = clusterMix(perDomain, mixId);
    /* Split the area's counts between its two domains: the first gets the
       larger half of the easy and medium questions, and the domain that
       goes first is drawn at random, so neither domain is always the
       harder one. */
    const [x, y] = rng() < 0.5 ? c.domains : [...c.domains].reverse();
    const ex = Math.ceil(total[1] / 2), mx = Math.ceil(total[2] / 2);
    const mixX = { 1: ex, 2: mx, 3: perDomain - ex - mx };
    const mixY = { 1: total[1] - ex, 2: total[2] - mx, 3: perDomain - (total[1] - ex) - (total[2] - mx) };
    const picked = { [x]: pickDomainItems(x, perDomain, rng, mixX), [y]: pickDomainItems(y, perDomain, rng, mixY) };
    out.push(...picked[c.domains[0]], ...picked[c.domains[1]]);
  }
  return out;
}

/* A short code that identifies the exact set of questions on a paper,
   so two sections can be confirmed to have sat the same form. */
export function formCode(ids) {
  const s = [...(ids || [])].map(String).sort().join(",");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(-5);
}

/* Order of questions on a baseline paper: easy, then medium, then hard,
   shuffled within each block. Weaker students meet questions they can
   do first, and neighbours still see different orders. */
export function difficultyRankOf(question) {
  const b = BANK_BY_STEM.get(norm(question?.question));
  if (b) return b.lv;
  return question?.difficulty === "easy" ? 1 : question?.difficulty === "hard" ? 3 : 2;
}

export function orderBaselinePaper(questions, rng = Math.random) {
  const blocks = { 1: [], 2: [], 3: [] };
  for (const q of questions || []) blocks[difficultyRankOf(q)].push(q);
  return [...shuffleWith(blocks[1], rng), ...shuffleWith(blocks[2], rng), ...shuffleWith(blocks[3], rng)];
}

/* ══════════════════════════════════════════════════════════════════
   QUESTION-BANK REPAIR
   ══════════════════════════════════════════════════════════════════
   Copies of built-in questions in a teacher's bank keep whatever text
   and key they had when imported. This lists the rows that differ from
   the verified bank and the patch that brings each one up to date. */
export function bankRowFor(item) {
  return {
    subject: "Aptitude", unit: item.u, topic: item.t, question: item.q,
    options: [...item.o], correct: item.c,
    difficulty: item.lv === 1 ? "easy" : item.lv === 2 ? "medium" : "hard", points: 1,
  };
}

export function isRowVerified(row, item) {
  return !!row && !!item
    && norm(row.question) === norm(item.q)
    && Array.isArray(row.options) && row.options.length === item.o.length
    && row.options.every((o, i) => o === item.o[i])
    && toIndex(row.correct) === item.c;
}

export function planBankRepairs(rows) {
  const repairs = [], retire = [];
  for (const row of rows || []) {
    const stem = norm(row?.question);
    const b = BANK_BY_STEM.get(stem);
    if (b) {
      const want = bankRowFor(b);
      const patch = {};
      if (!isRowVerified(row, b)) { patch.options = want.options; patch.correct = want.correct; }
      if (row.difficulty !== want.difficulty) patch.difficulty = want.difficulty;
      if ((row.unit || "") !== want.unit) patch.unit = want.unit;
      if ((row.topic || "") !== want.topic) patch.topic = want.topic;
      if (Object.keys(patch).length) repairs.push({ row, patch, item: b, reason: patch.options ? "answer key or options out of date" : "labels out of date" });
      continue;
    }
    const versions = LEGACY_BY_STEM.get(stem);
    if (versions) {
      const L = versions.find(v => v.sig === optionSig(row.options)) || versions[0];
      const next = L.next ? BANK_BY_ID.get(L.next) : null;
      if (next) {
        const want = bankRowFor(next);
        repairs.push({ row, patch: { question: want.question, options: want.options, correct: want.correct, difficulty: want.difficulty, unit: want.unit, topic: want.topic }, item: next, reason: L.status === "void" ? `faulty earlier version (${L.why})` : "earlier wording" });
      } else if (L.status === "void") {
        retire.push({ row, reason: L.why });
      }
    }
  }
  return { repairs, retire };
}
