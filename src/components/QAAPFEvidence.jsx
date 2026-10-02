/* ══════════════════════════════════════════════════════════════════
   QAAPF — Baseline Assessment, Benchmarking & Accreditation Evidence
   ══════════════════════════════════════════════════════════════════
   An honest evidence layer over the QAAPF diagnostic. Every number here
   is COMPUTED from real attempt/item data — nothing is fabricated and
   nothing is claimed that the data cannot support.

   Design principles carried from the institutional spec:
     • QAAPF is an institution-internal diagnostic. It is NOT mandated by
       NAAC / NBA / NIRF / UGC. The evidence map shows how its data can
       *support* those frameworks' existing themes — never that it is
       required by them.
     • A non-attempt is NEVER a zero. Pending students are counted and
       reported separately from low scorers.
     • Reliability / validity statistics are shown only when the sample
       supports them; otherwise a warning is shown, never a number.
     • Threshold and band changes are explicit and version-stamped onto
       every generated register, so historical classification is never
       silently rewritten.
   ══════════════════════════════════════════════════════════════════ */

import { useState, useMemo, useEffect } from "react";
import {
  Shield, LayoutDashboard, Users, UserX, User, Layers, TrendingUp,
  FlaskConical, FileCheck2, FileDown, Settings, ScrollText, Award,
  AlertTriangle, CheckCircle2, Printer, Search, ChevronDown, Info,
  ClipboardList,
} from "lucide-react";
import { card, btn, btnP, btnG, inp, num, Badge, Empty, Stat, Toast } from "./ui.jsx";
import { downloadCSV } from "../lib/csv.js";
import { logAudit, fetchAuditLog, fetchClassroomMembers } from "../lib/db.js";
import { useAuth } from "../lib/AuthContext.jsx";
/* QAAPF.jsx imports this file, so this is a cycle. Safe only because
   both symbols are referenced inside function bodies, never at module
   scope — at import time these bindings are still uninitialised. */
import { DOMAINS, computeQAAPFProfile } from "./QAAPF.jsx";

/* ── Statistics primitives (pure, testable) ───────────────────────── */
const asc = (a, b) => a - b;
export const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
export const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort(asc), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const modeOf = (a) => {
  if (!a.length) return null;
  const f = new Map(); let best = a[0], bc = 0;
  for (const x of a) { const c = (f.get(x) || 0) + 1; f.set(x, c); if (c > bc) { bc = c; best = x; } }
  return bc > 1 ? best : null;   // no meaningful mode if everything is unique
};
export const stdev = (a) => {
  if (a.length < 2) return null;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); // sample SD
};
export const quantile = (a, q) => {
  if (!a.length) return null;
  const s = [...a].sort(asc), pos = (s.length - 1) * q, base = Math.floor(pos), rest = pos - base;
  return s[base + 1] !== undefined ? s[base] + rest * (s[base + 1] - s[base]) : s[base];
};
/* Percentile rank of v within arr — % scoring at-or-below, midrank for ties. */
export const percentileRank = (arr, v) => {
  if (!arr.length) return null;
  let below = 0, equal = 0;
  for (const x of arr) { if (x < v) below++; else if (x === v) equal++; }
  return Math.round((100 * (below + 0.5 * equal)) / arr.length);
};
const r1 = (x) => (x === null || x === undefined ? null : Math.round(x * 10) / 10);
const r0 = (x) => (x === null || x === undefined ? null : Math.round(x));

/* ── Item analysis (Classical Test Theory) ────────────────────────
   For a set of attempts on ONE assessment, per question:
     p  = difficulty index  = fraction of attempters who got it right
     D  = discrimination    = p(top 27%) − p(bottom 27%) on total score
     distractor split       = % choosing each option, + % unattempted
   Flags are advisory review flags — never auto-deletions.               */
export function itemAnalysis(attempts) {
  const valid = attempts.filter((a) => Array.isArray(a.items) && a.items.length);
  const n = valid.length;
  // Rank students by total score for discrimination groups.
  const scored = valid
    .map((a) => ({ a, sc: a.items.reduce((s, it) => s + (it.chosen === it.correct ? 1 : 0), 0) }))
    .sort((x, y) => y.sc - x.sc);
  const g = Math.max(1, Math.round(n * 0.27));
  const topSet = new Set(scored.slice(0, g).map((x) => x.a));
  const botSet = new Set(scored.slice(-g).map((x) => x.a));

  const byQ = new Map();
  for (const a of valid) {
    const isTop = topSet.has(a), isBot = botSet.has(a);
    for (const it of a.items) {
      const key = it.qid || it.question;
      if (!byQ.has(key)) {
        byQ.set(key, {
          qid: it.qid, question: it.question, correct: it.correct,
          options: it.options || [], seen: 0, right: 0,
          picks: {}, skipped: 0, topN: 0, topR: 0, botN: 0, botR: 0,
        });
      }
      const r = byQ.get(key);
      r.seen++;
      const ok = it.chosen === it.correct;
      if (ok) r.right++;
      if (it.chosen === null || it.chosen === undefined) r.skipped++;
      else r.picks[it.chosen] = (r.picks[it.chosen] || 0) + 1;
      if (isTop) { r.topN++; if (ok) r.topR++; }
      if (isBot) { r.botN++; if (ok) r.botR++; }
    }
  }

  const items = [...byQ.values()].map((r) => {
    const p = r.seen ? r.right / r.seen : null;
    const pt = r.topN ? r.topR / r.topN : null;
    const pb = r.botN ? r.botR / r.botN : null;
    const D = pt !== null && pb !== null ? pt - pb : null;
    const flags = [];
    if (p !== null && p >= 0.95) flags.push("Very easy");
    if (p !== null && p <= 0.2) flags.push("Very hard");
    if (D !== null && D < 0.1 && r.seen >= 10) flags.push("Poor discrimination");
    if (D !== null && D < 0 && r.seen >= 10) flags.push("Negative discrimination");
    // Non-functioning distractor: a wrong option almost nobody picked.
    const nfd = (r.options || []).some((_, i) => i !== r.correct && r.seen >= 20 && (r.picks[i] || 0) / r.seen < 0.02);
    if (nfd) flags.push("Non-functioning distractor");
    return { ...r, p, D, flags };
  });
  return { n, items, groupSize: g };
}

/* ── Reliability (only on a common item set, with guards) ──────────
   Cronbach's alpha, split-half (Spearman-Brown), and SEM. Computed on
   the intersection of items answered by every included attempt, so the
   person×item matrix is complete. Returns {ok:false, reason} when the
   sample is too small — we never invent a coefficient.                  */
export function reliability(attempts, { minStudents = 10, minItems = 5 } = {}) {
  const valid = attempts.filter((a) => Array.isArray(a.items) && a.items.length);
  if (valid.length < minStudents)
    return { ok: false, reason: `Only ${valid.length} valid responses — below the ${minStudents} needed for a stable estimate.`, nStudents: valid.length };
  // Common item set.
  let common = null;
  for (const a of valid) {
    const ids = new Set(a.items.map((it) => it.qid || it.question));
    common = common === null ? ids : new Set([...common].filter((x) => ids.has(x)));
  }
  const itemIds = [...(common || [])];
  if (itemIds.length < minItems)
    return { ok: false, reason: `Only ${itemIds.length} items were common to all attempts — below the ${minItems} needed. (This happens when the assessment draws a different random subset per student.)`, nStudents: valid.length, nItems: itemIds.length };

  // Build 0/1 matrix on the common items.
  const matrix = valid.map((a) => {
    const m = new Map(a.items.map((it) => [it.qid || it.question, it.chosen === it.correct ? 1 : 0]));
    return itemIds.map((id) => m.get(id) || 0);
  });
  const k = itemIds.length, N = matrix.length;
  const totals = matrix.map((row) => row.reduce((s, x) => s + x, 0));
  const varOf = (arr) => { const m = mean(arr); return arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length; };
  const itemVarSum = itemIds.reduce((s, _, j) => s + varOf(matrix.map((row) => row[j])), 0);
  const totalVar = varOf(totals);
  const alpha = totalVar > 0 ? (k / (k - 1)) * (1 - itemVarSum / totalVar) : null;

  // Split-half: odd vs even items, correlate, Spearman-Brown.
  const oddIdx = itemIds.map((_, j) => j).filter((j) => j % 2 === 0);
  const evenIdx = itemIds.map((_, j) => j).filter((j) => j % 2 === 1);
  const sumIdx = (row, idx) => idx.reduce((s, j) => s + row[j], 0);
  const A = matrix.map((row) => sumIdx(row, oddIdx));
  const B = matrix.map((row) => sumIdx(row, evenIdx));
  const corr = (x, y) => {
    const mx = mean(x), my = mean(y);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
  };
  const rhh = corr(A, B);
  const splitHalf = rhh !== null ? (2 * rhh) / (1 + rhh) : null;

  // SEM in raw-score points, then as a % of k.
  const sdTotal = stdev(totals);
  const sem = alpha !== null && sdTotal !== null ? sdTotal * Math.sqrt(1 - alpha) : null;

  return {
    ok: true, nStudents: N, nItems: k, alpha, splitHalf, sem,
    semPct: sem !== null ? (sem / k) * 100 : null,
    meanTotal: mean(totals), sdTotal,
  };
}

