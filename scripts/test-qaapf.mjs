/* Tests for the QAAPF scoring core.  Run: npm test
   No framework — plain assertions, so it runs anywhere Node 18+ does. */
import assert from "node:assert/strict";
import {
  QAAPF_QUESTIONS, QAAPF_LEGACY, DOMAINS, CLUSTERS,
  resolveItem, rekeyAttempt, computeQAAPFProfile, getQLevel,
  buildBlueprint, difficultyMix, makeRng, formCode, orderBaselinePaper, MIXES, DEFAULT_MIX, clusterMix, paperMix, explanationFor,
  PAPER_SIZES, DEFAULT_PER_DOMAIN, suggestedMinutes, minutesForItems, minutesForCount, paceOf, TIME_PRESETS,
  planBankRepairs, bankRowFor, isBaselineQuiz, selectProfileAttempts,
  binomUpperTail, wilson, reliableChange,
} from "../src/lib/qaapf-core.js";

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; }
  catch (e) { console.error(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; }
};
const byStem = s => QAAPF_QUESTIONS.find(q => q.q === s);
const attempt = (items, extra = {}) => ({ submitted_at: "2026-10-14T04:00:00Z", time_used_sec: 3600, violations: 0, items, ...extra });
const itemOf = (q, chosenText, extra = {}) => ({
  qid: extra.qid ?? null, question: q.q, options: extra.options ?? q.o,
  correct: extra.correct ?? q.c,
  chosen: chosenText === null ? null : (extra.options ?? q.o).indexOf(chosenText),
  ...extra.more,
});

/* ── Keys ───────────────────────────────────────────────────────── */
test("every bank item resolves to its own key", () => {
  for (const q of QAAPF_QUESTIONS) {
    const r = resolveItem({ question: q.q, options: q.o, correct: q.c }, null);
    assert.equal(r.void, undefined, q.id);
    assert.equal(r.key, q.c, q.id);
    assert.equal(r.meta.domain, q.d, q.id);
  }
});

test("key follows the answer text when a bank row stores options in another order", () => {
  const q = QAAPF_QUESTIONS[0];
  const opts = [...q.o].reverse();
  const r = resolveItem({ question: q.q, options: opts, correct: 0 }, null);
  assert.equal(opts[r.key], q.o[q.c]);
});

test("a stored key never overrides the verified key (stale row or tampered attempt)", () => {
  const q = QAAPF_QUESTIONS[10];
  const wrong = (q.c + 1) % 4;
  const p = computeQAAPFProfile([attempt([itemOf(q, q.o[wrong], { correct: wrong })])], null);
  assert.equal(p.totalCorrect, 0);
});

test("v3 wrong-key items are re-keyed by answer text", () => {
  // Deployed v3 versions: same wording and options as v4, wrong key.
  const v3 = [
    { q: "Solve: 18 ÷ 3 + 4 × 2 − 5", o: ["9", "11", "13", "7"], c: 1, right: "9" },
    { q: "Test scores: 45,60,55,70,65,80,50. The median score:", o: ["60", "65", "55", "62"], c: 1, right: "60" },
    { q: "What is the place value of 7 in 4,72,893?", o: ["Thousands", "Ten-thousands", "Hundreds", "Lakhs"], c: 0, right: "Ten-thousands" },
  ];
  for (const v of v3) {
    const r = resolveItem({ question: v.q, options: v.o, correct: v.c }, null);
    assert.equal(v.o[r.key], v.right, v.q);
  }
});

test("faulty earlier versions are void, not wrong", () => {
  const voids = QAAPF_LEGACY.filter(l => l.status === "void");
  assert.ok(voids.length >= 25);
  for (const l of voids) {
    const r = resolveItem({ question: l.q, options: l.o, correct: 0 }, null);
    assert.equal(r.void, true, l.q);
  }
  const l = voids[0];
  const p = computeQAAPFProfile([attempt([{ question: l.q, options: l.o, correct: 0, chosen: 1 }])], null);
  assert.equal(p.presented, 0);
  assert.equal(p.voided.length, 1);
});

test("sound earlier wordings still score, against their own answer", () => {
  for (const l of QAAPF_LEGACY.filter(x => x.status === "ok")) {
    const r = resolveItem({ question: l.q, options: l.o, correct: 0 }, null);
    assert.equal(l.o[r.key], l.a, l.q);
  }
});

