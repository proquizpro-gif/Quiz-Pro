import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Users, Upload, Download, Plus, Search, Trash2, ChevronLeft,
  ShieldCheck, Clock, AlertTriangle, CheckCircle2, XCircle, Eye, Play, Trophy,
  FileSpreadsheet, ListChecks, LayoutDashboard, BookOpen, Circle, Award, Sparkles,
  LogOut, AlertCircle, RotateCcw,
  PlayCircle, PauseCircle, CalendarClock, FileDown, ShieldAlert,
  School, LogIn, Edit3, Save, GraduationCap,
} from "lucide-react";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import {
  fetchQuestions, insertQuestion, insertQuestions, deleteQuestion,
  fetchQuizzes, insertQuiz, updateQuiz, deleteQuiz,
  fetchAttempts, fetchMyAttempts, insertAttempt,
  fetchMyClassrooms, joinClassroomByCode, leaveClassroomAsStudent,
  logAudit, subscribeToAttempts,
} from "./lib/db";
import { parseWorkbook, downloadTemplate } from "./lib/xlsx-import";
import { downloadCSV } from "./lib/csv";
import { pingKeepAlive } from "./lib/keepalive";
import AIAssistant from "./components/AIAssistant";
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
export default function AppRoot() {
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
      {tab==="overview"   && <FacultyOverview questions={questions} quizzes={quizzes} attempts={attempts}/>}
      {tab==="classrooms" && <ClassroomManager classrooms={classrooms} setClassrooms={setClassrooms}/>}
      {tab==="bank"       && <QuestionBank questions={questions} setQuestions={setQuestions}/>}
      {tab==="quizzes"    && (openQuiz
        ? <QuizDetail quizzes={quizzes} quiz={openQuiz} attempts={attempts} classrooms={classrooms} profiles={null} onBack={() => setOpenQuiz(null)}/>
        : <QuizManager questions={questions} quizzes={quizzes} setQuizzes={setQuizzes} attempts={attempts} classrooms={classrooms} onOpen={setOpenQuiz}/>)}
    </div>
  );
}

