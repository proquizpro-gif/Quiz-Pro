/* ══════════════════════════════════════════════════════════════════
   QAAP 2.0 — STUDENT APTITUDE PROFILE
   ══════════════════════════════════════════════════════════════════
   A percentage answers "how many did they get right". It cannot answer
   "what can this student actually do, and should we trust the finding".
   Those are the two questions a baseline has to answer if it is going to
   drive an intervention, and this view is built around them.

   Five outputs, in the order a reader needs them:

     A  Baseline score      what was demonstrated, difficulty-weighted
     B  Domain profile      which areas are strong and weak
     C  Difficulty profile  where competence stops
     D  Weakness map        which specific sub-skill is failing
     E  Confidence          whether the classification is safe to act on

   Output E is the one that keeps the rest honest. Every other number on
   this page is conditional on it.
   ══════════════════════════════════════════════════════════════════ */

import { useState, useMemo } from "react";
import {
  Brain, Target, Layers, AlertTriangle, CheckCircle2, Award,
  Users, TrendingUp, FileDown, Circle, GraduationCap, Search,
} from "lucide-react";
import { card, btnP, btnG, inp, num, Badge, Empty, Stat } from "./ui.jsx";
import { downloadCSV } from "../lib/csv.js";
/* QAAPF.jsx imports this file, so this is a cycle. It is safe only
   because every symbol below is referenced inside a function body and
   never at module scope — at import time these bindings are still
   uninitialised, and touching one here would throw. Keep it that way. */
import { computeQAAPFProfile, DOMAINS, RELIABLE_MIN } from "./QAAPF.jsx";

/* ── Small helpers ─────────────────────────────────────────────── */
const toneOfPct = (p) =>
  p === null ? "bg-slate-200" : p >= 75 ? "bg-emerald-500" : p >= 60 ? "bg-violet-500" : p >= 45 ? "bg-amber-500" : "bg-rose-500";

const confTone = (band) => (band === "High" ? "emerald" : band === "Moderate" ? "amber" : "rose");

const statusTone = {
  good: "text-emerald-600", ok: "text-sky-600",
  thin: "text-amber-600",   weak: "text-rose-600", na: "text-slate-400",
};
const statusLabel = { good: "Good", ok: "Adequate", thin: "Thin", weak: "Weak", na: "Not available" };

/* Percentile within a named reference population. Ties take the midrank,
   so two students on the same score cannot be reported at different
   percentiles. Returns null below a usable cohort size rather than
   producing a percentile from four people. */
