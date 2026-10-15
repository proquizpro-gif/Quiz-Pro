/* ══════════════════════════════════════════════════════════════════
   QAAPF — Quantitative & Analytical Aptitude Proficiency Framework
   Faculty panel: baseline generator, results, profiles, heatmap,
   question bank, accreditation evidence and the framework reference.

   The numbers come from src/lib/qaapf-core.js and the questions from
   src/lib/qaapf-bank.js; this file only presents them.
   ══════════════════════════════════════════════════════════════════ */

import { useState, useMemo } from "react";
import {
  Brain, BarChart2, FileDown, Layers, Target, ShieldCheck, Wrench,
  CheckCircle2, Users, Sparkles, RefreshCw, Plus, AlertTriangle, Info,
} from "lucide-react";
import { card, cardH, btnP, btnG, inp, num, Badge, Empty, Toast } from "./ui.jsx";
import { downloadCSV } from "../lib/csv.js";
import { insertQuestions, insertQuiz, updateQuestionSafe } from "../lib/db.js";
import { useAuth } from "../lib/AuthContext.jsx";
import QAAPFEvidence from "./QAAPFEvidence.jsx";
import QAAPF2 from "./QAAPF2.jsx";
import {
  QAAPF_QUESTIONS, QAAPF_LEGACY, QAAPF_BANK_VERSION, QAAPF_BANK_DATE,
  Q_LEVELS, DOMAINS, CLUSTERS, CLUSTER_RELIABLE_MIN, RAPID_SECONDS, diffLabel,
  computeQAAPFProfile, selectProfileAttempts, isBaselineQuiz, BASELINE_TITLE_PREFIX,
  PAPER_SIZES, DEFAULT_PER_DOMAIN, difficultyMix, buildBlueprint, MIXES, DEFAULT_MIX, clusterMix, paperMix, exposedItemIds, formCode, suggestedMinutes, minutesForItems,
  paceOf, TIME_PRESETS, RACE_SECONDS_PER_QUESTION,
  bankRowFor, isRowVerified, planBankRepairs, verifiedItemFor, norm,
} from "../lib/qaapf-core.js";

/* Kept so existing imports (App.jsx and older components) still work. */
export {
  Q_LEVELS, getQLevel, DOMAINS, CLUSTERS, QAAPF_QUESTIONS, RELIABLE_MIN,
  COGNITIVE, cognitiveOf, computeQAAPFProfile, computeConfidence,
} from "../lib/qaapf-core.js";

const diffTone = v => (v === 1 ? "emerald" : v === 2 ? "amber" : "rose");
const pctTone = p => (p === null || p === undefined ? "text-slate-300" : p >= 70 ? "text-emerald-600" : p >= 50 ? "text-amber-600" : "text-rose-600");
const pctBar = p => (p >= 70 ? "bg-emerald-500" : p >= 50 ? "bg-amber-400" : "bg-rose-500");
const rangeText = r => (r ? `${r[0]}–${r[1]}%` : "");

/* ══════════════════════════════════════════════════════════════════
   MAIN QAAPF PANEL (faculty view)
   ══════════════════════════════════════════════════════════════════ */