test("teacher questions use the bank row's current key", () => {
  const row = { id: 991, question: "Teacher: 2 + 2 = ?", options: ["3", "4", "5", "6"], correct: 1, unit: "Percentages", topic: "Percentages", difficulty: "easy" };
  const it = { qid: 991, question: row.question, options: row.options, correct: 0, chosen: 1 };   // stored key was wrong
  const p = computeQAAPFProfile([attempt([it])], [row]);
  assert.equal(p.totalSeen, 1);
  assert.equal(p.totalCorrect, 1);
  assert.equal(p.domainProfiles.find(d => d.id === "B").total, 1);
});

test("rekeyAttempt reports changes and recomputes the percentage", () => {
  const v = { question: "Solve: 18 ÷ 3 + 4 × 2 − 5", options: ["9", "11", "13", "7"], correct: 1, chosen: 0 };
  const rk = rekeyAttempt(attempt([v]), null);
  assert.equal(rk.items[0].correct, 0);
  assert.equal(rk.rekey.changed, true);
  assert.equal(rk.rekey.percent, 100);
});

/* ── Profile ────────────────────────────────────────────────────── */
const fullPaper = (rightShare, rng = makeRng(7)) => {
  const bp = buildBlueprint(6, rng);
  return bp.map((q, i) => itemOf(q, i < Math.round(bp.length * rightShare) ? q.o[q.c] : q.o[(q.c + 1) % 4], { more: { sec: 60 } }));
};

test("a perfect 48-item paper scores 100%, Q6, high confidence", () => {
  const p = computeQAAPFProfile([attempt(fullPaper(1))], null);
  assert.equal(p.totalSeen, 48);
  assert.equal(p.overallPct, 100);
  assert.equal(p.overallLevel.level, "Q6");
  assert.equal(p.confidence.band, "High");
  for (const c of p.clusterProfiles) { assert.equal(c.total, 12); assert.equal(c.reliable, true); }
  for (const d of p.domainProfiles) { assert.equal(d.total, 6); assert.equal(d.reliable, true); }
});

test("headline is the plain percentage correct, with a likely range", () => {
  const items = fullPaper(0.5);
  const p = computeQAAPFProfile([attempt(items)], null);
  assert.equal(p.overallPct, 50);
  assert.ok(p.overallRange[0] < 50 && p.overallRange[1] > 50);
});

test("first response per question counts; later attempts do not overwrite it", () => {
  const q = QAAPF_QUESTIONS[5];
  const first = attempt([itemOf(q, q.o[(q.c + 1) % 4])], { submitted_at: "2026-10-01" });
  const later = attempt([itemOf(q, q.o[q.c])], { submitted_at: "2026-10-05" });
  const p = computeQAAPFProfile([later, first], null);
  assert.equal(p.totalSeen, 1);
  assert.equal(p.totalCorrect, 0);
});

test("guessing-level accuracy is flagged; clear performance is not", () => {
  const guess = computeQAAPFProfile([attempt(fullPaper(0.27))], null);
  assert.equal(guess.confidence.factors.find(f => f.label === "Above chance").status, "weak");
  const clear = computeQAAPFProfile([attempt(fullPaper(0.7))], null);
  assert.equal(clear.confidence.factors.find(f => f.label === "Above chance").status, "good");
});

test("rapid answers and integrity flags lower confidence", () => {
  const items = fullPaper(0.8).map(it => ({ ...it, sec: 2 }));
  const p = computeQAAPFProfile([attempt(items, { violations: 5 })], null);
  assert.equal(p.confidence.factors.find(f => f.label === "Rapid answers").status, "weak");
  assert.equal(p.confidence.factors.find(f => f.label === "Session integrity").status, "weak");
  assert.notEqual(p.confidence.band, "High");
});

test("bands: cut-points unchanged from v3", () => {
  assert.equal(getQLevel(24).level, "Q1");
  assert.equal(getQLevel(25).level, "Q2");
  assert.equal(getQLevel(59).level, "Q3");
  assert.equal(getQLevel(60).level, "Q4");
  assert.equal(getQLevel(90).level, "Q6");
  assert.equal(getQLevel(null), null);
});

