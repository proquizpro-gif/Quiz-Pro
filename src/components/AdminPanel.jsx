import { useState, useEffect, useMemo, useCallback } from "react";
import { Users, ShieldCheck, ScrollText, Search, Crown, GraduationCap, UserCog, Activity, Database, School, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { card, cardH, btn, btnP, btnG, inp, num, Badge, Stat, Empty, Toast, dateStr } from "./ui";
import { fetchAllProfiles, updateProfileRole, fetchAuditLog, logAudit, fetchClassroomsWithMeta, hardDeleteClassroom } from "../lib/db";
import { useAuth } from "../lib/AuthContext";

const ROLE_TONE = { admin: "rose", faculty: "violet", student: "sky" };
const ROLE_ICON = { admin: Crown, faculty: GraduationCap, student: UserCog };
const PAGE_SIZE = 50;

export default function AdminPanel({ questions, quizzes, attempts, setClassrooms }) {
  const { profile: me, user, isAdmin, refreshProfile } = useAuth();
  const [tab, setTab] = useState("users");

  /* ── Users: paginated ─────────────────────────────────────────── */
  const [users, setUsers] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [userPage, setUserPage] = useState(0);
  const [search, setSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);

  const [auditLog, setAuditLog] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const toast2 = (msg, tone = "emerald") => { setToast({ msg, tone }); setTimeout(() => setToast(null), 3500); };

  /* ── Load users (paginated) ──────────────────────────────────── */
  const loadUsers = useCallback(async (page, q) => {
    setUsersLoading(true);
    try {
      const { data, count } = await fetchAllProfiles(page, PAGE_SIZE, q);
      setUsers(data);
      setUserCount(count);
    } catch (err) { toast2(err.message, "rose"); }
    setUsersLoading(false);
  }, []);

  // Initial load and on page/search change
  useEffect(() => { loadUsers(userPage, search); }, [userPage, loadUsers]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setUserPage(0); loadUsers(0, search); }, 350);
    return () => clearTimeout(t);
  }, [search, loadUsers]);

  /* ── Load audit + classrooms once ────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const [log, cr] = await Promise.all([fetchAuditLog(80), fetchClassroomsWithMeta()]);
        setAuditLog(log);
        setRooms(cr);
      } catch (err) { toast2(err.message, "rose"); }
      setLoading(false);
    })();
  }, []);

  const totalPages = Math.max(1, Math.ceil(userCount / PAGE_SIZE));

  // Role breakdown: fetch once on mount (all users), not per-page.
  const [counts, setCounts] = useState({ admin: 0, faculty: 0, student: 0 });
  useEffect(() => {
    (async () => {
      try {
        // Fetch page 0 with a large size and no search, just to get totals.
        // fetchAllProfiles returns { data, count } — we use all data here.
        const { data: all } = await fetchAllProfiles(0, 10000, "");
        setCounts({
          admin: all.filter(u => u.role === "admin").length,
          faculty: all.filter(u => u.role === "faculty").length,
          student: all.filter(u => u.role === "student").length,
        });
      } catch (_) {}
    })();
  }, []);

  const changeRole = async (target, newRole) => {
    if (target.id === user.id && newRole !== "admin" && isAdmin) {
      if (!window.confirm("You are about to remove your own admin access. Continue?")) return;
    }
    try {
      await updateProfileRole(target.id, newRole);
      setUsers(prev => prev.map(u => u.id === target.id ? { ...u, role: newRole } : u));
      await logAudit({ actor_id: user.id, actor_name: me.full_name, action: "role.change", target: target.email, meta: { from: target.role, to: newRole } });
      setAuditLog(prev => [{ id: crypto.randomUUID(), actor_name: me.full_name, action: "role.change", target: target.email, meta: { from: target.role, to: newRole }, created_at: new Date().toISOString() }, ...prev]);
      toast2(`${target.full_name} is now ${newRole}.`);
      if (target.id === user.id) await refreshProfile();
    } catch (err) {
      toast2(err.message, "rose");
    }
  };

  /* ── Typed-confirmation hard-delete (admin only) ─────────────── */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteTyped, setDeleteTyped] = useState("");

  const confirmHardDelete = async () => {
    if (!deleteTarget) return;
    try {
      await hardDeleteClassroom(deleteTarget.id);
      setRooms(prev => prev.filter(r => r.id !== deleteTarget.id));
      setClassrooms?.(prev => prev.filter(r => r.id !== deleteTarget.id));
      await logAudit({ actor_id: user.id, actor_name: me.full_name, action: "classroom.hard_delete", target: deleteTarget.name, meta: { by: "admin" } });
      toast2(`"${deleteTarget.name}" permanently deleted.`, "amber");
    } catch (err) { toast2(err.message, "rose"); }
    setDeleteTarget(null);
    setDeleteTyped("");
  };

  const tabs = [
    { id: "users", label: "Users & Roles", icon: Users },
    { id: "classrooms", label: "Classrooms", icon: School },
    { id: "activity", label: "Activity Log", icon: ScrollText },
    { id: "system", label: "System Status", icon: Database },
  ];

  if (loading) return <div className={`${card} p-12 text-center text-sm text-slate-400`}>Loading admin data...</div>;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} tone={toast.tone} onDismiss={() => setToast(null)} />}

      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <ShieldCheck size={16} className="text-rose-500" /> Admin Panel
        <Badge tone="rose">Admin only</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat icon={Crown} label="Admins" value={counts.admin} tone="rose" />
        <Stat icon={GraduationCap} label="Faculty" value={counts.faculty} tone="violet" />
        <Stat icon={UserCog} label="Students" value={counts.student} tone="sky" />
        <Stat icon={School} label="Classrooms" value={rooms.length} tone="emerald" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`${btn} ${tab===t.id?"bg-slate-900 text-white shadow-sm":"border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            <t.icon size={15}/> {t.label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB (paginated) ───────────────────────────────── */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input className={`${inp} pl-10`} placeholder="Search by name or email..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <span className="text-xs text-slate-400">{userCount} user{userCount === 1 ? "" : "s"} total</span>
          </div>

          <div className={`${card} overflow-hidden`}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="px-5 py-2.5">User</th><th className="px-3 py-2.5">Email</th><th className="px-3 py-2.5">Role</th><th className="px-5 py-2.5 text-right">Change role</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersLoading && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400">Loading...</td></tr>}
                {!usersLoading && !users.length && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400">No users match.</td></tr>}
                {!usersLoading && users.map(u => {
                  const RoleIcon = ROLE_ICON[u.role] || UserCog;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {u.avatar_url
                            ? <img src={u.avatar_url} className="h-7 w-7 rounded-full object-cover border border-slate-200" alt="" />
                            : <div className="grid h-7 w-7 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">{u.full_name.charAt(0)}</div>}
                          <span className="font-medium text-slate-800">{u.full_name}</span>
                          {u.id === user.id && <Badge tone="slate">You</Badge>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">{u.email}</td>
                      <td className="px-3 py-3"><Badge tone={ROLE_TONE[u.role]}><RoleIcon size={11}/> {u.role}</Badge></td>
                      <td className="px-5 py-3 text-right">
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                          value={u.role}
                          onChange={e => changeRole(u, e.target.value)}>
                          <option value="student">Student</option>
                          <option value="faculty">Faculty</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination controls ─────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button className={btnG} disabled={userPage === 0} onClick={() => setUserPage(p => p - 1)}>
                <ChevronLeft size={14}/> Previous
              </button>
              <span className={`text-xs text-slate-500 ${num}`}>Page {userPage + 1} of {totalPages}</span>
              <button className={btnG} disabled={userPage >= totalPages - 1} onClick={() => setUserPage(p => p + 1)}>
                Next <ChevronRight size={14}/>
              </button>
            </div>
          )}

          <p className="text-xs text-slate-400">Faculty can manage questions, quizzes, and view all analytics. Admin additionally controls user roles from this panel. New users default to Student on first sign-in.</p>
        </div>
      )}

      {/* ── CLASSROOMS TAB ──────────────────────────────────────── */}
      {tab === "classrooms" && (
        <div className="space-y-4">
          <div className={`${card} overflow-hidden`}>
            <div className="border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><School size={15}/> All classrooms</h4>
              <span className="text-xs text-slate-400">{rooms.length} total across all faculty</span>
            </div>
            {!rooms.length
              ? <div className="p-10"><Empty icon={School} title="No classrooms yet" hint="Faculty create classrooms from their dashboard. All of them will be listed here."/></div>
              : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-5 py-2.5">Classroom</th>
                        <th className="px-3 py-2.5">Section</th>
                        <th className="px-3 py-2.5">Year</th>
                        <th className="px-3 py-2.5">Owner</th>
                        <th className="px-3 py-2.5 text-center">Co-owners</th>
                        <th className="px-3 py-2.5 text-center">Students</th>
                        <th className="px-3 py-2.5 text-center">Quizzes</th>
                        <th className="px-3 py-2.5">Join code</th>
                        <th className="px-5 py-2.5 text-right">Created</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rooms.map(r => {
                        const memberCount = r.classroom_members?.[0]?.count ?? 0;
                        const coOwnerCount = r.classroom_co_owners?.length ?? 0;
                        const quizCount = quizzes.filter(q => q.classroom_id === r.id).length;
                        return (
                          <tr key={r.id} className={`transition ${r.deleted_at ? "opacity-50 bg-rose-50/30" : "hover:bg-slate-50/60"}`}>
                            <td className="px-5 py-3">
                              <span className="font-medium text-slate-800">{r.name}</span>
                              {r.is_archived && <span className="ml-1.5"><Badge tone="amber">Archived</Badge></span>}
                              {r.deleted_at && <span className="ml-1.5"><Badge tone="rose">Soft-deleted</Badge></span>}
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-500">{r.section || "—"}</td>
                            <td className="px-3 py-3 text-xs text-slate-500">{r.year || "—"}</td>
                            <td className="px-3 py-3 text-xs text-slate-500">{r.owner?.full_name || "—"}</td>
                            <td className={`px-3 py-3 text-center ${num} text-slate-600`}>{coOwnerCount}</td>
                            <td className={`px-3 py-3 text-center ${num} text-slate-600`}>{memberCount}</td>
                            <td className={`px-3 py-3 text-center ${num} text-slate-600`}>{quizCount}</td>
                            <td className={`px-3 py-3 text-xs font-bold tracking-widest text-violet-600 ${num}`}>{r.join_code}</td>
                            <td className="px-5 py-3 text-right text-xs text-slate-400">{dateStr(r.created_at)}</td>
                            <td className="px-3 py-3 text-right">
                              <button onClick={() => { setDeleteTarget(r); setDeleteTyped(""); }}
                                className="rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500" title="Permanently delete">
                                <Trash2 size={13}/>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
              Faculty "remove" soft-deletes classrooms (quizzes detached, attempts preserved). Admin can permanently delete from here — this cascades into members, co-owners, and any remaining attached data.
            </div>
          </div>

          {/* ── Hard-delete typed confirmation ──────────────────── */}
          {deleteTarget && (
            <div className={`${card} border-rose-200 p-5`}>
              <h4 className="text-sm font-bold text-rose-700">Permanently delete "{deleteTarget.name}"?</h4>
              <p className="mt-2 text-xs text-rose-600">
                This is a hard delete. If quizzes are still attached (not yet soft-deleted by faculty), they and their student attempts will be permanently removed. This cannot be undone.
              </p>
              <p className="mt-3 text-xs text-slate-600">
                Type <strong>{deleteTarget.name}</strong> to confirm:
              </p>
              <input className={`${inp} mt-2`} value={deleteTyped} onChange={e => setDeleteTyped(e.target.value)} placeholder={deleteTarget.name} autoFocus />
              <div className="mt-3 flex gap-2">
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-40"
                  disabled={deleteTyped.trim().toLowerCase() !== deleteTarget.name.trim().toLowerCase()}
                  onClick={confirmHardDelete}>
                  <Trash2 size={12}/> Permanently delete
                </button>
                <button className={btnG} onClick={() => { setDeleteTarget(null); setDeleteTyped(""); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className={`${card} overflow-hidden`}>
          <div className="border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Activity size={15}/> Recent activity</h4>
            <span className="text-xs text-slate-400">Last {auditLog.length} actions</span>
          </div>
          {!auditLog.length
            ? <div className="p-10"><Empty icon={ScrollText} title="No activity yet" hint="Faculty and admin actions (role changes, quiz creation, question deletion) will appear here." /></div>
            : (
              <div className="divide-y divide-slate-100 max-h-[28rem] overflow-auto">
                {auditLog.map(entry => (
                  <div key={entry.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <span className="font-semibold text-slate-800">{entry.actor_name}</span>
                      <span className="text-slate-500"> {actionVerb(entry.action)} </span>
                      {entry.target && <span className="font-medium text-slate-700">{entry.target}</span>}
                      {entry.meta?.from && entry.meta?.to && <span className="text-xs text-slate-400"> ({entry.meta.from} → {entry.meta.to})</span>}
                    </div>
                    <span className={`shrink-0 text-xs text-slate-400 ${num}`}>{new Date(entry.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {tab === "system" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat icon={Database} label="Questions" value={questions.length} tone="violet" />
            <Stat icon={ScrollText} label="Quizzes" value={quizzes.length} tone="slate" />
            <Stat icon={Activity} label="Total attempts" value={attempts.length} tone="sky" />
            <Stat icon={Users} label="Total users" value={userCount} tone="emerald" />
          </div>
          <div className={`${card} p-5`}>
            <h4 className="mb-2 text-sm font-bold text-slate-900">Database keep-alive</h4>
            <p className="text-xs leading-relaxed text-slate-500">
              A scheduled job runs inside your Supabase database once daily to prevent the free-tier project from
              auto-pausing after 7 days of inactivity. This requires no external service and needs no maintenance.
              You can verify it is active by running <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">select * from cron.job;</code> in
              the Supabase SQL Editor — you should see a job named <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">quizpro-keepalive-daily</code>.
            </p>
          </div>
          <div className={`${card} p-5`}>
            <h4 className="mb-2 text-sm font-bold text-slate-900">AI provider</h4>
            <p className="text-xs leading-relaxed text-slate-500">
              The AI assistant is configured via the <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">VITE_AI_PROVIDER</code> environment
              variable. Default is Groq (free tier). Set it to <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">anthropic</code> to use Claude instead — see DEPLOY_GUIDE.md.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function actionVerb(action) {
  const map = {
    "role.change": "changed role for",
    "quiz.create": "created quiz",
    "quiz.update": "updated quiz",
    "quiz.delete": "deleted quiz",
    "question.create": "added question",
    "question.delete": "deleted question",
    "question.import": "bulk-imported questions into",
    "classroom.create": "created classroom",
    "classroom.update": "updated classroom",
    "classroom.delete": "removed classroom",
    "classroom.hard_delete": "permanently deleted classroom",
    "classroom.member_add": "added student",
    "classroom.member_remove": "removed student",
    "classroom.co_owner_add": "added co-owner",
    "classroom.co_owner_remove": "removed co-owner",
  };
  return map[action] || action;
}
