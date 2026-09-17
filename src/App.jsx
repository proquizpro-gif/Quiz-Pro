import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Users, Upload, Download, Plus, Search, Trash2, ChevronLeft,
  ShieldCheck, Clock, AlertTriangle, CheckCircle2, XCircle, Eye, Play, Trophy,
  FileSpreadsheet, ListChecks, LayoutDashboard, BookOpen, Circle, Award, Sparkles,
  LogOut, AlertCircle, RotateCcw,
  PlayCircle, PauseCircle, CalendarClock, FileDown, ShieldAlert,
  School, LogIn, Edit3, Save, GraduationCap,
  Target, Copy, Printer, Flag, Wifi, WifiOff, Brain, Radio,
} from "lucide-react";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { configMissing } from "./lib/supabase";
import {
  fetchQuestions, insertQuestion, insertQuestions, updateQuestion, deleteQuestion, deleteQuestions,
  fetchQuizzes, insertQuiz, updateQuiz, deleteQuiz,
  fetchAttempts, fetchMyAttempts, insertAttempt,
  fetchMyClassrooms, joinClassroomByCode, leaveClassroomAsStudent,
  logAudit, subscribeToAttempts,
  startLiveSession, touchLiveSession, endLiveSession,
} from "./lib/db";
import { parseWorkbook, downloadTemplate } from "./lib/xlsx-import";
import { downloadCSV } from "./lib/csv";
import { pingKeepAlive } from "./lib/keepalive";
import AIAssistant from "./components/AIAssistant";
import QAAPFPanel, { computeQAAPFProfile, Q_LEVELS, getQLevel } from "./components/QAAPF.jsx";
import LiveInvigilation from "./components/LiveInvigilation.jsx";
import AdminPanel from "./components/AdminPanel";
import ClassroomManager from "./components/Classrooms";
import {
  card, cardH, btn, btnP, btnG, btnGld, inp, num, vTone,
  fmtTime, pct, shuffle, dateStr, dateTimeStr,
  fsElement, enterFs, exitFs, buildLeaderboard, quizAvailability,
  Stat, Badge, Empty, Toast, ScoreBar, Spinner,
} from "./components/ui";

/* ── Exam draft backup keys (localStorage safety net) ────────────── */
const draftKey = (quizId, userId) => `quizpro:draft:${quizId}:${userId}`;