/* ── Blueprint ─────────────────────────────────────────────────── */
test("timing: the default is 40 questions in 45 minutes; suggestions stay 30–45 min", () => {
  assert.deepEqual(PAPER_SIZES.map(n => n * DOMAINS.length), [32, 40, 48]);
  assert.equal(DEFAULT_PER_DOMAIN * DOMAINS.length, 40);
  assert.equal(DEFAULT_MIX, "challenging");
  assert.deepEqual(PAPER_SIZES.map(n => suggestedMinutes(n, "balanced")), [30, 40, 45]);
  assert.deepEqual(PAPER_SIZES.map(n => suggestedMinutes(n, "challenging")), [35, 45, 45]);
  assert.equal(minutesForItems(buildBlueprint(5, makeRng(5))), 45);
  for (const n of [10, 24, 32, 48, 64, 80, 200]) { const m = minutesForCount(n); assert.ok(m >= 30 && m <= 45, `${n} → ${m}`); }
  for (const per of PAPER_SIZES) for (const m of Object.keys(MIXES)) {
    const s = suggestedMinutes(per, m) * 60 / (per * 8);
    assert.ok(s >= 50 && s <= 90, `${per}/${m}: ${s} s a question`);
  }
  assert.deepEqual(TIME_PRESETS, [30, 35, 40, 45]);
  const p = paceOf(48, 40);
  assert.equal(p.secPerQuestion, 50); assert.equal(p.perMinute, 1.2); assert.equal(p.tight, false);
  assert.equal(paceOf(48, 30).tight, true);
  assert.equal(paceOf(32, 40).race, false);
});

/* ── Timed papers ───────────────────────────────────────────────── */
const timedPaper = ({ reached = 48, endGuesses = 0, scatteredRapid = 0, accuracy = 0.75 }) => {
  const bp = orderBaselinePaper(buildBlueprint(6, makeRng(21), "balanced").map(b => ({ ...bankRowFor(b), _b: b })), makeRng(4)).map(r => r._b);
  let rightLeft = Math.round(reached * accuracy);
  return bp.map((q, pos) => {
    if (pos >= reached + endGuesses) return itemOf(q, null, { more: { sec: 0, pos } });           // never reached
    if (pos >= reached) return itemOf(q, q.o[(q.c + 1) % 4], { more: { sec: 2, pos } });         // guessed as time ran out
    const right = rightLeft-- > 0;
    const sec = pos < scatteredRapid ? 2 : 45;
    return itemOf(q, right ? q.o[q.c] : q.o[(q.c + 1) % 4], { more: { sec, pos } });
  });
};

test("not-reached questions score zero but are not counted as skipped", () => {
  const p = computeQAAPFProfile([attempt(timedPaper({ reached: 36 }))], null);
  assert.equal(p.presented, 48);
  assert.equal(p.notReached, 12);
  assert.equal(p.skippedViewed, 0);
  assert.equal(p.overallPct, Math.round((27 / 48) * 100));
  assert.equal(p.confidence.factors.find(f => f.label === "Completion").status, "good");
  assert.equal(p.confidence.factors.find(f => f.label === "Speed").status, "ok");
  assert.equal(p.speedProfile.label, "Accurate but slow");
});

test("difficulty profile uses questions reached", () => {
  const p = computeQAAPFProfile([attempt(timedPaper({ reached: 32 }))], null);
  const hard = p.difficultyProfile.find(d => d.level === 3);
  assert.equal(hard.total + hard.notReached, 16);
  assert.ok(hard.notReached >= 15, "the hard block comes last on a baseline paper");
});

test("end-of-time guesses are not counted as rapid guessing; scattered ones are", () => {
  const end = computeQAAPFProfile([attempt(timedPaper({ reached: 36, endGuesses: 12 }))], null);
  assert.equal(end.rapidEnd, 12);
  assert.equal(end.confidence.factors.find(f => f.label === "Rapid answers").status, "good");
  const scattered = computeQAAPFProfile([attempt(timedPaper({ reached: 48, scatteredRapid: 14 }))], null);
  assert.equal(scattered.confidence.factors.find(f => f.label === "Rapid answers").status, "weak");
});

test("speed and accuracy labels", () => {
  assert.equal(computeQAAPFProfile([attempt(timedPaper({ reached: 48, accuracy: 0.8 }))], null).speedProfile.label, "Quick and accurate");
  assert.equal(computeQAAPFProfile([attempt(timedPaper({ reached: 48, accuracy: 0.4 }))], null).speedProfile.label, "Quick but error-prone");
  assert.equal(computeQAAPFProfile([attempt(timedPaper({ reached: 30, accuracy: 0.4 }))], null).speedProfile.label, "Slow and error-prone");
});