/* ── Faculty Overview ─────────────────────────────────────────────── */
function FacultyOverview({ questions, quizzes, attempts }) {
  const board    = useMemo(() => buildLeaderboard(attempts), [attempts]);
  const avgAll   = attempts.length ? Math.round(attempts.reduce((s,a) => s+a.percent, 0) / attempts.length) : 0;
  const passRate = attempts.length ? Math.round(attempts.filter(a=>a.percent>=60).length/attempts.length*100) : 0;
  const weekChart = quizzes.map(q => {
    const at = attempts.filter(a => a.quiz_id === q.id);
    return { name:`Wk ${q.week}`, avg: at.length ? Math.round(at.reduce((s,a)=>s+a.percent,0)/at.length) : 0 };
  });
  const atRisk = board.filter(s => s.avg < 50);

  const exportClassCSV = () => {
    downloadCSV(`class-summary-${dateStr(Date.now())}.csv`, board, [
      { label: "Student", key: "student" },
      { label: "Average %", key: "avg" },
      { label: "Best %", key: "best" },
      { label: "Quizzes Taken", key: "n" },
      { label: "Total Flags", key: "violations" },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={BookOpen}    label="Questions"  value={questions.length} tone="violet"/>
        <Stat icon={ListChecks}  label="Quizzes"    value={quizzes.length}   tone="slate"/>
        <Stat icon={Users}       label="Attempts"   value={attempts.length}  tone="sky"/>
        <Stat icon={Award}       label="Class avg"  value={`${avgAll}%`}     sub={`${passRate}% pass rate`} tone="emerald"/>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className={`${card} p-5 lg:col-span-2`}>
          <h3 className="mb-1 text-sm font-bold text-slate-900">Weekly averages</h3>
          <p className="mb-4 text-xs text-slate-400">Score % by quiz week</p>
          <WeekBarChart data={weekChart} />
        </div>

        <div className={`${card} p-5 lg:col-span-3`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Trophy size={15} className="text-amber-500"/> Class ranking</h3>
            <button className={`${btnG} px-3 py-1.5 text-xs`} onClick={exportClassCSV}><FileDown size={13}/> Export CSV</button>
          </div>
          <p className="mb-4 text-xs text-slate-400">By average score across all quizzes (best attempt counted per quiz)</p>
          <div className="overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="px-4 py-2.5">Rank</th><th className="px-4 py-2.5">Student</th><th className="px-4 py-2.5 text-right">Avg</th><th className="px-4 py-2.5 text-right">Best</th><th className="px-4 py-2.5 text-right hidden sm:table-cell">Flags</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {board.map((s, i) => (
                  <tr key={s.user_id} className={`transition hover:bg-slate-50/60 ${i<3?"bg-amber-50/30":""}`}>
                    <td className={`px-4 py-2.5 font-bold ${num}`}>{i<3?["🥇","🥈","🥉"][i]:`#${i+1}`}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="grid h-7 w-7 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">{s.student.charAt(0)}</div>
                        <span className="font-medium text-slate-800">{s.student}</span>
                        {s.avg < 50 && <Badge tone="rose">At risk</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right"><span className={`font-bold ${num} ${s.avg>=80?"text-emerald-600":s.avg>=60?"text-violet-600":"text-rose-600"}`}>{s.avg}%</span></td>
                    <td className={`px-4 py-2.5 text-right ${num} text-slate-500`}>{s.best}%</td>
                    <td className="px-4 py-2.5 text-right hidden sm:table-cell"><Badge tone={vTone(s.violations)}>{s.violations}</Badge></td>
                  </tr>
                ))}
                {!board.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No attempts yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {atRisk.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600"/>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Students below 50% — early action helps</h4>
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
  const [unitFilter, setUF]   = useState("all");
  const [preview, setPreview] = useState(null);
  const [adding, setAdding]   = useState(false);
  const [toast, setToast]     = useState(null);
  const fileRef = useRef(null);
  const { user, profile } = useAuth();
  const units   = useMemo(() => Array.from(new Set(questions.map(x => x.unit))), [questions]);

  const filtered = useMemo(() => questions.filter(x =>
    (unitFilter === "all" || x.unit === unitFilter) &&
    (q.trim() === "" || x.question.toLowerCase().includes(q.toLowerCase()) || (x.topic||"").toLowerCase().includes(q.toLowerCase()))
  ), [questions, unitFilter, q]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(x => { g[x.unit] = g[x.unit] || []; g[x.unit].push(x); });
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
      toast2("Question removed.", "amber");
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "question.delete", target: target?.question?.slice(0, 60), meta: {} });
    } catch (err) { toast2(err.message, "rose"); }
  };

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.msg} tone={toast.tone} onDismiss={() => setToast(null)}/>}

      <div className={`${card} overflow-hidden`}>
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileSpreadsheet size={16} className="text-violet-600"/> Bulk upload</h3>
              <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-slate-500">Upload an .xlsx. Column names matched flexibly. Every row reviewed before saving.</p>
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
        <select className={`${inp} max-w-[180px]`} value={unitFilter} onChange={e=>setUF(e.target.value)}>
          <option value="all">All units ({questions.length})</option>
          {units.map(u => <option key={u} value={u}>{u} ({questions.filter(x=>x.unit===u).length})</option>)}
        </select>
        <button className={btnG} onClick={() => setAdding(v=>!v)}><Plus size={15}/> {adding?"Cancel":"Add question"}</button>
      </div>

      {adding && <AddQuestion questions={questions} setQuestions={setQuestions} units={units} onDone={() => setAdding(false)} onSuccess={msg => toast2(msg)}/>}

      <div className="space-y-4">
        {!filtered.length
          ? <Empty icon={BookOpen} title="No questions match" hint="Adjust the filter, upload a file, or add manually."/>
          : Object.entries(grouped).map(([unit, qs]) => (
            <div key={unit}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{unit}</span>
                <span className={`${num} text-xs text-slate-300`}>({qs.length})</span>
              </div>
              <div className="space-y-2">
                {qs.map(x => (
                  <div key={x.id} className={`${cardH} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="violet">{x.unit}</Badge>
                          <Badge tone="slate">{x.topic}</Badge>
                          <Badge tone="slate">{x.points} pt</Badge>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-800">{x.question}</p>
                        <div className="mt-2 grid gap-1 sm:grid-cols-2">
                          {x.options.map((o, i) => (
                            <div key={i} className={`flex items-center gap-2 text-xs ${i===x.correct?"font-semibold text-emerald-700":"text-slate-400"}`}>
                              {i===x.correct?<CheckCircle2 size={12}/>:<Circle size={12} className="text-slate-200"/>}
                              <span className="truncate">{o}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => remove(x.id)} className="shrink-0 rounded-xl p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500" title="Delete"><Trash2 size={15}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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

function AddQuestion({ questions, setQuestions, units, onDone, onSuccess }) {
  const { user, profile } = useAuth();
  const [question, setQuestion] = useState("");
  const [opts, setOpts]         = useState(["","","",""]);
  const [correct, setCorrect]   = useState(0);
  const [unit, setUnit]         = useState(units[0] || "");
  const [topic, setTopic]       = useState("");
  const [saving, setSaving]     = useState(false);
  const ready = question.trim() && opts.every(o=>o.trim()) && unit.trim();

  const save = async () => {
    setSaving(true);
    try {
      const q = await insertQuestion({ question: question.trim(), options: opts.map(o=>o.trim()), correct, unit: unit.trim(), topic: topic.trim()||"General", points: 1 });
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
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div><input className={inp} list="udl" placeholder="Unit" value={unit} onChange={e=>setUnit(e.target.value)}/><datalist id="udl">{units.map(u=><option key={u} value={u}/>)}</datalist></div>
        <input className={inp} placeholder="Topic (optional)" value={topic} onChange={e=>setTopic(e.target.value)}/>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button className={btnP} disabled={!ready||saving} onClick={save}>{saving?"Saving...":"Add to bank"}</button>
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
                <div className="flex flex-wrap gap-1">{qz.units.map(u=><Badge key={u} tone="slate">{u}</Badge>)}</div>
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
  const units  = useMemo(() => Array.from(new Set(questions.map(x=>x.unit))), [questions]);
  // Include rooms where user is owner OR listed as co-owner.
  // Co-owners are loaded from the classrooms join; for the quiz dropdown
  // we match on owner_id (which we know) or rely on the RLS-scoped
  // classrooms list (which already includes co-owned rooms).
  const myRooms = useMemo(() => classrooms.filter(c => !c.is_archived), [classrooms]);
  const [title, setTitle]       = useState("");
  const [week, setWeek]         = useState(quizzes.length+1);
  const [minutes, setMinutes]   = useState(5);
  const [drawCount, setDraw]    = useState(5);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [openAt, setOpenAt]     = useState("");
  const [closeAt, setCloseAt]   = useState("");
  const [classroomId, setClassroomId] = useState(myRooms[0]?.id ?? "");
  // Issue #2 fix: nothing pre-selected — teacher opts IN question by question
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [pSort, setPSort] = useState("newest");
  const [pQuery, setPQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(true);
  const [saving, setSaving]     = useState(false);

  const sortedQs = useMemo(() => {
    const filtered = questions.filter(q => {
      if (!pQuery.trim()) return true;
      const t = pQuery.toLowerCase();
      return q.question.toLowerCase().includes(t) || (q.unit||"").toLowerCase().includes(t);
    });
    if (pSort === "newest") return [...filtered].sort((a,b) => (b.created_at||"").localeCompare(a.created_at||""));
    if (pSort === "unit")   return [...filtered].sort((a,b) => (a.unit||"").localeCompare(b.unit||""));
    return filtered;
  }, [questions, pSort, pQuery]);

  const selectedQs    = questions.filter(q => selectedIds.has(q.id));
  const derivedUnits  = useMemo(() => Array.from(new Set(selectedQs.map(q => q.unit))), [selectedQs]);
  const selectedCount = selectedIds.size;

  const toggleQ        = id  => setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll      = ()  => setSelectedIds(new Set(questions.map(q => q.id)));
  const selectFiltered = ()  => setSelectedIds(s => { const n = new Set(s); sortedQs.forEach(q => n.add(q.id)); return n; });
  const deselectAll    = ()  => setSelectedIds(new Set());

  const needsRoom = !isAdmin && !classroomId;
  const ready = title.trim() && selectedCount > 0 && !needsRoom;

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
        created_by: user.id,
      });
      setQuizzes(prev => [...prev, qz]);
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "quiz.create", target: title.trim(), meta: { classroom_id: classroomId || null } });
      onDone();
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  return (
    <div className={`${card} p-5`}>
      <h4 className="mb-4 text-sm font-bold text-slate-900">New quiz</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="mb-1 block text-xs font-semibold text-slate-500">Title</label><input className={inp} placeholder="e.g. Week 3 Check-in" value={title} onChange={e=>setTitle(e.target.value)}/></div>
        <div className="grid grid-cols-3 gap-2">
          {[["Week",week,setWeek],["Minutes",minutes,setMinutes],["Questions",drawCount,setDraw]].map(([label,val,set]) => (
            <div key={label}><label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label><input type="number" min={1} className={inp} value={val} onChange={e=>set(e.target.value)}/></div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><School size={12}/> Share with classroom</label>
        <select className={inp} value={classroomId} onChange={e=>setClassroomId(e.target.value)}>
          {myRooms.map(c => <option key={c.id} value={c.id}>{c.name}{c.section?` · Section ${c.section}`:""}{c.year?` (${c.year})`:""}</option>)}
          {isAdmin && <option value="">All students (no classroom)</option>}
          {!myRooms.length && !isAdmin && <option value="">— no classrooms yet —</option>}
        </select>
        {needsRoom
          ? <p className="mt-1 text-[11px] font-semibold text-rose-600">Create a classroom first (Classrooms tab), then students who join it will see this quiz.</p>
          : <p className="mt-1 text-[11px] text-slate-400">{classroomId ? "Only students who joined this classroom can see and take the quiz." : "Visible to every signed-in student."}</p>}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><RotateCcw size={12}/> Max attempts</label>
          <input type="number" min={1} max={5} className={inp} value={maxAttempts} onChange={e=>setMaxAttempts(e.target.value)}/>
          <p className="mt-1 text-[11px] text-slate-400">1 = no retakes. 2 = one retake allowed.</p>
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><CalendarClock size={12}/> Opens at</label>
          <input type="datetime-local" className={inp} value={openAt} onChange={e=>setOpenAt(e.target.value)}/>
          <p className="mt-1 text-[11px] text-slate-400">Leave blank to open immediately.</p>
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><CalendarClock size={12}/> Closes at</label>
          <input type="datetime-local" className={inp} value={closeAt} onChange={e=>setCloseAt(e.target.value)}/>
          <p className="mt-1 text-[11px] text-slate-400">Leave blank for no deadline.</p>
        </div>
      </div>

      {/* Question picker */}
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
            <div className="flex flex-wrap items-center gap-2">
              <select className={`${inp} !w-auto text-xs`} value={pSort} onChange={e => setPSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="unit">By unit</option>
              </select>
              <input className={`${inp} !w-auto min-w-[160px] flex-1 text-xs`} placeholder="Search…" value={pQuery} onChange={e => setPQuery(e.target.value)}/>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">
                <span className={`${num} font-semibold text-slate-800`}>{sortedQs.length}</span> in view · <span className={`${num} font-semibold text-slate-800`}>{questions.length}</span> total
              </span>
              <div className="flex flex-wrap gap-1">
                <button onClick={selectAll}      className={`${btnP} !py-1.5 !px-3 !text-xs`}><Plus size={12}/> All in bank ({questions.length})</button>
                <button onClick={selectFiltered} className={`${btnG} !py-1.5 !px-3 !text-xs`}>Select filtered ({sortedQs.length})</button>
                <button onClick={deselectAll}    className={`${btnG} !py-1.5 !px-3 !text-xs`}>Clear ({selectedCount})</button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
              {sortedQs.length === 0
                ? <div className="p-6 text-center text-xs text-slate-400">No questions in bank yet. Upload via Question Bank tab first.</div>
                : sortedQs.map(q => {
                  const checked = selectedIds.has(q.id);
                  return (
                    <label key={q.id} className={`flex items-start gap-3 p-3 cursor-pointer transition ${checked ? "bg-violet-50/50" : "hover:bg-slate-50"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleQ(q.id)} className="mt-1 shrink-0 h-4 w-4 accent-violet-600"/>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 mb-0.5">
                          <Badge tone="sky">{q.unit}</Badge>
                          {q.topic && q.topic !== "General" && <span className="text-[10px] text-slate-400">{q.topic}</span>}
                        </div>
                        <p className="text-xs font-medium text-slate-800 line-clamp-2">{q.question}</p>
                      </div>
                    </label>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {selectedCount === 0 ? "Pick at least one question above." : `${selectedCount} question${selectedCount===1?"":"s"} across ${derivedUnits.length} unit${derivedUnits.length===1?"":"s"}.`}
        </p>
        <div className="flex gap-2">
          <button className={btnG} onClick={onDone}>Cancel</button>
          <button className={btnP} disabled={!ready||saving} onClick={save}>{saving?"Saving…":"Create quiz"}</button>
        </div>
      </div>
    </div>
  );
}

function QuizDetail({ quizzes, quiz, attempts, classrooms, profiles, onBack }) {
  const room = classrooms.find(c => c.id === quiz.classroom_id);
  const at  = attempts.filter(a => a.quiz_id === quiz.id).sort((a,b) => b.percent-a.percent);
  const avg = at.length ? Math.round(at.reduce((s,a)=>s+a.percent,0)/at.length) : 0;
  const passCount = at.filter(a=>a.percent>=60).length;
  const dist = [0,1,2,3,4,5].map(k => ({ score:`${k}`, count:0 }));
  at.forEach(a => { const i=Math.min(a.score,5); if(dist[i]) dist[i].count++; });
  const maxCount = Math.max(1, ...dist.map(d => d.count));

  const exportCSV = () => {
    downloadCSV(`${quiz.title.replace(/\s+/g,"-")}-attempts.csv`, at, [
      { label: "Student", key: "student_name" },
      { label: "Attempt #", key: "attempt_number" },
      { label: "Score", value: r => `${r.score}/${r.max_score}` },
      { label: "Percent", key: "percent" },
      { label: "Flags", key: "violations" },
      { label: "Time Used (s)", key: "time_used_sec" },
      { label: "Submitted At", value: r => new Date(r.submitted_at).toISOString() },
    ]);
  };

  // Resolve created_by to a name if available
  const creatorName = quiz.created_by && profiles
    ? profiles.find(p => p.id === quiz.created_by)?.full_name
    : null;

  return (
    <div className="space-y-5">
      <button className={`${btnG} w-fit`} onClick={onBack}><ChevronLeft size={15}/> Back</button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="violet">Week {quiz.week}</Badge>
          <Badge tone={room ? "sky" : "amber"}><School size={11}/> {room ? `${room.name}${room.section?` · ${room.section}`:""}${room.year?` (${room.year})`:""}` : "All students"}</Badge>
          <h3 className="text-xl font-extrabold text-slate-900">{quiz.title}</h3>
          {creatorName && <span className="text-xs text-slate-400">by {creatorName}</span>}
        </div>
        <button className={btnG} onClick={exportCSV}><FileDown size={14}/> Export CSV</button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat icon={Users} label="Attempts" value={at.length} tone="sky"/>
        <Stat icon={Award} label="Avg" value={`${avg}%`} tone="violet"/>
        <Stat icon={CheckCircle2} label="Pass rate" value={at.length?`${Math.round(passCount/at.length*100)}%`:"—"} tone="emerald"/>
        <Stat icon={Clock} label="Duration" value={`${Math.round(quiz.duration_sec/60)}m`} tone="slate"/>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${card} p-5`}>
          <h4 className="mb-1 text-sm font-bold text-slate-900">Score distribution</h4>
          <p className="mb-4 text-xs text-slate-400">Students per score</p>
          <div className="flex h-40 items-end gap-2">
            {dist.map(d => (
              <div key={d.score} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full rounded-t-lg bg-violet-600 transition-all" style={{ height: `${(d.count/maxCount)*100}%`, minHeight: d.count > 0 ? 4 : 0 }} />
                </div>
                <span className={`text-[11px] font-semibold text-slate-600 ${num}`}>{d.count}</span>
                <span className="text-[10px] text-slate-400">{d.score}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`${card} overflow-hidden lg:col-span-2`}>
          <div className="border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">All attempts</h4>
            <span className="text-xs text-slate-400">{at.length} total</span>
          </div>
          <div className="overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="px-5 py-2.5">Student</th><th className="px-3 py-2.5 text-center">#</th><th className="px-3 py-2.5 text-right">Score</th><th className="px-3 py-2.5 text-right">%</th><th className="px-3 py-2.5 text-center">Flags</th><th className="px-3 py-2.5 text-right hidden sm:table-cell">Time</th><th className="px-5 py-2.5 text-right hidden md:table-cell">Date</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!at.length && <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No attempts yet.</td></tr>}
                {at.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600">{(a.student_name||"?").charAt(0)}</div>
                        <span className="font-medium text-slate-800">{a.student_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center"><Badge tone="slate">{a.attempt_number}</Badge></td>
                    <td className={`px-3 py-2.5 text-right ${num} text-slate-600`}>{a.score}/{a.max_score}</td>
                    <td className="px-3 py-2.5 text-right"><span className={`font-bold ${num} ${a.percent>=80?"text-emerald-600":a.percent>=60?"text-violet-600":"text-rose-600"}`}>{a.percent}%</span></td>
                    <td className="px-3 py-2.5 text-center"><Badge tone={vTone(a.violations)}>{a.violations}</Badge></td>
                    <td className={`px-3 py-2.5 text-right ${num} text-slate-400 hidden sm:table-cell`}>{fmtTime(a.time_used_sec)}</td>
                    <td className="px-5 py-2.5 text-right text-xs text-slate-400 hidden md:table-cell">{dateStr(a.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Flags = window switches + fullscreen exits. Signals, not evidence.</div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* STUDENT                                                            */
/* ================================================================== */
function Student({ questions, quizzes, setQuizzes, attempts, setAttempts, classrooms, setClassrooms, user, profile }) {
  const [screen, setScreen]       = useState("home");
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [lastAttempt, setLast]    = useState(null);

  const onSubmit = async (attempt) => {
    try {
      const saved = await insertAttempt(attempt);
      setAttempts(prev => [...prev, saved]);
      localStorage.removeItem(draftKey(attempt.quiz_id, attempt.user_id)); // clear backup on success
      setLast(saved);
      setScreen("result");
    } catch (err) {
      throw err; // let Exam component handle retry UI
    }
  };

  if (screen==="rules"  && activeQuiz) return <Rules quiz={activeQuiz} questions={questions} attempts={attempts} name={profile.full_name} onStart={() => setScreen("exam")} onBack={() => setScreen("home")}/>;
  if (screen==="exam"   && activeQuiz) return <Exam questions={questions} quiz={activeQuiz} user={user} profile={profile} attempts={attempts} onSubmit={onSubmit} onAbort={() => setScreen("home")}/>;
  if (screen==="result" && lastAttempt) return <Result quizzes={quizzes} attempt={lastAttempt} attempts={attempts} name={profile.full_name} onHome={() => setScreen("home")}/>;
  return <StudentHome quizzes={quizzes} setQuizzes={setQuizzes} questions={questions} attempts={attempts} classrooms={classrooms} setClassrooms={setClassrooms} name={profile.full_name} onStart={qz => { setActiveQuiz(qz); setScreen("rules"); }}/>;
}

function StudentHome({ quizzes, setQuizzes, questions, attempts, classrooms, setClassrooms, name, onStart }) {
  const board  = useMemo(() => buildLeaderboard(attempts), [attempts]);
  const myRank = board.findIndex(s => s.student === name);
  const myAvg  = board.find(s => s.student === name)?.avg || 0;
  const mine   = attempts.filter(a => a.student_name === name);
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
            const myAttempts = attempts.filter(a => a.quiz_id === qz.id).sort((a,b)=>b.attempt_number-a.attempt_number);
            const best = myAttempts.reduce((b,a) => (!b || a.percent > b.percent) ? a : b, null);
            const attemptsUsed = myAttempts.length;
            const canRetake = attemptsUsed > 0 && attemptsUsed < qz.max_attempts;
            const pool = questions.filter(b => qz.units.includes(b.unit)).length;
            const avail = quizAvailability(qz);
            const canStart = avail.available && pool >= qz.draw_count && (attemptsUsed === 0 || canRetake);

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

function Rules({ quiz, questions, attempts, name, onStart, onBack }) {
  const pool = questions.filter(b => quiz.units.includes(b.unit)).length;
  const myAttempts = attempts.filter(a => a.quiz_id === quiz.id).length;
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
      localStorage.setItem(dKey, JSON.stringify({ quizId: quiz.id, drawn, answers, remaining, log, savedAt: Date.now() }));
    } catch (_) {}
  }, [answers, remaining, log, submitted]); // eslint-disable-line react-hooks/exhaustive-deps

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
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Question {idx+1} of {drawn.length}</span>
                <Badge tone="violet">{cur.q.unit}</Badge>
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

            {showConfirm && (
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-amber-200">{drawn.length-answered} question{drawn.length-answered===1?"":"s"} unanswered. Submit anyway?</p>
                <div className="mt-3 flex gap-2">
                  <button className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`} onClick={finish}>Yes, submit</button>
                  <button className={`${btn} border border-slate-700 bg-slate-800 text-slate-200`} onClick={() => setShowConfirm(false)}>Go back</button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Integrity monitor</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"/></span> Live
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className={`text-4xl font-extrabold ${num} ${log.length===0?"text-emerald-400":"text-amber-400"}`}>{log.length}</span>
                <span className="text-xs text-slate-400">flag{log.length===1?"":"s"}</span>
              </div>
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
                {drawn.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)}
                    className={`grid h-9 place-items-center rounded-xl text-xs font-bold transition ${num} ${i===idx?"bg-violet-500 text-white shadow-lg shadow-violet-900/50":answers[i]!==null?"bg-emerald-500/30 text-emerald-300":"bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>
                    {i+1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Result ───────────────────────────────────────────────────────── */
function Result({ quizzes, attempt, attempts, name, onHome }) {
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

      {attempt.items?.length > 0 && (
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
