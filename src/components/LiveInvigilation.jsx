import { useState, useEffect, useMemo, useRef } from "react";
import {
  Radio, AlertTriangle, ShieldAlert, Clock, Users, WifiOff,
  CheckCircle2, RefreshCw,
} from "lucide-react";
import { card, btn, btnG, num, Badge, Empty } from "./ui.jsx";
import { fetchLiveSessions, subscribeToLiveSessions } from "../lib/db.js";

/* A row stops being trustworthy once the browser stops reporting.
   The heartbeat runs every 8s, so 30s of silence means the tab is
   closed, asleep, or offline — not that the student is idle. */
const STALE_MS = 30000;

function fmtAgo(iso) {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 10)  return "just now";
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function fmtClock(sec) {
  if (sec === null || sec === undefined) return "—";
  const m = Math.floor(Math.max(0, sec) / 60), s = Math.max(0, sec) % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LiveInvigilation({ quiz }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow]         = useState(Date.now());
  const [connected, setConnected] = useState(false);
  const rowsRef = useRef([]);

  /* Re-render on a timer so "3m ago" and the stale badge stay honest
     even when no realtime event has arrived. */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await fetchLiveSessions(quiz.id);
      if (!alive) return;
      rowsRef.current = data;
      setRows(data);
      setLoading(false);
    })();

    const unsub = subscribeToLiveSessions(quiz.id, (row) => {
      if (!row?.id) return;
      setConnected(true);
      const next = [...rowsRef.current];
      const i = next.findIndex(r => r.id === row.id);
      if (i >= 0) next[i] = { ...next[i], ...row };
      else next.unshift(row);
      next.sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen));
      rowsRef.current = next;
      setRows(next);
    });

    /* Realtime can be unavailable (STEP4 not run, or the project has no
       publication). Poll as a fallback so the panel still works — just
       less immediately — instead of appearing permanently empty. */
    const poll = setInterval(async () => {
      const data = await fetchLiveSessions(quiz.id);
      rowsRef.current = data;
      setRows(data);
    }, 15000);

    return () => { alive = false; unsub(); clearInterval(poll); };
  }, [quiz.id]);

  const { active, flagged, submitted, stale } = useMemo(() => {
    const isStale = r => now - new Date(r.last_seen).getTime() > STALE_MS;
    const act = rows.filter(r => r.status === "active");
    return {
      active:    act,
      flagged:   act.filter(r => (r.violations || 0) > 0),
      submitted: rows.filter(r => r.status === "submitted"),
      stale:     act.filter(isStale),
    };
  }, [rows, now]);

  const refresh = async () => {
    setLoading(true);
    const data = await fetchLiveSessions(quiz.id);
    rowsRef.current = data;
    setRows(data);
    setLoading(false);
  };

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {active.length > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"/>}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${active.length ? "bg-emerald-500" : "bg-slate-300"}`}/>
          </span>
          <h4 className="text-sm font-bold text-slate-900">Live invigilation</h4>
          {active.length > 0 && <Badge tone="emerald">{active.length} writing now</Badge>}
          {flagged.length > 0 && <Badge tone="rose">{flagged.length} flagged</Badge>}
        </div>
        <button onClick={refresh} className={`${btnG} !py-1.5 !px-3 !text-xs`}>
          <RefreshCw size={12} className={loading ? "animate-spin" : ""}/> Refresh
        </button>
      </div>

      {loading && !rows.length && (
        <div className="px-5 py-10 text-center text-xs text-slate-400">Loading sessions…</div>
      )}

      {!loading && !rows.length && (
        <div className="px-5 py-8">
          <Empty
            icon={Radio}
            title="Nobody is writing this quiz yet"
            hint="Students appear here the moment they begin, with their progress and any integrity flags updating live."
          />
          <p className="mx-auto mt-3 max-w-md text-center text-[11px] leading-relaxed text-slate-400">
            If students are writing but this stays empty, run
            <code className="mx-1 rounded bg-slate-100 px-1 font-mono">STEP4_run_this_in_supabase.sql</code>
            — the live_sessions table is what this panel reads.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Student</th>
                <th className="px-3 py-2.5 text-left font-semibold">Progress</th>
                <th className="px-3 py-2.5 text-center font-semibold">Time left</th>
                <th className="px-3 py-2.5 text-center font-semibold">Flags</th>
                <th className="px-4 py-2.5 text-left font-semibold hidden md:table-cell">Last event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map(r => {
                const isStale = now - new Date(r.last_seen).getTime() > STALE_MS;
                const done    = r.status === "submitted";
                const gone    = r.status === "abandoned";
                const pct     = r.total ? Math.round((r.answered / r.total) * 100) : 0;
                const v       = r.violations || 0;
                return (
                  <tr key={r.id} className={v >= 3 ? "bg-rose-50/50" : done ? "bg-emerald-50/30" : ""}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${done ? "bg-emerald-500" : gone ? "bg-slate-300" : isStale ? "bg-amber-400" : "bg-emerald-500"}`}/>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800">{r.student_name || "Student"}</div>
                          <div className="text-[10px] text-slate-400">
                            {[r.student_course, r.student_cu_id].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {done
                        ? <span className="flex items-center gap-1 font-semibold text-emerald-600"><CheckCircle2 size={12}/> Submitted</span>
                        : gone
                          ? <span className="flex items-center gap-1 text-slate-400"><WifiOff size={12}/> Left the exam</span>
                          : (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }}/>
                              </div>
                              <span className={`${num} text-[11px] text-slate-500`}>{r.answered}/{r.total}</span>
                            </div>
                          )}
                    </td>
                    <td className={`px-3 py-2.5 text-center ${num} ${(r.remaining_sec ?? 0) < 120 && !done ? "font-bold text-rose-600" : "text-slate-500"}`}>
                      {done || gone ? "—" : fmtClock(r.remaining_sec)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge tone={v === 0 ? "emerald" : v <= 2 ? "amber" : "rose"}>{v}</Badge>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      {r.last_flag
                        ? <span className="flex items-center gap-1 text-rose-600"><ShieldAlert size={11} className="shrink-0"/><span className="truncate">{r.last_flag}</span></span>
                        : <span className="text-slate-300">No flags</span>}
                      <div className="text-[10px] text-slate-400">
                        {fmtAgo(r.last_seen)}{isStale && !done && !gone && " · not responding"}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-400">
          <span>{active.length} active</span>
          <span>{submitted.length} submitted</span>
          {stale.length > 0 && <span className="text-amber-600">{stale.length} not responding</span>}
          <span className="ml-auto">
            {connected ? "Live — updates as they happen" : "Polling every 15s"}
          </span>
        </div>
      )}
    </div>
  );
}