test("balanced blueprint: equal items per domain, fixed difficulty mix, no repeats", () => {
  for (const per of [...PAPER_SIZES, 8, 10]) {
    const bp = buildBlueprint(per, makeRng(per), "balanced");
    assert.equal(bp.length, per * DOMAINS.length);
    assert.equal(new Set(bp.map(q => q.id)).size, bp.length);
    const mix = difficultyMix(per);
    for (const d of DOMAINS) {
      const mine = bp.filter(q => q.d === d.id);
      assert.equal(mine.length, per);
      for (const lv of [1, 2, 3]) assert.equal(mine.filter(q => q.lv === lv).length, mix[lv], `${d.id} lv${lv}`);
      assert.ok(mine.filter(q => q.lv === 1).length >= 1 && mine.filter(q => q.lv === 3).length >= 1, "every domain has an easy and a hard item");
      if (per >= 6) assert.ok(mine.filter(q => q.lv === 3).length >= 2, "two hard items so the domain ceiling can reach Hard");
    }
  }
});

test("challenging blueprint: 15/25/60 overall, hard shared evenly, one CAT-level item per area, last on the paper", () => {
  assert.deepEqual((({ 1: e, 2: m, 3: h, cat }) => [e, m, h, cat])(paperMix(5)), [6, 10, 24, 4]);
  assert.deepEqual((({ 1: e, 2: m, 3: h }) => [e, m, h])(paperMix(4)), [5, 8, 19]);
  assert.deepEqual((({ 1: e, 2: m, 3: h }) => [e, m, h])(paperMix(6)), [7, 12, 29]);
  for (let seed = 1; seed <= 60; seed++) for (const per of PAPER_SIZES) {
    const bp = buildBlueprint(per, makeRng(seed * 13 + per));
    const want = paperMix(per);
    assert.equal(bp.length, per * DOMAINS.length);
    assert.equal(new Set(bp.map(q => q.id)).size, bp.length);
    for (const d of DOMAINS) assert.equal(bp.filter(q => q.d === d.id).length, per, `${d.id} count`);
    for (const lv of [1, 2, 3]) assert.equal(bp.filter(q => q.lv === lv).length, want[lv], `lv${lv} seed ${seed}`);
    const hardPerArea = CLUSTERS.map(c => bp.filter(q => c.domains.includes(q.d) && q.lv === 3).length);
    assert.ok(Math.max(...hardPerArea) - Math.min(...hardPerArea) <= 1, `hard per area ${hardPerArea}`);
    for (const c of CLUSTERS) assert.equal(bp.filter(q => c.domains.includes(q.d) && q.k === "cat").length, 1, `${c.id} CAT`);
    const ordered = orderBaselinePaper(bp.map(b => ({ ...bankRowFor(b), _b: b })), makeRng(seed)).map(r => r._b);
    assert.ok(ordered.slice(-4).every(q => q.k === "cat"), "CAT-level questions come last");
    assert.ok(ordered.slice(0, want[1]).every(q => q.lv === 1), "easy questions come first");
  }
});

test("balanced papers never include CAT-level items", () => {
  for (let seed = 1; seed <= 20; seed++) for (const per of PAPER_SIZES) assert.ok(!buildBlueprint(per, makeRng(seed), "balanced").some(q => q.k === "cat"));
});

test("the hard pool in every domain can fill several different challenging papers", () => {
  for (const d of DOMAINS) {
    const hard = QAAPF_QUESTIONS.filter(q => q.d === d.id && q.lv === 3 && q.k !== "cat").length;
    const cat = QAAPF_QUESTIONS.filter(q => q.d === d.id && q.k === "cat").length;
    assert.ok(hard >= 12, `${d.id} has only ${hard} hard items`);
    assert.ok(cat >= 4, `${d.id} has only ${cat} CAT-level items`);
  }
});

test("every reasoning item and every v4.1 item has an explanation", () => {
  for (const q of QAAPF_QUESTIONS) {
    if (q.d === "F") assert.ok(q.x && q.x.length > 20, `${q.id} has no explanation`);
  }
  const added = QAAPF_QUESTIONS.filter(q => q.x && q.d !== "F");
  assert.ok(added.length >= 50, "new hard items carry explanations");
  const f = QAAPF_QUESTIONS.find(q => q.id === "F084") || QAAPF_QUESTIONS.find(q => q.d === "F" && q.x);
  assert.equal(explanationFor(f.q), f.x);
  assert.equal(explanationFor("Teacher's own question"), null);
});