/* ================================================================== */
/* LOGIN PAGE                                                         */
/* ================================================================== */
function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleGoogle = async () => {
    setLoading(true); setError("");
    const { error } = await signInWithGoogle();
    if (error) { setError(error.message); setLoading(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-50 to-violet-50 px-4">
      <div className="w-full max-w-sm">
        <div className={`${card} overflow-hidden`}>
          <div className="bg-gradient-to-br from-violet-600 to-violet-800 px-6 py-10 text-center text-white">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/15 mb-4"><ShieldCheck size={28}/></div>
            <h1 className="text-2xl font-extrabold tracking-tight">QuizPro</h1>
            <p className="mt-1 text-sm text-violet-200">Academic Integrity Platform</p>
          </div>
          <div className="p-6">
            {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            <button onClick={handleGoogle} disabled={loading} className={`${btn} w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400 py-3`}>
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {loading ? "Signing in..." : "Continue with Google"}
            </button>
            <p className="mt-4 text-center text-xs text-slate-400">Faculty and students both use the same login. Your role is assigned by an administrator.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* ROOT APP                                                           */
/* ================================================================== */
function SetupRequired() {
  const vars = [
    ["VITE_SUPABASE_URL",      "https://timhgmqztcqajrcfogzh.supabase.co"],
    ["VITE_SUPABASE_ANON_KEY", "your Supabase anon / publishable key"],
    ["VITE_GROQ_KEY",          "optional — free AI key from console.groq.com"],
  ];
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className={`${card} w-full max-w-lg p-7`}>
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600"><AlertTriangle size={21}/></div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Configuration needed</h1>
            <p className="text-xs text-slate-500">This deployment has no database credentials.</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">
          The keys are deliberately not stored in GitHub, so they have to be set on the host.
          Vite reads them at <em>build</em> time, which means a redeploy is required after adding them.
        </p>
        <ol className="mt-4 space-y-2.5 text-sm text-slate-700">
          <li className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-600 text-[11px] font-bold text-white">1</span><span>Netlify → your site → <strong>Site configuration</strong> → <strong>Environment variables</strong></span></li>
          <li className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-600 text-[11px] font-bold text-white">2</span><span>Add each variable below with <strong>Add a variable</strong></span></li>
          <li className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-600 text-[11px] font-bold text-white">3</span><span><strong>Deploys</strong> → <strong>Trigger deploy</strong> → <strong>Clear cache and deploy site</strong></span></li>
        </ol>
        <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {vars.map(([k, v]) => (
            <div key={k} className="text-xs">
              <code className="font-mono font-bold text-violet-700">{k}</code>
              <div className="mt-0.5 font-mono text-[11px] text-slate-500">{v}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
          A plain redeploy can serve a cached build, which is why the cleared-cache option is listed.
          Your Supabase keys are in Supabase → Project Settings → API.
        </p>
      </div>
    </div>
  );
}

export default function AppRoot() {
  if (configMissing) return <SetupRequired/>;
  return <AuthProvider><AppInner /></AuthProvider>;
}

function AppInner() {
  const { isLoading, user, profile, isFaculty, isAdmin, signOut } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [quizzes,   setQuizzes]   = useState([]);
  const [attempts,  setAttempts]  = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState("");
  const [view, setView] = useState("main"); // 'main' | 'admin'

  useEffect(() => {
    if (!user) return;
    pingKeepAlive(); // secondary keep-alive — see lib/keepalive.js
    (async () => {
      try {
        const [qs, qzs, ats, crs] = await Promise.all([
          fetchQuestions(),
          fetchQuizzes(),
          isFaculty ? fetchAttempts() : fetchMyAttempts(user.id),
          fetchMyClassrooms(),
        ]);
        setQuestions(qs);
        setQuizzes(qzs);
        setAttempts(ats);
        setClassrooms(crs);
        setDataReady(true);
      } catch (err) {
        setDataError(err.message);
      }
    })();
  }, [user, isFaculty]);

  // Realtime: faculty dashboards update the instant a student submits,
  // no manual refresh needed.
  useEffect(() => {
    if (!isFaculty || !dataReady) return;
    const unsubscribe = subscribeToAttempts((newAttempt) => {
      setAttempts(prev => prev.some(a => a.id === newAttempt.id) ? prev : [newAttempt, ...prev]);
    });
    return unsubscribe;
  }, [isFaculty, dataReady]);

  if (isLoading) return <Spinner />;
  if (!user) return <LoginPage />;
  if (!dataReady && !dataError) return <Spinner />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 text-white shadow-sm"><ShieldCheck size={18}/></div>
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-tight text-slate-900">Quiz<span className="text-violet-600">Pro</span></div>
              <div className="hidden text-[10px] font-medium text-slate-400 sm:block">Academic Integrity Platform</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button onClick={() => setView(v => v === "admin" ? "main" : "admin")}
                className={`${btn} px-3 py-2 ${view === "admin" ? "bg-rose-600 text-white" : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"}`}>
                <ShieldAlert size={14}/> {view === "admin" ? "Exit admin" : "Admin"}
              </button>
            )}
            <Badge tone={isAdmin ? "rose" : isFaculty ? "violet" : "sky"}>{isAdmin ? "Admin" : isFaculty ? "Faculty" : "Student"}</Badge>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name} className="h-8 w-8 rounded-full border border-slate-200 object-cover"/>
              : <div className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{(profile?.full_name||"?").charAt(0)}</div>}
            <span className="hidden text-xs font-medium text-slate-700 sm:block">{profile?.full_name}</span>
            <button onClick={signOut} className={`${btnG} px-3 py-2`} title="Sign out"><LogOut size={15}/></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {dataError && <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2"><AlertCircle size={16}/> Database error: {dataError}. Check your Supabase config.</div>}

        {view === "admin" && isAdmin
          ? <AdminPanel questions={questions} quizzes={quizzes} attempts={attempts} classrooms={classrooms} setClassrooms={setClassrooms}/>
          : isFaculty
            ? <Faculty questions={questions} setQuestions={setQuestions} quizzes={quizzes} setQuizzes={setQuizzes} attempts={attempts} setAttempts={setAttempts} classrooms={classrooms} setClassrooms={setClassrooms}/>
            : <Student questions={questions} quizzes={quizzes} setQuizzes={setQuizzes} attempts={attempts} setAttempts={setAttempts} classrooms={classrooms} setClassrooms={setClassrooms} user={user} profile={profile}/>}
      </main>

      <footer className="border-t border-slate-100 py-6 text-center text-[11px] text-slate-400">
        QuizPro · Lockdown mode: blocks the screen on window switches, detects split-screen and floating apps. Install the native app for full device lock.
      </footer>

      <AIAssistant questions={questions} quizzes={quizzes} attempts={attempts} role={isFaculty?"faculty":"student"} userName={profile?.full_name}/>
    </div>
  );
}

/* ================================================================== */
/* FACULTY                                                            */
/* ================================================================== */
function Faculty({ questions, setQuestions, quizzes, setQuizzes, attempts, setAttempts, classrooms, setClassrooms }) {
  const [tab, setTab]         = useState("overview");
  const [openQuiz, setOpenQuiz] = useState(null);
  const tabs = [
    { id:"overview",   label:"Overview",       icon:LayoutDashboard },
    { id:"classrooms", label:"Classrooms",     icon:School },
    { id:"bank",       label:"Question Bank",  icon:BookOpen },
    { id:"quizzes",    label:"Quizzes",        icon:ListChecks },
    { id:"qaapf",     label:"QAAPF",           icon:Brain },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setOpenQuiz(null); }}
            className={`${btn} ${tab===t.id?"bg-slate-900 text-white shadow-sm":"border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            <t.icon size={15}/> {t.label}
          </button>
        ))}
      </div>
      {tab==="overview"   && <FacultyOverview questions={questions} quizzes={quizzes} attempts={attempts} classrooms={classrooms} onOpenQuiz={(q)=>{ setOpenQuiz(q); setTab("quizzes"); }} onGoto={setTab}/>}
      {tab==="classrooms" && <ClassroomManager classrooms={classrooms} setClassrooms={setClassrooms}/>}
      {tab==="bank"       && <QuestionBank questions={questions} setQuestions={setQuestions}/>}
      {tab==="qaapf"     && <QAAPFPanel attempts={attempts} questions={questions} quizzes={quizzes} setQuizzes={setQuizzes} setQuestions={setQuestions} classrooms={classrooms}/>}
      {tab==="quizzes"    && (openQuiz
        ? <QuizDetail quizzes={quizzes} quiz={openQuiz} questions={questions} attempts={attempts} classrooms={classrooms} profiles={null} onBack={() => setOpenQuiz(null)}/>
        : <QuizManager questions={questions} quizzes={quizzes} setQuizzes={setQuizzes} attempts={attempts} classrooms={classrooms} onOpen={setOpenQuiz}/>)}
    </div>
  );
}

/* ── Faculty Overview ─────────────────────────────────────────────── */
function FacultyOverview({ questions, quizzes, attempts, classrooms, onOpenQuiz, onGoto }) {
  const board = useMemo(() => buildLeaderboard(attempts), [attempts]);

  /* Per-quiz rollups, most recent first. This is what a teacher opens
     the dashboard to see: which quiz just ran, how it went, and whether
     anything needs attention — not a global lifetime average that blends
     every cohort and every week into one meaningless number. */
  const quizRows = useMemo(() => {
    return quizzes.map(q => {
      const at   = attempts.filter(a => a.quiz_id === q.id);
      const uniq = new Map();               // best attempt per student
      for (const a of at) {
        const p = uniq.get(a.user_id);
        if (!p || (a.percent ?? 0) > (p.percent ?? 0)) uniq.set(a.user_id, a);
      }
      const best = [...uniq.values()];
      const avg  = best.length ? Math.round(best.reduce((s,a)=>s+a.percent,0)/best.length) : null;
      const flaggedStudents = best.filter(a => (a.violations||0) >= 3).length;
      const room = classrooms?.find(c => c.id === q.classroom_id);
      const openState = quizAvailability(q);
      return {
        quiz: q, room, students: best.length, avg,
        pass: best.length ? Math.round(best.filter(a=>a.percent>=60).length/best.length*100) : null,
        flaggedStudents,
        lastAt: at.length ? Math.max(...at.map(a => new Date(a.submitted_at).getTime())) : 0,
        open: openState.available, openLabel: openState.label,
      };
    }).sort((a,b) => b.lastAt - a.lastAt || (b.quiz.week||0)-(a.quiz.week||0));
  }, [quizzes, attempts, classrooms]);

  const liveQuizzes = quizRows.filter(r => r.open);

  /* Answer-key health. A question whose bank entry looks like an import
     artefact — every stored answer defaulting to option A — is the most
     likely cause of a student disputing a mark, so surface a count and
     a way straight to the fix rather than making the teacher hunt. */
  const suspectKeys = useMemo(() => {
    // Heuristic only flags a *pattern*, never a single legitimately-A
    // question: a unit where an implausible share of answers are index 0.
    const byUnit = {};
    for (const q of questions) {
      const u = q.unit || "—";
      byUnit[u] = byUnit[u] || { total:0, a:0 };
      byUnit[u].total++; if (q.correct === 0) byUnit[u].a++;
    }
    let count = 0;
    for (const u in byUnit) {
      const { total, a } = byUnit[u];
      if (total >= 5 && a / total >= 0.8) count += a;   // 80%+ all-A in a unit of 5+
    }
    return count;
  }, [questions]);

  const atRisk = board.filter(s => s.avg < 50);
  const needsMarkingReview = quizRows.filter(r => r.avg !== null && r.avg < 25 && r.students >= 3);

  return (
    <div className="space-y-5">
      {/* Action items — the first thing a teacher should see, and only
          when there is genuinely something to act on. */}
      {(suspectKeys > 0 || needsMarkingReview.length > 0) && (
        <div className="space-y-2">
          {suspectKeys > 0 && (
            <button onClick={() => onGoto?.("bank")} className="flex w-full items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:bg-amber-100/70">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600"/>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900">{suspectKeys} question{suspectKeys===1?"":"s"} may have the wrong answer key</p>
                <p className="mt-0.5 text-xs text-amber-700">Several units have almost every answer set to option A — the signature of an import that lost its answer key. This is the usual cause of disputed marks. Open the Question Bank to review and one-click fix.</p>
              </div>
              <ChevronLeft size={16} className="mt-1 shrink-0 rotate-180 text-amber-400"/>
            </button>
          )}
          {needsMarkingReview.map(r => (
            <button key={r.quiz.id} onClick={() => onOpenQuiz?.(r.quiz)} className="flex w-full items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left transition hover:bg-rose-100/70">
              <ShieldAlert size={18} className="mt-0.5 shrink-0 text-rose-600"/>
              <div className="flex-1">
                <p className="text-sm font-bold text-rose-900">"{r.quiz.title}" is averaging {r.avg}% across {r.students} students</p>
                <p className="mt-0.5 text-xs text-rose-700">An average this low across a whole group usually means a scoring-key problem, not a weak cohort. Open the quiz and check the question analysis before releasing marks.</p>
              </div>
              <ChevronLeft size={16} className="mt-1 shrink-0 rotate-180 text-rose-400"/>
            </button>
          ))}
        </div>
      )}

      {/* Compact stat strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Radio}      label="Live now"   value={liveQuizzes.length} sub={liveQuizzes.length?"quizzes open":"none open"} tone={liveQuizzes.length?"emerald":"slate"}/>
        <Stat icon={Users}      label="Students"   value={board.length} sub="have attempted" tone="sky"/>
        <Stat icon={ListChecks} label="Quizzes"    value={quizzes.length} sub={`${questions.length} questions`} tone="violet"/>
        <Stat icon={Award}      label="Class avg"  value={board.length?`${Math.round(board.reduce((s,x)=>s+x.avg,0)/board.length)}%`:"—"} sub="across students" tone="amber"/>
      </div>

      {/* Live-now shortcut */}
      {liveQuizzes.length > 0 && (
        <div className={`${card} p-4`}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"/></span>
            Open right now
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {liveQuizzes.map(r => (
              <button key={r.quiz.id} onClick={() => onOpenQuiz?.(r.quiz)} className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 text-left transition hover:bg-emerald-100/60">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800">{r.quiz.title}</p>
                  <p className="truncate text-[10px] text-slate-500">{r.room?.name || "All students"} · {r.students} in</p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold text-emerald-700">Watch live →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent quiz results — the core of the dashboard */}
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-bold text-slate-900">Recent quizzes</h3>
          <p className="text-[11px] text-slate-400">Most recent first · click any row to open results and live view</p>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2.5">Quiz</th>
                <th className="px-3 py-2.5 hidden sm:table-cell">Classroom</th>
                <th className="px-3 py-2.5 text-center">Students</th>
                <th className="px-3 py-2.5 text-right">Avg</th>
                <th className="px-3 py-2.5 text-right hidden md:table-cell">Pass</th>
                <th className="px-3 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!quizRows.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No quizzes yet. Create one from the Quizzes tab.</td></tr>}
              {quizRows.map(r => (
                <tr key={r.quiz.id} onClick={() => onOpenQuiz?.(r.quiz)} className="cursor-pointer transition hover:bg-slate-50/70">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{r.quiz.title}</span>
                      {r.flaggedStudents > 0 && <Badge tone="rose">{r.flaggedStudents} flagged</Badge>}
                    </div>
                    <span className="text-[10px] text-slate-400">Week {r.quiz.week}</span>
                  </td>
                  <td className="px-3 py-2.5 hidden sm:table-cell text-xs text-slate-500">{r.room?.name || "All students"}</td>
                  <td className={`px-3 py-2.5 text-center ${num} text-slate-600`}>{r.students || "—"}</td>
                  <td className="px-3 py-2.5 text-right">
                    {r.avg !== null
                      ? <span className={`font-bold ${num} ${r.avg>=60?"text-emerald-600":r.avg>=40?"text-amber-600":"text-rose-600"}`}>{r.avg}%</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className={`px-3 py-2.5 text-right hidden md:table-cell ${num} text-slate-500`}>{r.pass !== null ? `${r.pass}%` : "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    {r.open
                      ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/> Live</span>
                      : <span className="text-[11px] text-slate-400">{r.openLabel}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {atRisk.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600"/>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-amber-900">{atRisk.length} student{atRisk.length===1?"":"s"} below 50% overall — early action helps</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {atRisk.map(s => (
                  <div key={s.user_id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs shadow-sm border border-amber-100">
                    <div className="grid h-5 w-5 place-items-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">{s.student.charAt(0)}</div>
                    <span className="font-semibold text-slate-700">{s.student}</span>
                    <span className="font-bold text-rose-600">{s.avg}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Lightweight inline bar chart - no recharts dependency for this simple case
function WeekBarChart({ data }) {
  const max = Math.max(100, ...data.map(d => d.avg));
  return (
    <div className="flex h-52 items-end gap-3 px-1">
      {data.map(d => (
        <div key={d.name} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t-lg bg-violet-600 transition-all duration-500" style={{ height: `${(d.avg / max) * 100}%`, minHeight: d.avg > 0 ? 4 : 0 }} title={`${d.avg}%`} />
          </div>
          <span className={`text-xs font-bold text-slate-700 ${num}`}>{d.avg}%</span>
          <span className="text-[11px] text-slate-400">{d.name}</span>
        </div>
      ))}
      {!data.length && <Empty icon={ListChecks} title="No quiz data yet" />}
    </div>
  );
}

/* ── Question Bank ────────────────────────────────────────────────── */
function QuestionBank({ questions, setQuestions }) {
  const [q, setQ]             = useState("");
  const [subjectFilter, setSF] = useState("all");
  const [unitFilter, setUF]   = useState("all");
  const [preview, setPreview] = useState(null);
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState(null);   // question being edited, or null
  const [selected, setSelected] = useState(() => new Set());
  const [toast, setToast]     = useState(null);
  const fileRef = useRef(null);
  const { user, profile } = useAuth();

  const subjects = useMemo(() => Array.from(new Set(questions.map(x => x.subject || "").filter(Boolean))).sort(), [questions]);
  const units    = useMemo(() => {
    const src = subjectFilter === "all" ? questions : questions.filter(x => (x.subject || "") === subjectFilter);
    return Array.from(new Set(src.map(x => x.unit))).sort();
  }, [questions, subjectFilter]);

  const filtered = useMemo(() => questions.filter(x =>
    (subjectFilter === "all" || (x.subject || "") === subjectFilter) &&
    (unitFilter === "all" || x.unit === unitFilter) &&
    (q.trim() === "" || x.question.toLowerCase().includes(q.toLowerCase()) || (x.topic||"").toLowerCase().includes(q.toLowerCase()))
  ), [questions, subjectFilter, unitFilter, q]);

  // Reset a stale unit filter when the subject changes out from under it.
  useEffect(() => { if (unitFilter !== "all" && !units.includes(unitFilter)) setUF("all"); }, [units]); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(x => {
      const s = x.subject || "(no subject)";
      g[s] = g[s] || {};
      g[s][x.unit] = g[s][x.unit] || [];
      g[s][x.unit].push(x);
    });
    return g;
  }, [filtered]);

  const toast2 = (msg, tone = "emerald") => { setToast({ msg, tone }); setTimeout(() => setToast(null), 3500); };

  const onFile = e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload  = () => setPreview(parseWorkbook(new Uint8Array(reader.result), questions));
    reader.onerror = () => setPreview({ error: "Could not read file." });
    reader.readAsArrayBuffer(file); e.target.value = "";
  };

  const commitImport = async () => {
    const rows = preview.rows.filter(r => r.parsed && !r.dup).map(r => r.parsed);
    try {
      const inserted = await insertQuestions(rows);
      setQuestions(prev => [...prev, ...inserted]);
      setPreview(null);
      toast2(`Imported ${inserted.length} questions.`);
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "question.import", target: `${inserted.length} questions`, meta: {} });
    } catch (err) { toast2(err.message, "rose"); }
  };

  const remove = async (id) => {
    const target = questions.find(x => x.id === id);
    try {
      await deleteQuestion(id);
      setQuestions(prev => prev.filter(x => x.id !== id));
      setSelected(s => { if (!s.has(id)) return s; const n = new Set(s); n.delete(id); return n; });
      toast2("Question removed.", "amber");
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "question.delete", target: target?.question?.slice(0, 60), meta: {} });
    } catch (err) { toast2(err.message, "rose"); }
  };

  // ── Bulk selection ────────────────────────────────────────────
  const toggleOne = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllVisible = () => setSelected(s => {
    const ids = filtered.map(x => x.id);
    const allSelected = ids.length > 0 && ids.every(id => s.has(id));
    if (allSelected) return new Set([...s].filter(id => !ids.includes(id)));
    return new Set([...s, ...ids]);
  });
  const allVisibleSelected = filtered.length > 0 && filtered.every(x => selected.has(x.id));

  const bulkDelete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} question${ids.length===1?"":"s"}? This cannot be undone. Any quiz already using them keeps the copy each student answered — only future quizzes lose access to these questions.`)) return;
    try {
      await deleteQuestions(ids);
      setQuestions(prev => prev.filter(x => !selected.has(x.id)));
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "question.bulk_delete", target: `${ids.length} questions`, meta: { ids } });
      setSelected(new Set());
      toast2(`Deleted ${ids.length} question${ids.length===1?"":"s"}.`, "amber");
    } catch (err) { toast2(err.message, "rose"); }
  };

  // ── Fast answer-key repair ──────────────────────────────────────
  // Clicking any option marks it correct immediately — no modal, no
  // re-typing the question. This exists specifically for the situation
  // where a bulk import mapped answer keys wrong: it lets a professor
  // walk down a flagged list and fix each one in a single click.
  const reassignCorrect = async (question, newCorrectIdx) => {
    if (question.correct === newCorrectIdx) return;
    const prevCorrect = question.correct;
    setQuestions(prev => prev.map(x => x.id === question.id ? { ...x, correct: newCorrectIdx } : x));
    try {
      await updateQuestion(question.id, { correct: newCorrectIdx });
      toast2(`Correct answer updated to "${question.options[newCorrectIdx]}".`);
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "question.fix_answer", target: question.question.slice(0,60), meta: { from: prevCorrect, to: newCorrectIdx } });
    } catch (err) {
      setQuestions(prev => prev.map(x => x.id === question.id ? { ...x, correct: prevCorrect } : x));
      toast2(err.message, "rose");
    }
  };

  const selectedCount = selected.size;

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.msg} tone={toast.tone} onDismiss={() => setToast(null)}/>}

      <div className={`${card} overflow-hidden`}>
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileSpreadsheet size={16} className="text-violet-600"/> Bulk upload</h3>
              <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-slate-500">Upload an .xlsx. Column names matched flexibly. Every row reviewed before saving. Answer key accepts a letter (A–D) or a 0-indexed number.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={btnG} onClick={downloadTemplate}><Download size={15}/> Template</button>
              <button className={btnP} onClick={() => fileRef.current?.click()}><Upload size={15}/> Upload .xlsx</button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="hidden"/>
            </div>
          </div>
        </div>
      </div>

      {preview && <ImportPreview preview={preview} onCancel={() => setPreview(null)} onCommit={commitImport}/>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className={`${inp} pl-10`} placeholder="Search questions or topics..." value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <select className={`${inp} max-w-[180px]`} value={subjectFilter} onChange={e=>setSF(e.target.value)}>
          <option value="all">All subjects ({questions.length})</option>
          {subjects.map(s => <option key={s} value={s}>{s} ({questions.filter(x=>(x.subject||"")===s).length})</option>)}
        </select>
        <select className={`${inp} max-w-[180px]`} value={unitFilter} onChange={e=>setUF(e.target.value)}>
          <option value="all">All units ({subjectFilter==="all" ? questions.length : questions.filter(x=>(x.subject||"")===subjectFilter).length})</option>
          {units.map(u => <option key={u} value={u}>{u} ({questions.filter(x=>x.unit===u && (subjectFilter==="all"||(x.subject||"")===subjectFilter)).length})</option>)}
        </select>
        <button className={btnG} onClick={() => setAdding(v=>!v)}><Plus size={15}/> {adding?"Cancel":"Add question"}</button>
      </div>

      {filtered.length > 0 && (
        <div className={`${card} flex flex-wrap items-center justify-between gap-3 px-4 py-2.5`}>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="h-4 w-4 accent-violet-600"/>
            {selectedCount > 0 ? `${selectedCount} selected` : `Select all ${filtered.length} shown`}
          </label>
          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <button className={`${btnG} !py-1.5 !px-3 !text-xs`} onClick={() => setSelected(new Set())}>Clear</button>
              <button className={`${btn} !py-1.5 !px-3 !text-xs border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100`} onClick={bulkDelete}>
                <Trash2 size={13}/> Delete {selectedCount}
              </button>
            </div>
          )}
        </div>
      )}

      {adding && <AddQuestion questions={questions} setQuestions={setQuestions} subjects={subjects} units={units} onDone={() => setAdding(false)} onSuccess={msg => toast2(msg)}/>}
      {editing && (
        <EditQuestionModal
          question={editing}
          subjects={subjects}
          units={units}
          onClose={() => setEditing(null)}
          onSaved={(updated) => { setQuestions(prev => prev.map(x => x.id === updated.id ? updated : x)); setEditing(null); toast2("Question updated."); }}
          onError={(msg) => toast2(msg, "rose")}
        />
      )}

      <div className="space-y-6">
        {!filtered.length
          ? <Empty icon={BookOpen} title="No questions match" hint="Adjust the filter, upload a file, or add manually."/>
          : Object.entries(grouped).map(([subject, unitMap]) => (
            <div key={subject}>
              <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-1.5">
                <GraduationCap size={14} className="text-violet-500"/>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{subject}</span>
                <span className={`${num} text-xs text-slate-300`}>({Object.values(unitMap).reduce((n,arr)=>n+arr.length,0)})</span>
              </div>
              {Object.entries(unitMap).map(([unit, qs]) => (
                <div key={unit} className="mb-4">
                  <div className="mb-2 flex items-center gap-2 pl-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{unit}</span>
                    <span className={`${num} text-[11px] text-slate-300`}>({qs.length})</span>
                  </div>
                  <div className="space-y-2">
                    {qs.map(x => (
                      <div key={x.id} className={`${cardH} p-4 ${selected.has(x.id) ? "ring-2 ring-violet-200 border-violet-200" : ""}`}>
                        <div className="flex items-start gap-3">
                          <input type="checkbox" checked={selected.has(x.id)} onChange={() => toggleOne(x.id)} className="mt-1 h-4 w-4 shrink-0 accent-violet-600"/>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {x.difficulty && <Badge tone={x.difficulty==="hard"?"rose":x.difficulty==="easy"?"emerald":"amber"}>{x.difficulty}</Badge>}
                              <Badge tone="slate">{x.topic}</Badge>
                              <Badge tone="slate">{x.points} pt</Badge>
                            </div>
                            <p className="mt-2 text-sm font-semibold text-slate-800">{x.question}</p>
                            <p className="mt-1 text-[10px] text-slate-400">Click an option below to change the correct answer</p>
                            <div className="mt-2 grid gap-1 sm:grid-cols-2">
                              {x.options.map((o, i) => (
                                <button
                                  key={i}
                                  onClick={() => reassignCorrect(x, i)}
                                  title={i===x.correct ? "Current correct answer" : "Set this as the correct answer"}
                                  className={`flex items-center gap-2 rounded-lg px-2 py-1 text-left text-xs transition ${i===x.correct ? "bg-emerald-50 font-semibold text-emerald-700" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}>
                                  {i===x.correct ? <CheckCircle2 size={12} className="shrink-0"/> : <Circle size={12} className="shrink-0 text-slate-200"/>}
                                  <span className="truncate">{o}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-1">
                            <button onClick={() => setEditing(x)} className="rounded-lg p-2 text-slate-300 transition hover:bg-violet-50 hover:text-violet-500" title="Edit question"><Edit3 size={14}/></button>
                            <button onClick={() => remove(x.id)} className="rounded-lg p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500" title="Delete"><Trash2 size={14}/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

function EditQuestionModal({ question, subjects, units, onClose, onSaved, onError }) {
  const [text, setText]         = useState(question.question);
  const [opts, setOpts]         = useState([...question.options]);
  const [correct, setCorrect]   = useState(question.correct);
  const [subject, setSubject]   = useState(question.subject || "");
  const [unit, setUnit]         = useState(question.unit || "");
  const [topic, setTopic]       = useState(question.topic || "");
  const [difficulty, setDiff]   = useState(question.difficulty || "medium");
  const [points, setPoints]     = useState(question.points || 1);
  const [saving, setSaving]     = useState(false);
  const ready = text.trim() && opts.every(o => o.trim()) && unit.trim();

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateQuestion(question.id, {
        question: text.trim(), options: opts.map(o => o.trim()), correct,
        subject: subject.trim(), unit: unit.trim(), topic: topic.trim() || "General",
        difficulty, points: Number(points) || 1,
      });
      onSaved(updated);
    } catch (err) { onError(err.message); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={`${card} w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto space-y-4`} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Edit question</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><XCircle size={18}/></button>
        </div>
        <textarea className={`${inp} resize-none`} rows={2} value={text} onChange={e=>setText(e.target.value)}/>
        <div className="grid gap-2 sm:grid-cols-2">
          {opts.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <button onClick={() => setCorrect(i)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold transition ${correct===i?"bg-emerald-600 text-white":"bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{"ABCD"[i]}</button>
              <input className={inp} value={o} onChange={e => { const n=[...opts]; n[i]=e.target.value; setOpts(n); }}/>
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Subject</label>
            <input className={inp} list="edl-subj" value={subject} onChange={e=>setSubject(e.target.value)}/>
            <datalist id="edl-subj">{subjects.map(s=><option key={s} value={s}/>)}</datalist>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Unit *</label>
            <input className={inp} list="edl-unit" value={unit} onChange={e=>setUnit(e.target.value)}/>
            <datalist id="edl-unit">{units.map(u=><option key={u} value={u}/>)}</datalist>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Topic</label>
            <input className={inp} value={topic} onChange={e=>setTopic(e.target.value)}/>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Difficulty</label>
            <select className={inp} value={difficulty} onChange={e=>setDiff(e.target.value)}>
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className={btnP} disabled={!ready||saving} onClick={save}>{saving?"Saving…":"Save changes"}</button>
          <button className={btnG} onClick={onClose}>Cancel</button>
          <span className="text-xs text-slate-400">Click a letter to change the correct answer</span>
        </div>
      </div>
    </div>
  );
}

function ImportPreview({ preview, onCancel, onCommit }) {
  if (preview.error) return (
    <div className={`${card} border-rose-200 p-5`}>
      <div className="flex items-start gap-3"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500"/>
        <div><h4 className="text-sm font-bold text-rose-700">File rejected</h4><p className="mt-1 text-sm text-slate-600">{preview.error}</p></div></div>
      <div className="mt-4"><button className={btnG} onClick={onCancel}>Close</button></div>
    </div>
  );
  const valid = preview.rows.filter(r => r.parsed && !r.dup);
  const dups  = preview.rows.filter(r => r.dup);
  const bad   = preview.rows.filter(r => r.errors.length);
  return (
    <div className={`${card} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-slate-900">Import preview</h4>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="emerald">{valid.length} ready</Badge>
          {dups.length > 0  && <Badge tone="amber">{dups.length} duplicate</Badge>}
          {bad.length > 0   && <Badge tone="rose">{bad.length} with errors</Badge>}
        </div>
      </div>
      <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Question</th><th className="px-3 py-2">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.rows.map(r => (
              <tr key={r.rowNum} className={r.errors.length?"bg-rose-50/40":r.dup?"bg-amber-50/40":""}>
                <td className={`px-3 py-2 ${num} text-slate-400`}>{r.rowNum}</td>
                <td className="px-3 py-2 text-slate-700"><span className="line-clamp-1">{r.question||<em className="text-slate-400">empty</em>}</span></td>
                <td className="px-3 py-2">
                  {r.errors.length ? <span className="flex items-start gap-1.5 text-xs text-rose-600"><XCircle size={12} className="mt-0.5 shrink-0"/>{r.errors.join("; ")}</span>
                    : r.dup ? <span className="flex items-center gap-1.5 text-xs text-amber-600"><AlertTriangle size={12}/>already in bank</span>
                    : <span className="flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle2 size={12}/>ready{r.notes.length?` · ${r.notes.join(", ")}`:""}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className={btnP} onClick={onCommit} disabled={valid.length===0}>Import {valid.length} question{valid.length===1?"":"s"}</button>
        <button className={btnG} onClick={onCancel}>Cancel</button>
        {bad.length > 0 && <span className="text-xs text-slate-400">Fix flagged rows and re-upload.</span>}
      </div>
    </div>
  );
}

function AddQuestion({ questions, setQuestions, units, subjects, onDone, onSuccess }) {
  const { user, profile } = useAuth();
  const [question, setQuestion] = useState("");
  const [opts, setOpts]         = useState(["","","",""]);
  const [correct, setCorrect]   = useState(0);
  const [subject, setSubject]   = useState(subjects[0] || "");
  const [unit, setUnit]         = useState(units[0] || "");
  const [topic, setTopic]       = useState("");
  const [difficulty, setDiff]   = useState("medium");
  const [points, setPoints]     = useState(1);
  const [saving, setSaving]     = useState(false);
  const ready = question.trim() && opts.every(o=>o.trim()) && unit.trim();

  const save = async () => {
    setSaving(true);
    try {
      const q = await insertQuestion({ question: question.trim(), options: opts.map(o=>o.trim()), correct, subject: subject.trim(), unit: unit.trim(), topic: topic.trim()||"General", difficulty, points: Number(points)||1 });
      setQuestions(prev => [...prev, q]);
      onSuccess?.("Question added.");
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "question.create", target: question.trim().slice(0, 60), meta: {} });
      onDone();
    } catch (err) { onSuccess?.(err.message, "rose"); }
    setSaving(false);
  };

  return (
    <div className={`${card} p-5`}>
      <h4 className="mb-4 text-sm font-bold text-slate-900">New question</h4>
      <textarea className={`${inp} mb-3`} rows={2} placeholder="Question text" value={question} onChange={e=>setQuestion(e.target.value)}/>
      <div className="grid gap-2 sm:grid-cols-2">
        {opts.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <button onClick={() => setCorrect(i)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold transition ${correct===i?"bg-emerald-600 text-white":"bg-slate-100 text-slate-500 hover:bg-slate-200"}`} title="Mark correct">{"ABCD"[i]}</button>
            <input className={inp} placeholder={`Option ${"ABCD"[i]}`} value={o} onChange={e=>{const n=[...opts];n[i]=e.target.value;setOpts(n);}}/>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <div><label className="mb-1 block text-xs font-semibold text-slate-500">Subject *</label><input className={inp} list="sdl" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Aptitude"/><datalist id="sdl">{subjects.map(s=><option key={s} value={s}/>)}</datalist></div>
        <div><label className="mb-1 block text-xs font-semibold text-slate-500">Unit *</label><input className={inp} list="udl" value={unit} onChange={e=>setUnit(e.target.value)} placeholder="e.g. Arithmetic"/><datalist id="udl">{units.map(u=><option key={u} value={u}/>)}</datalist></div>
        <div><label className="mb-1 block text-xs font-semibold text-slate-500">Topic</label><input className={inp} value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Optional"/></div>
        <div><label className="mb-1 block text-xs font-semibold text-slate-500">Difficulty</label><select className={inp} value={difficulty} onChange={e=>setDiff(e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button className={btnP} disabled={!ready||saving} onClick={save}>{saving?"Saving…":"Add to bank"}</button>
        <button className={btnG} onClick={onDone}>Cancel</button>
        <span className="text-xs text-slate-400">Click a letter to set the correct answer</span>
      </div>
    </div>
  );
}

/* ── Quiz Manager ─────────────────────────────────────────────────── */
function QuizManager({ questions, quizzes, setQuizzes, attempts, classrooms, onOpen }) {
  const { user, profile } = useAuth();
  const [creating, setCreating] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [reopenTarget, setReopenTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const toast2 = (msg, tone = "emerald") => { setToast({ msg, tone }); setTimeout(() => setToast(null), 3500); };
  const roomLabel = useMemo(() => Object.fromEntries(
    classrooms.map(c => [c.id, `${c.name}${c.section ? ` · ${c.section}` : ""}${c.year ? ` (${c.year})` : ""}`])
  ), [classrooms]);

  const removeQuiz = async (id) => {
    const target = quizzes.find(q => q.id === id);
    if (!window.confirm("Delete this quiz? All attempts for it will also be removed.")) return;
    try {
      await deleteQuiz(id);
      setQuizzes(prev => prev.filter(q => q.id !== id));
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "quiz.delete", target: target?.title, meta: {} });
    } catch (err) { toast2(err.message, "rose"); }
  };

  const toggleOpen = async (qz) => {
    // If close_at is in the past, reopening needs a new deadline
    const closeInPast = qz.close_at && new Date(qz.close_at).getTime() < Date.now();
    if (closeInPast) { setReopenTarget(qz); return; }
    try {
      const updated = await updateQuiz(qz.id, { is_open: !qz.is_open });
      setQuizzes(prev => prev.map(q => q.id === qz.id ? updated : q));
      toast2(`"${qz.title}" is now ${updated.is_open ? "open" : "closed"}.`, updated.is_open ? "emerald" : "amber");
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "quiz.update", target: qz.title, meta: { is_open: updated.is_open } });
    } catch (err) { toast2(err.message, "rose"); }
  };

  const cloneQuiz = async (qz) => {
    try {
      const { id, created_at, ...rest } = qz;
      const copy = await insertQuiz({
        ...rest,
        title: `${qz.title} (copy)`,
        is_open: false,          // never auto-publish a clone
        open_at: null,
        close_at: null,
        created_by: user.id,
      });
      setQuizzes(prev => [...prev, copy]);
      toast2(`Cloned as "${copy.title}" — closed, so you can retime it before publishing.`);
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "quiz.clone", target: qz.title, meta: { from: qz.id } });
    } catch (err) { toast2(err.message, "rose"); }
  };

  const doReopen = async ({ newCloseAt, clearClose }) => {
    const qz = reopenTarget; if (!qz) return;
    const patch = { is_open: true };
    if (clearClose) patch.close_at = null;
    else if (newCloseAt) patch.close_at = new Date(newCloseAt).toISOString();
    try {
      const updated = await updateQuiz(qz.id, patch);
      setQuizzes(prev => prev.map(q => q.id === qz.id ? updated : q));
      toast2(`"${qz.title}" reopened.`, "emerald");
      setReopenTarget(null);
    } catch (err) { toast2(err.message, "rose"); }
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} tone={toast.tone} onDismiss={() => setToast(null)} />}
      <div className="flex items-center justify-between">
        <div><h3 className="text-sm font-bold text-slate-900">Quizzes</h3><p className="text-xs text-slate-400">{quizzes.length} configured</p></div>
        <button className={btnP} onClick={() => setCreating(v=>!v)}><Plus size={15}/> New quiz</button>
      </div>
      {creating && <CreateQuiz questions={questions} quizzes={quizzes} setQuizzes={setQuizzes} classrooms={classrooms} onDone={() => setCreating(false)}/>}
      <div className="grid gap-3 sm:grid-cols-2">
        {!quizzes.length && <div className="sm:col-span-2"><Empty icon={ListChecks} title="No quizzes yet" hint="Create your first quiz."/></div>}
        {quizzes.map(qz => {
          const at   = attempts.filter(a => a.quiz_id === qz.id);
          const avg  = at.length ? Math.round(at.reduce((s,a)=>s+a.percent,0)/at.length) : 0;
          const pool = Array.isArray(qz.question_ids) && qz.question_ids.length > 0
            ? questions.filter(q => qz.question_ids.includes(q.id)).length
            : questions.filter(b => (qz.units||[]).includes(b.unit)).length;
          const avail = quizAvailability(qz);
          return (
            <div key={qz.id} className={`${cardH} p-5`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="violet">Week {qz.week}</Badge>
                    {avail.available ? <Badge tone="emerald">Open</Badge> : <Badge tone="rose">{avail.label}</Badge>}
                    <Badge tone={qz.classroom_id ? "sky" : "amber"}>
                      <School size={11}/> {qz.classroom_id ? (roomLabel[qz.classroom_id] || "Classroom") : "All students"}
                    </Badge>
                  </div>
                  <h4 className="mt-2 font-bold text-slate-900">{qz.title}</h4>
                </div>
                <div className="flex items-center gap-1">
                  <button className={btnG} onClick={() => cloneQuiz(qz)} title="Duplicate for another section"><Copy size={14}/></button>
                  <button className={btnG} onClick={() => setEditTarget(qz)} title="Edit quiz"><Edit3 size={14}/></button>
                  <button className={btnG} onClick={() => onOpen(qz)}><Eye size={14}/> View</button>
                  <button onClick={() => removeQuiz(qz.id)} className="rounded-xl p-2.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition" title="Delete"><Trash2 size={14}/></button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><Clock size={12}/>{Math.round(qz.duration_sec/60)} min</span>
                <span className="flex items-center gap-1.5"><ListChecks size={12}/>{qz.draw_count} of {pool} drawn</span>
                <span className="flex items-center gap-1.5"><Users size={12}/>{at.length} attempt{at.length===1?"":"s"}</span>
                <span className="flex items-center gap-1.5"><RotateCcw size={12}/>max {qz.max_attempts} attempt{qz.max_attempts===1?"":"s"}</span>
              </div>
              {(qz.open_at || qz.close_at) && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <CalendarClock size={12}/>
                  {qz.open_at && <span>opens {dateTimeStr(qz.open_at)}</span>}
                  {qz.open_at && qz.close_at && <span>·</span>}
                  {qz.close_at && <span>closes {dateTimeStr(qz.close_at)}</span>}
                </div>
              )}
              {at.length > 0 && <div className="mt-3"><ScoreBar value={avg}/></div>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">{(qz.units||[]).map(u=><Badge key={u} tone="slate">{u}</Badge>)}</div>
                {(() => {
                  const closeInPast = qz.close_at && new Date(qz.close_at).getTime() < Date.now();
                  const showReopen  = !qz.is_open || closeInPast;
                  return (
                    <button onClick={() => toggleOpen(qz)} className={`${btn} px-3 py-1.5 text-xs ${showReopen ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"}`}>
                      {showReopen ? <><PlayCircle size={13}/> {closeInPast ? "Reopen quiz" : "Open now"}</> : <><PauseCircle size={13}/> Close now</>}
                    </button>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
      {editTarget && (
        <EditQuizModal
          quiz={editTarget}
          questions={questions}
          attempts={attempts}
          classrooms={classrooms}
          onSaved={updated => { setQuizzes(prev => prev.map(q => q.id === updated.id ? updated : q)); setEditTarget(null); toast2("Quiz updated."); }}
          onClose={() => setEditTarget(null)}
        />
      )}
      {reopenTarget && <ReopenModal quiz={reopenTarget} onCancel={() => setReopenTarget(null)} onConfirm={doReopen}/>}
    </div>
  );
}

function ReopenModal({ quiz, onCancel, onConfirm }) {
  const [mode, setMode] = useState("extend");
  const [newClose, setNewClose] = useState(() => {
    const d = new Date(Date.now() + 24*60*60*1000); d.setSeconds(0,0); return d.toISOString().slice(0,16);
  });
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className={`${card} w-full max-w-md p-6 space-y-4`} onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-900">Reopen quiz</h3>
        <p className="text-xs text-slate-500">"{quiz.title}" closed at {dateTimeStr(quiz.close_at)}. Choose how to reopen:</p>
        <div className="space-y-2">
          <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${mode==="extend" ? "border-violet-500 bg-violet-50/40" : "border-slate-200"}`}>
            <input type="radio" name="rm" checked={mode==="extend"} onChange={() => setMode("extend")} className="mt-0.5"/>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">Extend deadline</div>
              <input type="datetime-local" className={`${inp} mt-2`} value={newClose} onChange={e => setNewClose(e.target.value)} disabled={mode !== "extend"}/>
            </div>
          </label>
          <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${mode==="clear" ? "border-violet-500 bg-violet-50/40" : "border-slate-200"}`}>
            <input type="radio" name="rm" checked={mode==="clear"} onChange={() => setMode("clear")} className="mt-0.5"/>
            <div><div className="text-sm font-semibold text-slate-900">Reopen indefinitely</div><div className="text-xs text-slate-500">No close time — close manually later.</div></div>
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button className={btnG} onClick={onCancel}>Cancel</button>
          <button className={btnP} onClick={() => onConfirm(mode === "clear" ? { clearClose: true } : { newCloseAt: newClose })}><PlayCircle size={14}/> Reopen</button>
        </div>
      </div>
    </div>
  );
}

function EditQuizModal({ quiz, questions, attempts, classrooms, onSaved, onClose }) {
  const { user, profile } = useAuth();
  const myRooms = useMemo(() => classrooms.filter(c => !c.is_archived), [classrooms]);
  const attemptCount = attempts.filter(a => a.quiz_id === quiz.id).length;
  const questionsLocked = attemptCount > 0;

  const [title,       setTitle]       = useState(quiz.title || "");
  const [minutes,     setMinutes]     = useState(Math.round((quiz.duration_sec || 300) / 60));
  const [maxAttempts, setMaxAttempts] = useState(quiz.max_attempts || 1);
  const [classroomId, setClassroomId] = useState(quiz.classroom_id || "");
  const [openAt,      setOpenAt]      = useState(quiz.open_at  ? new Date(quiz.open_at).toISOString().slice(0,16)  : "");
  const [closeAt,     setCloseAt]     = useState(quiz.close_at ? new Date(quiz.close_at).toISOString().slice(0,16) : "");
  const [isOpen,      setIsOpen]      = useState(quiz.is_open !== false);
  const [policy,      setPolicy]      = useState(quiz.show_answers_policy || "after_close");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);
  const ready = title.trim();

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const patch = {
        title: title.trim(),
        duration_sec: Number(minutes) * 60,
        max_attempts: Number(maxAttempts),
        classroom_id: classroomId || null,
        open_at:  openAt  ? new Date(openAt).toISOString()  : null,
        close_at: closeAt ? new Date(closeAt).toISOString() : null,
        is_open: isOpen,
        show_answers_policy: policy,
      };
      const updated = await updateQuiz(quiz.id, patch);
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "quiz.edit", target: quiz.title, meta: { fields: Object.keys(patch) } });
      onSaved(updated);
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
      <div className={`${card} w-full max-w-2xl p-6 my-8 space-y-4`} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div><h3 className="text-lg font-bold text-slate-900">Edit quiz</h3><p className="mt-1 text-xs text-slate-500">Changes take effect immediately.</p></div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><XCircle size={16}/></button>
        </div>
        {questionsLocked && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
            <ShieldAlert size={14} className="shrink-0 mt-0.5"/>
            <span><strong>Note:</strong> {attemptCount} student{attemptCount===1?" has":"s have"} already attempted this quiz. You can update timing, classroom, and open/close status — but to preserve fairness, question draws are not changed here.</span>
          </div>
        )}
        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">{error}</div>}
        <div><label className="mb-1 block text-xs font-semibold text-slate-500">Title *</label><input className={inp} value={title} onChange={e => setTitle(e.target.value)}/></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div><label className="mb-1 block text-xs font-semibold text-slate-500">Minutes</label><input type="number" min={1} className={`${inp} ${num}`} value={minutes} onChange={e => setMinutes(e.target.value)}/></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-500">Max attempts</label><input type="number" min={1} max={5} className={`${inp} ${num}`} value={maxAttempts} onChange={e => setMaxAttempts(e.target.value)}/></div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Status</label>
            <div className="flex gap-2">
              <button onClick={() => setIsOpen(true)}  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold ${isOpen  ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>Open</button>
              <button onClick={() => setIsOpen(false)} className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold ${!isOpen ? "border-amber-300 bg-amber-50 text-amber-700"     : "border-slate-200 bg-white text-slate-500"}`}>Closed</button>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500"><CalendarClock size={12}/> Opens at</label><input type="datetime-local" className={inp} value={openAt} onChange={e => setOpenAt(e.target.value)}/></div>
          <div><label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500"><CalendarClock size={12}/> Closes at</label><input type="datetime-local" className={inp} value={closeAt} onChange={e => setCloseAt(e.target.value)}/></div>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-slate-50/60 p-3">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700"><ShieldCheck size={13} className="text-emerald-600"/> Answer visibility</label>
          <select className={inp} value={policy} onChange={e=>setPolicy(e.target.value)}>
            <option value="after_close">After the quiz closes — recommended</option>
            <option value="immediate">Immediately after submission</option>
            <option value="never">Never — score only</option>
          </select>
        </div>
        <div><label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500"><School size={12}/> Classroom</label>
          <select className={inp} value={classroomId} onChange={e => setClassroomId(e.target.value)}>
            {myRooms.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` · ${c.section}` : ""}{c.year ? ` (${c.year})` : ""}</option>)}
            <option value="">All students</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button className={btnG} onClick={onClose}>Cancel</button>
          <button className={btnP} disabled={!ready || saving} onClick={save}><Save size={14}/> {saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

function CreateQuiz({ questions, quizzes, setQuizzes, classrooms, onDone }) {
  const { user, profile, isAdmin } = useAuth();
  const myRooms = useMemo(() => classrooms.filter(c => !c.is_archived), [classrooms]);
  const [title, setTitle]       = useState("");
  const [week, setWeek]         = useState(quizzes.length+1);
  const [minutes, setMinutes]   = useState(20);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [openAt, setOpenAt]     = useState("");
  const [closeAt, setCloseAt]   = useState("");
  const [classroomId, setClassroomId] = useState(myRooms[0]?.id ?? "");
  const [policy, setPolicy]     = useState("after_close");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [pSort, setPSort] = useState("newest");
  const [pQuery, setPQuery] = useState("");
  const [pSubject, setPSubject] = useState("all");
  const [pUnit, setPUnit] = useState("all");
  const [pTopic, setPTopic] = useState("all");
  const [pDiff, setPDiff] = useState("all");
  const [pickerOpen, setPickerOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cascade filter options
  const subjects = useMemo(() => Array.from(new Set(questions.map(q => q.subject||"").filter(Boolean))).sort(), [questions]);
  const units    = useMemo(() => {
    const src = pSubject === "all" ? questions : questions.filter(q => (q.subject||"") === pSubject);
    return Array.from(new Set(src.map(q => q.unit||""))).filter(Boolean).sort();
  }, [questions, pSubject]);
  const topics   = useMemo(() => {
    const src = questions.filter(q =>
      (pSubject === "all" || (q.subject||"") === pSubject) &&
      (pUnit === "all"    || (q.unit||"")    === pUnit)
    );
    return Array.from(new Set(src.map(q => q.topic||"General"))).sort();
  }, [questions, pSubject, pUnit]);

  const filteredQs = useMemo(() => {
    let src = questions;
    if (pSubject !== "all") src = src.filter(q => (q.subject||"") === pSubject);
    if (pUnit    !== "all") src = src.filter(q => (q.unit||"")    === pUnit);
    if (pTopic   !== "all") src = src.filter(q => (q.topic||"General") === pTopic);
    if (pDiff    !== "all") src = src.filter(q => (q.difficulty||"medium") === pDiff);
    if (pQuery.trim()) {
      const t = pQuery.toLowerCase();
      src = src.filter(q => q.question.toLowerCase().includes(t) || (q.unit||"").toLowerCase().includes(t));
    }
    if (pSort === "newest") return [...src].sort((a,b) => (b.created_at||"").localeCompare(a.created_at||""));
    if (pSort === "unit")   return [...src].sort((a,b) => (a.unit||"").localeCompare(b.unit||""));
    if (pSort === "diff")   return [...src].sort((a,b) => ["easy","medium","hard"].indexOf(a.difficulty||"medium") - ["easy","medium","hard"].indexOf(b.difficulty||"medium"));
    return src;
  }, [questions, pSubject, pUnit, pTopic, pDiff, pQuery, pSort]);

  // Group filtered by subject→unit for display
  const groupedFiltered = useMemo(() => {
    const g = {};
    filteredQs.forEach(q => {
      const s = q.subject || "(no subject)";
      const u = q.unit || "General";
      if (!g[s]) g[s] = {};
      if (!g[s][u]) g[s][u] = [];
      g[s][u].push(q);
    });
    return g;
  }, [filteredQs]);

  const selectedQs   = questions.filter(q => selectedIds.has(q.id));
  const derivedUnits = useMemo(() => Array.from(new Set(selectedQs.map(q => q.unit))), [selectedQs]);
  const selectedCount = selectedIds.size;

  const toggleQ        = id  => setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll      = ()  => setSelectedIds(new Set(questions.map(q => q.id)));
  const selectFiltered = ()  => setSelectedIds(s => { const n = new Set(s); filteredQs.forEach(q => n.add(q.id)); return n; });
  const deselectFiltered = () => setSelectedIds(s => { const n = new Set(s); filteredQs.forEach(q => n.delete(q.id)); return n; });
  const deselectAll    = ()  => setSelectedIds(new Set());
  const selectByUnit   = (unit) => setSelectedIds(s => { const n = new Set(s); questions.filter(q=>q.unit===unit).forEach(q=>n.add(q.id)); return n; });

  const needsRoom = !isAdmin && !classroomId;
  const ready = title.trim() && selectedCount > 0 && !needsRoom;
  const diffTone = d => d==="hard"?"rose":d==="easy"?"emerald":"amber";
  const diffCounts = useMemo(() => {
    const e=filteredQs.filter(q=>(q.difficulty||"medium")==="easy").length;
    const m=filteredQs.filter(q=>(q.difficulty||"medium")==="medium").length;
    const h=filteredQs.filter(q=>(q.difficulty||"medium")==="hard").length;
    return { easy:e, medium:m, hard:h };
  }, [filteredQs]);

  const save = async () => {
    setSaving(true);
    try {
      const qz = await insertQuiz({
        week: Number(week), title: title.trim(),
        duration_sec: Number(minutes)*60,
        draw_count: selectedCount,
        units: derivedUnits,
        question_ids: [...selectedIds],
        max_attempts: Number(maxAttempts),
        open_at: openAt ? new Date(openAt).toISOString() : null,
        close_at: closeAt ? new Date(closeAt).toISOString() : null,
        classroom_id: classroomId || null,
        show_answers_policy: policy,
        created_by: user.id,
      });
      setQuizzes(prev => [...prev, qz]);
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "quiz.create", target: title.trim(), meta: { classroom_id: classroomId || null, q_count: selectedCount } });
      onDone();
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  return (
    <div className={`${card} p-5`}>
      <h4 className="mb-4 text-sm font-bold text-slate-900">New quiz</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="mb-1 block text-xs font-semibold text-slate-500">Title</label><input className={inp} placeholder="e.g. Aptitude Baseline Quiz" value={title} onChange={e=>setTitle(e.target.value)}/></div>
        <div className="grid grid-cols-3 gap-2">
          <div><label className="mb-1 block text-xs font-semibold text-slate-500">Week</label><input type="number" min={1} className={inp} value={week} onChange={e=>setWeek(e.target.value)}/></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-500">Minutes</label><input type="number" min={1} className={inp} value={minutes} onChange={e=>setMinutes(e.target.value)}/></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-500">Max retakes</label><input type="number" min={1} max={5} className={inp} value={maxAttempts} onChange={e=>setMaxAttempts(e.target.value)}/></div>
        </div>
      </div>
      <div className="mt-4">
        <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><School size={12}/> Share with classroom</label>
        <select className={inp} value={classroomId} onChange={e=>setClassroomId(e.target.value)}>
          {myRooms.map(c => <option key={c.id} value={c.id}>{c.name}{c.section?` · Section ${c.section}`:""}{c.year?` (${c.year})`:""}</option>)}
          {isAdmin && <option value="">All students (no classroom)</option>}
          {!myRooms.length && !isAdmin && <option value="">— no classrooms yet —</option>}
        </select>
        {needsRoom && <p className="mt-1 text-[11px] font-semibold text-rose-600">Create a classroom first (Classrooms tab).</p>}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><CalendarClock size={12}/> Opens at</label><input type="datetime-local" className={inp} value={openAt} onChange={e=>setOpenAt(e.target.value)}/><p className="mt-1 text-[11px] text-slate-400">Leave blank to open immediately.</p></div>
        <div><label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><CalendarClock size={12}/> Closes at</label><input type="datetime-local" className={inp} value={closeAt} onChange={e=>setCloseAt(e.target.value)}/><p className="mt-1 text-[11px] text-slate-400">Leave blank for no deadline.</p></div>
      </div>

      <div className="mt-4 rounded-xl border-2 border-slate-200 bg-slate-50/60 p-4">
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700"><ShieldCheck size={13} className="text-emerald-600"/> When can students see correct answers?</label>
        <select className={inp} value={policy} onChange={e=>setPolicy(e.target.value)}>
          <option value="after_close">After the quiz closes — recommended</option>
          <option value="immediate">Immediately after they submit</option>
          <option value="never">Never — show score only</option>
        </select>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
          {policy === "immediate"
            ? "Only safe when retakes are off. With retakes allowed a student can submit blank, read the key, and retake for full marks."
            : policy === "never"
              ? "Students see their score and nothing else. Use for questions you intend to reuse."
              : "Answers stay hidden until the close time, so students who finish early cannot pass the key to those still sitting."}
        </p>
      </div>

      {/* Question picker — cascade filters */}
      <div className="mt-4 rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
        <button onClick={() => setPickerOpen(v => !v)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-violet-600"/>
            <span className="text-sm font-bold text-slate-900">Pick questions from bank</span>
            <Badge tone={selectedCount === 0 ? "rose" : "emerald"}>{selectedCount} selected</Badge>
          </div>
          <ChevronLeft size={16} className={`text-slate-400 transition-transform ${pickerOpen ? "-rotate-90" : "rotate-180"}`}/>
        </button>
        {pickerOpen && (
          <div className="border-t border-slate-100 p-4 space-y-3">
            {/* Cascade filters row 1 */}
            <div className="flex flex-wrap gap-2">
              <select className={`${inp} !w-auto text-xs`} value={pSubject} onChange={e=>{setPSubject(e.target.value);setPUnit("all");setPTopic("all");}}>
                <option value="all">All subjects</option>
                {subjects.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <select className={`${inp} !w-auto text-xs`} value={pUnit} onChange={e=>{setPUnit(e.target.value);setPTopic("all");}} disabled={units.length===0}>
                <option value="all">All units</option>
                {units.map(u=><option key={u} value={u}>{u}</option>)}
              </select>
              <select className={`${inp} !w-auto text-xs`} value={pTopic} onChange={e=>setPTopic(e.target.value)} disabled={topics.length===0}>
                <option value="all">All topics</option>
                {topics.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              <select className={`${inp} !w-auto text-xs`} value={pDiff} onChange={e=>setPDiff(e.target.value)}>
                <option value="all">Any difficulty</option>
                <option value="easy">Easy only</option>
                <option value="medium">Medium only</option>
                <option value="hard">Hard only</option>
              </select>
              <select className={`${inp} !w-auto text-xs`} value={pSort} onChange={e=>setPSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="unit">By unit</option>
                <option value="diff">By difficulty</option>
              </select>
              <input className={`${inp} !w-auto min-w-[140px] flex-1 text-xs`} placeholder="Search questions…" value={pQuery} onChange={e=>setPQuery(e.target.value)}/>
            </div>
            {/* Difficulty breakdown of current filter */}
            {filteredQs.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span><span className={`${num} font-bold text-slate-800`}>{filteredQs.length}</span> match</span>
                <div className="flex gap-1.5">
                  <button onClick={()=>setPDiff("easy")} className="rounded-full border px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100">{diffCounts.easy} easy</button>
                  <button onClick={()=>setPDiff("medium")} className="rounded-full border px-2 py-0.5 text-[11px] font-semibold bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100">{diffCounts.medium} medium</button>
                  <button onClick={()=>setPDiff("hard")} className="rounded-full border px-2 py-0.5 text-[11px] font-semibold bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100">{diffCounts.hard} hard</button>
                </div>
              </div>
            )}
            {/* Bulk action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-400"><span className={`${num} font-semibold text-slate-800`}>{selectedCount}</span> selected of <span className={`${num} font-semibold`}>{questions.length}</span> total</span>
              <div className="flex flex-wrap gap-1">
                <button onClick={selectAll}        className={`${btnP} !py-1.5 !px-3 !text-xs`}><Plus size={12}/> All bank ({questions.length})</button>
                <button onClick={selectFiltered}   className={`${btnG} !py-1.5 !px-3 !text-xs`}><Plus size={12}/> Add filtered ({filteredQs.length})</button>
                <button onClick={deselectFiltered} className={`${btnG} !py-1.5 !px-3 !text-xs`}>Remove filtered</button>
                <button onClick={deselectAll}      className={`${btnG} !py-1.5 !px-3 !text-xs`}><XCircle size={12}/> Clear all</button>
              </div>
            </div>
            {/* Unit quick-select chips */}
            {pSubject !== "all" && units.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-semibold text-slate-400 self-center">Quick add by unit:</span>
                {units.map(u => (
                  <button key={u} onClick={()=>selectByUnit(u)} className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 transition">
                    {u} <span className={`${num} opacity-70`}>({questions.filter(q=>q.unit===u).length})</span>
                  </button>
                ))}
              </div>
            )}
            {/* Question list grouped by subject/unit */}
            <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-100">
              {filteredQs.length === 0
                ? <div className="p-6 text-center text-xs text-slate-400">No questions match. Try changing filters or upload via Question Bank tab.</div>
                : Object.entries(groupedFiltered).map(([subject, unitMap]) => (
                  <div key={subject}>
                    <div className="sticky top-0 z-10 flex items-center gap-2 bg-violet-50 px-3 py-1.5 border-b border-violet-100">
                      <GraduationCap size={12} className="text-violet-600 shrink-0"/>
                      <span className="text-[11px] font-bold text-violet-700">{subject}</span>
                    </div>
                    {Object.entries(unitMap).map(([unit, qs]) => (
                      <div key={unit}>
                        <div className="flex items-center justify-between px-3 py-1 bg-slate-50 border-b border-slate-100">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{unit}</span>
                          <div className="flex items-center gap-2">
                            <span className={`${num} text-[10px] text-slate-400`}>{qs.filter(q=>selectedIds.has(q.id)).length}/{qs.length} selected</span>
                            <button onClick={()=>{const ids=qs.map(q=>q.id);const allSel=ids.every(id=>selectedIds.has(id));setSelectedIds(s=>{const n=new Set(s);ids.forEach(id=>allSel?n.delete(id):n.add(id));return n;})}} className="text-[10px] font-semibold text-violet-600 hover:text-violet-800">
                              {qs.every(q=>selectedIds.has(q.id)) ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                        </div>
                        {qs.map(q => {
                          const checked = selectedIds.has(q.id);
                          return (
                            <label key={q.id} className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer border-b border-slate-50 transition ${checked ? "bg-violet-50/60" : "hover:bg-slate-50"}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggleQ(q.id)} className="mt-0.5 shrink-0 h-4 w-4 accent-violet-600"/>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1 mb-0.5">
                                  {q.topic && q.topic !== "General" && <span className="text-[10px] text-slate-400">{q.topic}</span>}
                                  {q.difficulty && <Badge tone={diffTone(q.difficulty)}>{q.difficulty}</Badge>}
                                  <span className={`${num} text-[10px] text-slate-300`}>{q.points||1}pt</span>
                                </div>
                                <p className="text-xs font-medium text-slate-800 line-clamp-2">{q.question}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {selectedCount === 0 ? "Pick at least one question above." : `${selectedCount} Q across ${derivedUnits.length} unit${derivedUnits.length===1?"":"s"} · ${Math.round(minutes)} min`}
        </p>
        <div className="flex gap-2">
          <button className={btnG} onClick={onDone}>Cancel</button>
          <button className={btnP} disabled={!ready||saving} onClick={save}>{saving?"Saving…":"Create quiz"}</button>
        </div>
      </div>
    </div>
  );
}
/* ──────────────────────────────────────────────────────────────────
   ITEM ANALYSIS — per-question psychometrics.

   Two standard measures from classical test theory:

   • Difficulty index (p) = proportion who answered correctly.
     0.30–0.80 is the healthy band. Above 0.90 the item teaches you
     nothing (everyone knows it); below 0.20 it is usually broken or
     the topic was never taught.

   • Discrimination index (D) = (correct rate in top 27% of scorers)
     − (correct rate in bottom 27%). A good item is one strong
     students get right and weak students get wrong, so D should be
     positive. D < 0 means the item is INVERTED — your best students
     are getting it wrong, which almost always means a wrong answer
     key or an ambiguous stem. That is the single most valuable
     signal this screen produces.
   ────────────────────────────────────────────────────────────────── */
function computeItemAnalysis(attempts) {
  const withItems = attempts.filter(a => Array.isArray(a.items) && a.items.length);
  if (withItems.length < 1) return [];

  const ranked = [...withItems].sort((a, b) => b.percent - a.percent);
  const groupSize = Math.max(1, Math.round(ranked.length * 0.27));
  const topIds = new Set(ranked.slice(0, groupSize).map(a => a.id));
  const botIds = new Set(ranked.slice(-groupSize).map(a => a.id));

  const byQ = new Map();
  for (const att of withItems) {
    for (const it of att.items) {
      const key = it.qid || it.question;
      if (!key) continue;
      if (!byQ.has(key)) {
        byQ.set(key, {
          key, question: it.question, options: it.options || [], correct: it.correct,
          seen: 0, right: 0, skipped: 0,
          picks: new Array((it.options || []).length).fill(0),
          topSeen: 0, topRight: 0, botSeen: 0, botRight: 0,
        });
      }
      const r = byQ.get(key);
      r.seen++;
      const ok = it.chosen === it.correct;
      if (ok) r.right++;
      if (it.chosen === null || it.chosen === undefined) r.skipped++;
      else if (r.picks[it.chosen] !== undefined) r.picks[it.chosen]++;
      if (topIds.has(att.id)) { r.topSeen++; if (ok) r.topRight++; }
      if (botIds.has(att.id)) { r.botSeen++; if (ok) r.botRight++; }
    }
  }

  return [...byQ.values()].map(r => {
    const p = r.seen ? r.right / r.seen : 0;
    const topRate = r.topSeen ? r.topRight / r.topSeen : 0;
    const botRate = r.botSeen ? r.botRight / r.botSeen : 0;
    const d = topRate - botRate;
    let verdict = "good", note = "Healthy item.";
    if (d < 0)          { verdict = "inverted"; note = "Top scorers got this WRONG more than weak ones — check the answer key."; }
    else if (p >= 0.95) { verdict = "tooEasy";  note = "Nearly everyone got it. Adds little information."; }
    else if (p <= 0.20) { verdict = "tooHard";  note = "Almost nobody got it. Reteach the topic, or the stem may be unclear."; }
    else if (d < 0.15)  { verdict = "weak";     note = "Barely separates strong from weak students."; }
    return { ...r, p, d, topRate, botRate, verdict, note };
  }).sort((a, b) => a.p - b.p);
}

function ItemAnalysis({ attempts }) {
  const rows = useMemo(() => computeItemAnalysis(attempts), [attempts]);
  const [open, setOpen]   = useState(false);
  const [only, setOnly]   = useState("problems");

  if (!rows.length) return null;

  const problems = rows.filter(r => r.verdict !== "good");
  const shown = only === "problems" ? problems : rows;
  const tone = v => v === "inverted" ? "rose" : v === "tooHard" ? "amber" : v === "tooEasy" ? "sky" : v === "weak" ? "slate" : "emerald";
  const label = v => v === "inverted" ? "Check key" : v === "tooHard" ? "Too hard" : v === "tooEasy" ? "Too easy" : v === "weak" ? "Weak" : "Good";
  const inverted = rows.filter(r => r.verdict === "inverted").length;

  const exportItems = () => downloadCSV("item-analysis.csv", rows, [
    { label: "Question",          key: "question" },
    { label: "Times answered",    key: "seen" },
    { label: "Correct",           key: "right" },
    { label: "Skipped",           key: "skipped" },
    { label: "Difficulty (p)",    value: r => r.p.toFixed(2) },
    { label: "Discrimination (D)",value: r => r.d.toFixed(2) },
    { label: "Verdict",           value: r => label(r.verdict) },
    { label: "Correct answer",    value: r => r.options[r.correct] ?? "" },
  ]);

  return (
    <div className={`${card} overflow-hidden`}>
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Target size={15} className="text-violet-600"/> Question analysis
            {inverted > 0 && <Badge tone="rose">{inverted} need{inverted===1?"s":""} review</Badge>}
          </h4>
          <p className="mt-0.5 text-xs text-slate-400">
            {problems.length ? `${problems.length} of ${rows.length} questions flagged` : `All ${rows.length} questions look healthy`}
          </p>
        </div>
        <ChevronLeft size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? "-rotate-90" : "rotate-180"}`}/>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              <button onClick={() => setOnly("problems")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${only==="problems"?"bg-violet-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>Needs attention ({problems.length})</button>
              <button onClick={() => setOnly("all")}      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${only==="all"?"bg-violet-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>All ({rows.length})</button>
            </div>
            <button onClick={exportItems} className={`${btnG} !py-1.5 !px-3 !text-xs`}><FileDown size={12}/> Export</button>
          </div>

          {!shown.length && <Empty icon={CheckCircle2} title="No problem questions" hint="Every item is discriminating well. Nothing to fix."/>}

          <div className="space-y-3">
            {shown.map(r => (
              <div key={r.key} className={`rounded-xl border p-4 ${r.verdict==="inverted"?"border-rose-200 bg-rose-50/40":"border-slate-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="flex-1 text-sm font-medium text-slate-800">{r.question}</p>
                  <Badge tone={tone(r.verdict)}>{label(r.verdict)}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  <span className="text-slate-500">Correct: <span className={`${num} font-bold text-slate-800`}>{Math.round(r.p*100)}%</span> <span className="text-slate-400">({r.right}/{r.seen})</span></span>
                  <span className="text-slate-500">Discrimination: <span className={`${num} font-bold ${r.d<0?"text-rose-600":r.d<0.15?"text-amber-600":"text-emerald-600"}`}>{r.d>=0?"+":""}{r.d.toFixed(2)}</span></span>
                  {r.skipped>0 && <span className="text-slate-500">Skipped: <span className={`${num} font-bold text-slate-800`}>{r.skipped}</span></span>}
                </div>

                {/* Distractor spread — where the wrong answers went */}
                <div className="mt-3 space-y-1.5">
                  {r.options.map((opt, i) => {
                    const n = r.picks[i] || 0;
                    const pctPick = r.seen ? Math.round((n/r.seen)*100) : 0;
                    const isRight = i === r.correct;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${isRight?"bg-emerald-500 text-white":"bg-slate-100 text-slate-500"}`}>{"ABCD"[i]}</span>
                        <span className={`min-w-0 flex-1 truncate text-xs ${isRight?"font-semibold text-emerald-700":"text-slate-500"}`}>{opt}</span>
                        <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${isRight?"bg-emerald-500":"bg-slate-300"}`} style={{ width:`${pctPick}%` }}/>
                        </div>
                        <span className={`${num} w-9 shrink-0 text-right text-[11px] text-slate-400`}>{pctPick}%</span>
                      </div>
                    );
                  })}
                </div>

                {r.verdict !== "good" && (
                  <p className={`mt-3 text-[11px] ${r.verdict==="inverted"?"font-semibold text-rose-700":"text-slate-500"}`}>{r.note}</p>
                )}
              </div>
            ))}
          </div>

          <p className="border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
            Discrimination compares your top 27% of scorers against the bottom 27%. A negative value means strong students missed it more often than weak ones — nearly always a wrong answer key or an ambiguous question.
          </p>
        </div>
      )}
    </div>
  );
}

/* Printable question paper + separate answer key. Universities still
   run paper backups when the campus wifi drops mid-exam, and invigilators
   want a key they can mark against without a laptop. Opens a clean print
   window so it works on any device with no extra dependency. */
function printQuizPaper(quiz, questions, { withKey }) {
  const qs = Array.isArray(quiz.question_ids) && quiz.question_ids.length
    ? quiz.question_ids.map(id => questions.find(q => q.id === id)).filter(Boolean)
    : questions.filter(q => (quiz.units || []).includes(q.unit));

  if (!qs.length) { alert("This quiz has no questions to print."); return; }

  const esc = t => String(t ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c]));
  const total = qs.reduce((sum, q) => sum + (q.points || 1), 0);

  const body = qs.map((q, i) => `
    <div class="q">
      <div class="stem"><span class="n">${i + 1}.</span><span>${esc(q.question)}</span><span class="pts">[${q.points || 1}]</span></div>
      <ol class="opts">
        ${q.options.map((o, oi) => `<li class="${withKey && oi === q.correct ? "key" : ""}">${esc(o)}</li>`).join("")}
      </ol>
    </div>`).join("");

  const keyTable = withKey ? `
    <div class="keybox">
      <h2>Answer key</h2>
      <table>${qs.map((q, i) =>
        `<tr><td class="kn">${i + 1}</td><td class="kv">${"ABCD"[q.correct]}</td></tr>`
      ).join("")}</table>
    </div>` : "";

  const w = window.open("", "_blank");
  if (!w) { alert("Your browser blocked the print window. Allow pop-ups for this site and try again."); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(quiz.title)}</title><style>
    @page { margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body { font: 11pt/1.5 Georgia, "Times New Roman", serif; color: #111; margin: 0; }
    header { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 18px; }
    h1 { font-size: 16pt; margin: 0 0 4px; }
    .meta { font-size: 9.5pt; color: #444; display: flex; gap: 18px; flex-wrap: wrap; }
    .fill { margin: 14px 0 20px; font-size: 10pt; display: flex; gap: 26px; flex-wrap: wrap; }
    .fill span { border-bottom: 1px solid #999; min-width: 150px; padding-bottom: 2px; }
    .q { margin-bottom: 14px; page-break-inside: avoid; }
    .stem { display: flex; gap: 7px; font-weight: 600; align-items: baseline; }
    .n { min-width: 22px; }
    .pts { margin-left: auto; font-weight: 400; color: #666; font-size: 9pt; }
    ol.opts { list-style: upper-alpha; margin: 6px 0 0 46px; padding: 0; }
    ol.opts li { margin-bottom: 2px; }
    ol.opts li.key { font-weight: 700; }
    ol.opts li.key::after { content: "  \\2713"; color: #000; }
    .keybox { page-break-before: always; padding-top: 8px; }
    .keybox h2 { font-size: 13pt; margin: 0 0 10px; }
    .keybox table { border-collapse: collapse; }
    .keybox td { border: 1px solid #999; padding: 3px 11px; font-size: 10pt; text-align: center; }
    .kn { background: #f0f0f0; font-weight: 600; }
    .kv { font-weight: 700; }
    footer { margin-top: 26px; border-top: 1px solid #bbb; padding-top: 7px; font-size: 8.5pt; color: #666; text-align: center; }
  </style></head><body>
    <header>
      <h1>${esc(quiz.title)}</h1>
      <div class="meta">
        <span>Week ${esc(quiz.week)}</span>
        <span>Duration: ${Math.round(quiz.duration_sec / 60)} minutes</span>
        <span>Questions: ${qs.length}</span>
        <span>Max marks: ${total}</span>
      </div>
    </header>
    ${withKey ? "" : `<div class="fill"><span>Name:</span><span>CU ID:</span><span>Course &amp; Sem:</span><span>Signature:</span></div>`}
    ${body}
    ${keyTable}
    <footer>Generated by QuizPro on ${new Date().toLocaleDateString()}${withKey ? " — ANSWER KEY, do not distribute to students" : ""}</footer>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

function QuizDetail({ quizzes, quiz, questions = [], attempts, classrooms, profiles, onBack }) {
  const room = classrooms.find(c => c.id === quiz.classroom_id);
  const at  = attempts.filter(a => a.quiz_id === quiz.id).sort((a,b) => b.percent-a.percent);
  const avg = at.length ? Math.round(at.reduce((s,a)=>s+a.percent,0)/at.length) : 0;
  const passCount  = at.filter(a=>a.percent>=60).length;
  const honorsCount= at.filter(a=>a.percent>=80).length;

  // Fix 2: proper percent-bucket distribution (0-20, 21-40, 41-60, 61-80, 81-100)
  const buckets = [
    { label:"0–20%",   min:0,  max:20,  color:"bg-rose-500" },
    { label:"21–40%",  min:21, max:40,  color:"bg-orange-400" },
    { label:"41–60%",  min:41, max:60,  color:"bg-amber-400" },
    { label:"61–80%",  min:61, max:80,  color:"bg-violet-500" },
    { label:"81–100%", min:81, max:100, color:"bg-emerald-500" },
  ].map(b => ({ ...b, count: at.filter(a=>a.percent>=b.min && a.percent<=b.max).length }));
  const maxCount = Math.max(1, ...buckets.map(b=>b.count));

  // Time analysis
  const avgTime = at.length ? Math.round(at.reduce((s,a)=>s+(a.time_used_sec||0),0)/at.length) : 0;
  const fastCount = at.filter(a=>(a.time_used_sec||0) < quiz.duration_sec*0.3).length;

  // Violation breakdown
  const flagged = at.filter(a=>a.violations>0).length;

  // Roster search + risk filter — a 60-student table is unusable without it
  const [q, setQ] = useState("");
  const [lens, setLens] = useState("all");
  const visible = useMemo(() => {
    let v = at;
    if (lens === "failed")  v = v.filter(a => a.percent < 60);
    if (lens === "flagged") v = v.filter(a => (a.violations||0) > 0);
    if (lens === "honors")  v = v.filter(a => a.percent >= 80);
    if (q.trim()) {
      const t = q.toLowerCase();
      v = v.filter(a =>
        (a.student_name||"").toLowerCase().includes(t) ||
        (a.meta?.cu_id||a.student_cu_id||"").toLowerCase().includes(t) ||
        (a.meta?.course||a.student_course||"").toLowerCase().includes(t)
      );
    }
    return v;
  }, [at, q, lens]);

  // Fix 3: Quiz share link
  const quizLink = `${window.location.origin}?quiz=${quiz.id}`;
  const [linkCopied, setLinkCopied] = useState(false);
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(quizLink); setLinkCopied(true); setTimeout(()=>setLinkCopied(false), 2500); } catch {}
  };

  // Fix 4: enriched CSV with student profile fields
  const exportCSV = () => {
    downloadCSV(`${quiz.title.replace(/\s+/g,"-")}-results.csv`, visible, [
      { label: "Student Name",    key: "student_name" },
      { label: "Course",          value: r => r.student_course   || r.meta?.course   || "" },
      { label: "Semester",        value: r => r.student_semester || r.meta?.semester || "" },
      { label: "CU ID",           value: r => r.student_cu_id   || r.meta?.cu_id    || "" },
      { label: "Phone",           value: r => r.student_phone   || r.meta?.phone    || "" },
      { label: "Attempt #",       key: "attempt_number" },
      { label: "Score",           value: r => `${r.score}/${r.max_score}` },
      { label: "Percent %",       key: "percent" },
      { label: "Grade",           value: r => r.percent>=80?"Honors":r.percent>=60?"Pass":"Fail" },
      { label: "Flags",           key: "violations" },
      { label: "Time Taken",      value: r => fmtTime(r.time_used_sec || 0) },
      { label: "Time Taken (s)",  key: "time_used_sec" },
      { label: "Submitted At",    value: r => new Date(r.submitted_at).toLocaleString() },
    ]);
  };

  const creatorName = quiz.created_by && profiles
    ? profiles.find(p => p.id === quiz.created_by)?.full_name
    : null;

  return (
    <div className="space-y-5">
      <button className={`${btnG} w-fit`} onClick={onBack}><ChevronLeft size={15}/> Back</button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="violet">Week {quiz.week}</Badge>
            <Badge tone={room?"sky":"amber"}><School size={11}/> {room?`${room.name}${room.section?` · ${room.section}`:""}${room.year?` (${room.year})`:""}` : "All students"}</Badge>
            {creatorName && <span className="text-xs text-slate-400">by {creatorName}</span>}
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">{quiz.title}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Fix 3: Copy quiz link */}
          <button onClick={copyLink} className={`${btnG} gap-2`}>
            {linkCopied ? <><CheckCircle2 size={14} className="text-emerald-500"/> Copied!</> : <><span className="text-xs">Copy quiz link</span></>}
          </button>
          <button className={btnG} onClick={() => printQuizPaper(quiz, questions, { withKey:false })} title="Printable paper for offline backup"><Printer size={14}/> Paper</button>
          <button className={btnG} onClick={() => printQuizPaper(quiz, questions, { withKey:true })} title="Answer key for marking"><Printer size={14}/> Key</button>
          <button className={btnG} onClick={exportCSV}><FileDown size={14}/> Export CSV</button>
        </div>
      </div>

      <LiveInvigilation quiz={quiz} attempts={at}/>

      {/* Fix 3: Quiz link card */}
      <div className={`${card} border-violet-100 bg-violet-50/40 p-4 flex flex-wrap items-center gap-3`}>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-violet-700 mb-1">Quiz link — share directly with students</p>
          <code className="text-xs text-slate-600 font-mono break-all">{quizLink}</code>
        </div>
        <button onClick={copyLink} className={`${btnP} shrink-0`}>
          {linkCopied ? <><CheckCircle2 size={14}/> Copied!</> : <>Copy link</>}
        </button>
      </div>

      {/* Fix 2: Rich stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat icon={Users}       label="Attempts"  value={at.length}                               tone="sky"/>
        <Stat icon={Award}       label="Avg score" value={`${avg}%`}                               tone="violet"/>
        <Stat icon={CheckCircle2}label="Pass rate" value={at.length?`${Math.round(passCount/at.length*100)}%`:"—"} tone="emerald"/>
        <Stat icon={Trophy}      label="Honors"    value={at.length?`${Math.round(honorsCount/at.length*100)}%`:"—"} sub="≥80%" tone="amber"/>
        <Stat icon={ShieldAlert} label="Flagged"   value={at.length?`${Math.round(flagged/at.length*100)}%`:"—"} sub={`${flagged} students`} tone="rose"/>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Fix 2: Score distribution - proper % buckets with colors */}
        <div className={`${card} p-5`}>
          <h4 className="mb-0.5 text-sm font-bold text-slate-900">Score distribution</h4>
          <p className="mb-4 text-xs text-slate-400">Students per score band</p>
          <div className="flex h-36 items-end gap-2">
            {buckets.map(b => (
              <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                <span className={`text-[11px] font-bold ${num} text-slate-700`}>{b.count}</span>
                <div className="flex w-full flex-1 items-end">
                  <div className={`w-full rounded-t-lg ${b.color} transition-all`} style={{ height:`${(b.count/maxCount)*100}%`, minHeight:b.count>0?6:0 }}/>
                </div>
                <span className="text-[9px] text-slate-400 text-center leading-tight">{b.label}</span>
              </div>
            ))}
          </div>
          {/* Pass line indicator */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <div className="h-px flex-1 border-t-2 border-dashed border-emerald-300"/>
            <span>60% pass line</span>
            <div className="h-px flex-1 border-t-2 border-dashed border-emerald-300"/>
          </div>
          {/* Avg, pass, honors mini-bars */}
          <div className="mt-4 space-y-2">
            {[
              { label:"Class average", pct:avg, color:"bg-violet-500" },
              { label:"Pass rate",     pct:at.length?Math.round(passCount/at.length*100):0,   color:"bg-emerald-500" },
              { label:"Honors rate",   pct:at.length?Math.round(honorsCount/at.length*100):0, color:"bg-amber-400" },
            ].map(r => (
              <div key={r.label}>
                <div className="mb-0.5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">{r.label}</span>
                  <span className={`${num} font-bold text-slate-800`}>{r.pct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${r.color} transition-all`} style={{ width:`${r.pct}%` }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attempts table - Fix 4: show course if present */}
        <div className={`${card} overflow-hidden lg:col-span-2`}>
          <div className="border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">All attempts</h4>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{visible.length === at.length ? `${at.length} total` : `${visible.length} of ${at.length}`} · avg score <strong className="text-slate-600">{avg}%</strong> · avg time {fmtTime(avgTime)}</span>
              {fastCount>0&&<Badge tone="amber">{fastCount} unusually fast</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-2.5">
            <div className="relative min-w-[180px] flex-1">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input className={`${inp} !py-1.5 pl-8 text-xs`} placeholder="Search name, CU ID, or course…" value={q} onChange={e=>setQ(e.target.value)}/>
            </div>
            {[["all","All"],["failed","Below 60%"],["flagged","Flagged"],["honors","Honors"]].map(([k,lbl]) => (
              <button key={k} onClick={()=>setLens(k)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${lens===k?"bg-violet-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{lbl}</button>
            ))}
          </div>
          <div className="overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-3 py-2.5 hidden sm:table-cell">Course</th>
                  <th className="px-3 py-2.5 text-right">Score</th>
                  <th className="px-3 py-2.5 text-right">%</th>
                  <th className="px-3 py-2.5 text-center">Flags</th>
                  <th className="px-3 py-2.5 text-right hidden lg:table-cell">Time taken</th>
                  <th className="px-4 py-2.5 text-right hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!visible.length && <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">{at.length ? "No students match this filter." : "No attempts yet."}</td></tr>}
                {visible.map(a => {
                  const course = a.student_course || a.meta?.course || "";
                  const fast = (a.time_used_sec||0) < quiz.duration_sec * 0.3;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600">{(a.student_name||"?").charAt(0)}</div>
                          <div>
                            <p className="font-medium text-slate-800 text-xs">{a.student_name}</p>
                            {a.meta?.cu_id && <p className="text-[10px] text-slate-400">{a.meta.cu_id}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        {course ? <Badge tone="slate">{course}</Badge> : <span className="text-[10px] text-slate-300">—</span>}
                      </td>
                      <td className={`px-3 py-2.5 text-right ${num} text-slate-600 text-xs`}>{a.score}/{a.max_score}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`font-bold ${num} text-xs ${a.percent>=80?"text-emerald-600":a.percent>=60?"text-violet-600":a.percent>=40?"text-amber-600":"text-rose-600"}`}>{a.percent}%</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Badge tone={vTone(a.violations)}>{a.violations}</Badge>
                          {fast && <Badge tone="amber" title="Submitted unusually fast">fast</Badge>}
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 text-right ${num} text-xs hidden lg:table-cell ${fast ? "font-semibold text-amber-600" : "text-slate-500"}`}>{fmtTime(a.time_used_sec || 0)}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-400 hidden md:table-cell">{dateStr(a.submitted_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-400">Flags = window switches + fullscreen exits. Signals, not evidence.</div>
        </div>
      </div>

      <ItemAnalysis attempts={at}/>
    </div>
  );
}
const COURSES = ["MBA","BBA","BCom (Hons)","BCom (CFA)","MCA","BTech (CS)","BTech (AI/ML)","BCA","BTech (EC/ME)","BTech (IT)","Other"];
const SEMESTERS = ["1st","2nd","3rd","4th","5th","6th","7th","8th"];

function StudentProfileModal({ userId, onSave }) {
  const pKey = `quizpro:profile:${userId}`;
  const saved = useMemo(()=>{ try { return JSON.parse(localStorage.getItem(pKey)||"{}"); } catch{return{};} },[pKey]);
  const [course,    setCourse]   = useState(saved.course    || "");
  const [semester,  setSemester] = useState(saved.semester  || "");
  const [cuId,      setCuId]     = useState(saved.cu_id     || "");
  const [phone,     setPhone]    = useState(saved.phone     || "");
  const ready = course && semester && cuId.trim();
  const save = () => {
    const p = { course, semester, cu_id: cuId.trim(), phone: phone.trim() };
    try { localStorage.setItem(pKey, JSON.stringify(p)); } catch {}
    onSave(p);
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className={`${card} w-full max-w-md p-6 space-y-5`}>
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">Student profile</h3>
          <p className="mt-1 text-xs text-slate-500">Required once — saved on this device. Your details appear in the faculty report and CSV export.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Course *</label>
          <select className={inp} value={course} onChange={e=>setCourse(e.target.value)}>
            <option value="">Select your programme…</option>
            {COURSES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Semester *</label>
            <select className={inp} value={semester} onChange={e=>setSemester(e.target.value)}>
              <option value="">Select…</option>
              {SEMESTERS.map(s=><option key={s} value={s}>{s} sem</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">CU ID / Roll No. *</label>
            <input className={inp} placeholder="e.g. 20BCE1234" value={cuId} onChange={e=>setCuId(e.target.value.toUpperCase())}/>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Phone (optional)</label>
          <input className={inp} type="tel" placeholder="10-digit mobile number" maxLength={10} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))}/>
        </div>
        <button className={`${btnP} w-full justify-center`} disabled={!ready} onClick={save}>
          Save &amp; continue to quiz
        </button>
      </div>
    </div>
  );
}

function Student({ questions, quizzes, setQuizzes, attempts, setAttempts, classrooms, setClassrooms, user, profile }) {
  const [screen, setScreen]         = useState("home");
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [lastAttempt, setLast]      = useState(null);
  const [studentMeta, setStudentMeta] = useState(null);
  const [needsProfile, setNeedsProfile] = useState(false);

  const pKey = `quizpro:profile:${user.id}`;
  const loadMeta = () => { try { const m = JSON.parse(localStorage.getItem(pKey)||"null"); return m?.course&&m?.cu_id ? m : null; } catch{return null;} };

  // Deep link: ?quiz=<id> opens that quiz directly (faculty paste the link
  // into a class group). The id is captured once on mount, but resolution
  // waits for the quiz list to actually arrive — resolving against an empty
  // array would wrongly report the quiz as unavailable.
  const startQuizRef = useRef(null);
  const [deepLinkMsg, setDeepLinkMsg] = useState(null);
  const deepLinkId = useRef(new URLSearchParams(window.location.search).get("quiz"));
  const deepLinkDone = useRef(false);

  useEffect(() => {
    const id = deepLinkId.current;
    if (!id || deepLinkDone.current) return;
    if (!quizzes.length) return;            // still loading — try again next render
    deepLinkDone.current = true;
    window.history.replaceState({}, "", window.location.pathname);

    const qz = quizzes.find(q => q.id === id);
    if (!qz) {
      setDeepLinkMsg("That quiz isn't shared with you yet. Join the classroom using its code, then open the link again.");
      return;
    }
    const avail = quizAvailability(qz);
    if (!avail.available) { setDeepLinkMsg(`"${qz.title}" is ${avail.label.toLowerCase()}.`); return; }
    startQuizRef.current?.(qz);
  }, [quizzes]);

  const onSubmit = async (attempt) => {
    try {
      const meta = studentMeta || loadMeta() || {};
      const saved = await insertAttempt({
        ...attempt,
        student_course:   meta.course   || null,
        student_semester: meta.semester || null,
        student_cu_id:    meta.cu_id    || null,
        student_phone:    meta.phone    || null,
        meta,
      });
      setAttempts(prev => [...prev, saved]);
      localStorage.removeItem(draftKey(attempt.quiz_id, attempt.user_id));
      setLast(saved);
      setScreen("result");
    } catch (err) { throw err; }
  };

  const startQuiz = (qz) => {
    const meta = loadMeta();
    if (!meta) {
      setActiveQuiz(qz);
      setNeedsProfile(true);
    } else {
      setStudentMeta(meta);
      setActiveQuiz(qz);
      setScreen("rules");
    }
  };

  startQuizRef.current = startQuiz;

  if (needsProfile && activeQuiz) return <StudentProfileModal userId={user.id} onSave={meta=>{ setStudentMeta(meta); setNeedsProfile(false); setScreen("rules"); }}/>;
  if (screen==="rules"  && activeQuiz) return <Rules quiz={activeQuiz} questions={questions} attempts={attempts} name={profile.full_name} userId={user.id} onStart={() => setScreen("exam")} onBack={() => setScreen("home")}/>;
  if (screen==="exam"   && activeQuiz) return <Exam questions={questions} quiz={activeQuiz} user={user} profile={profile} attempts={attempts} onSubmit={onSubmit} onAbort={() => setScreen("home")}/>;
  if (screen==="result" && lastAttempt) return <Result quizzes={quizzes} attempt={lastAttempt} attempts={attempts} name={profile.full_name} onHome={() => setScreen("home")}/>;
  return <StudentHome quizzes={quizzes} setQuizzes={setQuizzes} questions={questions} attempts={attempts} classrooms={classrooms} setClassrooms={setClassrooms} name={profile.full_name} userId={user.id} onStart={startQuiz} deepLinkMsg={deepLinkMsg} onDismissDeepLink={()=>setDeepLinkMsg(null)}/>;
}

function StudentHome({ quizzes, setQuizzes, questions, attempts, classrooms, setClassrooms, name, userId, onStart, deepLinkMsg, onDismissDeepLink }) {
  // Scope every stat to THIS student. Matching on name collides when two
  // students share a name; user_id is the only safe key.
  const myAll = useMemo(() => attempts.filter(a => a.user_id === userId), [attempts, userId]);
  const board  = useMemo(() => buildLeaderboard(attempts), [attempts]);
  const myRank = board.findIndex(s => s.user_id === userId);
  const myAvg  = board.find(s => s.user_id === userId)?.avg || 0;
  const mine   = myAll;
  const trend  = mine.slice().sort((a,b)=>new Date(a.submitted_at)-new Date(b.submitted_at)).map(a=>({ name: dateStr(a.submitted_at), pct: a.percent }));
  const honors = myAvg >= 80 && mine.length > 0;
  const flags  = mine.reduce((s,a)=>s+a.violations,0);

  /* ── join a classroom by code ─────────────────────────────────── */
  const [code, setCode]       = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState(null);
  const [roomFilter, setRoomFilter] = useState("all");

  const join = async () => {
    if (!code.trim()) return;
    setJoining(true); setJoinMsg(null);
    try {
      const room = await joinClassroomByCode(code);
      setClassrooms(prev => prev.some(c => c.id === room.id) ? prev : [...prev, room]);
      const fresh = await fetchQuizzes();
      setQuizzes(fresh);
      setCode("");
      setJoinMsg({ tone: "emerald", msg: `Joined ${room.name}${room.section ? ` · ${room.section}` : ""}${room.year ? ` (${room.year})` : ""}.` });
    } catch (err) { setJoinMsg({ tone: "rose", msg: err.message }); }
    setJoining(false);
  };

  const leave = async (room) => {
    if (!window.confirm(`Leave "${roomLabel(room)}"?\n\nYour past attempts are kept. You can rejoin later with the same code.`)) return;
    try {
      await leaveClassroomAsStudent(room.id);
      setClassrooms(prev => prev.filter(c => c.id !== room.id));
      const fresh = await fetchQuizzes();
      setQuizzes(fresh);
      if (roomFilter === room.id) setRoomFilter("all");
      setJoinMsg({ tone: "amber", msg: `Left ${roomLabel(room)}.` });
    } catch (err) { setJoinMsg({ tone: "rose", msg: err.message }); }
  };

  const roomLabel = (c) => `${c.name}${c.section ? ` · ${c.section}` : ""}${c.year ? ` (${c.year})` : ""}`;
  const visibleQuizzes = roomFilter === "all" ? quizzes : quizzes.filter(q => q.classroom_id === roomFilter);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-violet-700 to-violet-900 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-300">
              {honors ? <><Sparkles size={13} className="text-amber-300"/> Honors standing</> : <>Your standing</>}
            </div>
            <div className="mt-2 flex items-end gap-3">
              <span className={`text-6xl font-extrabold leading-none ${num} ${myRank>=0?"text-amber-300":"text-white"}`}>{myRank>=0?`#${myRank+1}`:"—"}</span>
              <span className="pb-2 text-sm text-violet-300">{mine.length?`of ${board.length} students`:"take a quiz to rank"}</span>
            </div>
            <p className="mt-1.5 text-sm text-violet-200">{name}{mine.length?` · ${myAvg}% avg · ${mine.length} quiz${mine.length===1?"":"zes"}`:" — no quizzes taken yet"}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[["avg",mine.length?`${myAvg}%`:"—"],["taken",mine.length],["flags",flags]].map(([label,value]) => (
              <div key={label} className="rounded-2xl bg-white/10 px-4 py-3 text-center backdrop-blur">
                <div className={`text-2xl font-extrabold ${num}`}>{value}</div>
                <div className="text-[11px] font-medium text-violet-300">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {trend.length > 1 && (
        <div className={`${card} p-5`}>
          <h3 className="mb-1 text-sm font-bold text-slate-900">Score trend</h3>
          <p className="mb-4 text-xs text-slate-400">Your scores over time</p>
          <div className="flex h-36 items-end gap-2">
            {trend.map((t, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full rounded-t-lg bg-violet-500 transition-all" style={{ height: `${t.pct}%`, minHeight: 4 }} title={`${t.pct}%`} />
                </div>
                <span className={`text-[11px] font-semibold text-slate-600 ${num}`}>{t.pct}%</span>
                <span className="text-[10px] text-slate-400">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QAAPF mini-profile for student */}
      {myAll.length > 0 && (() => {
        let profile;
        try { profile = computeQAAPFProfile(myAll, questions); }
        catch (e) { console.error("QAAPF profile failed:", e); return null; }
        if (profile.overallPct === null) return null;
        const lvl = profile.overallLevel;
        return (
          <div className={`${card} p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div><h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Brain size={15} className="text-violet-600"/> Your aptitude profile</h3><p className="text-xs text-slate-400 mt-0.5">QAAPF — Quantitative & Analytical Aptitude Proficiency Framework</p></div>
              {lvl && <div className={`rounded-xl border px-4 py-2 text-center ${lvl.light}`}><div className="text-lg font-extrabold">{lvl.level}</div><div className="text-xs font-semibold">{lvl.label}</div></div>}
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              {profile.domainProfiles.filter(d=>d.pct!==null).map(d=>(
                <div key={d.id} className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                  <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">{d.icon} {d.short}</div>
                  <div className={`text-lg font-extrabold ${d.pct>=70?"text-emerald-600":d.pct>=50?"text-amber-600":"text-rose-600"}`}>{d.pct}%</div>
                  <div className={`text-[10px] font-semibold ${d.level?.light.split(" ").slice(2).join(" ")}`}>{d.level?.level}</div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${d.pct>=70?"bg-emerald-500":d.pct>=50?"bg-amber-400":"bg-rose-500"}`} style={{width:`${d.pct}%`}}/></div>
                </div>
              ))}
            </div>
            {profile.gaps.length > 0 && (
              <div className="mt-3 rounded-xl bg-rose-50 border border-rose-100 p-3">
                <p className="text-xs font-bold text-rose-700 mb-1">Focus areas for improvement:</p>
                <p className="text-[11px] text-rose-600">{profile.gaps.map(d=>`${d.icon} ${d.name}`).join(" · ")}</p>
              </div>
            )}
          </div>
        );
      })()}

      {deepLinkMsg && (
        <div className={`${card} border-amber-200 bg-amber-50 p-4 flex items-start gap-3`}>
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600"/>
          <p className="flex-1 text-xs text-amber-800">{deepLinkMsg}</p>
          <button onClick={onDismissDeepLink} className="shrink-0 text-amber-400 hover:text-amber-700"><XCircle size={15}/></button>
        </div>
      )}

      {/* ── My classrooms + join by code ─────────────────────────── */}
      <div className={`${card} p-5 space-y-4`}>
        <div className="flex items-center gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><School size={15} className="text-violet-500"/> My classrooms</h3>
          {classrooms.length > 0 && <Badge tone="slate">{classrooms.length}</Badge>}
        </div>
        {classrooms.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {classrooms.map(c => (
              <div key={c.id} className="inline-flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 pl-3 pr-1 py-1 text-xs font-semibold text-violet-700">
                <School size={12}/><span>{roomLabel(c)}</span>
                <button onClick={() => leave(c)} title="Leave classroom" className="rounded-lg p-1 text-violet-400 hover:bg-violet-100 hover:text-rose-500 transition"><XCircle size={13}/></button>
              </div>
            ))}
          </div>
        )}
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 p-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">{classrooms.length > 0 ? "Join another classroom" : "Join your first classroom"}</label>
          <p className="text-[11px] text-slate-500 mb-2.5">You can be in multiple classes with the same login — enter the code your instructor shared.</p>
          <div className="flex flex-wrap gap-2">
          <div className="w-full sm:w-auto">
            <div className="flex gap-2">
              <input className={`${inp} sm:w-44 uppercase tracking-widest`} maxLength={6} placeholder="JOIN CODE" value={code}
                onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && join()}/>
              <button className={`${btnP} shrink-0`} disabled={joining || code.trim().length < 4} onClick={join}>
                <LogIn size={14}/> {joining ? "Joining…" : "Join classroom"}
              </button>
            </div>
            {joinMsg && <p className={`mt-2 text-xs font-semibold ${joinMsg.tone === "emerald" ? "text-emerald-600" : joinMsg.tone === "amber" ? "text-amber-600" : "text-rose-600"}`}>{joinMsg.msg}</p>}
          </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">This term's quizzes</h3>
          {classrooms.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setRoomFilter("all")}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${roomFilter==="all"?"border-violet-500 bg-violet-50 text-violet-700":"border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>All</button>
              {classrooms.map(c => (
                <button key={c.id} onClick={() => setRoomFilter(c.id)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${roomFilter===c.id?"border-violet-500 bg-violet-50 text-violet-700":"border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>{c.name}</button>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {!visibleQuizzes.length && <div className="sm:col-span-2"><Empty icon={ListChecks} title="No quizzes here yet" hint={classrooms.length ? "Your instructor hasn't published a quiz for this classroom yet." : "Join a classroom above to see its quizzes."}/></div>}
          {visibleQuizzes.map(qz => {
            const room = classrooms.find(c => c.id === qz.classroom_id);
            const myAttempts = myAll.filter(a => a.quiz_id === qz.id).sort((a,b)=>b.attempt_number-a.attempt_number);
            const best = myAttempts.reduce((b,a) => (!b || a.percent > b.percent) ? a : b, null);
            const attemptsUsed = myAttempts.length;
            const canRetake = attemptsUsed > 0 && attemptsUsed < qz.max_attempts;
            const isExact = Array.isArray(qz.question_ids) && qz.question_ids.length > 0;
            const pool = isExact
              ? questions.filter(b => qz.question_ids.includes(b.id)).length
              : questions.filter(b => (qz.units||[]).includes(b.unit)).length;
            const needed = isExact ? 1 : qz.draw_count;
            const avail = quizAvailability(qz);
            const canStart = avail.available && pool >= needed && (attemptsUsed === 0 || canRetake);

            return (
              <div key={qz.id} className={`${cardH} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="violet">Week {qz.week}</Badge>
                      {room && <Badge tone="sky"><School size={11}/> {room.name}{room.section?` · ${room.section}`:""}</Badge>}
                      {!avail.available && <Badge tone="rose">{avail.label}</Badge>}
                    </div>
                    <h4 className="mt-2 font-bold text-slate-900">{qz.title}</h4>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={12}/>{Math.round(qz.duration_sec/60)} min</span>
                      <span className="flex items-center gap-1"><ListChecks size={12}/>{qz.draw_count} questions</span>
                      {qz.max_attempts > 1 && <span className="flex items-center gap-1"><RotateCcw size={12}/>{attemptsUsed}/{qz.max_attempts} used</span>}
                    </div>
                  </div>
                  {best && (
                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-extrabold ${num} ${best.percent>=80?"text-emerald-600":best.percent>=60?"text-violet-600":"text-rose-600"}`}>{best.percent}%</div>
                      <div className="text-[11px] text-slate-400">best of {attemptsUsed}</div>
                    </div>
                  )}
                </div>
                {best && (
                  <div className="mt-4">
                    <ScoreBar value={best.percent}/>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><CheckCircle2 size={13}/> Completed · {dateStr(best.submitted_at)}</div>
                  </div>
                )}
                {canStart ? (
                  <button className={`${btnP} mt-4 w-full`} onClick={() => onStart(qz)}>
                    <Play size={14}/> {attemptsUsed > 0 ? "Retake quiz" : "Start quiz"}
                  </button>
                ) : attemptsUsed > 0 && !canRetake ? (
                  <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs font-medium text-slate-400">No attempts remaining</div>
                ) : !avail.available ? (
                  <div className="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-center text-xs font-medium text-rose-500">{avail.label}</div>
                ) : (
                  <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs font-medium text-slate-400">Not enough questions in bank</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Rules({ quiz, questions, attempts, name, userId, onStart, onBack }) {
  const isExact = Array.isArray(quiz.question_ids) && quiz.question_ids.length > 0;
  const pool = isExact
    ? questions.filter(b => quiz.question_ids.includes(b.id)).length
    : questions.filter(b => (quiz.units||[]).includes(b.unit)).length;
  const myAttempts = attempts.filter(a => a.quiz_id === quiz.id && a.user_id === userId).length;
  const isRetake = myAttempts > 0;
  return (
    <div className="mx-auto max-w-lg pt-6">
      <button className={`${btnG} mb-4`} onClick={onBack}><ChevronLeft size={15}/> Back</button>
      <div className={`${card} overflow-hidden`}>
        <div className="bg-gradient-to-br from-violet-50 to-white px-6 pt-6">
          <div className="flex items-center gap-1.5">
            <Badge tone="violet">Week {quiz.week}</Badge>
            {isRetake && <Badge tone="amber">Retake — attempt {myAttempts + 1} of {quiz.max_attempts}</Badge>}
          </div>
          <h3 className="mt-2 text-xl font-extrabold text-slate-900">{quiz.title}</h3>
          <p className="mt-1 text-sm text-slate-500">Signed in as <strong>{name}</strong></p>
        </div>
        <div className="space-y-3 p-6 text-sm">
          {[
            [ListChecks, `${quiz.draw_count} questions, randomly drawn from ${pool} and unique to your session.`],
            [Clock, `${Math.round(quiz.duration_sec/60)} minutes. Auto-submits when time runs out.`],
            [ShieldCheck, "Goes fullscreen. Leaving locks the quiz — the screen goes blank until you return."],
            [AlertTriangle, "5 violations auto-submit your quiz. Split-screen, floating windows, and app switching are all detected."],
            [Eye, "You can see the integrity log live next to the questions."],
          ].map(([Icon, text], i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><Icon size={15}/></span>
              <p className="text-slate-600 leading-relaxed">{text}</p>
            </div>
          ))}
          {isRetake && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-xs leading-relaxed text-amber-700">
              This is a retake. Your best score across all attempts will count toward your class rank. This is attempt {myAttempts + 1} of {quiz.max_attempts} allowed.
            </div>
          )}
          <div className="rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500 border border-slate-100">This system cannot see a second device. Part of academic integrity is trust — do your own work.</div>
          <button className={`${btnP} w-full`} onClick={onStart}><Play size={15}/> Start now</button>
        </div>
      </div>
    </div>
  );
}

/* ── Proctored Exam ───────────────────────────────────────────────── */
function Exam({ questions, quiz, user, profile, attempts, onSubmit, onAbort }) {
  const containerRef = useRef(null);
  const dKey = draftKey(quiz.id, user.id);

  // ── localStorage backup / restore ──────────────────────────────
  // If the browser crashed, network dropped, or the tab was closed
  // mid-exam, we restore the exact question draw and answers so the
  // student doesn't lose progress or get a fresh (easier/harder) draw.
  const restored = useMemo(() => {
    try {
      const raw = localStorage.getItem(dKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Only trust a restore if it's for this exact quiz and reasonably recent (same day)
      if (parsed.quizId === quiz.id && Date.now() - parsed.savedAt < 6 * 3600 * 1000) return parsed;
    } catch (_) {}
    return null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [drawn] = useState(() => {
    if (restored) return restored.drawn;
    // If quiz was created with exact question_ids, serve those specifically
    if (Array.isArray(quiz.question_ids) && quiz.question_ids.length > 0) {
      const wanted = new Set(quiz.question_ids);
      const pool = questions.filter(b => wanted.has(b.id));
      return shuffle(pool).map(q => ({ q, order: shuffle([0,1,2,3]) }));
    }
    // Legacy: random draw from units
    const pool = questions.filter(b => (quiz.units||[]).includes(b.unit));
    return shuffle(pool).slice(0, quiz.draw_count).map(q => ({ q, order: shuffle([0,1,2,3]) }));
  });
  const [answers, setAnswers]       = useState(() => restored?.answers ?? drawn.map(() => null));
  // "Mark for review" — standard in NTA/GRE/GMAT interfaces. Students
  // park an uncertain question and come back rather than burning time.
  const [flagged, setFlagged]       = useState(() => new Set(restored?.flagged ?? []));
  const [online, setOnline]         = useState(() => navigator.onLine !== false);
  const [idx, setIdx]               = useState(0);
  const [remaining, setRemaining]   = useState(() => restored?.remaining ?? quiz.duration_sec);
  const [log, setLog]               = useState(() => restored?.log ?? []);
  const [banner, setBanner]         = useState(null);
  const [fsBlocked, setFsBlocked]   = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [locked, setLocked]         = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const submittedRef = useRef(false);
  const cleanupRef = useRef(null);   // { cleanup, unlock }
  const finishRef = useRef(null);    // always-current ref to finish()

  // Persist a snapshot to localStorage on every meaningful change.
  useEffect(() => {
    if (submitted) return;
    try {
      localStorage.setItem(dKey, JSON.stringify({ quizId: quiz.id, drawn, answers, flagged: [...flagged], remaining, log, savedAt: Date.now() }));
    } catch (_) {}
  }, [answers, flagged, remaining, log, submitted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Network state — shown in the integrity panel so a student can see
  // at a glance that a dropped connection has not eaten their answers.
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  const addFlag = useCallback(label => {
    setLog(l => [...l, { t: Date.now(), label }]);
    setBanner(label);
    setTimeout(() => setBanner(null), 3500);
  }, []);

  // ── LOCKDOWN ENGINE ──────────────────────────────────────────
  // Uses finishRef (updated below) so onAutoSubmit always calls
  // the latest finish(), avoiding stale-closure bugs.
  useEffect(() => {
    if (submitted) return;
    import("./lib/lockdown.js").then(({ createLockdownSession }) => {
      const session = createLockdownSession({
        container: containerRef.current,
        onFlag: (label) => {
          if (!submittedRef.current) addFlag(label);
        },
        onLock: () => {
          if (!submittedRef.current) {
            setLocked(true);
            setViolationCount(c => c + 1);
          }
        },
        onAutoSubmit: () => {
          if (!submittedRef.current && finishRef.current) finishRef.current();
        },
        autoSubmitAt: 5,
      });
      cleanupRef.current = session;
    }).catch(() => {
      if (containerRef.current) enterFs(containerRef.current).catch(() => setFsBlocked(true));
    });

    return () => {
      if (cleanupRef.current) cleanupRef.current.cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up lockdown on submit
  useEffect(() => {
    if (submitted && cleanupRef.current) {
      cleanupRef.current.cleanup();
      cleanupRef.current = null;
    }
  }, [submitted]);

  const handleReturnToExam = useCallback(async () => {
    // Reset the engine's isLocked so overlay re-fires on next violation
    if (cleanupRef.current?.unlock) cleanupRef.current.unlock();
    try {
      const { returnToExam } = await import("./lib/lockdown.js");
      await returnToExam(containerRef.current);
    } catch (_) {
      if (containerRef.current) enterFs(containerRef.current).catch(() => {});
    }
    setLocked(false);
  }, []);

  useEffect(() => {
    if (submitted) return;
    if (remaining <= 0) { finish(); return; }
    const id = setTimeout(() => setRemaining(r => r-1), 1000);
    return () => clearTimeout(id);
  }, [remaining, submitted]);

  const choose = origIdx => setAnswers(a => { const n=[...a]; n[idx]=origIdx; return n; });

  const buildAttemptPayload = useCallback(() => {
    let score = 0, maxScore = 0;
    const items = drawn.map((d, i) => {
      maxScore += d.q.points;
      if (answers[i] === d.q.correct) score += d.q.points;
      return { qid: d.q.id, question: d.q.question, options: d.q.options, correct: d.q.correct, chosen: answers[i] };
    });
    const used = quiz.duration_sec - remaining;
    const attemptNumber = attempts.filter(a => a.quiz_id === quiz.id && a.user_id === user.id).length + 1;
    return {
      quiz_id: quiz.id,
      user_id: user.id,
      student_name: profile.full_name,
      attempt_number: attemptNumber,
      score, max_score: maxScore, percent: pct(score, maxScore),
      violations: log.length, items, log,
      submitted_at: new Date().toISOString(),
      time_used_sec: used > 0 ? used : 1,
    };
  }, [drawn, answers, quiz, user, profile, remaining, log, attempts]);

  const finish = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true; setSubmitted(true); exitFs();
    setSubmitting(true);
    const payload = buildAttemptPayload();
    try {
      await onSubmit(payload);
      endLiveSession(quiz.id, user.id, "submitted");
    } catch (err) {
      // Submission failed (network drop, etc). The draft is still in
      // localStorage — offer a retry instead of silently losing the exam.
      setSubmitError(err.message || "Could not reach the server.");
      submittedRef.current = false; // allow retry to re-attempt
    }
    setSubmitting(false);
  }, [buildAttemptPayload, onSubmit]);

  // Keep finishRef in sync so the lockdown engine's onAutoSubmit
  // always calls the latest finish() with current state.
  useEffect(() => { finishRef.current = finish; }, [finish]);

  const retrySubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    submittedRef.current = true;
    const payload = buildAttemptPayload();
    try {
      await onSubmit(payload);
    } catch (err) {
      setSubmitError(err.message || "Still could not reach the server. Your answers are saved locally — try again when your connection is back.");
      submittedRef.current = false;
    }
    setSubmitting(false);
  };

  const answered = answers.filter(a => a !== null).length;

  /* Live invigilation heartbeat. The faculty dashboard cannot show a
     student who has not submitted anything yet, so the browser
     publishes its own progress. Deliberately fire-and-forget: every
     helper swallows its errors, because an invigilation feature must
     never be able to interrupt the exam it is watching. */
  const liveMeta = useRef({ answered: 0, violations: 0, lastFlag: null, remaining: 0 });
  liveMeta.current = {
    answered,
    violations: log.length,
    lastFlag: log.length ? log[log.length - 1].label : null,
    remaining,
  };

  useEffect(() => {
    if (!user?.id || !quiz?.id) return;
    const meta = (() => {
      try { return JSON.parse(localStorage.getItem(`quizpro:profile:${user.id}`) || "{}"); }
      catch { return {}; }
    })();
    startLiveSession({
      quiz_id: quiz.id,
      user_id: user.id,
      student_name: profile?.full_name || "Student",
      student_course: meta.course || null,
      student_cu_id: meta.cu_id || null,
      total: drawn.length,
      answered: 0,
      violations: 0,
      remaining_sec: quiz.duration_sec,
    });

    const tick = setInterval(() => {
      const m = liveMeta.current;
      touchLiveSession(quiz.id, user.id, {
        answered: m.answered,
        violations: m.violations,
        last_flag: m.lastFlag,
        remaining_sec: m.remaining,
      });
    }, 8000);

    /* A closed tab would otherwise sit on the dashboard as "active"
       until the row goes stale. Mark it abandoned on the way out. */
    const bye = () => endLiveSession(quiz.id, user.id, "abandoned");
    window.addEventListener("pagehide", bye);

    return () => {
      clearInterval(tick);
      window.removeEventListener("pagehide", bye);
    };
  }, [user?.id, quiz?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Push immediately when a flag is raised — an integrity event is the
     one thing an invigilator needs now, not up to eight seconds later. */
  useEffect(() => {
    if (!log.length || !user?.id || !quiz?.id) return;
    const m = liveMeta.current;
    touchLiveSession(quiz.id, user.id, {
      answered: m.answered,
      violations: m.violations,
      last_flag: m.lastFlag,
      remaining_sec: m.remaining,
    });
  }, [log.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = drawn[idx];
  const low = remaining <= 30;

  // Submission failure screen — the localStorage draft persists until
  // a successful submit, so closing and reopening this tab recovers
  // the exact same exam state.
  if (submitError) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/20 text-rose-300"><AlertTriangle size={24}/></div>
          <h3 className="text-lg font-bold text-white">Couldn't submit your quiz</h3>
          <p className="mt-2 text-sm text-slate-400">{submitError}</p>
          <p className="mt-3 text-xs text-slate-500">Your answers are saved on this device. Don't close this tab — try submitting again once your connection is back.</p>
          <button className={`${btnP} mt-5 w-full`} onClick={retrySubmit} disabled={submitting}>
            {submitting ? "Retrying..." : "Retry submission"}
          </button>
        </div>
      </div>
    );
  }

  if (submitting && submitted) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900">
        <div className="text-center text-slate-300">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-violet-400 border-t-transparent"/>
          Submitting your quiz...
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 overflow-auto" style={{ background:"#0f172a" }}>

      {/* ── LOCKDOWN OVERLAY ───────────────────────────────────────
           When the student leaves the exam (tab switch, split-screen,
           floating window, etc.), this opaque wall hides the quiz
           content. They must return and tap "Return to quiz" to
           continue. This is the actual deterrent: they can't read
           questions while away. ──────────────────────────────────── */}
      {locked && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950" style={{ touchAction: "none" }}>
          <div className="w-full max-w-md px-6 text-center">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-rose-500/20">
              <ShieldCheck size={32} className="text-rose-400"/>
            </div>
            <h2 className="text-xl font-extrabold text-white">Quiz locked</h2>
            <p className="mt-3 text-sm text-slate-400">
              You left the exam window. This has been recorded as an integrity violation.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {violationCount >= 4
                ? `Warning: ${5 - violationCount} more violation${5 - violationCount === 1 ? "" : "s"} will auto-submit your quiz.`
                : `${violationCount} violation${violationCount === 1 ? "" : "s"} recorded so far. Stay in the exam to avoid more.`}
            </p>
            <button
              onClick={handleReturnToExam}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-violet-900/50 transition hover:bg-violet-500 active:scale-95">
              <ShieldCheck size={16}/> Return to quiz
            </button>
            <p className="mt-4 text-[11px] text-slate-600">
              The quiz timer continues while this screen is shown.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300"><ShieldCheck size={15} className="text-violet-400"/> {quiz.title}</div>
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-lg font-extrabold ${num} transition-colors ${low?"bg-rose-500/20 text-rose-300":"bg-slate-800 text-slate-100"}`}><Clock size={15} className={low?"text-rose-400":"text-slate-400"}/> {fmtTime(remaining)}</div>
        </div>

        {restored && idx === 0 && answered > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm font-medium text-violet-200">
            <CheckCircle2 size={15}/> Restored your progress from before — you had {answered} question{answered===1?"":"s"} answered.
          </div>
        )}

        {banner && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200">
            <AlertTriangle size={15}/> Recorded: {banner}
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
              <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>Question {idx+1} of {drawn.length}</span>
                <div className="flex items-center gap-2">
                  <Badge tone="violet">{cur.q.unit}</Badge>
                  <button
                    onClick={() => setFlagged(f => { const n = new Set(f); n.has(idx) ? n.delete(idx) : n.add(idx); return n; })}
                    title={flagged.has(idx) ? "Remove review flag" : "Mark for review — come back to this before submitting"}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${flagged.has(idx) ? "border-amber-400/40 bg-amber-400/20 text-amber-300" : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200"}`}>
                    <Flag size={11}/> {flagged.has(idx) ? "Flagged" : "Review"}
                  </button>
                </div>
              </div>
              <p className="mt-4 text-lg font-semibold leading-snug text-white">{cur.q.question}</p>
              <div className="mt-5 space-y-2.5">
                {cur.order.map((origIdx, pos) => {
                  const sel = answers[idx] === origIdx;
                  return (
                    <button key={origIdx} onClick={() => choose(origIdx)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all ${sel?"border-violet-400 bg-violet-500/20 text-white":"border-slate-700 bg-slate-900/40 text-slate-200 hover:border-slate-500"}`}>
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold transition ${sel?"bg-violet-500 text-white":"bg-slate-700 text-slate-300"}`}>{"ABCD"[pos]}</span>
                      {cur.q.options[origIdx]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button className={`${btn} border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700`} disabled={idx===0} onClick={() => setIdx(i=>i-1)}><ChevronLeft size={15}/> Previous</button>
              {idx < drawn.length-1
                ? <button className={btnP} onClick={() => setIdx(i=>i+1)}>Next</button>
                : <button className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`} onClick={() => (answered<drawn.length)?setShowConfirm(true):finish()}><CheckCircle2 size={15}/> Submit quiz</button>}
            </div>

            {showConfirm && (() => {
              const unanswered  = drawn.length - answered;
              const firstOpen   = drawn.findIndex((_, i) => answers[i] === null);
              const firstFlag   = drawn.findIndex((_, i) => flagged.has(i));
              return (
                <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-sm font-semibold text-amber-200">
                    {unanswered > 0
                      ? `${unanswered} question${unanswered===1?"":"s"} still unanswered.`
                      : "All questions answered."}
                    {flagged.size > 0 && ` ${flagged.size} marked for review.`}
                  </p>
                  <p className="mt-1 text-xs text-amber-200/70">Once submitted you cannot change your answers.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`} onClick={finish}>Yes, submit now</button>
                    {firstOpen >= 0 && <button className={`${btn} border border-slate-700 bg-slate-800 text-slate-200`} onClick={() => { setIdx(firstOpen); setShowConfirm(false); }}>Go to unanswered</button>}
                    {firstFlag >= 0 && <button className={`${btn} border border-amber-500/40 bg-amber-500/10 text-amber-200`} onClick={() => { setIdx(firstFlag); setShowConfirm(false); }}>Review flagged</button>}
                    <button className={`${btn} border border-slate-700 bg-slate-800 text-slate-200`} onClick={() => setShowConfirm(false)}>Cancel</button>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Integrity monitor</span>
                {online
                  ? <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"/></span> Live
                    </span>
                  : <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400"><WifiOff size={12}/> Offline</span>}
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className={`text-4xl font-extrabold ${num} ${log.length===0?"text-emerald-400":"text-amber-400"}`}>{log.length}</span>
                <span className="text-xs text-slate-400">flag{log.length===1?"":"s"}</span>
              </div>
              {!online && (
                <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
                  No internet connection. Keep answering — every answer is saved on this device and will be submitted once you reconnect.
                </p>
              )}
              {fsBlocked && <p className="mt-3 rounded-lg bg-slate-900/60 px-3 py-2 text-[11px] leading-relaxed text-slate-400">Fullscreen blocked in this preview. Window monitoring still active.</p>}
              {violationCount >= 3 && violationCount < 5 && (
                <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-[11px] font-semibold text-rose-300">
                  {5 - violationCount} more violation{5 - violationCount === 1 ? "" : "s"} and your quiz auto-submits.
                </div>
              )}
              <div className="mt-4 max-h-40 space-y-1.5 overflow-auto">
                {!log.length
                  ? <p className="text-xs text-slate-500">No events. Stay on this page.</p>
                  : log.slice().reverse().map((e, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-900/60 px-3 py-1.5 text-[11px]">
                      <span className="flex items-center gap-1.5 text-amber-300"><AlertTriangle size={10}/>{e.label}</span>
                      <span className={`${num} text-slate-500`}>{new Date(e.t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
              <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold uppercase tracking-wider">Progress</span>
                <span className={num}>{answered}/{drawn.length}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {drawn.map((_, i) => {
                  const isFlagged = flagged.has(i);
                  return (
                    <button key={i} onClick={() => setIdx(i)}
                      className={`relative grid h-9 place-items-center rounded-xl text-xs font-bold transition ${num} ${i===idx?"bg-violet-500 text-white shadow-lg shadow-violet-900/50":answers[i]!==null?"bg-emerald-500/30 text-emerald-300":"bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>
                      {i+1}
                      {isFlagged && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-slate-800"/>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-700 pt-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400"/>Answered</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400"/>For review ({flagged.size})</span>
              </div>
              {(() => {
                const nextOpen = drawn.findIndex((_, i) => answers[i] === null);
                const nextFlag = drawn.findIndex((_, i) => flagged.has(i));
                return (nextOpen >= 0 || nextFlag >= 0) && (
                  <div className="mt-2 flex gap-1.5">
                    {nextOpen >= 0 && <button onClick={() => setIdx(nextOpen)} className="flex-1 rounded-lg bg-slate-700 px-2 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-slate-600">Next unanswered</button>}
                    {nextFlag >= 0 && <button onClick={() => setIdx(nextFlag)} className="flex-1 rounded-lg bg-amber-500/20 px-2 py-1.5 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-500/30">Next flagged</button>}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Result ───────────────────────────────────────────────────────── */
function Result({ quizzes, attempt, attempts, name, onHome }) {
  /* Answer-key exposure control.

     Showing the key the instant a paper is submitted creates an
     obvious exploit wherever retakes are allowed: submit blank, read
     every correct answer, retake for full marks. The quiz carries a
     policy — default "after_close" — and the review section honours
     it. "immediate" is only safe on single-attempt formative quizzes. */
  const srcQuiz     = quizzes?.find(q => q.id === attempt.quiz_id) || null;
  const policy      = srcQuiz?.show_answers_policy || "after_close";
  const windowShut  = srcQuiz
    ? (srcQuiz.is_open === false) ||
      (srcQuiz.close_at ? new Date(srcQuiz.close_at).getTime() < Date.now() : false)
    : false;
  const showAnswers = policy === "immediate" || (policy === "after_close" && windowShut);
  const board  = useMemo(() => buildLeaderboard(attempts), [attempts]);
  const rank   = board.findIndex(s => s.student === name);
  const honors = attempt.percent >= 80;
  const passed = attempt.percent >= 60;
  const head   = honors ? "bg-gradient-to-br from-amber-400 to-amber-500" : passed ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gradient-to-br from-slate-600 to-slate-700";

  return (
    <div className="mx-auto max-w-2xl space-y-5 pt-6">
      <div className={`${card} overflow-hidden`}>
        <div className={`px-6 py-10 text-center text-white ${head}`}>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/20 mb-3">
            {honors?<Sparkles size={28}/>:passed?<CheckCircle2 size={28}/>:<AlertTriangle size={28}/>}
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-white/80">{honors?"Honors result":passed?"Passed":"Keep going"}</div>
          <div className={`mt-2 text-7xl font-extrabold ${num}`}>{attempt.percent}%</div>
          <p className="mt-1 text-sm text-white/80">{attempt.score} of {attempt.max_score} correct</p>
          <p className="mt-0.5 text-xs text-white/60">Attempt {attempt.attempt_number} · Completed in {fmtTime(attempt.time_used_sec)}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-100 py-4">
          {rank >= 0 && <Badge tone="violet">Class rank #{rank+1} of {board.length}</Badge>}
          <Badge tone={vTone(attempt.violations)}>{attempt.violations} integrity flag{attempt.violations===1?"":"s"}</Badge>
        </div>
        <div className="px-6 py-4">
          <button className={`${honors?btnGld:btnP} w-full`} onClick={onHome}>Back to my dashboard</button>
        </div>
      </div>

      {attempt.items?.length > 0 && !showAnswers && (
        <div className={`${card} p-5 text-center`}>
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-slate-100"><ShieldCheck size={19} className="text-slate-500"/></div>
          <h4 className="text-sm font-bold text-slate-900">Answer review is not open yet</h4>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
            {policy === "never"
              ? "Your instructor has set this quiz to show scores only. Correct answers will not be published."
              : srcQuiz?.close_at
                ? `Correct answers unlock when the quiz closes on ${dateTimeStr(srcQuiz.close_at)}, so that everyone sits the same paper.`
                : "Correct answers unlock once your instructor closes this quiz for the whole class."}
          </p>
          <p className="mt-3 text-[11px] text-slate-400">Your score above is final and already recorded.</p>
        </div>
      )}

      {attempt.items?.length > 0 && showAnswers && (
        <div className={`${card} p-5`}>
          <h4 className="mb-4 text-sm font-bold text-slate-900">Answer review</h4>
          <div className="space-y-3">
            {attempt.items.map((it, i) => {
              const right = it.chosen === it.correct;
              return (
                <div key={i} className={`rounded-xl border p-4 ${right?"border-emerald-100 bg-emerald-50/30":"border-rose-100 bg-rose-50/20"}`}>
                  <div className="flex items-start gap-2.5">
                    {right?<CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500"/>:<XCircle size={15} className="mt-0.5 shrink-0 text-rose-500"/>}
                    <p className="text-sm font-semibold text-slate-800">{it.question}</p>
                  </div>
                  <div className="mt-2.5 grid gap-1 pl-7">
                    {it.options.map((o, oi) => {
                      const isC = oi===it.correct, isCh = oi===it.chosen;
                      return (
                        <div key={oi} className={`flex items-center gap-2 text-xs ${isC?"font-bold text-emerald-700":isCh?"text-rose-500 line-through":"text-slate-400"}`}>
                          {isC?<CheckCircle2 size={12}/>:isCh?<XCircle size={12}/>:<Circle size={12} className="text-slate-200"/>}
                          {o}{isCh&&!isC&&<span className="ml-1 text-rose-400 font-normal">(your answer)</span>}
                        </div>
                      );
                    })}
                    {it.chosen===null && <div className="text-xs italic text-slate-400">Not answered.</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