function percentileIn(values, v, minN = 5) {
  const a = values.filter((x) => typeof x === "number" && !Number.isNaN(x));
  if (a.length < minN || typeof v !== "number") return null;
  const below = a.filter((x) => x < v).length;
  const equal = a.filter((x) => x === v).length;
  return Math.round(((below + equal / 2) / a.length) * 100);
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PANEL
   ══════════════════════════════════════════════════════════════════ */
export default function QAAPF2({ attempts, questions }) {
  const [query, setQuery]   = useState("");
  const [selId, setSelId]   = useState(null);
  const [scope, setScope]   = useState("all");   // percentile reference population

  /* One profile per student, built from every attempt that student made.
     Computed once and shared by the roster, the cohort strip and the
     detail pane, so no two panels can disagree about a student. */
  const students = useMemo(() => {
    const m = {};
    for (const a of attempts || []) {
      if (!a.user_id) continue;
      if (!m[a.user_id]) {
        m[a.user_id] = {
          id: a.user_id,
          name: a.student_name || "Unknown",
          course: a.meta?.course || a.student_course || "—",
          cu_id:  a.meta?.cu_id  || a.student_cu_id  || "—",
          attempts: [],
        };
      }
      m[a.user_id].attempts.push(a);
    }
    return Object.values(m)
      .map((s) => ({ ...s, profile: computeQAAPFProfile(s.attempts, questions) }))
      .filter((s) => s.profile.totalSeen > 0)
      .sort((a, b) => (b.profile.overallPct ?? -1) - (a.profile.overallPct ?? -1));
  }, [attempts, questions]);

  /* Reference populations for the cohort view. "Clearly label the
     reference population" is the whole point — an 82nd percentile means
     nothing until you say 82nd of what. */
  const scopes = useMemo(() => {
    const byCourse = {};
    for (const s of students) {
      /* Students whose course was never recorded are not a cohort. They
         are a group of people with the same piece of missing metadata,
         and ranking anyone against them would read as a programme
         comparison that was never made. */
      const c = String(s.course || "").trim();
      if (!c || c === "—" || c.toLowerCase() === "unknown") continue;
      (byCourse[c] ||= []).push(s);
    }
    return [
      { key: "all", label: `All assessed students (${students.length})`, members: students },
      ...Object.entries(byCourse)
        .filter(([, v]) => v.length >= 3)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([c, v]) => ({ key: `course:${c}`, label: `${c} (${v.length})`, members: v })),
    ];
  }, [students]);

  const activeScope = scopes.find((s) => s.key === scope) || scopes[0];
  const scopeScores = useMemo(
    () => (activeScope?.members || []).map((s) => s.profile.overallPct).filter((x) => x !== null),
    [activeScope]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || String(s.cu_id).toLowerCase().includes(q) || String(s.course).toLowerCase().includes(q)
    );
  }, [students, query]);

  /* Resolve the selection against the visible list. Resolving against
     the full roster let the detail pane keep showing a student that the
     current search had filtered out — nothing in view was highlighted,
     and the cohort label on their printed report named a list they were
     no longer part of. */
  const selected = filtered.find((s) => s.id === selId) || filtered[0] || null;

  /* Whether the selected student belongs to the population they are
     being ranked against. Percentile is withheld rather than computed
     when they do not. */
  const inScope = selected ? (activeScope?.members || []).some((m) => m.id === selected.id) : false;

  /* How much of the cohort produced a classification worth acting on.
     An institution that reads only the band distribution will happily
     build interventions on findings that were never safe to use. */
  const confSplit = useMemo(() => {
    const c = { High: 0, Moderate: 0, Low: 0 };
    for (const s of students) c[s.profile.confidence.band]++;
    return c;
  }, [students]);

  /* A percentile is only meaningful against a population the student is
     actually in. Mapping the active scope's distribution across every
     row would hand a BBA student a rank among MBA students while the
     reference-population column named MBA — a cross-cohort comparison
     presented as an in-cohort one. */
  const scopeIds = useMemo(() => new Set((activeScope?.members || []).map((m) => m.id)), [activeScope]);
  const pctileFor = (s) => (scopeIds.has(s.id) ? percentileIn(scopeScores, s.profile.overallPct) : null);

  const exportProfiles = () =>
    downloadCSV("qaap2-profiles.csv", students, [
      { label: "Name",   value: (s) => s.name },
      { label: "CU ID",  value: (s) => s.cu_id },
      { label: "Course", value: (s) => s.course },
      { label: "Baseline %",    value: (s) => s.profile.overallPct ?? "" },
      { label: "Band",          value: (s) => s.profile.overallLevel?.level ?? "" },
      { label: "Band label",    value: (s) => s.profile.overallLevel?.label ?? "" },
      { label: "Accuracy on answered items %", value: (s) => s.profile.answeredAccuracy ?? "" },
      { label: "Percentile",    value: (s) => pctileFor(s) ?? "" },
      { label: "Reference population", value: (s) => (scopeIds.has(s.id) ? activeScope?.label ?? "" : "not in selected population") },
      { label: "Ceiling", value: (s) => (s.profile.overallCeiling ? ["", "Easy", "Medium", "Hard"][s.profile.overallCeiling] : "None cleared") },
      { label: "Easy %",   value: (s) => s.profile.difficultyProfile[0].pct ?? "" },
      { label: "Medium %", value: (s) => s.profile.difficultyProfile[1].pct ?? "" },
      { label: "Hard %",   value: (s) => s.profile.difficultyProfile[2].pct ?? "" },
      { label: "Confidence",      value: (s) => s.profile.confidence.score },
      { label: "Confidence band", value: (s) => s.profile.confidence.band },
      { label: "Items answered",  value: (s) => s.profile.answered },
      { label: "Items skipped",   value: (s) => s.profile.skipped },
      { label: "Weakest sub-skills", value: (s) => s.profile.weakSubDomains.slice(0, 3).map((u) => u.unit).join("; ") },
      ...DOMAINS.map((d) => ({ label: d.short, value: (s) => s.profile.domainProfiles.find((p) => p.id === d.id)?.pct ?? "" })),
    ]);

  if (!students.length)
    return (
      <div className={`${card} p-6`}>
        <Empty
          icon={Brain}
          title="No aptitude profiles yet"
          hint="Once students complete a baseline test, each one gets a full profile here — score, domain breakdown, difficulty ceiling, weakness map and a confidence rating for the classification."
        />
      </div>
    );

  return (
    <div className="space-y-5">
      {/* ── Why this view exists ──────────────────────────────────── */}
      <div className={`${card} border-l-4 border-l-violet-500 p-4`}>
        <div className="flex items-start gap-3">
          <Target size={18} className="mt-0.5 shrink-0 text-violet-600" />
          <div className="text-xs leading-relaxed text-slate-600">
            <strong className="text-slate-900">A baseline estimates ability, it does not award a mark.</strong>{" "}
            Two students on the same percentage are not the same student: one may have cleared the easy tier and stopped,
            the other may still have been answering hard items. Each profile below is therefore reported on five axes, and
            every one of them is qualified by a confidence rating that says whether the finding is safe to act on.
          </div>
        </div>
      </div>

      {/* ── Cohort confidence strip ───────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users}         label="Students profiled"            value={students.length} tone="violet" />
        <Stat icon={CheckCircle2}  label="Classifications safe to act on" value={confSplit.High}     tone="emerald" sub="High confidence" />
        <Stat icon={AlertTriangle} label="Indicative only"              value={confSplit.Moderate} tone="amber"   sub="Reassess before acting" />
        <Stat icon={Circle}        label="Not safe to act on"           value={confSplit.Low}      tone="rose"    sub="Reassessment required" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* ── Roster ──────────────────────────────────────────────── */}
        <div className={`${card} flex flex-col overflow-hidden`}>
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inp} pl-9`}
                placeholder="Search name, ID or course"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button onClick={exportProfiles} className={`${btnG} mt-2 w-full justify-center text-xs`}>
              <FileDown size={13} /> Export all profiles
            </button>
          </div>

          <div className="max-h-[560px] overflow-y-auto">
            {filtered.map((s) => {
              const p = s.profile;
              const isSel = selected && s.id === selected.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelId(s.id)}
                  className={`flex w-full items-center gap-3 border-b border-slate-50 px-3 py-2.5 text-left transition ${
                    isSel ? "bg-violet-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-extrabold text-white ${p.overallLevel?.color || "bg-slate-300"}`}>
                    {p.overallLevel?.level || "—"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-slate-900">{s.name}</div>
                    <div className="truncate text-[10px] text-slate-500">
                      {s.course} · {p.overallPct ?? "—"}%
                    </div>
                  </div>
                  <Badge tone={confTone(p.confidence.band)}>{p.confidence.score}</Badge>
                </button>
              );
            })}
            {!filtered.length && <div className="p-6 text-center text-xs text-slate-400">No student matches that search.</div>}
          </div>
        </div>

        {/* ── Detail ──────────────────────────────────────────────── */}
        {selected ? (
          <StudentProfile2
            student={selected}
            scopeScores={scopeScores}
            scopes={scopes}
            scope={activeScope?.key}
            setScope={setScope}
            inScope={inScope}
          />
        ) : (
          <div className={`${card} p-6`}>
            <Empty icon={Brain} title="Select a student" hint="Pick a name from the roster to see the full profile." />
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   THE FIVE OUTPUTS
   ══════════════════════════════════════════════════════════════════ */
function StudentProfile2({ student: s, scopeScores, scopes, scope, setScope, inScope }) {
  const p = s.profile;
  const pctile = inScope ? percentileIn(scopeScores, p.overallPct) : null;
  const scopeLabel = scopes.find((x) => x.key === scope)?.label || "cohort";
  const ceilLabel = p.overallCeiling ? ["", "Easy", "Medium", "Hard"][p.overallCeiling] : null;

  return (
    <div className="space-y-5">
      {/* ── A. Baseline score, with the two views side by side ────── */}
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{s.name}</h3>
              <p className="text-[11px] text-slate-500">
                {s.course} · {s.cu_id} · {p.answered} of {p.presented} framework items answered
                {p.attemptCount > 1 && ` · ${p.attemptCount} attempts, earliest response counted per question`}
              </p>
            </div>
            <button onClick={() => printProfile2(s, scopeLabel, pctile)} className={`${btnP} text-xs`}>
              <FileDown size={14} /> Print report
            </button>
          </div>
        </div>

        <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
          {/* Absolute */}
          <div className="bg-white p-5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Absolute baseline</div>
            <div className="flex items-end gap-3">
              <div className={`text-4xl font-extrabold text-slate-900 ${num}`}>{p.overallPct ?? "—"}%</div>
              {p.overallLevel && (
                <div className={`mb-1 rounded-lg border px-2 py-1 text-xs font-bold ${p.overallLevel.light}`}>
                  {p.overallLevel.level} · {p.overallLevel.label}
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Difficulty-weighted, so this reads as the proportion of difficulty mastered rather than the proportion of
              questions answered. {p.overallLevel?.desc}
            </p>
            {/* Where a paper was heavily skipped the headline figure and
                the accuracy on what was actually attempted pull apart.
                Showing only the first would let a skipped paper read as a
                weak student. */}
            {p.skipped > 0 && p.answeredAccuracy !== null && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-800">
                <strong>{p.skipped} item{p.skipped === 1 ? "" : "s"} left unanswered.</strong> On the items actually
                attempted the student was correct <strong className={num}>{p.answeredAccuracy}%</strong> of the time.
                The headline figure counts every item presented; the gap between the two is a participation finding, not
                an ability one.
              </div>
            )}
          </div>

          {/* Cohort */}
          <div className="bg-white p-5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Within cohort</div>
              <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">
                {scopes.map((x) => (
                  <option key={x.key} value={x.key}>{x.label}</option>
                ))}
              </select>
            </div>
            {pctile !== null ? (
              <>
                <div className="flex items-end gap-2">
                  <div className={`text-4xl font-extrabold text-slate-900 ${num}`}>{pctile}</div>
                  <div className="mb-1.5 text-sm font-bold text-slate-400">th percentile</div>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  Rank within <strong>{scopeLabel}</strong>; students on an identical score share the midpoint of the
                  places they occupy. This is a position, not an ability — a high rank in a weak cohort is still a weak
                  baseline.
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-extrabold text-slate-300">Not reportable</div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  {!inScope
                    ? "This student is not part of the selected reference population, so no rank within it can be reported."
                    : "A percentile needs a reference population of at least five assessed students. Ranking against fewer would read as precision that is not there."}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── E. Confidence — placed high, because it governs the rest ─ */}
      <ConfidencePanel confidence={p.confidence} />

      {/* ── C. Difficulty profile ─────────────────────────────────── */}
      <div className={`${card} p-5`}>
        <div className="mb-1 flex items-center gap-2">
          <Layers size={15} className="text-violet-600" />
          <h4 className="text-sm font-bold text-slate-900">Difficulty profile</h4>
        </div>
        <p className="mb-4 text-[11px] text-slate-500">
          Where competence stops. This is the axis a total score hides — and the one that decides where teaching starts.
        </p>

        <div className="space-y-3">
          {p.difficultyProfile.map((d) => (
            <div key={d.level}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700">{d.label}</span>
                <span className={`${num} text-slate-500`}>
                  {d.total ? `${d.correct}/${d.total} · ${d.pct}%` : "not assessed"}
                  {d.total > 0 && !d.reliable && <span className="ml-1 text-amber-600">provisional</span>}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full transition-all ${toneOfPct(d.pct)}`} style={{ width: `${d.pct ?? 0}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-4 rounded-xl border p-3 text-xs ${ceilLabel ? "border-violet-200 bg-violet-50 text-violet-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          {ceilLabel ? (
            <>
              <strong>Ability ceiling: {ceilLabel}.</strong> The hardest tier still cleared at 60% or better.
              {p.overallCeiling < 3 && " Teaching should begin at the tier above this one."}
            </>
          ) : (
            <>
              <strong>No tier cleared at 60%.</strong> No ceiling can be placed from this evidence — the student did not
              reach the threshold at any difficulty level, so start from foundations and reassess.
            </>
          )}
        </div>
      </div>

      {/* ── B. Domain profile ─────────────────────────────────────── */}
      <div className={`${card} p-5`}>
        <div className="mb-1 flex items-center gap-2">
          <Brain size={15} className="text-violet-600" />
          <h4 className="text-sm font-bold text-slate-900">Domain profile</h4>
        </div>
        <p className="mb-4 text-[11px] text-slate-500">
          Performance across the eight framework domains. Domains below {RELIABLE_MIN} items are marked provisional.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {p.domainProfiles.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-100 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <span>{d.icon}</span> {d.short}
                </span>
                <span className={`${num} text-xs font-bold text-slate-900`}>{d.pct ?? "—"}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${toneOfPct(d.pct)}`} style={{ width: `${d.pct ?? 0}%` }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                <span>{d.total ? `${d.correct}/${d.total} items` : "not assessed"}</span>
                {d.total > 0 && !d.reliable && <span className="text-amber-600">provisional</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cognitive profile ─────────────────────────────────────── */}
      <div className={`${card} p-5`}>
        <div className="mb-1 flex items-center gap-2">
          <GraduationCap size={15} className="text-violet-600" />
          <h4 className="text-sm font-bold text-slate-900">Cognitive profile</h4>
        </div>
        <p className="mb-4 text-[11px] text-slate-500">
          Separates knowing a procedure from deciding which procedure applies. Demand is derived from each item's skill
          type at framework level — it is a mapping rule, not a per-question expert tag.
        </p>
        <div className="space-y-2.5">
          {p.cognitiveProfile.map((c) => (
            <div key={c.id}>
              <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                <span className="font-semibold text-slate-700">{c.label}</span>
                <span className={`${num} shrink-0 text-slate-500`}>
                  {c.total ? `${c.correct}/${c.total} · ${c.pct}%` : "not assessed"}
                  {c.total > 0 && !c.reliable && <span className="ml-1 text-amber-600">provisional</span>}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${toneOfPct(c.pct)}`} style={{ width: `${c.pct ?? 0}%` }} />
              </div>
              <div className="mt-0.5 text-[10px] text-slate-400">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── D. Diagnostic weakness map ────────────────────────────── */}
      <div className={`${card} p-5`}>
        <div className="mb-1 flex items-center gap-2">
          <Target size={15} className="text-violet-600" />
          <h4 className="text-sm font-bold text-slate-900">Diagnostic weakness map</h4>
        </div>
        <p className="mb-4 text-[11px] text-slate-500">
          "Weak in Data Interpretation" is not something anyone can teach to. "Weak in Growth Rates" is a lesson. Only
          sub-skills carrying at least three items are listed.
        </p>

        {p.weakSubDomains.length === 0 && p.strongSubDomains.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center text-xs text-slate-500">
            Not enough items per sub-skill yet. A longer baseline — more questions per domain — produces this map.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-600">
                <AlertTriangle size={12} /> Needs intervention
              </div>
              {p.weakSubDomains.length ? (
                <div className="space-y-1.5">
                  {p.weakSubDomains.slice(0, 8).map((u) => (
                    <div key={`${u.domain}-${u.unit}`} className="flex items-center justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-1.5">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-rose-900">{u.unit}</div>
                        <div className="text-[10px] text-rose-500">{u.domainName}</div>
                      </div>
                      <span className={`${num} shrink-0 text-xs font-bold text-rose-700`}>{u.pct}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">No sub-skill fell below 50% on sufficient evidence.</p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                <Award size={12} /> Secure
              </div>
              {p.strongSubDomains.length ? (
                <div className="space-y-1.5">
                  {p.strongSubDomains.slice(0, 8).map((u) => (
                    <div key={`${u.domain}-${u.unit}`} className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-emerald-900">{u.unit}</div>
                        <div className="text-[10px] text-emerald-600">{u.domainName}</div>
                      </div>
                      <span className={`${num} shrink-0 text-xs font-bold text-emerald-700`}>{u.pct}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">No sub-skill reached 80% on sufficient evidence.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── E. Confidence, shown as an audit rather than a number ───────── */
function ConfidencePanel({ confidence: c }) {
  const [open, setOpen] = useState(false);
  const tone = confTone(c.band);
  const ring = tone === "emerald" ? "border-emerald-200 bg-emerald-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : "border-rose-200 bg-rose-50";
  const text = tone === "emerald" ? "text-emerald-800" : tone === "amber" ? "text-amber-800" : "text-rose-800";

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="p-5">
        <div className="mb-1 flex items-center gap-2">
          <TrendingUp size={15} className="text-violet-600" />
          <h4 className="text-sm font-bold text-slate-900">Baseline confidence</h4>
        </div>
        <p className="mb-4 text-[11px] text-slate-500">
          Whether the classification above is safe to act on. Computed from the response pattern, not from the score.
        </p>

        <div className={`rounded-xl border p-4 ${ring}`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className={`text-3xl font-extrabold ${text} ${num}`}>{c.score}</div>
            <div className="min-w-0 flex-1">
              <div className={`text-sm font-bold ${text}`}>{c.band} confidence</div>
              <div className={`text-[11px] leading-relaxed ${text} opacity-80`}>{c.advice}</div>
            </div>
          </div>
        </div>

        <button onClick={() => setOpen((o) => !o)} className={`${btnG} mt-3 w-full justify-center text-xs`}>
          {open ? "Hide" : "Show"} the {c.factors.length} signals behind this number
        </button>

        {open && (
          <div className="mt-3 space-y-2">
            {c.factors.map((f) => (
              <div key={f.label} className="flex items-start gap-3 rounded-lg border border-slate-100 px-3 py-2">
                <div className="w-36 shrink-0">
                  <div className="text-[11px] font-semibold text-slate-700">{f.label}</div>
                  <div className={`text-[10px] font-bold ${statusTone[f.status]}`}>{statusLabel[f.status]}</div>
                </div>
                <div className="text-[11px] leading-relaxed text-slate-500">{f.detail}</div>
              </div>
            ))}
            <p className="px-1 pt-1 text-[10px] leading-relaxed text-slate-400">
              Signals marked <em>not available</em> cost nothing. Absence of evidence is never counted against a student.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PRINTABLE REPORT
   Self-contained: inline styles, no external fetch, so it renders the
   same from any machine and keeps working if the app is offline.
   ══════════════════════════════════════════════════════════════════ */
function printProfile2(s, scopeLabel, pctile) {
  const p = s.profile;
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const ceil = p.overallCeiling ? ["", "Easy", "Medium", "Hard"][p.overallCeiling] : null;

  const bar = (pct, w = 150) =>
    `<span style="display:inline-block;width:${w}px;height:7px;background:#e8eaf0;border-radius:4px;vertical-align:middle;overflow:hidden">
       <span style="display:block;height:7px;width:${pct ?? 0}%;background:${
         pct === null ? "#cbd5e1" : pct >= 75 ? "#10b981" : pct >= 60 ? "#8b5cf6" : pct >= 45 ? "#f59e0b" : "#f43f5e"
       }"></span></span>`;

  const row = (label, sub, pct, meta) => `
    <tr>
      <td style="padding:5px 10px 5px 0">
        <div style="font-weight:600">${esc(label)}</div>
        ${sub ? `<div style="font-size:9px;color:#94a3b8">${esc(sub)}</div>` : ""}
      </td>
      <td style="padding:5px 10px 5px 0">${bar(pct)}</td>
      <td style="padding:5px 0;text-align:right;font-family:monospace;white-space:nowrap">${pct === null ? "—" : pct + "%"}</td>
      <td style="padding:5px 0 5px 12px;font-size:9px;color:#94a3b8;white-space:nowrap">${esc(meta || "")}</td>
    </tr>`;

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>QAAP Baseline Profile — ${esc(s.name)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
         color:#0f172a; font-size:11px; line-height:1.55; margin:0; }
  h1 { font-size:17px; margin:0 0 2px; }
  h2 { font-size:12px; margin:20px 0 6px; padding-bottom:4px; border-bottom:1.5px solid #e2e8f0;
       text-transform:uppercase; letter-spacing:.06em; color:#475569; }
  table { width:100%; border-collapse:collapse; }
  .muted { color:#64748b; }
  .note { font-size:9.5px; color:#64748b; line-height:1.5; margin-top:4px; }
  .box { border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; margin-top:8px; }
  .grid2 { display:flex; gap:12px; }
  .grid2 > div { flex:1; }
  .kpi { font-size:26px; font-weight:800; font-family:monospace; line-height:1.1; }
  .tag { display:inline-block; padding:2px 7px; border-radius:5px; font-size:9.5px; font-weight:700; }
  .pill { display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700 }
  @media print { .noprint { display:none } }
</style></head><body>

<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #7c3aed;padding-bottom:8px">
  <div>
    <h1>QAAP Baseline Aptitude Profile</h1>
    <div class="muted" style="font-size:10px">Quantitative &amp; Analytical Aptitude Proficiency Framework · COER University</div>
  </div>
  <div style="text-align:right;font-size:9px;color:#64748b">
    Generated ${esc(new Date().toLocaleString())}<br>
    ${esc(p.answered)} of ${esc(p.presented)} framework items answered${
      p.attemptCount > 1 ? `<br>${esc(p.attemptCount)} attempts · earliest response counted per question` : ""
    }
  </div>
</div>

<h2>Student</h2>
<table><tr>
  <td style="width:50%"><strong>${esc(s.name)}</strong><div class="muted">${esc(s.course)}</div></td>
  <td style="text-align:right" class="muted">ID ${esc(s.cu_id)}</td>
</tr></table>

<h2>A · Baseline score</h2>
<div class="grid2">
  <div class="box">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8">Absolute baseline</div>
    <div class="kpi">${p.overallPct ?? "—"}%</div>
    <div style="margin-top:3px"><span class="tag" style="background:#ede9fe;color:#5b21b6">${esc(p.overallLevel?.level || "—")} · ${esc(p.overallLevel?.label || "Not assessed")}</span></div>
    <div class="note">${esc(p.overallLevel?.desc || "")}</div>
  </div>
  <div class="box">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8">Within cohort</div>
    <div class="kpi">${pctile === null ? "—" : pctile + "<span style='font-size:12px'>th</span>"}</div>
    <div class="note">${
      pctile === null
        ? "Not reportable: the student is outside the selected reference population, or that population holds fewer than five assessed students."
        : `Rank within <strong>${esc(scopeLabel)}</strong>; equal scores share the midpoint of the places they occupy. A position within a group, not a measure of ability.`
    }</div>
  </div>
</div>
<div class="note">Scores are difficulty-weighted: harder items carry more weight in both the numerator and the denominator, so the figure reads as the proportion of difficulty mastered rather than the proportion of questions answered.</div>
${
  p.skipped > 0 && p.answeredAccuracy !== null
    ? `<div class="box" style="border-color:#fde68a;background:#fffbeb"><strong>${esc(p.skipped)} item${p.skipped === 1 ? "" : "s"} left unanswered.</strong> On the items actually attempted this student was correct ${esc(p.answeredAccuracy)}% of the time. The headline figure counts every item presented; the gap between the two figures is a participation finding, not an ability one.</div>`
    : ""
}

<h2>E · Confidence in this classification</h2>
<div class="box" style="border-color:${p.confidence.band === "High" ? "#a7f3d0" : p.confidence.band === "Moderate" ? "#fde68a" : "#fecdd3"};background:${p.confidence.band === "High" ? "#ecfdf5" : p.confidence.band === "Moderate" ? "#fffbeb" : "#fff1f2"}">
  <table><tr>
    <td style="width:70px"><div class="kpi">${p.confidence.score}</div></td>
    <td><strong>${esc(p.confidence.band)} confidence</strong><div class="note" style="color:#334155">${esc(p.confidence.advice)}</div></td>
  </tr></table>
</div>
<table style="margin-top:8px">
  ${p.confidence.factors
    .map(
      (f) => `<tr>
        <td style="padding:3px 10px 3px 0;width:120px;font-weight:600">${esc(f.label)}</td>
        <td style="padding:3px 10px 3px 0;width:70px"><span class="pill" style="background:${
          { good: "#d1fae5", ok: "#e0f2fe", thin: "#fef3c7", weak: "#ffe4e6", na: "#f1f5f9" }[f.status]
        };color:${{ good: "#047857", ok: "#0369a1", thin: "#b45309", weak: "#be123c", na: "#94a3b8" }[f.status]}">${
        { good: "Good", ok: "Adequate", thin: "Thin", weak: "Weak", na: "n/a" }[f.status]
      }</span></td>
        <td style="padding:3px 0;font-size:9.5px;color:#475569">${esc(f.detail)}</td>
      </tr>`
    )
    .join("")}
</table>
<div class="note">Signals marked n/a could not be evaluated and carry no penalty. Absence of evidence is never counted against the student.</div>

<h2>C · Difficulty profile</h2>
<table>${p.difficultyProfile
    .map((d) => row(d.label, null, d.pct, d.total ? `${d.correct}/${d.total}${d.reliable ? "" : " · provisional"}` : "not assessed"))
    .join("")}</table>
<div class="box" style="border-color:${ceil ? "#ddd6fe" : "#fde68a"};background:${ceil ? "#f5f3ff" : "#fffbeb"}">
  ${
    ceil
      ? `<strong>Ability ceiling: ${esc(ceil)}.</strong> The hardest difficulty tier still cleared at 60% or better.${
          p.overallCeiling < 3 ? " Teaching should begin at the tier above this one." : ""
        }`
      : `<strong>No difficulty tier was cleared at 60%.</strong> No ceiling can be placed from this evidence. Begin from foundations and reassess.`
  }
</div>

<h2>B · Domain profile</h2>
<table>${p.domainProfiles
    .map((d) => row(`${d.icon} ${d.name}`, null, d.pct, d.total ? `${d.correct}/${d.total}${d.reliable ? "" : " · provisional"}` : "not assessed"))
    .join("")}</table>

<h2>Cognitive profile</h2>
<table>${p.cognitiveProfile
    .map((c) => row(c.label, c.desc, c.pct, c.total ? `${c.correct}/${c.total}${c.reliable ? "" : " · provisional"}` : "not assessed"))
    .join("")}</table>
<div class="note">Cognitive demand is derived from each item's skill type as a framework-level mapping rule, not assigned per question by a reviewer.</div>

<h2>D · Diagnostic weakness map</h2>
${
  p.weakSubDomains.length || p.strongSubDomains.length
    ? `<div class="grid2">
        <div class="box">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#be123c;margin-bottom:5px">Needs intervention</div>
          ${
            p.weakSubDomains.length
              ? p.weakSubDomains
                  .slice(0, 10)
                  .map((u) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0"><span>${esc(u.unit)} <span class="muted" style="font-size:9px">· ${esc(u.domainName)}</span></span><strong style="font-family:monospace">${u.pct}%</strong></div>`)
                  .join("")
              : `<div class="muted">No sub-skill fell below 50% on sufficient evidence.</div>`
          }
        </div>
        <div class="box">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#047857;margin-bottom:5px">Secure</div>
          ${
            p.strongSubDomains.length
              ? p.strongSubDomains
                  .slice(0, 10)
                  .map((u) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0"><span>${esc(u.unit)} <span class="muted" style="font-size:9px">· ${esc(u.domainName)}</span></span><strong style="font-family:monospace">${u.pct}%</strong></div>`)
                  .join("")
              : `<div class="muted">No sub-skill reached 80% on sufficient evidence.</div>`
          }
        </div>
      </div>`
    : `<div class="box muted">Not enough items per sub-skill to produce a diagnostic map. A longer baseline — more questions per domain — produces this section.</div>`
}

<h2>Recommended next step</h2>
<div class="box">
  ${
    p.confidence.band === "Low"
      ? `<strong>Reassess before intervening.</strong> The response pattern does not support a classification that can be acted on. Re-run the baseline on a fuller paper before assigning this student to an intervention group.`
      : p.weakSubDomains.length
      ? `<strong>Target ${esc(p.weakSubDomains.slice(0, 3).map((u) => u.unit).join(", "))}.</strong> These are the specific sub-skills below 50% on sufficient evidence${
          ceil ? `, worked at the ${esc(ceil)} tier and above` : ""
        }.${p.confidence.band === "Moderate" ? " Confidence is moderate, so confirm with a follow-up assessment." : ""}`
      : `<strong>No sub-skill gap identified on current evidence.</strong> ${
          ceil && p.overallCeiling < 3
            ? `Extend the student above the ${esc(ceil)} tier to locate the true ceiling.`
            : `Maintain and extend with harder material.`
        }`
  }
</div>

<div style="margin-top:22px;border-top:1px solid #e2e8f0;padding-top:7px;font-size:8.5px;color:#94a3b8;line-height:1.5">
  Generated from the institutional QAAP assessment database. Figures are computed from recorded responses only; no value
  on this report is estimated or imputed. A baseline estimates aptitude at a point in time and is not a measure of
  academic merit, potential or attainment.
</div>

<div class="noprint" style="margin-top:18px;text-align:center">
  <button onclick="window.print()" style="padding:9px 20px;border:0;border-radius:9px;background:#7c3aed;color:#fff;font-weight:700;font-size:12px;cursor:pointer">Print / Save as PDF</button>
</div>
</body></html>`;

  const w = window.open("", "_blank");
  /* A blocked popup used to fail silently — the button simply did
     nothing and the user had no way to know why. */
  if (!w) {
    alert("The report opens in a new tab, which the browser blocked. Allow pop-ups for this site and try again.");
    return;
  }
  w.document.write(html);
  w.document.close();
}