export default function QAAPFPanel({ attempts, classrooms, questions, quizzes, setQuizzes, setQuestions }) {
  const [tab, setTab] = useState("baseline");
  const [toast, setToast] = useState(null);
  const [source, setSource] = useState("auto");
  const toast2 = (m, t = "emerald") => { setToast({ m, t }); setTimeout(() => setToast(null), 4500); };

  /* One definition of "baseline" for every tab below: attempts on
     baseline papers when there are any, otherwise every attempt. */
  const sel = useMemo(() => selectProfileAttempts(attempts, quizzes, source), [attempts, quizzes, source]);

  const TABS = [
    ["baseline",  "Baseline test"],
    ["dashboard", "Results"],
    ["profile2",  "Student profiles"],
    ["cohort",    "Heatmap"],
    ["bank",      "Question bank"],
    ["accredit",  "Accreditation"],
    ["levels",    "Framework"],
  ];
  const showsProfiles = ["dashboard", "profile2", "cohort"].includes(tab);

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.m} tone={toast.t} onDismiss={() => setToast(null)} />}

      <div className={`${card} overflow-hidden`}>
        <div className="bg-gradient-to-r from-violet-700 to-indigo-700 px-6 py-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-white"><Brain size={20} /> QAAPF</h2>
              <p className="mt-0.5 text-sm text-violet-200">Quantitative &amp; Analytical Aptitude Proficiency Framework</p>
              <p className="mt-1 text-[11px] text-violet-300">
                8 domains in 4 reporting areas · 6 proficiency bands · {QAAPF_QUESTIONS.length} verified questions · bank v{QAAPF_BANK_VERSION}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TABS.map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${tab === t ? "bg-white text-violet-700" : "bg-white/10 text-white hover:bg-white/20"}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>
        {showsProfiles && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[11px] text-slate-600">
            <span className="font-bold uppercase tracking-wide text-slate-400">Scored from</span>
            {[
              ["auto", sel.baselineCount ? `Baseline papers (${sel.baselineCount} attempt${sel.baselineCount === 1 ? "" : "s"})` : "All quizzes — no baseline paper sat yet"],
              ["all", "All quizzes with QAAPF questions"],
            ].map(([k, label]) => (
              <button key={k} onClick={() => setSource(k)} className={`rounded-lg border px-2.5 py-1 font-semibold transition ${source === k ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>{label}</button>
            ))}
            <span className="ml-auto text-slate-400">Every question is scored against the verified v{QAAPF_BANK_VERSION} key; faulty earlier items are withdrawn.</span>
          </div>
        )}
      </div>

      {tab === "baseline"  && <BaselineGenerator questions={questions} setQuestions={setQuestions} quizzes={quizzes} setQuizzes={setQuizzes} classrooms={classrooms} attempts={attempts} onDone={toast2} goResults={() => setTab("dashboard")} />}
      {tab === "dashboard" && <Dashboard attempts={sel.attempts} questions={questions} />}
      {tab === "profile2"  && <QAAPF2 attempts={sel.attempts} questions={questions} />}
      {tab === "cohort"    && <CohortHeatmap attempts={sel.attempts} questions={questions} />}
      {tab === "bank"      && <QuestionInventory questions={questions} setQuestions={setQuestions} toast2={toast2} />}
      {tab === "accredit"  && <QAAPFEvidence attempts={attempts} questions={questions} quizzes={quizzes} classrooms={classrooms} />}
      {tab === "levels"    && <LevelsGuide />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BASELINE GENERATOR
   ══════════════════════════════════════════════════════════════════
   Builds one paper from the fixed blueprint, makes sure every question
   on it is the verified version in the question bank (repairing or
   adding rows as needed), and creates a one-attempt quiz. A paper can
   be reused for other sections so a cohort sits the same form. */
function BaselineGenerator({ questions, setQuestions, quizzes, setQuizzes, classrooms, attempts, onDone, goResults }) {
  const { user } = useAuth();
  const rooms = useMemo(() => (classrooms || []).filter(c => !c.is_archived), [classrooms]);
  const forms = useMemo(() => (quizzes || []).filter(q => isBaselineQuiz(q) && Array.isArray(q.question_ids) && q.question_ids.length), [quizzes]);

  const [classroomId, setClassroomId] = useState(rooms[0]?.id || "");
  const [paper, setPaper]             = useState("new");            // "new" | id of an existing baseline quiz
  const [perDomain, setPerDomain]     = useState(DEFAULT_PER_DOMAIN);
  const [mixId, setMixId]             = useState(DEFAULT_MIX);
  const [minutesEdited, setMinutesEdited] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [busy, setBusy]               = useState(false);
  const [created, setCreated]         = useState(null);
  const [copied, setCopied]           = useState(false);

  const template = paper === "new" ? null : forms.find(f => f.id === paper) || null;
  const totalQ = template ? template.question_ids.length : perDomain * DOMAINS.length;
  const templateItems = useMemo(() => {
    if (!template) return null;
    const rowById = new Map(questions.map(r => [r.id, r]));
    return template.question_ids.map(id => rowById.get(id)).filter(Boolean).map(r => verifiedItemFor(r.question) || r);
  }, [template, questions]);
  const suggested = template ? minutesForItems(templateItems) : suggestedMinutes(perDomain, mixId);
  const minutes = minutesEdited ?? (template ? Math.round((template.duration_sec || 0) / 60) || suggested : suggested);
  const areaMix = clusterMix(perDomain, mixId);
  const whole = paperMix(perDomain, mixId);
  const pct = n => Math.round((n / whole.total) * 100);
  const pace = paceOf(totalQ, minutes);
  /* Questions already used on this institution's earlier baseline papers.
     New papers take unseen questions first. */
  const exposed = useMemo(() => exposedItemIds(forms, questions), [forms, questions]);

  /* Make sure each bank item on the paper exists in the question bank in
     its verified form. Reuse a verified row; repair a stale copy; add a
     fresh row when neither works. Returns the row ids in paper order. */
  const ensureVerifiedRows = async (items) => {
    const byStem = new Map();
    for (const r of questions) {
      const k = norm(r.question);
      if (!byStem.has(k)) byStem.set(k, []);
      byStem.get(k).push(r);
    }
    const ids = new Array(items.length).fill(null);
    const toInsert = [];
    const updated = [];
    let repaired = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const rows = byStem.get(norm(it.q)) || [];
      const ok = rows.find(r => isRowVerified(r, it));
      if (ok) { ids[i] = ok.id; continue; }
      const stale = rows[0];
      if (stale) {
        const want = bankRowFor(it);
        try {
          const row = await updateQuestionSafe(stale.id, { options: want.options, correct: want.correct, difficulty: want.difficulty, unit: want.unit, topic: want.topic });
          if (row) { ids[i] = row.id; updated.push(row); repaired++; continue; }
        } catch (_) { /* another teacher's row, or no permission: add our own copy below */ }
      }
      toInsert.push(i);
    }
    let inserted = [];
    if (toInsert.length) {
      inserted = await insertQuestions(toInsert.map(i => bankRowFor(items[i])));
      const byText = new Map(inserted.map(r => [norm(r.question), r]));
      toInsert.forEach(i => { ids[i] = byText.get(norm(items[i].q))?.id ?? null; });
    }
    if (updated.length || inserted.length) {
      const upd = new Map(updated.map(r => [r.id, r]));
      setQuestions(prev => [...prev.map(r => upd.get(r.id) || r), ...inserted]);
    }
    return { ids, repaired, added: inserted.length };
  };

  const generate = async () => {
    if (!classroomId && rooms.length) { onDone("Pick a classroom first.", "amber"); return; }
    setBusy(true);
    try {
      let items, extraIds = [];
      if (template) {
        /* Same paper as an existing form. Built-in questions are re-checked
           against the verified bank; anything else is reused as it is. */
        const rowById = new Map(questions.map(r => [r.id, r]));
        items = [];
        for (const id of template.question_ids) {
          const row = rowById.get(id);
          const b = row ? verifiedItemFor(row.question) : null;
          if (b) items.push(b); else if (row) extraIds.push(id);
        }
      } else {
        items = buildBlueprint(perDomain, Math.random, mixId, exposed);
      }

      const { ids, repaired, added } = await ensureVerifiedRows(items);
      const questionIds = [...ids.filter(Boolean), ...extraIds];
      if (questionIds.length < items.length) throw new Error("Some questions could not be saved to the bank. Check your connection and try again.");

      const code = formCode([...items.map(b => b.id), ...extraIds.map(id => `row:${id}`)]);

      const room = rooms.find(r => r.id === classroomId);
      const quiz = await insertQuiz({
        title: `${BASELINE_TITLE_PREFIX} — ${room ? room.name + (room.section ? " " + room.section : "") : "Cohort"} · Form ${code}`,
        subject: "Aptitude",
        purpose: "baseline",
        week: 1,
        units: Array.from(new Set(items.map(b => b.u))),
        question_ids: questionIds,
        draw_count: questionIds.length,
        duration_sec: Number(minutes) * 60,
        max_attempts: 1,
        classroom_id: classroomId || null,
        is_open: true,
        show_answers_policy: showAnswers ? "after_close" : "never",
        created_by: user.id,
      });
      setQuizzes(prev => [...prev, quiz]);
      setCreated({ quiz, link: `${window.location.origin}?quiz=${quiz.id}`, code, repaired, added, fresh: template ? null : items.filter(b => !exposed.has(b.id)).length });
      onDone(`Baseline created — ${questionIds.length} questions · Form ${code}.`);
    } catch (e) {
      onDone(e.message || "Could not create the baseline test.", "rose");
    }
    setBusy(false);
  };

  const copyLink = async () => {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.link); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* clipboard blocked */ }
  };

  const baselineIds = new Set(forms.map(q => q.id));
  const baselineTakers = new Set((attempts || []).filter(a => baselineIds.has(a.quiz_id)).map(a => a.user_id)).size;

  if (created) {
    return (
      <div className={`${card} space-y-5 p-6`}>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><CheckCircle2 size={22} /></div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Baseline test is live</h3>
            <p className="text-xs text-slate-500">"{created.quiz.title}" · {created.quiz.question_ids.length} questions · {Math.round(created.quiz.duration_sec / 60)} min ({paceOf(created.quiz.question_ids.length, created.quiz.duration_sec / 60).secPerQuestion} s a question) · one attempt</p>
          </div>
        </div>

        <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
          <p className="mb-1 text-xs font-semibold text-violet-700">Share this link with students</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-600">{created.link}</code>
            <button onClick={copyLink} className={btnP}>{copied ? <><CheckCircle2 size={14} /> Copied</> : "Copy link"}</button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-violet-600">
            Questions run from easier to harder, in a different order for each student within each block, with options shuffled.
            {created.quiz.show_answers_policy === "never" ? " Students see their score but not the answers, so the paper stays usable for other sections and the end-of-term check." : " Answers are shown to students after the quiz closes."}
          </p>
        </div>

        <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><div className="text-[10px] font-bold uppercase text-slate-400">Form</div><div className={`${num} text-sm font-bold text-slate-900`}>{created.code}</div></div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><div className="text-[10px] font-bold uppercase text-slate-400">Bank copies repaired</div><div className={`${num} text-sm font-bold text-slate-900`}>{created.repaired}</div></div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><div className="text-[10px] font-bold uppercase text-slate-400">Questions added to bank</div><div className={`${num} text-sm font-bold text-slate-900`}>{created.added}</div></div>
          {created.fresh !== null && created.fresh !== undefined && <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 sm:col-span-3"><div className="text-[10px] font-bold uppercase text-slate-400">Not on any earlier paper</div><div className={`${num} text-sm font-bold text-slate-900`}>{created.fresh} of {created.quiz.question_ids.length}</div></div>}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setPaper(created.quiz.id); setCreated(null); }} className={btnG}><Layers size={14} /> Same paper for another section</button>
          <button onClick={goResults} className={btnG}><BarChart2 size={14} /> View results</button>
          <button onClick={() => { setPaper("new"); setCreated(null); }} className={btnG}><RefreshCw size={14} /> New paper</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${card} p-5`}>
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600"><Target size={20} /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Generate a diagnostic baseline test</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              One paper built to a fixed blueprint: the same number of questions in each of the 8 domains and the same mix of easy, medium
              and hard in each of the 4 reporting areas, spread across sub-skills. Every question is checked against the verified bank before the quiz is created.
            </p>
          </div>
        </div>

        {baselineTakers > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <CheckCircle2 size={14} /> {baselineTakers} student{baselineTakers === 1 ? " has" : "s have"} already completed a baseline. See Results for their profiles.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Classroom</label>
            <select className={inp} value={classroomId} onChange={e => setClassroomId(e.target.value)}>
              {rooms.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` · ${c.section}` : ""}{c.year ? ` (${c.year})` : ""}</option>)}
              {!rooms.length && <option value="">— create a classroom first —</option>}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Paper</label>
            <select className={inp} value={paper} onChange={e => { setPaper(e.target.value); setMinutesEdited(null); }}>
              <option value="new">New paper from the verified bank</option>
              {forms.map(f => <option key={f.id} value={f.id}>Same paper as: {f.title} ({f.question_ids.length} Q)</option>)}
            </select>
            <p className="mt-1 text-[10px] text-slate-400">Give every section of a cohort the same paper so their results can be compared.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Paper length</label>
            <select className={inp} value={perDomain} disabled={!!template} onChange={e => { setPerDomain(Number(e.target.value)); setMinutesEdited(null); }}>
              {PAPER_SIZES.map(n => {
                const m = paperMix(n, mixId);
                const pc = paceOf(n * DOMAINS.length, suggestedMinutes(n, mixId));
                const label = n === DEFAULT_PER_DOMAIN ? "recommended" : "shorter, less precise";
                return <option key={n} value={n}>{n * DOMAINS.length} questions · {suggestedMinutes(n, mixId)} min · {pc.perMinute} a minute · {m[1]} easy / {m[2]} medium / {m[3]} hard ({label})</option>;
              })}
            </select>
            <p className="mt-1 text-[10px] text-slate-400">A shorter paper widens each score's likely range: about ±17 points at 50% on 32 questions, ±15 on 40, ±14 on 48.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Difficulty</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.values(MIXES).map(m => (
                <button key={m.id} type="button" disabled={!!template} onClick={() => { setMixId(m.id); setMinutesEdited(null); }}
                  className={`rounded-xl border px-3 py-2 text-left text-xs transition disabled:opacity-50 ${mixId === m.id ? "border-violet-400 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  <span className="font-bold">{m.label}{m.id === DEFAULT_MIX ? " (recommended)" : ""}</span> — {m.note}
                  <span className="mt-0.5 block text-[10px] text-slate-500">{m.id === "challenging"
                    ? "Separates students who are genuinely behind from the rest; most will score well below 100%."
                    : "The v4.0 paper. Use it to compare with a cohort that sat a balanced baseline earlier."}</span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Compare start and end of term on the same difficulty — scores from the two are not comparable.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Time limit — a race against the clock</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {TIME_PRESETS.map(m => (
                <button key={m} type="button" onClick={() => setMinutesEdited(m)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${minutes === m ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {m} min
                </button>
              ))}
              <input type="number" min={10} max={240} aria-label="Minutes" className={`${inp} ${num} !w-20 !py-1.5`} value={minutes} onChange={e => setMinutesEdited(Math.max(10, Number(e.target.value) || 10))} />
            </div>
            {(() => {
              /* Judged against the time this paper's difficulty needs, not a
                 fixed one-a-minute rule: hard questions take longer. */
              const tight = minutes < suggested - 5, roomy = minutes > suggested + 5;
              return (
                <p className={`mt-1 text-[10px] ${tight || roomy ? "text-amber-700" : "text-slate-500"}`}>
                  {pace.secPerQuestion} s a question · {pace.perMinute} questions a minute.{" "}
                  {tight
                    ? `Much less than the ${suggested} min this paper needs: many students will not reach the hard questions, so their difficulty profile rests on fewer of them.`
                    : roomy
                    ? `More than the ${suggested} min this paper needs — speed will tell you little.`
                    : `Suggested ${suggested} min (easy 40 s, medium 55 s, hard 75 s, CAT-level 100 s a question).`}
                </p>
              );
            })()}
          </div>
        </div>

        <label className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600">
          <input type="checkbox" className="mt-0.5" checked={showAnswers} onChange={e => setShowAnswers(e.target.checked)} />
          <span>
            <strong className="text-slate-800">Show correct answers to students after the test closes.</strong> Leave this off for a baseline:
            once answers are seen, the same questions cannot be used for other sections or the end-of-term comparison.
          </span>
        </label>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">This paper will cover</p>
          {template ? (
            <p className="text-xs text-slate-600">The same {template.question_ids.length} questions as <strong>{template.title}</strong>. Built-in questions are re-checked against the verified bank first.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <p className="sm:col-span-2 text-xs text-slate-600">{whole[1]} easy ({pct(whole[1])}%) · {whole[2]} medium ({pct(whole[2])}%) · {whole[3]} hard ({pct(whole[3])}%), in that order on the paper{whole.cat ? <>, ending with {whole.cat} CAT/XAT-level questions</> : null}.
                {exposed.size > 0 && <> Questions not used on your {forms.length} earlier baseline paper{forms.length === 1 ? "" : "s"} are chosen first.</>}</p>
              {CLUSTERS.map(c => (
                <div key={c.id} className="rounded-lg border border-slate-100 bg-white p-2">
                  <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>{c.icon} {c.name}</span><span className={`${num} text-slate-400`}>{perDomain * c.domains.length} Q · {areaMix[3]} hard{whole.cat ? " incl. 1 CAT-level" : ""}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.domains.map(id => {
                      const d = DOMAINS.find(x => x.id === id);
                      return <span key={id} className="rounded-md border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">{d.icon} {d.short} · {perDomain} Q</span>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">{totalQ} questions · {minutes} min · {pace.perMinute} a minute · one attempt · {showAnswers ? "answers shown after close" : "answers never shown"}</p>
          <button className={btnP} disabled={busy || (!classroomId && rooms.length > 0)} onClick={generate}>
            {busy ? "Building…" : <><Sparkles size={15} /> Create baseline &amp; get link</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   RESULTS
   ══════════════════════════════════════════════════════════════════ */
function useStudents(attempts, questions) {
  const studentMap = useMemo(() => {
    const m = {};
    for (const a of attempts || []) {
      if (!a.user_id) continue;
      if (!m[a.user_id]) m[a.user_id] = { name: a.student_name, course: a.meta?.course || a.student_course || "—", cu_id: a.meta?.cu_id || a.student_cu_id || "—", attempts: [] };
      m[a.user_id].attempts.push(a);
    }
    return m;
  }, [attempts]);
  return useMemo(() =>
    Object.entries(studentMap)
      .map(([id, v]) => ({ id, ...v, profile: computeQAAPFProfile(v.attempts, questions) }))
      .filter(s => s.profile.totalSeen > 0)
      .sort((a, b) => (b.profile.overallPct ?? -1) - (a.profile.overallPct ?? -1)),
  [studentMap, questions]);
}

function Dashboard({ attempts, questions }) {
  const [selStudent, setSelStudent] = useState(null);
  const students = useStudents(attempts, questions);

  const bandCounts = Q_LEVELS.map(ql => ({ ...ql, count: students.filter(s => s.profile.overallLevel?.level === ql.level).length }));
  const voidedAny = students.reduce((s, x) => s + x.profile.voided.length, 0);

  const exportCSV = () => downloadCSV("qaapf-cohort.csv", students, [
    { label: "Name", value: s => s.name },
    { label: "Course", value: s => s.course },
    { label: "CU ID", value: s => s.cu_id },
    { label: "Level", value: s => s.profile.overallLevel?.level || "N/A" },
    { label: "Label", value: s => s.profile.overallLevel?.label || "N/A" },
    { label: "Overall %", value: s => s.profile.overallPct ?? "" },
    { label: "Likely range", value: s => rangeText(s.profile.overallRange) },
    { label: "Correct", value: s => s.profile.totalCorrect },
    { label: "Scored items", value: s => s.profile.totalSeen },
    { label: "Confidence", value: s => s.profile.confidence.band },
    { label: "Reached", value: s => s.profile.reached },
    { label: "Accuracy on attempted %", value: s => s.profile.answeredAccuracy ?? "" },
    { label: "Speed profile", value: s => s.profile.speedProfile?.label || "" },
    ...CLUSTERS.map(c => ({ label: `${c.short} %`, value: s => s.profile.clusterProfiles.find(p => p.id === c.id)?.pct ?? "" })),
    ...DOMAINS.map(d => ({ label: d.short, value: s => s.profile.domainProfiles.find(p => p.id === d.id)?.pct ?? "" })),
  ]);

  /* Remediation groups are drawn on the four reporting areas (two
     domains each) rather than single domains, so a group is not formed
     on two or three unlucky answers. */
  const interventionGroups = useMemo(() => CLUSTERS.map(c => {
    const scored = students.map(s => ({ s, cp: s.profile.clusterProfiles.find(p => p.id === c.id) })).filter(x => x.cp && x.cp.pct !== null);
    const need = scored.filter(x => x.cp.pct < 50 && x.s.profile.confidence.band !== "Low").sort((a, b) => a.cp.pct - b.cp.pct);
    return { cluster: c, need, assessed: scored.length, share: scored.length ? Math.round((need.length / scored.length) * 100) : 0 };
  }).filter(g => g.need.length > 0).sort((a, b) => b.need.length - a.need.length), [students]);

  const reassess = students.filter(s => s.profile.confidence.band === "Low");

  const exportGroup = g => downloadCSV(`remediation-${g.cluster.short}.csv`, g.need, [
    { label: "Name", value: x => x.s.name },
    { label: "Course", value: x => x.s.course },
    { label: "CU ID", value: x => x.s.cu_id },
    { label: `${g.cluster.name} %`, value: x => x.cp.pct },
    { label: "Items", value: x => x.cp.total },
    ...g.cluster.domains.map(id => ({ label: DOMAINS.find(d => d.id === id).short, value: x => x.s.profile.domainProfiles.find(p => p.id === id)?.pct ?? "" })),
    { label: "Overall band", value: x => x.s.profile.overallLevel?.level || "—" },
  ]);

  return (
    <div className="space-y-5">
      <div className={`${card} p-5`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Cohort distribution across Q-levels</h3>
          {students.length > 0 && <button onClick={exportCSV} className={`${btnG} !px-3 !py-1.5 !text-xs`}><FileDown size={13} /> Export</button>}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {bandCounts.map(b => (
            <div key={b.level} className={`rounded-xl border p-3 text-center ${b.light}`}>
              <div className={`text-2xl font-extrabold ${num}`}>{b.count}</div>
              <div className="text-xs font-bold">{b.level}</div>
              <div className="text-[10px]">{b.label}</div>
            </div>
          ))}
        </div>
        {voidedAny > 0 && (
          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
            <Info size={12} className="mt-0.5 shrink-0 text-slate-400" />
            Faulty questions from the earlier bank were withdrawn from scoring for every student who saw them ({voidedAny} responses in total). No student gains or loses from a faulty item.
          </p>
        )}
        {!students.length && <Empty icon={Users} title="No student data yet" hint="Results appear here once students complete the baseline paper." />}
      </div>

      {reassess.length > 0 && (
        <div className={`${card} border-l-4 border-l-rose-400 p-4`}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-500" />
            <div className="text-xs leading-relaxed text-slate-600">
              <strong className="text-slate-900">{reassess.length} student{reassess.length === 1 ? "" : "s"} should be reassessed before grouping.</strong>{" "}
              Their response pattern is close to guessing, heavily skipped, rushed or interrupted, so their band is not reliable:{" "}
              {reassess.slice(0, 10).map(s => s.name).join(", ")}{reassess.length > 10 ? ` and ${reassess.length - 10} more` : ""}.
            </div>
          </div>
        </div>
      )}

      {interventionGroups.length > 0 && (
        <div className={`${card} p-5`}>
          <div className="mb-1 flex items-center gap-2">
            <Layers size={15} className="text-violet-600" />
            <h3 className="text-sm font-bold text-slate-900">Suggested remediation groups</h3>
          </div>
          <p className="mb-4 text-xs text-slate-400">Students below 50% in a reporting area (students flagged for reassessment are left out). A large group signals a whole-class gap worth reteaching.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {interventionGroups.map(g => (
              <div key={g.cluster.id} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{g.cluster.icon}</span>
                    <span className="text-sm font-bold text-slate-800">{g.cluster.name}</span>
                  </div>
                  <button onClick={() => exportGroup(g)} className={`${btnG} !px-2 !py-1 !text-[11px]`}><FileDown size={11} /> List</button>
                </div>
                <div className="mb-3 flex items-center gap-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${g.share >= 50 ? "bg-rose-100 text-rose-700" : g.share >= 25 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                    {g.need.length} of {g.assessed} students · {g.share}%
                  </span>
                  {g.share >= 50 && <span className="text-[10px] font-semibold text-rose-600">whole-class gap</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.need.slice(0, 12).map(x => (
                    <span key={x.s.id} className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                      {x.s.name}<span className={`font-bold ${x.cp.pct < 30 ? "text-rose-600" : "text-amber-600"}`}>{x.cp.pct}%</span>
                    </span>
                  ))}
                  {g.need.length > 12 && <span className="self-center text-[11px] text-slate-400">+{g.need.length - 12} more</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {students.length > 0 && (
        <div className={`${card} overflow-hidden`}>
          <div className="border-b border-slate-100 px-5 py-3.5"><h4 className="text-sm font-bold text-slate-900">Student results</h4></div>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-left">Student</th>
                  <th className="hidden px-3 py-2.5 text-left sm:table-cell">Course</th>
                  <th className="px-3 py-2.5 text-center">Level</th>
                  <th className="px-3 py-2.5 text-center">Overall</th>
                  {CLUSTERS.map(c => <th key={c.id} className="hidden px-2 py-2.5 text-center lg:table-cell" title={c.name}>{c.short}</th>)}
                  <th className="px-3 py-2.5 text-center">Confidence</th>
                  <th className="px-3 py-2.5 text-center">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map(s => {
                  const lvl = s.profile.overallLevel;
                  return (
                    <tr key={s.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelStudent(selStudent?.id === s.id ? null : s)}>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{s.name}</td>
                      <td className="hidden px-3 py-2.5 text-slate-500 sm:table-cell">{s.course}</td>
                      <td className="px-3 py-2.5 text-center">{lvl ? <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${lvl.light}`}>{lvl.level}</span> : "—"}</td>
                      <td className={`px-3 py-2.5 text-center font-bold ${num}`} title={s.profile.overallRange ? `Likely range ${rangeText(s.profile.overallRange)}` : ""}>{s.profile.overallPct !== null ? `${s.profile.overallPct}%` : "—"}</td>
                      {CLUSTERS.map(c => {
                        const cp = s.profile.clusterProfiles.find(p => p.id === c.id);
                        return <td key={c.id} className="hidden px-2 py-2.5 text-center lg:table-cell"><span className={`font-bold ${num} ${pctTone(cp?.pct)}`}>{cp?.pct ?? "—"}</span></td>;
                      })}
                      <td className="px-3 py-2.5 text-center"><Badge tone={s.profile.confidence.band === "High" ? "emerald" : s.profile.confidence.band === "Moderate" ? "amber" : "rose"}>{s.profile.confidence.band}</Badge></td>
                      <td className="px-3 py-2.5 text-center"><button className="rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-600">{selStudent?.id === s.id ? "▲ Less" : "▼ More"}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selStudent && <StudentProfileCard student={students.find(s => s.id === selStudent.id) || selStudent} />}
    </div>
  );
}

