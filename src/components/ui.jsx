/* ── Class strings ─────────────────────────────────────────────── */
export const card   = "rounded-2xl border border-slate-200 bg-white shadow-sm";
export const cardH  = "rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow";
export const btn    = "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40";
export const btnP   = `${btn} bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-400 shadow-sm`;
export const btnG   = `${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400`;
export const inp    = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 transition";
export const num    = "font-[JetBrains_Mono,ui-monospace,monospace]";

/* ── Tones ─────────────────────────────────────────────────────── */
const TONE_CLASS = {
  violet: "bg-violet-100 text-violet-700 border-violet-200",
  sky:    "bg-sky-100 text-sky-700 border-sky-200",
  rose:   "bg-rose-100 text-rose-700 border-rose-200",
  emerald:"bg-emerald-100 text-emerald-700 border-emerald-200",
  amber:  "bg-amber-100 text-amber-700 border-amber-200",
  slate:  "bg-slate-100 text-slate-700 border-slate-200",
};
const toneClass = (t) => TONE_CLASS[t] || TONE_CLASS.slate;

// vTone: accepts tone name OR violation count → always returns a tone name
export const vTone = (input) => {
  if (typeof input === "number") {
    if (input === 0) return "emerald";
    if (input <= 2)  return "amber";
    return "rose";
  }
  return TONE_CLASS[input] ? input : "slate";
};

/* ── Helpers ───────────────────────────────────────────────────── */
export const shuffle    = (arr) => [...arr].sort(() => Math.random() - 0.5);
export const fmtTime    = (sec) => `${Math.floor(sec/60).toString().padStart(2,"0")}:${(sec%60).toString().padStart(2,"0")}`;
export const dateStr    = (iso) => iso ? new Date(iso).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}) : "—";
export const dateTimeStr= (iso) => iso ? new Date(iso).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
export const pct        = (n,d) => d ? Math.round((n/d)*100) : 0;

// quizAvailability: checks open/close window only. Returns { available, label }
export const quizAvailability = (quiz) => {
  if (!quiz) return { available: false, label: "Unavailable" };
  const now = Date.now();
  if (quiz.is_open === false) return { available: false, label: "Closed" };
  if (quiz.open_at  && new Date(quiz.open_at).getTime()  > now) return { available: false, label: "Not open yet" };
  if (quiz.close_at && new Date(quiz.close_at).getTime() < now) return { available: false, label: "Closed" };
  return { available: true, label: "Open" };
};

export const buildLeaderboard = (attempts, profiles) => {
  if (!attempts?.length) return [];
  const byUser = {};
  for (const a of attempts) {
    if (!a?.user_id) continue;
    if (!byUser[a.user_id]) byUser[a.user_id] = { attempts: [] };
    byUser[a.user_id].attempts.push(a);
  }
  return Object.entries(byUser).map(([userId, { attempts: ua }]) => {
    /* Count the BEST attempt per quiz, not every attempt. Averaging all
       attempts blends a retake's lower first try into the mean, which
       both understates a student who improved and contradicts the
       "best attempt counted per quiz" the UI promises. Collapse to one
       row per quiz first, keeping the highest percent, then average. */
    const bestPerQuiz = {};
    for (const a of ua) {
      const q = a.quiz_id;
      if (!bestPerQuiz[q] || (a.percent ?? 0) > (bestPerQuiz[q].percent ?? 0)) bestPerQuiz[q] = a;
    }
    const perQuiz = Object.values(bestPerQuiz);
    const best = perQuiz.reduce((b, a) => (a.percent ?? 0) > (b.percent ?? 0) ? a : b);
    const avg  = Math.round(perQuiz.reduce((s, a) => s + (a.percent || 0), 0) / perQuiz.length);
    const name = best.student_name || profiles?.find(p => p.id === userId)?.full_name || "Unknown";
    return {
      user_id: userId, student: name,
      best: best.percent || 0, avg: avg || 0,
      n: perQuiz.length,                                   // distinct quizzes taken
      violations: ua.reduce((s, a) => s + (a.violations || 0), 0),
      profile: profiles?.find(p => p.id === userId) || null,
    };
  }).sort((a, b) => b.avg - a.avg);
};

/* ── Components ────────────────────────────────────────────────── */
export function Badge({ tone = "slate", children }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass(tone)}`}>{children}</span>;
}

export function Stat({ icon: Icon, label, value, sub, tone = "slate" }) {
  const colors = { violet:"bg-violet-50 text-violet-600", sky:"bg-sky-50 text-sky-600", rose:"bg-rose-50 text-rose-600", emerald:"bg-emerald-50 text-emerald-600", amber:"bg-amber-50 text-amber-600", slate:"bg-slate-50 text-slate-600" };
  return (
    <div className={`${card} flex items-center gap-3 p-4`}>
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${colors[tone]||colors.slate}`}><Icon size={16}/></div>
      <div>
        <div className={`text-xl font-extrabold text-slate-900 ${num}`}>{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      {Icon && <Icon size={32} className="text-slate-300"/>}
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      {hint && <p className="max-w-sm text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Toast({ message, tone = "emerald", onDismiss }) {
  const colors = { emerald:"bg-emerald-600", rose:"bg-rose-600", amber:"bg-amber-600", sky:"bg-sky-600" };
  return (
    <div className={`fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-xl ${colors[tone]||colors.emerald}`}>
      <span>{message}</span>
      {onDismiss && <button onClick={onDismiss} className="ml-2 text-white/70 hover:text-white">✕</button>}
    </div>
  );
}

export function ScoreBar({ value, percent }) {
  const v = value ?? percent ?? 0;
  const color = v >= 60 ? "bg-emerald-500" : v >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width:`${Math.min(100,v)}%` }}/>
    </div>
  );
}

export function Spinner({ size = 20, fullPage = false }) {
  const svg = (
    <svg className="animate-spin text-violet-600" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
    </svg>
  );
  if (fullPage) return <div className="fixed inset-0 flex items-center justify-center bg-slate-50">{svg}</div>;
  return svg;
}

/* ── Fullscreen helpers ────────────────────────────────────────── */
export const fsElement = () =>
  document.fullscreenElement ||
  document.webkitFullscreenElement ||
  document.mozFullScreenElement ||
  null;

export const enterFs = (el = document.documentElement) => {
  const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
  return fn ? fn.call(el) : Promise.resolve();
};

export const exitFs = () => {
  const fn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen;
  return fn ? fn.call(document) : Promise.resolve();
};

export const btnGld = `${btn} bg-gradient-to-r from-amber-400 to-amber-500 text-white hover:from-amber-500 hover:to-amber-600 shadow-sm`;