/* ── Configurable baseline bands (§28) ─────────────────────────────
   Persisted per-browser. Every generated register stamps the config
   version + values in effect, so historical classification is never
   silently rewritten when someone edits the bands later.               */
const DEFAULT_BANDS = [
  { key: "critical",  label: "Critical Intervention", min: 0,  max: 30,  tone: "bg-rose-100 text-rose-700 border-rose-200" },
  { key: "needs",     label: "Needs Intervention",    min: 31, max: 45,  tone: "bg-orange-100 text-orange-700 border-orange-200" },
  { key: "developing",label: "Developing",            min: 46, max: 60,  tone: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "proficient",label: "Proficient",            min: 61, max: 75,  tone: "bg-violet-100 text-violet-700 border-violet-200" },
  { key: "advanced",  label: "Advanced",              min: 76, max: 100, tone: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];
const BANDS_KEY = "qaapf.bands.v2";
function loadBands() {
  try {
    const raw = JSON.parse(localStorage.getItem(BANDS_KEY) || "null");
    if (raw && Array.isArray(raw.bands) && raw.bands.length) return raw;
  } catch (_) {}
  return { version: 1, updatedAt: null, updatedBy: null, bands: DEFAULT_BANDS };
}
function saveBands(cfg) { try { localStorage.setItem(BANDS_KEY, JSON.stringify(cfg)); } catch (_) {} }
const bandFor = (pct, bands) =>
  pct === null || pct === undefined ? null : bands.find((b) => pct >= b.min && pct <= b.max) || bands[bands.length - 1];

/* ── SHA-256 content fingerprint for generated reports ─────────────── */
async function fingerprint(str) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12).toUpperCase();
  } catch (_) { return null; }
}

/* ══════════════════════════════════════════════════════════════════
   ROOT
   ══════════════════════════════════════════════════════════════════ */
const SUBTABS = [
  ["dashboard", "Dashboard",   LayoutDashboard],
  ["attempted", "Attempted",   Users],
  ["pending",   "Pending",     UserX],
  ["student",   "Individual",  User],
  ["cohort",    "Cohort / Section", Layers],
  ["progress",  "Baseline vs Progress", TrendingUp],
  ["quality",   "Item & Reliability", FlaskConical],
  ["evidence",  "Evidence Map", FileCheck2],
  ["visit",     "Visit-Ready Pack", Award],
  ["settings",  "Thresholds", Settings],
  ["audit",     "Audit Trail", ScrollText],
];