test("new papers take questions not used on earlier papers first, keeping the spread", () => {
  const first = buildBlueprint(6, makeRng(101));
  const exposed = new Set(first.map(b => b.id));
  const second = buildBlueprint(6, makeRng(202), DEFAULT_MIX, exposed);
  const repeats = second.filter(b => exposed.has(b.id)).length;
  assert.ok(repeats <= 6, `${repeats} repeats on the second paper`);
  const control = buildBlueprint(6, makeRng(202));
  assert.ok(repeats < control.filter(b => exposed.has(b.id)).length || repeats === 0, "exposure control lowers repeats");
  for (const d of DOMAINS) {
    const k = {}; for (const q of second.filter(x => x.d === d.id)) k[q.u] = (k[q.u] || 0) + 1;
    assert.ok(Math.max(...Object.values(k)) <= 2, `${d.id} spread`);
  }
  const want = paperMix(6);
  for (const lv of [1, 2, 3]) assert.equal(second.filter(q => q.lv === lv).length, want[lv]);
});

test("blueprint spreads each domain across its sub-skills", () => {
  for (let seed = 1; seed <= 25; seed++) {
    const bp = buildBlueprint(6, makeRng(seed));
    for (const d of DOMAINS) {
      const counts = {};
      for (const q of bp.filter(x => x.d === d.id)) counts[q.u] = (counts[q.u] || 0) + 1;
      assert.ok(Math.max(...Object.values(counts)) <= 2, `${d.id} seed ${seed}: ${JSON.stringify(counts)}`);
    }
  }
});

test("form code identifies the question set, not its order", () => {
  assert.equal(formCode([3, 1, 2]), formCode([1, 2, 3]));
  assert.notEqual(formCode([1, 2, 3]), formCode([1, 2, 4]));
});

test("baseline papers run easy → medium → hard", () => {
  const rows = buildBlueprint(6, makeRng(3)).map(bankRowFor);
  const ordered = orderBaselinePaper(rows, makeRng(9));
  const rank = { easy: 1, medium: 2, hard: 3 };
  for (let i = 1; i < ordered.length; i++) assert.ok(rank[ordered[i - 1].difficulty] <= rank[ordered[i].difficulty]);
});

/* ── Bank repair ───────────────────────────────────────────────── */
test("bank repair: stale built-in rows are patched, verified rows left alone", () => {
  const q = byStem("Solve: 18 ÷ 3 + 4 × 2 − 5");
  const stale = { id: 1, question: q.q, options: ["9", "11", "13", "7"], correct: 1, unit: q.u, topic: q.t, difficulty: "easy" };
  const fresh = { id: 2, ...bankRowFor(QAAPF_QUESTIONS[0]) };
  const { repairs } = planBankRepairs([stale, fresh]);
  assert.equal(repairs.length, 1);
  assert.equal(repairs[0].row.id, 1);
  assert.equal(repairs[0].patch.options[repairs[0].patch.correct], "9");
});

test("bank repair: a faulty old wording is replaced by its successor", () => {
  const old = QAAPF_LEGACY.find(l => l.status === "void" && l.next);
  const { repairs } = planBankRepairs([{ id: 7, question: old.q, options: old.o, correct: 0, unit: old.u, topic: old.t }]);
  assert.equal(repairs.length, 1);
  assert.equal(repairs[0].patch.question, QAAPF_QUESTIONS.find(q => q.id === old.next).q);
});

/* ── Baseline selection and statistics ─────────────────────────── */
test("baseline quizzes are recognised and preferred", () => {
  const quizzes = [{ id: "b", title: "Aptitude Baseline — MBA A · Form X" }, { id: "p", title: "Week 3 practice" }];
  assert.ok(isBaselineQuiz(quizzes[0]) && !isBaselineQuiz(quizzes[1]));
  const atts = [{ quiz_id: "b" }, { quiz_id: "p" }];
  assert.equal(selectProfileAttempts(atts, quizzes).attempts.length, 1);
  assert.equal(selectProfileAttempts(atts, quizzes, "all").attempts.length, 2);
  assert.equal(selectProfileAttempts([{ quiz_id: "p" }], quizzes).source, "all");
});

test("binomial tail, Wilson interval and reliable change", () => {
  assert.ok(Math.abs(binomUpperTail(10, 40, 0.25) - 0.5605) < 0.001);
  assert.equal(binomUpperTail(0, 10, 0.3), 1);
  const [lo, hi] = wilson(30, 48);
  assert.ok(lo < 62.5 && hi > 62.5);
  assert.equal(reliableChange(24, 48, 26, 48).status, "within-error");
  assert.equal(reliableChange(20, 48, 38, 48).status, "improved");
});

test("clusters partition the domains", () => {
  const all = CLUSTERS.flatMap(c => c.domains).sort().join("");
  assert.equal(all, DOMAINS.map(d => d.id).sort().join(""));
});

console.log(`${passed} tests passed${process.exitCode ? ", some failed" : ""}.`);