/* A one-page printable report a teacher can hand or email to a student. */
function printStudentReport(s) {
  const p = s.profile;
  const lvl = p.overallLevel;
  const esc = t => String(t ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const w = window.open("", "_blank");
  if (!w) { alert("Allow pop-ups to print the report."); return; }

  const bar = pct => (pct === null ? "" : `<div class="bar"><div class="fill ${pct >= 70 ? "g" : pct >= 50 ? "a" : "r"}" style="width:${pct}%"></div></div>`);
  const clusterRows = p.clusterProfiles.map(c => `<tr><td><strong>${c.icon} ${esc(c.name)}</strong></td><td class="v">${c.pct === null ? "—" : c.pct + "%"}</td><td class="barcell">${bar(c.pct)}</td><td class="note">${c.total ? `${c.correct}/${c.total} correct${c.reliable ? "" : " · provisional"}` : "not assessed"}</td></tr>`).join("");
  const domainRows = p.domainProfiles.map(d => {
    const note = d.pct === null ? "not assessed" : `${d.correct}/${d.total}${d.ceiling ? ` · clears ${diffLabel(d.ceiling).toLowerCase()}` : ""}`;
    return `<tr><td>${d.icon} ${esc(d.name)}</td><td class="v">${d.pct === null ? "—" : d.pct + "%"}</td><td class="barcell">${bar(d.pct)}</td><td class="note">${note}</td></tr>`;
  }).join("");

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.name)} — Aptitude Report</title><style>
    @page { margin: 18mm; }
    * { box-sizing: border-box; }
    body { font: 11pt/1.5 Georgia, serif; color: #111; margin: 0; }
    header { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; display:flex; justify-content:space-between; align-items:flex-end; }
    h1 { font-size: 17pt; margin: 0 0 2px; }
    h2 { font-size: 10pt; text-transform: uppercase; letter-spacing: .05em; color:#444; margin: 16px 0 4px; }
    .sub { font-size: 9.5pt; color: #555; }
    .band { text-align:center; border:2px solid #333; border-radius:10px; padding:6px 14px; }
    .band .lv { font-size: 20pt; font-weight: 800; }
    .band .lb { font-size: 9pt; }
    .desc { font-size: 10pt; color:#333; margin: 4px 0 6px; font-style: italic; }
    table { width:100%; border-collapse: collapse; font-size: 10pt; }
    td { padding:5px 6px; border-bottom:1px solid #eee; vertical-align: middle; }
    td.v { font-weight:700; text-align:right; width:48px; }
    td.barcell { width: 140px; }
    td.note { font-size:8.5pt; color:#666; }
    .bar { height:8px; background:#eee; border-radius:4px; overflow:hidden; }
    .fill { height:100%; } .fill.g { background:#059669; } .fill.a { background:#d97706; } .fill.r { background:#dc2626; }
    .plan { margin-top:14px; border:1px solid #333; border-radius:8px; padding:10px 12px; font-size:9.5pt; }
    footer { margin-top:20px; border-top:1px solid #bbb; padding-top:7px; font-size:8pt; color:#666; text-align:center; }
  </style></head><body>
    <header>
      <div>
        <h1>${esc(s.name)}</h1>
        <div class="sub">${esc(s.course || "")} ${s.cu_id ? "· " + esc(s.cu_id) : ""} · ${p.totalCorrect} of ${p.totalSeen} correct · score ${p.overallPct ?? "—"}% (likely ${rangeText(p.overallRange)})</div>
      </div>
      ${lvl ? `<div class="band"><div class="lv">${lvl.level}</div><div class="lb">${esc(lvl.label)}</div></div>` : ""}
    </header>
    ${lvl ? `<div class="desc">${esc(lvl.desc)}</div>` : ""}
    <h2>Reporting areas</h2>
    <table><tbody>${clusterRows}</tbody></table>
    <h2>Domains (indicative — a few questions each)</h2>
    <table><tbody>${domainRows}</tbody></table>
    ${p.weakSubDomains.length ? `<div class="plan"><strong>Suggested focus:</strong> ${p.weakSubDomains.slice(0, 3).map(u => esc(u.unit)).join(", ")}. Work from easier items upward before attempting harder application questions.</div>` : ""}
    <footer>QAAPF baseline · scored against the verified bank v${QAAPF_BANK_VERSION} · confidence ${esc(p.confidence.band)} · generated ${new Date().toLocaleDateString()}${p.confidence.band === "Low" ? " · NOT SAFE TO ACT ON — reassess" : ""}</footer>
  </body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 350);
}

function StudentProfileCard({ student: s }) {
  const p = s.profile;
  const lvl = p.overallLevel;
  return (
    <div className={`${card} p-5`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">{s.name}</h3>
          <p className="text-xs text-slate-500">{s.course} · {s.cu_id} · {s.attempts.length} attempt{s.attempts.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => printStudentReport(s)} className={`${btnG} !px-3 !py-1.5 !text-xs`}><FileDown size={13} /> Report</button>
          {lvl && <div className={`rounded-2xl border px-4 py-2 text-center ${lvl.light}`}><div className="text-xl font-extrabold">{lvl.level}</div><div className="text-xs font-semibold">{lvl.label}</div></div>}
        </div>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-slate-600">{lvl?.desc}</p>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-slate-500">
          {p.totalCorrect}/{p.totalSeen} correct · {p.overallPct}% · likely {rangeText(p.overallRange)}
        </span>
        <Badge tone={p.confidence.band === "High" ? "emerald" : p.confidence.band === "Moderate" ? "amber" : "rose"}>{p.confidence.band} confidence</Badge>
        {p.voided.length > 0 && <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-400">{p.voided.length} faulty item{p.voided.length === 1 ? "" : "s"} withdrawn</span>}
        {p.speedProfile && (
          <span className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700" title={p.speedProfile.advice}>
            {p.speedProfile.label} · reached {p.speedProfile.reached}/{p.totalSeen} · {p.speedProfile.accuracyPct}% accurate on attempted
          </span>
        )}
      </div>

      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Reporting areas</p>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {p.clusterProfiles.map(c => (
          <div key={c.id} className="rounded-xl border border-slate-100 p-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">{c.icon} {c.name}</span>
              <span className={`${num} font-bold ${pctTone(c.pct)}`}>{c.pct ?? "—"}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">{c.pct !== null && <div className={`h-full rounded-full ${pctBar(c.pct)}`} style={{ width: `${c.pct}%` }} />}</div>
            <div className="mt-1 text-[10px] text-slate-400">{c.total ? `${c.correct}/${c.total} items${c.reliable ? "" : ` · provisional (under ${CLUSTER_RELIABLE_MIN})`}` : "not assessed"}</div>
          </div>
        ))}
      </div>

      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Domains — indicative</p>
      <div className="space-y-3">
        {p.domainProfiles.map(d => (
          <div key={d.id}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                {d.icon} {d.name}
                {d.pct !== null && !d.reliable && (
                  <span className="ml-1.5 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[9px] font-normal text-slate-400" title={`Based on only ${d.total} question${d.total === 1 ? "" : "s"}`}>provisional · {d.total}Q</span>
                )}
              </span>
              {d.pct !== null
                ? <div className="flex items-center gap-2">
                    {d.ceiling && <span className="text-[9px] text-slate-400">clears {diffLabel(d.ceiling).toLowerCase()}</span>}
                    <span className={`${num} text-xs font-bold ${pctTone(d.pct)}`}>{d.pct}%</span>
                  </div>
                : <span className="text-[10px] text-slate-300">Not assessed</span>}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">{d.pct !== null && <div className={`h-full rounded-full transition-all ${pctBar(d.pct)}`} style={{ width: `${d.pct}%` }} />}</div>
          </div>
        ))}
      </div>

      {(p.strengths.length > 0 || p.gaps.length > 0) && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {p.strengths.length > 0 && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="mb-1.5 text-xs font-bold text-emerald-700">✓ Strengths</p>
              {p.strengths.map(d => <p key={d.id} className="text-[11px] text-emerald-600">{d.icon} {d.name} — {d.pct}%</p>)}
            </div>
          )}
          {p.gaps.length > 0 && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
              <p className="mb-1.5 text-xs font-bold text-rose-700">⚠ Development gaps</p>
              {p.gaps.map(d => <p key={d.id} className="text-[11px] text-rose-600">{d.icon} {d.name} — {d.pct}%</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Cohort heatmap ───────────────────────────────────────────────── */
function CohortHeatmap({ attempts, questions }) {
  const students = useStudents(attempts, questions);
  const heat = pct => (pct === null || pct === undefined ? "bg-slate-100 text-slate-300" : pct >= 80 ? "bg-emerald-500 text-white" : pct >= 60 ? "bg-violet-500 text-white" : pct >= 40 ? "bg-amber-400 text-white" : "bg-rose-500 text-white");

  if (!students.length) return <div className={`${card} p-10`}><Empty icon={BarChart2} title="No student data yet" /></div>;

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h4 className="text-sm font-bold text-slate-900">Heatmap — whole cohort at a glance</h4>
        <p className="mt-0.5 text-xs text-slate-400">🟩 ≥80% · 🟣 60–79% · 🟨 40–59% · 🟥 &lt;40%. Reporting areas first (two domains each); single domains are indicative.</p>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="sticky left-0 bg-slate-50 px-4 py-2.5 text-left">Student</th>
              <th className="px-3 py-2.5 text-center">Overall</th>
              {CLUSTERS.map(c => <th key={c.id} className="px-2 py-2.5 text-center font-bold text-slate-700" title={c.name}>{c.short}</th>)}
              {DOMAINS.map(d => <th key={d.id} className="px-2 py-2.5 text-center" title={d.name}>{d.icon}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {students.map(s => (
              <tr key={s.id}>
                <td className="sticky left-0 bg-white px-4 py-2 font-medium text-slate-800">{s.name}<div className="text-[10px] text-slate-400">{s.course}</div></td>
                <td className="px-3 py-2 text-center"><span className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-bold ${heat(s.profile.overallPct)}`}>{s.profile.overallPct ?? "—"}%</span></td>
                {CLUSTERS.map(c => {
                  const pct = s.profile.clusterProfiles.find(p => p.id === c.id)?.pct;
                  return <td key={c.id} className="px-2 py-2 text-center"><span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${heat(pct)}`}>{pct ?? "—"}</span></td>;
                })}
                {DOMAINS.map(d => {
                  const pct = s.profile.domainProfiles.find(p => p.id === d.id)?.pct;
                  return <td key={d.id} className="px-2 py-2 text-center">{pct !== null && pct !== undefined ? <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold opacity-80 ${heat(pct)}`}>{pct}</span> : <span className="text-slate-200">—</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FRAMEWORK REFERENCE
   ══════════════════════════════════════════════════════════════════ */
const PIAAC_CROSSWALK = [
  ["Quantity and number", "A Numerical Foundation · B Commercial Arithmetic · C Estimation and Comparisons"],
  ["Change and relationships", "C Number Series and Patterns · D Algebraic Thinking · E Growth Rates · H Modelling"],
  ["Data and chance", "E Data Interpretation · G Statistical Interpretation · G Probability & Chance"],
  ["Space and shape", "H Measurement & Geometry"],
];

function LevelsGuide() {
  return (
    <div className="space-y-4">
      <div className={`${card} p-5`}>
        <h3 className="mb-1 text-sm font-bold text-slate-900">How the score is calculated</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-[12px] leading-relaxed text-slate-600">
          <li><strong>Baseline score</strong> = percentage of framework questions answered correctly on the baseline paper within the time. Unanswered questions, including those not reached, count as not correct; there is no negative marking, so students should attempt every question.</li>
          <li>Because the paper is timed, each profile also separates <strong>speed</strong> (how much of the paper was reached) from <strong>accuracy</strong> (correct answers among those attempted) — for example "Accurate but slow" or "Quick but error-prone". Questions never reached are left out of the difficulty profile, and quick guesses made as time ran out do not lower confidence.</li>
          <li>Each score is shown with its <strong>likely range</strong> (95% interval). Around 50% it is roughly ±17 points on the 32-question paper (±20 on 24 questions, ±14 on 48), so a student near a band edge could belong to the neighbouring band.</li>
          <li>Every question is scored against the <strong>verified key in bank v{QAAPF_BANK_VERSION}</strong> ({QAAPF_BANK_DATE}), matched on the answer text — not the key stored in the question bank or the attempt. {QAAPF_LEGACY.filter(l => l.status === "void").length} faulty versions from the earlier bank are withdrawn from every score in which they appear.</li>
          <li>Difficulty is reported as its own axis (the difficulty profile and ceiling), not folded into the score as weights. On a fixed paper everyone answers the same questions, so the plain percentage is the comparable figure.</li>
          <li>Decisions about groups use the <strong>four reporting areas</strong> (8 questions each on the 32-question paper, 12 on the 48-question paper). Domain results and sub-skills point to where to look, and are labelled provisional when evidence is thin.</li>
        </ul>
      </div>

      <div className={`${card} p-5`}>
        <h3 className="mb-1 text-sm font-bold text-slate-900">Proficiency bands</h3>
        <p className="mb-3 text-xs text-slate-500">Cut-points are provisional institutional standards, to be confirmed by a faculty standard-setting panel (modified Angoff or Bookmark) after the first cohort. A student scoring below 25% has scored at or below what guessing would produce on four-option questions.</p>
        <div className="grid gap-3">
          {Q_LEVELS.map(ql => (
            <div key={ql.level} className={`flex items-start gap-4 rounded-xl border p-4 ${ql.light}`}>
              <div className="shrink-0 text-center">
                <div className="text-lg font-extrabold">{ql.level}</div>
                <div className="text-[10px] font-semibold">{ql.label}</div>
              </div>
              <div className="flex-1">
                <div className="mb-1 text-xs font-semibold text-slate-700">{ql.min}–{ql.max}% on the baseline paper</div>
                <p className="text-[11px] leading-relaxed text-slate-600">{ql.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${card} p-5`}>
        <h3 className="mb-3 text-sm font-bold text-slate-900">Structure: 4 reporting areas · 8 domains</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {CLUSTERS.map(c => (
            <div key={c.id} className={`${cardH} p-3`}>
              <div className="mb-2 text-xs font-bold text-slate-900">{c.icon} {c.name}</div>
              {c.domains.map(id => {
                const d = DOMAINS.find(x => x.id === id);
                return (
                  <div key={id} className="mb-2">
                    <div className="text-[11px] font-semibold text-slate-700">Domain {d.id}: {d.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {d.units.map(u => <span key={u} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">{u}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className={`${card} p-5`}>
        <h3 className="mb-1 text-sm font-bold text-slate-900">Alignment with OECD PIAAC numeracy (Cycle 2)</h3>
        <p className="mb-3 text-xs text-slate-500">QAAPF is an institutional diagnostic informed by the PIAAC numeracy content areas. It does not report on the PIAAC scale and its bands are not PIAAC levels.</p>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">PIAAC content area</th><th className="px-3 py-2">Where QAAPF covers it</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {PIAAC_CROSSWALK.map(([a, b]) => <tr key={a}><td className="px-3 py-2 font-semibold text-slate-700">{a}</td><td className="px-3 py-2 text-slate-600">{b}</td></tr>)}
            <tr><td className="px-3 py-2 font-semibold text-slate-700">Outside PIAAC numeracy</td><td className="px-3 py-2 text-slate-600">F Logical &amp; Analytical Reasoning (sequences, arrangements, syllogisms) — general reasoning from the placement-aptitude tradition</td></tr>
          </tbody>
        </table>
      </div>

      <div className={`${card} p-5`}>
        <h3 className="mb-2 text-sm font-bold text-slate-900">Blueprint and item quality</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-[12px] leading-relaxed text-slate-600">
          {PAPER_SIZES.map(n => { const m = paperMix(n, DEFAULT_MIX); const mins = suggestedMinutes(n, DEFAULT_MIX); const pc = paceOf(n * DOMAINS.length, mins); return <li key={n}><strong>{n * DOMAINS.length} questions in {mins} minutes</strong> ({pc.perMinute} a minute, {pc.secPerQuestion} s each) — {n} per domain; {m[1]} easy · {m[2]} medium · {m[3]} hard{n === DEFAULT_PER_DOMAIN ? ", the recommended paper" : ", shorter and less precise"}.</li>; })}
          <li><strong>Challenging by default (v4.1).</strong> About 15% easy, 25% medium and 60% hard, with the same counts in each of the four reporting areas. A balanced paper (equal thirds, as in v4.0) is still available; compare start and end of term on the same mix. Difficulty is rated by solving effort: easy is one step or recall, medium two steps or one concept applied, hard three or more steps, combined ideas or a trap.</li>
          <li><strong>Explanations.</strong> Every reasoning item, and every item added from v4.1, has a worked explanation. It appears in the answer review (when the quiz shows answers), in the question bank and on the printed answer key.</li>
          <li><strong>A race against the clock.</strong> More than one question a minute, inside a 30–45 minute sitting; students see their pace against the target during the test. Questions run easy → medium → hard, shuffled within each block; options are shuffled for each student.</li>
          <li>Every item has one correct option among four, needs no other question to answer, and carries no hint. Answer positions are balanced across A–D. Two people solve every new or changed item before it enters the bank, and an automated check runs before each release.</li>
          <li>Confidence in each classification draws on evidence volume, breadth, difficulty spread, completion, speed, performance above chance, difficulty coherence, pace, answers faster than {RAPID_SECONDS} seconds while working, and proctoring flags.</li>
        </ul>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   QUESTION BANK
   ══════════════════════════════════════════════════════════════════ */
function QuestionInventory({ questions, setQuestions, toast2 }) {
  const [filter, setFilter] = useState("all");
  const [working, setWorking] = useState(false);

  const bankedTexts = useMemo(() => new Set(questions.map(q => norm(q.question))), [questions]);
  const notBanked = useMemo(() => QAAPF_QUESTIONS.filter(q => !bankedTexts.has(norm(q.q))), [bankedTexts]);
  const banked = QAAPF_QUESTIONS.length - notBanked.length;
  const plan = useMemo(() => planBankRepairs(questions), [questions]);

  const filtered = filter === "all" ? QAAPF_QUESTIONS : filter === "new" ? notBanked : QAAPF_QUESTIONS.filter(q => q.d === filter);

  const domainCounts = DOMAINS.map(d => ({
    ...d,
    total: QAAPF_QUESTIONS.filter(q => q.d === d.id).length,
    added: QAAPF_QUESTIONS.filter(q => q.d === d.id && bankedTexts.has(norm(q.q))).length,
  }));

  const importItems = async (items, label) => {
    if (!items.length) { toast2("Those questions are already in the bank.", "amber"); return; }
    setWorking(true);
    try {
      const inserted = await insertQuestions(items.map(bankRowFor));
      setQuestions(prev => [...prev, ...inserted]);
      toast2(`Added ${inserted.length} questions ${label}.`);
    } catch (e) { toast2(e.message, "rose"); }
    setWorking(false);
  };

  const repairAll = async () => {
    setWorking(true);
    const done = new Map();
    let failed = 0;
    for (const r of plan.repairs) {
      try { const row = await updateQuestionSafe(r.row.id, r.patch); if (row) done.set(row.id, row); }
      catch (_) { failed++; }
    }
    if (done.size) setQuestions(prev => prev.map(q => done.get(q.id) || q));
    toast2(failed
      ? `Repaired ${done.size} question${done.size === 1 ? "" : "s"}; ${failed} could not be changed (they belong to another account). New baselines add verified copies automatically.`
      : `Repaired ${done.size} question${done.size === 1 ? "" : "s"} to the verified v${QAAPF_BANK_VERSION} version.`, failed ? "amber" : "emerald");
    setWorking(false);
  };

  return (
    <div className="space-y-4">
      <div className={`${card} p-5`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Question inventory · bank v{QAAPF_BANK_VERSION}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{banked} of {QAAPF_QUESTIONS.length} built-in questions are in your bank. Built-in questions are always scored against the verified key, whatever the bank copy says.</p>
          </div>
          <button onClick={() => importItems(notBanked, "to the question bank")} disabled={working || !notBanked.length} className={`${btnP} gap-2`}>
            <Plus size={14} />{working ? "Working…" : `Import all ${notBanked.length} new`}
          </button>
        </div>

        {(plan.repairs.length > 0 || plan.retire.length > 0) && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2 text-xs leading-relaxed text-amber-900">
                <Wrench size={15} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  {plan.repairs.length > 0 && <p><strong>{plan.repairs.length} built-in question{plan.repairs.length === 1 ? "" : "s"} in your bank {plan.repairs.length === 1 ? "is" : "are"} out of date</strong> — a wrong key, a faulty version, or old wording. Repairing updates them in place, so every quiz that uses them is corrected.</p>}
                  {plan.retire.length > 0 && <p className="mt-1">{plan.retire.length} faulty question{plan.retire.length === 1 ? " has" : "s have"} no replacement. {plan.retire.length === 1 ? "It is" : "They are"} withdrawn from QAAPF scores; remove {plan.retire.length === 1 ? "it" : "them"} from any quiz that still uses {plan.retire.length === 1 ? "it" : "them"}: {plan.retire.slice(0, 3).map(r => `"${r.row.question.slice(0, 40)}…"`).join(", ")}</p>}
                </div>
              </div>
              {plan.repairs.length > 0 && <button onClick={repairAll} disabled={working} className={`${btnP} !py-1.5 text-xs`}><ShieldCheck size={14} /> Repair {plan.repairs.length}</button>}
            </div>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {domainCounts.map(d => (
            <div key={d.id} className={`${card} flex items-center justify-between gap-2 p-3`}>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800">{d.icon} Domain {d.id}</div>
                <div className="text-[10px] text-slate-500">{d.short}</div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${d.total ? Math.round((d.added / d.total) * 100) : 0}%` }} /></div>
                <div className="mt-0.5 text-[10px] text-slate-400">{d.added}/{d.total} added</div>
              </div>
              {d.added < d.total
                ? <button onClick={() => importItems(QAAPF_QUESTIONS.filter(q => q.d === d.id && !bankedTexts.has(norm(q.q))), `from Domain ${d.id}`)} disabled={working} className="shrink-0 rounded-xl bg-violet-50 p-1.5 text-violet-600 transition hover:bg-violet-100" title={`Import Domain ${d.id}`}><Plus size={14} /></button>
                : <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />}
            </div>
          ))}
        </div>
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <button onClick={() => setFilter("all")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === "all" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}>All ({QAAPF_QUESTIONS.length})</button>
          <button onClick={() => setFilter("new")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === "new" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}>Not imported ({notBanked.length})</button>
          {DOMAINS.map(d => <button key={d.id} onClick={() => setFilter(d.id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === d.id ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}>{d.icon} {d.id}</button>)}
        </div>
        <div className="max-h-[480px] divide-y divide-slate-50 overflow-y-auto">
          {filtered.map(q => {
            const inBank = bankedTexts.has(norm(q.q));
            const dom = DOMAINS.find(d => d.id === q.d);
            return (
              <div key={q.id} className={`flex items-start gap-3 px-4 py-3 ${inBank ? "bg-emerald-50/30" : ""}`}>
                <span className="shrink-0 text-sm">{dom?.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone="slate">{q.id}</Badge>
                    <Badge tone="sky">{q.u}</Badge>
                    <Badge tone={diffTone(q.lv)}>{diffLabel(q.lv)}</Badge>
                    {q.k === "cat" && <Badge tone="violet">CAT-level</Badge>}
                    {inBank && <Badge tone="emerald">In bank</Badge>}
                  </div>
                  <p className="text-xs font-medium text-slate-800">{q.q}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {q.o.map((o, oi) => <span key={oi} className={`text-[10px] ${oi === q.c ? "font-semibold text-emerald-700" : "text-slate-400"}`}>{"ABCD"[oi]}. {oi === q.c ? "✓ " : ""}{o}</span>)}
                  </div>
                  {q.x && <p className="mt-1 text-[10px] leading-relaxed text-slate-500"><span className="font-semibold text-slate-600">Why: </span>{q.x}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