export default function QAAPFEvidence({ attempts, questions, quizzes, classrooms }) {
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const toast2 = (m, t = "emerald") => { setToast({ m, t }); setTimeout(() => setToast(null), 3500); };

  const [bandsCfg, setBandsCfg] = useState(loadBands);

  // ── Scope filters (shared across most sections) ──
  const roomOf = useMemo(() => {
    const m = {}; for (const q of quizzes || []) m[q.id] = q.classroom_id || null; return m;
  }, [quizzes]);
  const years = useMemo(() => {
    const s = new Set();
    for (const a of attempts || []) if (a.submitted_at) s.add(new Date(a.submitted_at).getFullYear());
    return [...s].sort((a, b) => b - a);
  }, [attempts]);

  const [quizId, setQuizId] = useState("all");
  const [roomId, setRoomId] = useState("all");
  const [year, setYear] = useState("all");

  const scoped = useMemo(() => {
    return (attempts || []).filter((a) => {
      if (quizId !== "all" && a.quiz_id !== quizId) return false;
      if (roomId !== "all" && roomOf[a.quiz_id] !== roomId) return false;
      if (year !== "all" && (!a.submitted_at || new Date(a.submitted_at).getFullYear() !== Number(year))) return false;
      return true;
    });
  }, [attempts, quizId, roomId, year, roomOf]);

  // ── One baseline row per student (earliest attempt in scope) ──
  const rows = useMemo(() => buildRows(scoped, questions, bandsCfg.bands), [scoped, questions, bandsCfg]);

  const scopeLabel = useMemo(() => {
    const parts = [];
    parts.push(quizId === "all" ? "All assessments" : (quizzes.find((q) => q.id === quizId)?.title || "Assessment"));
    if (roomId !== "all") parts.push(classrooms.find((c) => c.id === roomId)?.name || "Section");
    if (year !== "all") parts.push(String(year));
    return parts.join(" · ");
  }, [quizId, roomId, year, quizzes, classrooms]);

  const shared = { attempts, scoped, rows, questions, quizzes, classrooms, bandsCfg, scopeLabel, quizId, roomId, year, toast2 };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.m} tone={toast.t} onDismiss={() => setToast(null)} />}

      {/* honest disclaimer — always visible */}
      <div className="flex gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-[12px] leading-relaxed text-amber-900">
        <Info size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <p>
          QAAPF is an <b>institution-internal diagnostic</b>. It is <b>not prescribed or mandated</b> by NAAC, NBA, NIRF or UGC.
          Everything below is computed from your students' actual attempts — the module shows how this baseline data can
          <b> support</b> outcome-based-education and student-development narratives, and never treats a non-attempt as a zero.
        </p>
      </div>

      {/* scope bar */}
      <div className={`${card} p-3.5`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Scope</span>
          <select value={quizId} onChange={(e) => setQuizId(e.target.value)} className={`${inp} !w-auto !py-1.5 text-xs`}>
            <option value="all">All assessments</option>
            {(quizzes || []).map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
          </select>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={`${inp} !w-auto !py-1.5 text-xs`}>
            <option value="all">All sections</option>
            {(classrooms || []).filter((c) => !c.is_archived).map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ""}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={`${inp} !w-auto !py-1.5 text-xs`}>
            <option value="all">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="ml-auto text-[11px] text-slate-400">{rows.length} student{rows.length === 1 ? "" : "s"} · {scoped.length} attempt{scoped.length === 1 ? "" : "s"} in scope</span>
        </div>
      </div>

      {/* sub-tab bar */}
      <div className="flex flex-wrap gap-1.5">
        {SUBTABS.map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${tab === t ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <EvDashboard {...shared} />}
      {tab === "attempted" && <EvAttempted {...shared} />}
      {tab === "pending"   && <EvPending {...shared} setQuizId={setQuizId} setRoomId={setRoomId} />}
      {tab === "student"   && <EvIndividual {...shared} />}
      {tab === "cohort"    && <EvCohort {...shared} roomOf={roomOf} />}
      {tab === "progress"  && <EvProgress {...shared} />}
      {tab === "quality"   && <EvQuality {...shared} setQuizId={setQuizId} />}
      {tab === "evidence"  && <EvEvidenceMap {...shared} />}
      {tab === "visit"     && <EvVisitPack {...shared} />}
      {tab === "settings"  && <EvSettings bandsCfg={bandsCfg} setBandsCfg={(c) => { saveBands(c); setBandsCfg(c); }} toast2={toast2} />}
      {tab === "audit"     && <EvAudit />}
    </div>
  );
}

/* Build one baseline row per student within scope. Baseline = the
   EARLIEST attempt (entry diagnostic). Also keeps the latest attempt for
   progress analysis. Percentile is computed against the scope cohort. */
function buildRows(scoped, questions, bands) {
  const byUser = new Map();
  for (const a of scoped) {
    if (!a.user_id) continue;
    if (!byUser.has(a.user_id)) byUser.set(a.user_id, []);
    byUser.get(a.user_id).push(a);
  }
  const rows = [];
  for (const [uid, list] of byUser) {
    list.sort((x, y) => new Date(x.submitted_at) - new Date(y.submitted_at));
    const baseline = list[0], latest = list[list.length - 1];
    const bProfile = computeQAAPFProfile([baseline], questions);
    const it = baseline.items || [];
    const correct = it.filter((x) => x.chosen === x.correct).length;
    const answered = it.filter((x) => x.chosen !== null && x.chosen !== undefined).length;
    rows.push({
      uid,
      name: baseline.student_name || "—",
      course: baseline.meta?.course || baseline.student_course || "—",
      cu_id: baseline.meta?.cu_id || baseline.student_cu_id || "—",
      semester: baseline.meta?.semester || baseline.student_semester || "—",
      roomId: null,
      baseline, latest, attemptCount: list.length,
      pct: baseline.percent ?? bProfile.overallPct ?? 0,
      qlevel: bProfile.overallLevel,
      profile: bProfile,
      totalQ: it.length, answered, correct, incorrect: answered - correct, skipped: it.length - answered,
      timeSec: baseline.time_used_sec || 0,
      band: null, percentile: null,
    });
  }
  const pctArr = rows.map((r) => r.pct);
  for (const r of rows) {
    r.percentile = percentileRank(pctArr, r.pct);
    r.band = bandFor(r.pct, bands);
  }
  return rows.sort((a, b) => b.pct - a.pct);
}

const fmtMin = (s) => (s ? `${Math.floor(s / 60)}m ${s % 60}s` : "—");
const dpct = (r, id) => r.profile.domainProfiles.find((p) => p.id === id)?.pct;

/* ══════════════════════════════════════════════════════════════════
   3. DASHBOARD
   ══════════════════════════════════════════════════════════════════ */
function EvDashboard({ rows, scopeLabel, bandsCfg }) {
  const scores = rows.map((r) => r.pct);
  const bandCounts = bandsCfg.bands.map((b) => ({ ...b, count: rows.filter((r) => r.band?.key === b.key).length }));
  // 10-point histogram
  const hist = Array.from({ length: 10 }, (_, i) => ({ lo: i * 10, hi: i * 10 + 9, count: scores.filter((s) => s >= i * 10 && s < i * 10 + 10).length }));
  if (hist[9]) hist[9].count = scores.filter((s) => s >= 90).length;
  const maxH = Math.max(1, ...hist.map((h) => h.count));

  if (!rows.length) return <Empty icon={LayoutDashboard} title="No attempts in this scope" hint="Adjust the scope above, or run a QAAPF baseline test first." />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Users} label="Students attempted" value={rows.length} tone="violet" />
        <Stat icon={Award} label="Average baseline" value={`${r0(mean(scores))}%`} tone="sky" />
        <Stat icon={TrendingUp} label="Median" value={`${r0(median(scores))}%`} tone="emerald" />
        <Stat icon={FlaskConical} label="Std deviation" value={r1(stdev(scores)) ?? "—"} tone="amber" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={ClipboardList} label="Highest" value={`${Math.max(...scores)}%`} />
        <Stat icon={ClipboardList} label="Lowest" value={`${Math.min(...scores)}%`} />
        <Stat icon={ClipboardList} label="25th pctile" value={`${r0(quantile(scores, 0.25))}%`} />
        <Stat icon={ClipboardList} label="75th pctile" value={`${r0(quantile(scores, 0.75))}%`} />
      </div>

      {/* Baseline categories */}
      <div className={`${card} p-5`}>
        <h3 className="mb-1 text-sm font-bold text-slate-900">Baseline categories</h3>
        <p className="mb-4 text-[11px] text-slate-400">Configurable bands (Thresholds tab) · {scopeLabel}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {bandCounts.map((b) => (
            <div key={b.key} className={`rounded-xl border p-3 text-center ${b.tone}`}>
              <div className={`text-2xl font-extrabold ${num}`}>{b.count}</div>
              <div className="text-[11px] font-bold leading-tight">{b.label}</div>
              <div className="text-[10px] opacity-70">{b.min}–{b.max}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution histogram */}
      <div className={`${card} p-5`}>
        <h3 className="mb-4 text-sm font-bold text-slate-900">Score distribution</h3>
        <div className="flex items-end gap-1.5" style={{ height: 140 }}>
          {hist.map((h, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className={`text-[10px] font-bold ${num} text-slate-500`}>{h.count || ""}</span>
              <div className="w-full rounded-t-md bg-violet-500/80 transition-all" style={{ height: `${(h.count / maxH) * 100}%`, minHeight: h.count ? 3 : 0 }} />
              <span className="text-[9px] text-slate-400">{h.lo}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   4. ATTEMPTED STUDENTS
   ══════════════════════════════════════════════════════════════════ */
function EvAttempted({ rows, scopeLabel }) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("pct");
  const [dir, setDir] = useState(-1);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let out = rows.filter((r) => !t || [r.name, r.course, r.cu_id].some((v) => String(v).toLowerCase().includes(t)));
    const get = (r) => ({ name: r.name, course: r.course, pct: r.pct, percentile: r.percentile, correct: r.correct, band: r.band?.min ?? 0, time: r.timeSec }[sortKey]);
    out = [...out].sort((a, b) => { const x = get(a), y = get(b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * dir; });
    return out;
  }, [rows, q, sortKey, dir]);

  const setSort = (k) => { if (sortKey === k) setDir(-dir); else { setSortKey(k); setDir(-1); } };

  const exportCSV = () => downloadCSV("qaapf-attempted.csv", filtered, [
    { label: "Name", value: (r) => r.name }, { label: "CU ID", value: (r) => r.cu_id },
    { label: "Course", value: (r) => r.course }, { label: "Semester", value: (r) => r.semester },
    { label: "Assessment date", value: (r) => r.baseline.submitted_at ? new Date(r.baseline.submitted_at).toLocaleString() : "" },
    { label: "Attempt #", value: (r) => r.baseline.attempt_number || 1 },
    { label: "Total Q", value: (r) => r.totalQ }, { label: "Answered", value: (r) => r.answered },
    { label: "Correct", value: (r) => r.correct }, { label: "Incorrect", value: (r) => r.incorrect },
    { label: "Unattempted", value: (r) => r.skipped },
    { label: "Raw score", value: (r) => r.baseline.score ?? "" }, { label: "Percentage", value: (r) => r.pct },
    { label: "Percentile (scope)", value: (r) => r.percentile }, { label: "Q-Level", value: (r) => r.qlevel?.level || "" },
    { label: "Category", value: (r) => r.band?.label || "" },
    ...DOMAINS.map((d) => ({ label: d.short, value: (r) => dpct(r, d.id) ?? "" })),
    { label: "Time", value: (r) => fmtMin(r.timeSec) }, { label: "Status", value: () => "Submitted" },
  ]);

  const th = (k, label, cls = "") => (
    <th className={`cursor-pointer px-2.5 py-2.5 ${cls}`} onClick={() => setSort(k)}>
      <span className="inline-flex items-center gap-0.5">{label}{sortKey === k && <ChevronDown size={11} className={dir === 1 ? "rotate-180" : ""} />}</span>
    </th>
  );

  if (!rows.length) return <Empty icon={Users} title="No attempts in this scope" hint="Adjust the scope above." />;

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / ID / course" className={`${inp} !w-56 !py-1.5 !pl-8 text-xs`} />
        </div>
        <button onClick={exportCSV} className={`${btnG} !py-1.5 !px-3 !text-xs`}><FileDown size={13} /> Export CSV</button>
      </div>
      <div className="overflow-auto max-h-[70vh]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              {th("name", "Student")}
              {th("course", "Course", "hidden sm:table-cell")}
              {th("correct", "Correct", "text-center")}
              {th("pct", "%", "text-center")}
              {th("percentile", "Pctile", "text-center")}
              <th className="px-2.5 py-2.5 text-center">Level</th>
              {DOMAINS.map((d) => <th key={d.id} className="px-1.5 py-2.5 text-center hidden lg:table-cell" title={d.name}>{d.short}</th>)}
              <th className="px-2.5 py-2.5">Category</th>
              {th("time", "Time", "text-center hidden md:table-cell")}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((r) => (
              <tr key={r.uid} className="hover:bg-slate-50">
                <td className="px-2.5 py-2 font-medium text-slate-800">{r.name}<div className="text-[10px] text-slate-400">{r.cu_id}</div></td>
                <td className="px-2.5 py-2 text-slate-500 hidden sm:table-cell">{r.course}</td>
                <td className={`px-2.5 py-2 text-center ${num} text-slate-600`}>{r.correct}/{r.totalQ}</td>
                <td className={`px-2.5 py-2 text-center font-bold ${num}`}>{r.pct}%</td>
                <td className={`px-2.5 py-2 text-center ${num} text-slate-500`}>{r.percentile}</td>
                <td className="px-2.5 py-2 text-center">{r.qlevel ? <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${r.qlevel.light}`}>{r.qlevel.level}</span> : "—"}</td>
                {DOMAINS.map((d) => { const p = dpct(r, d.id); return <td key={d.id} className={`px-1.5 py-2 text-center hidden lg:table-cell ${num} ${p == null ? "text-slate-200" : p >= 70 ? "text-emerald-600" : p >= 50 ? "text-amber-600" : "text-rose-600"}`}>{p == null ? "—" : p}</td>; })}
                <td className="px-2.5 py-2"><span className={`inline-block rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${r.band?.tone}`}>{r.band?.label}</span></td>
                <td className={`px-2.5 py-2 text-center text-slate-500 hidden md:table-cell ${num}`}>{fmtMin(r.timeSec)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   5. PENDING / NOT-ATTEMPTED  (real roster from classroom_members)
   ══════════════════════════════════════════════════════════════════ */
function EvPending({ rows, classrooms, roomId, quizId, quizzes, setRoomId }) {
  const [members, setMembers] = useState(null);
  const [loading, setLoading] = useState(false);
  const attemptedIds = useMemo(() => new Set(rows.map((r) => r.uid)), [rows]);

  useEffect(() => {
    let live = true;
    if (roomId === "all") { setMembers(null); return; }
    setLoading(true);
    fetchClassroomMembers(roomId)
      .then((m) => { if (live) setMembers(m || []); })
      .catch(() => { if (live) setMembers([]); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [roomId]);

  if (roomId === "all")
    return (
      <div className={`${card} p-6`}>
        <Empty icon={UserX} title="Select a section to see who is pending"
          hint="Pending students are computed from a section's real roster minus those who attempted. Choose a section in the scope bar." />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {(classrooms || []).filter((c) => !c.is_archived).slice(0, 8).map((c) => (
            <button key={c.id} onClick={() => setRoomId(c.id)} className={`${btnG} !py-1.5 !px-3 !text-xs`}>{c.name}</button>
          ))}
        </div>
      </div>
    );

  if (loading) return <div className={`${card} p-8 text-center text-sm text-slate-400`}>Loading roster…</div>;
  const pending = (members || []).filter((m) => !attemptedIds.has(m.user_id));
  const room = classrooms.find((c) => c.id === roomId);
  const cov = members && members.length ? Math.round(((members.length - pending.length) / members.length) * 100) : 0;

  const exportCSV = () => downloadCSV("qaapf-pending.csv", pending, [
    { label: "Name", value: (m) => m.profile?.full_name || "—" },
    { label: "Email", value: (m) => m.profile?.email || "—" },
    { label: "Section", value: () => room?.name || "" },
    { label: "Assessment", value: () => (quizId === "all" ? "Any QAAPF" : quizzes.find((q) => q.id === quizId)?.title || "") },
    { label: "Status", value: () => "Not attempted" },
  ]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Users} label="On roster" value={members?.length ?? 0} />
        <Stat icon={CheckCircle2} label="Attempted" value={(members?.length ?? 0) - pending.length} tone="emerald" />
        <Stat icon={UserX} label="Pending" value={pending.length} tone={pending.length ? "amber" : "emerald"} />
      </div>
      <div className={`${card} p-3.5 text-xs text-slate-500`}>
        Coverage in <b>{room?.name}</b>: <b className={num}>{cov}%</b> of the roster has attempted a QAAPF assessment in the current scope.
        A pending student is <b>not</b> a zero — they simply have not participated yet.
      </div>
      {!pending.length ? (
        <div className={`${card} p-6`}><Empty icon={CheckCircle2} title="Everyone on this roster has attempted" hint="Full coverage for the current scope." /></div>
      ) : (
        <div className={`${card} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h4 className="text-sm font-bold text-slate-900">Pending students · {pending.length}</h4>
            <button onClick={exportCSV} className={`${btnG} !py-1.5 !px-3 !text-xs`}><FileDown size={13} /> Export</button>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-2.5">Student</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pending.map((m) => (
                <tr key={m.user_id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-800">{m.profile?.full_name || "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{m.profile?.email || "—"}</td>
                  <td className="px-4 py-2"><Badge tone="amber">Not attempted</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   6 + 25. INDIVIDUAL PROFILE + printable evidence report
   ══════════════════════════════════════════════════════════════════ */
function EvIndividual({ rows, scopeLabel, toast2 }) {
  const { user, profile } = useAuth();
  const [sel, setSel] = useState(rows[0]?.uid || "");
  const r = rows.find((x) => x.uid === sel);

  const printReport = () => {
    if (!r) return;
    logAudit({ actor_id: user?.id, actor_name: profile?.full_name, action: "report.generate", target: `Individual evidence — ${r.name}`, meta: { scope: scopeLabel } });
    openStudentEvidenceReport(r, scopeLabel);
    toast2("Report opened in a print window");
  };

  if (!rows.length) return <Empty icon={User} title="No students in scope" hint="Adjust the scope above." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={sel} onChange={(e) => setSel(e.target.value)} className={`${inp} !w-auto !py-2 text-sm`}>
          {rows.map((x) => <option key={x.uid} value={x.uid}>{x.name} — {x.pct}%</option>)}
        </select>
        {r && <button onClick={printReport} className={`${btnP} !py-2`}><Printer size={15} /> Evidence report</button>}
      </div>
      {r && (
        <div className={`${card} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-lg font-extrabold text-slate-900">{r.name}</div>
              <div className="text-xs text-slate-500">{r.cu_id} · {r.course} · Sem {r.semester}</div>
              <div className="mt-1 text-[11px] text-slate-400">Baseline: {r.baseline.submitted_at ? new Date(r.baseline.submitted_at).toLocaleString() : "—"} · Attempt #{r.baseline.attempt_number || 1} · {fmtMin(r.timeSec)}</div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-extrabold ${num}`}>{r.pct}%</div>
              {r.qlevel && <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-bold ${r.qlevel.light}`}>{r.qlevel.level} · {r.qlevel.label}</span>}
              <div className="mt-1 text-[11px] text-slate-400">{r.percentile}th pctile in scope</div>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {DOMAINS.map((d) => {
              const dp = r.profile.domainProfiles.find((p) => p.id === d.id);
              const p = dp?.pct;
              return (
                <div key={d.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{d.icon} {d.name}</span>
                    <span className={`font-bold ${num} ${p == null ? "text-slate-300" : ""}`}>{p == null ? "not assessed" : `${p}%`}</span>
                  </div>
                  {p != null && (
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${p >= 70 ? "bg-emerald-500" : p >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${p}%` }} />
                    </div>
                  )}
                  {dp && !dp.reliable && p != null && <div className="mt-1 text-[10px] text-amber-600">few items — interpret with caution</div>}
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-3">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Strengths</div>
              {r.profile.strengths.length ? r.profile.strengths.map((s) => <div key={s.id} className="text-xs text-emerald-800">{s.name} — {s.pct}%</div>) : <div className="text-xs text-emerald-800/60">None above 70% yet</div>}
            </div>
            <div className="rounded-xl bg-rose-50 p-3">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-rose-700">Development gaps</div>
              {r.profile.gaps.length ? r.profile.gaps.map((s) => <div key={s.id} className="text-xs text-rose-800">{s.name} — {s.pct}%</div>) : <div className="text-xs text-rose-800/60">No domain below 60%</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   9 + 10 + 11. COHORT / SECTION / DOMAIN
   ══════════════════════════════════════════════════════════════════ */
function EvCohort({ scoped, questions, classrooms, roomOf, bandsCfg }) {
  // Group scoped attempts by their quiz's classroom.
  const sections = useMemo(() => {
    const g = new Map();
    for (const a of scoped) {
      const rid = roomOf[a.quiz_id] || "none";
      if (!g.has(rid)) g.set(rid, []);
      g.get(rid).push(a);
    }
    return [...g.entries()].map(([rid, atts]) => {
      const rws = buildRows(atts, questions, bandsCfg.bands);
      const scores = rws.map((r) => r.pct);
      const domAvg = {};
      for (const d of DOMAINS) {
        const vals = rws.map((r) => dpct(r, d.id)).filter((x) => x != null);
        domAvg[d.id] = vals.length ? r0(mean(vals)) : null;
      }
      return {
        rid, name: rid === "none" ? "Unassigned" : (classrooms.find((c) => c.id === rid)?.name || "Section"),
        n: rws.length, mean: r0(mean(scores)), median: r0(median(scores)), mode: r0(modeOf(scores)),
        sd: r1(stdev(scores)), min: scores.length ? Math.min(...scores) : null, max: scores.length ? Math.max(...scores) : null,
        p25: r0(quantile(scores, 0.25)), p75: r0(quantile(scores, 0.75)), domAvg,
      };
    }).sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));
  }, [scoped, questions, classrooms, roomOf, bandsCfg]);

  if (!sections.length) return <Empty icon={Layers} title="No data in scope" hint="Adjust the scope above." />;

  const domColor = (v) => v == null ? "text-slate-200" : v >= 70 ? "bg-emerald-50 text-emerald-700" : v >= 50 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";

  return (
    <div className="space-y-4">
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-slate-100 px-4 py-3"><h4 className="text-sm font-bold text-slate-900">Section / cohort statistics</h4></div>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Section</th><th className="px-2 py-2.5 text-center">n</th>
                <th className="px-2 py-2.5 text-center">Mean</th><th className="px-2 py-2.5 text-center">Median</th>
                <th className="px-2 py-2.5 text-center">Mode</th><th className="px-2 py-2.5 text-center">SD</th>
                <th className="px-2 py-2.5 text-center">Min</th><th className="px-2 py-2.5 text-center">Max</th>
                <th className="px-2 py-2.5 text-center">P25</th><th className="px-2 py-2.5 text-center">P75</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sections.map((s) => (
                <tr key={s.rid} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{s.name}</td>
                  <td className={`px-2 py-2 text-center ${num}`}>{s.n}</td>
                  <td className={`px-2 py-2 text-center font-bold ${num}`}>{s.mean}%</td>
                  <td className={`px-2 py-2 text-center ${num}`}>{s.median}%</td>
                  <td className={`px-2 py-2 text-center ${num} text-slate-400`}>{s.mode ?? "—"}</td>
                  <td className={`px-2 py-2 text-center ${num} text-slate-500`}>{s.sd ?? "—"}</td>
                  <td className={`px-2 py-2 text-center ${num} text-slate-400`}>{s.min}</td>
                  <td className={`px-2 py-2 text-center ${num} text-slate-400`}>{s.max}</td>
                  <td className={`px-2 py-2 text-center ${num} text-slate-400`}>{s.p25}</td>
                  <td className={`px-2 py-2 text-center ${num} text-slate-400`}>{s.p75}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Domain heatmap across sections */}
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-slate-100 px-4 py-3"><h4 className="text-sm font-bold text-slate-900">Domain averages by section</h4></div>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2.5">Section</th>{DOMAINS.map((d) => <th key={d.id} className="px-2 py-2.5 text-center" title={d.name}>{d.short}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sections.map((s) => (
                <tr key={s.rid}>
                  <td className="px-3 py-2 font-medium text-slate-800">{s.name}</td>
                  {DOMAINS.map((d) => <td key={d.id} className={`px-2 py-2 text-center font-bold ${num} ${domColor(s.domAvg[d.id])}`}>{s.domAvg[d.id] ?? "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-slate-400">Section history is preserved per attempt: a student who changes section keeps the section their assessment was taken in. Moving a student never rewrites past baseline data.</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   8. BASELINE vs PROGRESS
   ══════════════════════════════════════════════════════════════════ */
function EvProgress({ rows, scopeLabel }) {
  const multi = rows.filter((r) => r.attemptCount >= 2);
  const prog = multi.map((r) => {
    const pre = r.baseline.percent ?? 0, post = r.latest.percent ?? 0;
    const abs = post - pre;
    const relPct = pre > 0 ? Math.round(((post - pre) / pre) * 100) : null;
    const gain = 100 - pre > 0 ? Math.round(((post - pre) / (100 - pre)) * 100) : null; // normalized gain
    return { ...r, pre, post, abs, relPct, gain };
  }).sort((a, b) => b.abs - a.abs);

  const improved = prog.filter((p) => p.abs > 0).length;
  const same = prog.filter((p) => p.abs === 0).length;
  const declined = prog.filter((p) => p.abs < 0).length;
  const absArr = prog.map((p) => p.abs);

  return (
    <div className="space-y-4">
      <div className={`${card} p-3.5 text-xs text-slate-500`}>
        Progress compares each student's <b>earliest</b> attempt (baseline) with their <b>latest</b> attempt in scope.
        It appears only for students with two or more assessments — {multi.length} of {rows.length} here.
      </div>
      {!prog.length ? (
        <Empty icon={TrendingUp} title="No students with a second assessment yet" hint="Run a midline / post assessment, then progress will populate here automatically." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat icon={TrendingUp} label="Improved" value={improved} tone="emerald" />
            <Stat icon={ClipboardList} label="Unchanged" value={same} />
            <Stat icon={AlertTriangle} label="Declined" value={declined} tone={declined ? "rose" : "slate"} />
            <Stat icon={Award} label="Avg gain" value={`${absArr.length ? (r1(mean(absArr)) > 0 ? "+" : "") + r1(mean(absArr)) : "—"} pts`} tone="sky" />
            <Stat icon={Award} label="Median gain" value={`${r0(median(absArr)) ?? "—"} pts`} tone="violet" />
          </div>
          <div className={`${card} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h4 className="text-sm font-bold text-slate-900">Baseline → latest</h4>
              <button onClick={() => downloadCSV("qaapf-progress.csv", prog, [
                { label: "Name", value: (p) => p.name }, { label: "Baseline %", value: (p) => p.pre },
                { label: "Latest %", value: (p) => p.post }, { label: "Absolute gain", value: (p) => p.abs },
                { label: "% improvement", value: (p) => p.relPct ?? "" }, { label: "Normalized gain %", value: (p) => p.gain ?? "" },
              ])} className={`${btnG} !py-1.5 !px-3 !text-xs`}><FileDown size={13} /> Export</button>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2.5">Student</th><th className="px-2 py-2.5 text-center">Baseline</th><th className="px-2 py-2.5 text-center">Latest</th><th className="px-2 py-2.5 text-center">Δ pts</th><th className="px-2 py-2.5 text-center">% impr</th><th className="px-2 py-2.5 text-center" title="Normalized gain = (post−pre)/(100−pre)">Norm. gain</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {prog.map((p) => (
                  <tr key={p.uid} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{p.name}</td>
                    <td className={`px-2 py-2 text-center ${num} text-slate-500`}>{p.pre}%</td>
                    <td className={`px-2 py-2 text-center ${num} text-slate-500`}>{p.post}%</td>
                    <td className={`px-2 py-2 text-center font-bold ${num} ${p.abs > 0 ? "text-emerald-600" : p.abs < 0 ? "text-rose-600" : "text-slate-400"}`}>{p.abs > 0 ? "+" : ""}{p.abs}</td>
                    <td className={`px-2 py-2 text-center ${num} text-slate-500`}>{p.relPct == null ? "—" : `${p.relPct > 0 ? "+" : ""}${p.relPct}%`}</td>
                    <td className={`px-2 py-2 text-center ${num} text-slate-500`}>{p.gain == null ? "—" : `${p.gain}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   13 + 14. ITEM ANALYSIS & RELIABILITY  (per assessment)
   ══════════════════════════════════════════════════════════════════ */
function EvQuality({ scoped, quizId, quizzes, setQuizId }) {
  const ia = useMemo(() => itemAnalysis(scoped), [scoped]);
  const rel = useMemo(() => reliability(scoped), [scoped]);

  if (quizId === "all")
    return (
      <div className={`${card} p-6`}>
        <Empty icon={FlaskConical} title="Pick one assessment for item analysis"
          hint="Item difficulty, discrimination and reliability are only meaningful within a single assessment. Choose one in the scope bar." />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {(quizzes || []).slice(0, 8).map((q) => <button key={q.id} onClick={() => setQuizId(q.id)} className={`${btnG} !py-1.5 !px-3 !text-xs`}>{q.title}</button>)}
        </div>
      </div>
    );

  const flagged = ia.items.filter((i) => i.flags.length);

  return (
    <div className="space-y-4">
      {/* Reliability card */}
      <div className={`${card} p-5`}>
        <h3 className="mb-3 text-sm font-bold text-slate-900">Assessment reliability</h3>
        {!rel.ok ? (
          <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>Reliability estimate not shown — {rel.reason} <b>No coefficient is fabricated below the threshold.</b></span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={FlaskConical} label="Cronbach's α" value={rel.alpha == null ? "—" : rel.alpha.toFixed(2)} tone={rel.alpha >= 0.7 ? "emerald" : "amber"} />
              <Stat icon={FlaskConical} label="Split-half (SB)" value={rel.splitHalf == null ? "—" : rel.splitHalf.toFixed(2)} />
              <Stat icon={FlaskConical} label="SEM" value={rel.sem == null ? "—" : `±${rel.sem.toFixed(1)}`} sub={rel.semPct ? `±${r1(rel.semPct)}%` : ""} />
              <Stat icon={Users} label="n × items" value={`${rel.nStudents}×${rel.nItems}`} />
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              Computed on the {rel.nItems} items common to all {rel.nStudents} complete responses. α ≥ 0.70 is a common rule of thumb for internal consistency; interpret cautiously with small samples.
            </p>
          </>
        )}
      </div>

      {/* Item table */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h4 className="text-sm font-bold text-slate-900">Item analysis · {ia.items.length} items · {ia.n} responses</h4>
          <button onClick={() => downloadCSV("qaapf-item-analysis.csv", ia.items, [
            { label: "Question", value: (i) => (i.question || "").slice(0, 120) },
            { label: "Seen", value: (i) => i.seen }, { label: "Difficulty p", value: (i) => (i.p == null ? "" : i.p.toFixed(2)) },
            { label: "Discrimination D", value: (i) => (i.D == null ? "" : i.D.toFixed(2)) },
            { label: "Skipped %", value: (i) => (i.seen ? Math.round((i.skipped / i.seen) * 100) : "") },
            { label: "Flags", value: (i) => i.flags.join("; ") },
          ])} className={`${btnG} !py-1.5 !px-3 !text-xs`}><FileDown size={13} /> Export</button>
        </div>
        {flagged.length > 0 && (
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-[11px] text-amber-800">
            <b>{flagged.length}</b> item{flagged.length === 1 ? "" : "s"} flagged for review. Flags are advisory — nothing is auto-deleted.
          </div>
        )}
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2.5">Question</th><th className="px-2 py-2.5 text-center">Seen</th><th className="px-2 py-2.5 text-center" title="Difficulty index: fraction correct">p</th><th className="px-2 py-2.5 text-center" title="Discrimination: top 27% − bottom 27%">D</th><th className="px-2 py-2.5 text-center">Skip%</th><th className="px-3 py-2.5">Flags</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ia.items.map((i, k) => (
                <tr key={k} className="hover:bg-slate-50 align-top">
                  <td className="px-3 py-2 text-slate-700 max-w-md">{(i.question || "—").slice(0, 90)}{(i.question || "").length > 90 ? "…" : ""}</td>
                  <td className={`px-2 py-2 text-center ${num} text-slate-400`}>{i.seen}</td>
                  <td className={`px-2 py-2 text-center font-bold ${num} ${i.p == null ? "text-slate-300" : i.p >= 0.85 ? "text-emerald-600" : i.p <= 0.3 ? "text-rose-600" : "text-slate-600"}`}>{i.p == null ? "—" : i.p.toFixed(2)}</td>
                  <td className={`px-2 py-2 text-center font-bold ${num} ${i.D == null ? "text-slate-300" : i.D < 0.1 ? "text-rose-600" : i.D >= 0.3 ? "text-emerald-600" : "text-amber-600"}`}>{i.D == null ? "—" : i.D.toFixed(2)}</td>
                  <td className={`px-2 py-2 text-center ${num} text-slate-400`}>{i.seen ? Math.round((i.skipped / i.seen) * 100) : 0}</td>
                  <td className="px-3 py-2">{i.flags.length ? <div className="flex flex-wrap gap-1">{i.flags.map((f) => <span key={f} className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{f}</span>)}</div> : <span className="text-emerald-500 text-[11px]">ok</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   18–22. ACCREDITATION EVIDENCE MAP (honest — no mandate claims)
   ══════════════════════════════════════════════════════════════════ */
const EVIDENCE_MAP = [
  { fw: "NBA", theme: "Outcome-based education & attainment of outcomes", contrib: "Baseline → intervention → reassessment chain evidences outcome measurement and benchmarking.", backing: "Baseline vs Progress · Domain diagnostic · Item analysis" },
  { fw: "NBA", theme: "Continuous improvement", contrib: "Gap identification → corrective action → improvement cycle.", backing: "Cohort analysis · Intervention groups (Results tab)" },
  { fw: "NIRF", theme: "Teaching, Learning & Resources", contrib: "Documented diagnostic assessment of incoming students and targeted support.", backing: "Dashboard coverage · Section analysis" },
  { fw: "NIRF", theme: "Graduation Outcomes (readiness)", contrib: "Placement/competitive-exam readiness indicators derived from aptitude bands.", backing: "Baseline categories · Progress" },
  { fw: "NAAC", theme: "Student assessment & development", contrib: "Diagnostic assessment, remedial identification and student-support evidence with annual trends.", backing: "Attempted/Pending · Cohort · Register" },
  { fw: "NAAC", theme: "Teaching-learning effectiveness", contrib: "Evidence of measuring learning gaps and acting on them.", backing: "Domain diagnostic · Intervention" },
  { fw: "UGC / Regulatory", theme: "Employability & skill development", contrib: "Institution-internal aptitude development records associable with quality initiatives.", backing: "Visit-Ready Pack · Register" },
];
const VKEY = "qaapf.evidence.verify.v1";
function EvEvidenceMap() {
  const [verify, setVerify] = useState(() => { try { return JSON.parse(localStorage.getItem(VKEY) || "{}"); } catch { return {}; } });
  const setV = (i, v) => { const nx = { ...verify, [i]: v }; setVerify(nx); try { localStorage.setItem(VKEY, JSON.stringify(nx)); } catch (_) {} };
  return (
    <div className="space-y-4">
      <div className="flex gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-[12px] text-slate-600">
        <Shield size={16} className="mt-0.5 shrink-0 text-slate-400" />
        <p>This maps QAAPF data to <b>existing</b> quality themes of each framework. It does <b>not</b> assert that QAAPF is a required metric. Use it to point reviewers to the internal evidence your baseline generates.</p>
      </div>
      <div className={`${card} overflow-hidden`}>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-2.5">Framework</th><th className="px-3 py-2.5">Quality theme / criterion</th><th className="px-3 py-2.5">How QAAPF contributes</th><th className="px-3 py-2.5">Backing data in this app</th><th className="px-3 py-2.5 text-center">Verified</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {EVIDENCE_MAP.map((e, i) => (
              <tr key={i} className="hover:bg-slate-50 align-top">
                <td className="px-3 py-2.5"><Badge tone={e.fw.startsWith("NBA") ? "violet" : e.fw.startsWith("NIRF") ? "sky" : e.fw.startsWith("NAAC") ? "emerald" : "amber"}>{e.fw}</Badge></td>
                <td className="px-3 py-2.5 font-medium text-slate-700">{e.theme}</td>
                <td className="px-3 py-2.5 text-slate-600">{e.contrib}</td>
                <td className="px-3 py-2.5 text-slate-500">{e.backing}</td>
                <td className="px-3 py-2.5 text-center">
                  <button onClick={() => setV(i, !verify[i])} className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${verify[i] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{verify[i] ? "✓ Verified" : "Mark"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   23 + 24. VISIT-READY PACK + Register
   ══════════════════════════════════════════════════════════════════ */
function EvVisitPack({ rows, scoped, questions, quizzes, classrooms, bandsCfg, scopeLabel, quizId, roomId, year, toast2 }) {
  const { user, profile } = useAuth();
  const [framework, setFramework] = useState("NBA");
  const [institution, setInstitution] = useState(() => { try { return localStorage.getItem("qaapf.institution") || "COER University"; } catch { return "COER University"; } });
  const [busy, setBusy] = useState(false);

  const scores = rows.map((r) => r.pct);
  const ia = useMemo(() => (quizId !== "all" ? itemAnalysis(scoped) : null), [scoped, quizId]);
  const rel = useMemo(() => (quizId !== "all" ? reliability(scoped) : null), [scoped, quizId]);

  const generate = async () => {
    setBusy(true);
    try { localStorage.setItem("qaapf.institution", institution); } catch (_) {}
    const reportId = `QAAPF-${(year === "all" ? new Date().getFullYear() : year)}-${framework}-${Date.now().toString(36).toUpperCase()}`;
    const registerStr = rows.map((r) => `${r.name}|${r.cu_id}|${r.pct}|${r.band?.label}`).join("\n");
    const hash = await fingerprint(reportId + "\n" + registerStr);
    logAudit({ actor_id: user?.id, actor_name: profile?.full_name, action: "report.generate", target: `Visit-Ready Pack (${framework})`, meta: { reportId, scope: scopeLabel, students: rows.length, hash } });
    openVisitPack({ rows, scores, ia, rel, framework, institution, scopeLabel, bandsCfg, reportId, hash, generatedBy: profile?.full_name || "—", quizTitle: quizId === "all" ? "All QAAPF assessments" : (quizzes.find((q) => q.id === quizId)?.title || "—") });
    toast2("Visit pack opened — print or save as PDF");
    setBusy(false);
  };

  const exportRegister = () => {
    logAudit({ actor_id: user?.id, actor_name: profile?.full_name, action: "report.generate", target: "Student Baseline Register (CSV)", meta: { scope: scopeLabel, students: rows.length } });
    downloadCSV("qaapf-baseline-register.csv", rows.map((r, i) => ({ r, i })), [
      { label: "Sr", value: (x) => x.i + 1 }, { label: "Name", value: (x) => x.r.name }, { label: "CU ID", value: (x) => x.r.cu_id },
      { label: "Course", value: (x) => x.r.course }, { label: "Date", value: (x) => x.r.baseline.submitted_at ? new Date(x.r.baseline.submitted_at).toLocaleDateString() : "" },
      { label: "Score", value: (x) => x.r.baseline.score ?? "" }, { label: "%", value: (x) => x.r.pct }, { label: "Percentile", value: (x) => x.r.percentile },
      ...DOMAINS.map((d) => ({ label: d.short, value: (x) => dpct(x.r, d.id) ?? "" })),
      { label: "Q-Level", value: (x) => x.r.qlevel?.level || "" }, { label: "Category", value: (x) => x.r.band?.label || "" },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className={`${card} p-5`}>
        <h3 className="mb-1 text-sm font-bold text-slate-900">Accreditation Visit-Ready Pack</h3>
        <p className="mb-4 text-[11px] text-slate-400">Assembles every evidence section for the current scope into one printable/PDF document with a report ID, timestamp and content fingerprint. Scope: <b>{scopeLabel}</b> · {rows.length} students.</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-slate-600">Framework lens
            <select value={framework} onChange={(e) => setFramework(e.target.value)} className={`${inp} !py-2 mt-1 text-sm`}>
              {["NBA", "NIRF", "NAAC", "UGC / Regulatory", "Institutional"].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 flex-1 min-w-[200px]">Institution name
            <input value={institution} onChange={(e) => setInstitution(e.target.value)} className={`${inp} !py-2 mt-1 text-sm`} />
          </label>
          <button onClick={generate} disabled={busy || !rows.length} className={`${btnP} !py-2`}><Award size={15} /> {busy ? "Generating…" : "Generate pack"}</button>
          <button onClick={exportRegister} disabled={!rows.length} className={`${btnG} !py-2`}><FileDown size={15} /> Register CSV</button>
        </div>
      </div>
      <div className={`${card} p-4 text-[11px] text-slate-500`}>
        The pack includes: executive summary · assessment blueprint · student coverage · baseline distribution · domain-wise performance ·
        section analysis · student baseline register · intervention identification · reliability & item analysis (when one assessment is scoped) ·
        governance & audit stamp · evidence index. Reliability and item analysis need a single assessment selected in the scope bar.
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   28 + 29. THRESHOLDS / PERCENTILE SETTINGS
   ══════════════════════════════════════════════════════════════════ */
function EvSettings({ bandsCfg, setBandsCfg, toast2 }) {
  const { profile } = useAuth();
  const [draft, setDraft] = useState(bandsCfg.bands.map((b) => ({ ...b })));

  const save = () => {
    const sorted = [...draft].sort((a, b) => a.min - b.min);
    setBandsCfg({ version: (bandsCfg.version || 1) + 1, updatedAt: new Date().toISOString(), updatedBy: profile?.full_name || "—", bands: sorted });
    toast2("Bands saved — version " + ((bandsCfg.version || 1) + 1));
  };
  const reset = () => { setDraft(DEFAULT_BANDS.map((b) => ({ ...b }))); };

  return (
    <div className="space-y-4">
      <div className={`${card} p-5`}>
        <h3 className="mb-1 text-sm font-bold text-slate-900">Baseline classification bands</h3>
        <p className="mb-4 text-[11px] text-slate-400">
          Version {bandsCfg.version} {bandsCfg.updatedAt ? `· updated ${new Date(bandsCfg.updatedAt).toLocaleString()} by ${bandsCfg.updatedBy}` : "· defaults"}.
          Changing bands re-classifies the <b>live view</b> only; every generated register/pack stamps the version and values in effect, so historical documents are never silently rewritten.
        </p>
        <div className="space-y-2">
          {draft.map((b, i) => (
            <div key={b.key} className="flex items-center gap-2">
              <input value={b.label} onChange={(e) => setDraft((d) => d.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className={`${inp} !py-1.5 flex-1 text-xs`} />
              <input type="number" value={b.min} onChange={(e) => setDraft((d) => d.map((x, j) => j === i ? { ...x, min: Number(e.target.value) } : x))} className={`${inp} !py-1.5 !w-20 text-xs ${num}`} />
              <span className="text-slate-400">–</span>
              <input type="number" value={b.max} onChange={(e) => setDraft((d) => d.map((x, j) => j === i ? { ...x, max: Number(e.target.value) } : x))} className={`${inp} !py-1.5 !w-20 text-xs ${num}`} />
              <span className="text-[10px] text-slate-400">%</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={save} className={`${btnP} !py-2`}><CheckCircle2 size={15} /> Save bands</button>
          <button onClick={reset} className={`${btnG} !py-2`}>Reset to defaults</button>
        </div>
      </div>
      <div className={`${card} p-4 text-[11px] text-slate-500`}>
        <b>Percentile reference:</b> percentiles shown across the module are computed against the <b>current scope cohort</b> (the students matching the scope bar) and labelled as such — unrelated cohorts are never mixed unless you explicitly widen the scope.
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   31. AUDIT TRAIL  (reuses the real audit_log table)
   ══════════════════════════════════════════════════════════════════ */
function EvAudit() {
  const [log, setLog] = useState(null);
  useEffect(() => { let live = true; fetchAuditLog(150).then((d) => { if (live) setLog(d || []); }).catch(() => { if (live) setLog([]); }); return () => { live = false; }; }, []);
  if (log === null) return <div className={`${card} p-8 text-center text-sm text-slate-400`}>Loading audit trail…</div>;
  if (!log.length) return <Empty icon={ScrollText} title="No audit entries yet" hint="Assessment edits, question changes and report generations are recorded here as they happen." />;
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="border-b border-slate-100 px-4 py-3"><h4 className="text-sm font-bold text-slate-900">Audit trail · {log.length} recent events</h4></div>
      <div className="overflow-auto max-h-[70vh]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2.5">When</th><th className="px-4 py-2.5">Who</th><th className="px-4 py-2.5">Action</th><th className="px-4 py-2.5">Target</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {log.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{e.created_at ? new Date(e.created_at).toLocaleString() : "—"}</td>
                <td className="px-4 py-2 text-slate-700">{e.actor_name || "—"}</td>
                <td className="px-4 py-2"><Badge tone={String(e.action).startsWith("report") ? "violet" : "slate"}>{e.action}</Badge></td>
                <td className="px-4 py-2 text-slate-500">{e.target || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PRINT WINDOWS (self-contained, no dependency)
   ══════════════════════════════════════════════════════════════════ */
const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
function openPrint(title, bodyHtml) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1e293b;margin:0;padding:32px;font-size:12px;line-height:1.5}
    h1{font-size:20px;margin:0 0 2px} h2{font-size:14px;margin:22px 0 8px;padding-bottom:4px;border-bottom:2px solid #7c3aed;color:#4c1d95}
    h3{font-size:12px;margin:14px 0 4px;color:#475569}
    table{border-collapse:collapse;width:100%;margin:6px 0;font-size:10.5px} th,td{border:1px solid #e2e8f0;padding:4px 6px;text-align:left}
    th{background:#f8fafc;font-weight:700} .muted{color:#64748b} .r{text-align:right} .c{text-align:center}
    .stamp{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:10px 12px;font-size:10.5px;margin:8px 0}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0} .kpi{border:1px solid #e2e8f0;border-radius:8px;padding:8px;text-align:center}
    .kpi b{display:block;font-size:18px;color:#4c1d95} .note{font-size:10px;color:#94a3b8;margin-top:4px}
    @media print{h2{break-after:avoid}}
  </style></head><body>${bodyHtml}
  <script>window.onload=()=>{setTimeout(()=>window.print(),350)}<\/script></body></html>`);
  w.document.close();
}

function openStudentEvidenceReport(r, scopeLabel) {
  const dom = DOMAINS.map((d) => { const p = r.profile.domainProfiles.find((x) => x.id === d.id); return `<tr><td>${d.name}</td><td class="c">${p?.pct == null ? "not assessed" : p.pct + "%"}</td><td class="c">${p?.level?.level || "—"}</td></tr>`; }).join("");
  const strengths = r.profile.strengths.map((s) => s.name).join(", ") || "none above 70% yet";
  const gaps = r.profile.gaps.map((s) => s.name).join(", ") || "no domain below 60%";
  openPrint(`QAAPF Baseline — ${r.name}`, `
    <h1>Student Baseline Assessment Report</h1>
    <div class="muted">QAAPF · institution-internal diagnostic (not a NAAC/NBA/NIRF/UGC-mandated metric) · ${esc(scopeLabel)}</div>
    <h2>Student</h2>
    <table><tr><td><b>Name</b></td><td>${esc(r.name)}</td><td><b>CU ID</b></td><td>${esc(r.cu_id)}</td></tr>
    <tr><td><b>Course</b></td><td>${esc(r.course)}</td><td><b>Semester</b></td><td>${esc(r.semester)}</td></tr>
    <tr><td><b>Assessment date</b></td><td>${r.baseline.submitted_at ? new Date(r.baseline.submitted_at).toLocaleString() : "—"}</td><td><b>Time taken</b></td><td>${fmtMin(r.timeSec)}</td></tr></table>
    <h2>Overall baseline</h2>
    <div class="grid">
      <div class="kpi"><b>${r.pct}%</b>Overall</div>
      <div class="kpi"><b>${r.qlevel?.level || "—"}</b>${esc(r.qlevel?.label || "")}</div>
      <div class="kpi"><b>${r.percentile}</b>Percentile (scope)</div>
      <div class="kpi"><b>${r.correct}/${r.totalQ}</b>Correct</div>
    </div>
    <h2>Domain profile</h2>
    <table><thead><tr><th>Domain</th><th class="c">Score</th><th class="c">Band</th></tr></thead><tbody>${dom}</tbody></table>
    <h2>Diagnostic interpretation</h2>
    <p><b>Strengths:</b> ${esc(strengths)}</p>
    <p><b>Development gaps:</b> ${esc(gaps)}</p>
    <p class="muted">Recommended focus follows the gap order above. A non-assessed domain means the baseline drew too few items in that domain to judge — not a zero.</p>
    <div class="stamp">Generated ${new Date().toLocaleString()} · This report was produced from the institutional QAAPF assessment database. Domain bands reflect difficulty-weighted performance.</div>
  `);
}

function openVisitPack({ rows, scores, ia, rel, framework, institution, scopeLabel, bandsCfg, reportId, hash, generatedBy, quizTitle }) {
  const bandCounts = bandsCfg.bands.map((b) => ({ ...b, count: rows.filter((r) => r.band?.key === b.key).length }));
  const domAvg = DOMAINS.map((d) => { const v = rows.map((r) => dpct(r, d.id)).filter((x) => x != null); return { d, avg: v.length ? r0(mean(v)) : null }; });
  const register = rows.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${esc(r.name)}</td><td>${esc(r.cu_id)}</td><td>${esc(r.course)}</td><td class="c">${r.pct}%</td><td class="c">${r.percentile}</td><td class="c">${r.qlevel?.level || "—"}</td><td>${esc(r.band?.label || "")}</td></tr>`).join("");
  const bandRows = bandCounts.map((b) => `<tr><td>${esc(b.label)}</td><td class="c">${b.min}–${b.max}%</td><td class="c">${b.count}</td><td class="c">${rows.length ? Math.round((b.count / rows.length) * 100) : 0}%</td></tr>`).join("");
  const domRows = domAvg.map((x) => `<tr><td>${esc(x.d.name)}</td><td class="c">${x.avg == null ? "—" : x.avg + "%"}</td></tr>`).join("");
  const relBlock = !ia ? `<p class="muted">Scope covers multiple assessments — select a single assessment to include item analysis and reliability.</p>`
    : (!rel.ok ? `<p class="muted">Reliability not reported: ${esc(rel.reason)} No coefficient is fabricated.</p>`
      : `<div class="grid"><div class="kpi"><b>${rel.alpha == null ? "—" : rel.alpha.toFixed(2)}</b>Cronbach α</div><div class="kpi"><b>${rel.splitHalf == null ? "—" : rel.splitHalf.toFixed(2)}</b>Split-half</div><div class="kpi"><b>${rel.sem == null ? "—" : "±" + rel.sem.toFixed(1)}</b>SEM</div><div class="kpi"><b>${rel.nStudents}×${rel.nItems}</b>n × items</div></div>
      <p class="muted">${ia.items.filter((i) => i.flags.length).length} of ${ia.items.length} items flagged for review (advisory only).</p>`);
  const gap = domAvg.filter((x) => x.avg != null).sort((a, b) => a.avg - b.avg)[0];

  openPrint(`QAAPF Visit Pack — ${framework}`, `
    <h1>${esc(institution)}</h1>
    <div class="muted">QAAPF Baseline — Accreditation Evidence Pack · ${esc(framework)} lens</div>
    <div class="stamp"><b>Report ID:</b> ${esc(reportId)} &nbsp;·&nbsp; <b>Generated:</b> ${new Date().toLocaleString()} &nbsp;·&nbsp; <b>By:</b> ${esc(generatedBy)}<br>
      <b>Scope:</b> ${esc(scopeLabel)} &nbsp;·&nbsp; <b>Assessment:</b> ${esc(quizTitle)} &nbsp;·&nbsp; <b>Records:</b> ${rows.length} &nbsp;·&nbsp; <b>Fingerprint (SHA-256):</b> ${esc(hash || "n/a")}<br>
      <b>Band config:</b> v${bandsCfg.version}${bandsCfg.updatedAt ? " (" + new Date(bandsCfg.updatedAt).toLocaleDateString() + ")" : " (defaults)"}</div>

    <h2>1 · Executive summary</h2>
    <div class="grid">
      <div class="kpi"><b>${rows.length}</b>Students assessed</div>
      <div class="kpi"><b>${r0(mean(scores)) ?? "—"}%</b>Average baseline</div>
      <div class="kpi"><b>${r0(median(scores)) ?? "—"}%</b>Median</div>
      <div class="kpi"><b>${r1(stdev(scores)) ?? "—"}</b>Std deviation</div>
    </div>
    <p class="muted">${esc(institution)} administers QAAPF as an internal diagnostic to establish the entry aptitude baseline of students prior to structured intervention. This pack documents coverage, distribution, domain-level gaps and assessment quality for the selected cohort. QAAPF is not represented as a metric mandated by ${esc(framework)}; it is institutional evidence supporting ${esc(framework)}'s existing quality themes.</p>

    <h2>2 · Assessment blueprint</h2>
    <p>Eight OECD-PIAAC-grounded domains, six proficiency bands (Q1–Q6), difficulty-weighted scoring. Assessment: <b>${esc(quizTitle)}</b>.</p>

    <h2>3 · Student coverage & baseline distribution</h2>
    <table><thead><tr><th>Category</th><th class="c">Range</th><th class="c">Students</th><th class="c">Share</th></tr></thead><tbody>${bandRows}</tbody></table>

    <h2>4 · Domain-wise performance</h2>
    <table><thead><tr><th>Domain</th><th class="c">Cohort average</th></tr></thead><tbody>${domRows}</tbody></table>
    ${gap ? `<p class="muted"><b>Primary cohort gap:</b> ${esc(gap.d.name)} (${gap.avg}%) — a candidate for whole-cohort intervention.</p>` : ""}

    <h2>5 · Assessment reliability & item quality</h2>
    ${relBlock}

    <h2>6 · Student baseline register</h2>
    <table><thead><tr><th class="c">Sr</th><th>Name</th><th>ID</th><th>Course</th><th class="c">%</th><th class="c">Pctile</th><th class="c">Level</th><th>Category</th></tr></thead><tbody>${register}</tbody></table>

    <h2>7 · Governance & audit</h2>
    <p class="muted">Report generation is recorded in the institutional audit trail with user identity and timestamp. Historical baseline records are never overwritten; band-configuration changes are versioned and stamped above. Percentiles are computed within the stated scope cohort only.</p>
    <p class="muted">Authorized by: ______________________  ·  Department: ______________________  ·  Date: ____________</p>
  `);
}
