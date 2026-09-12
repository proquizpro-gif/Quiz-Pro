import { useState } from "react";
import {
  School, Plus, Copy, Check, Users, Trash2, UserPlus,
  ChevronDown, ChevronUp, CalendarDays, Archive, ArchiveRestore,
  UserCog, X,
} from "lucide-react";
import { card, cardH, btnP, btnG, inp, num, Badge, Empty, Toast, dateStr } from "./ui";
import {
  insertClassroom, updateClassroom, softDeleteClassroom,
  fetchClassroomMembers, addMemberByEmail, removeMember,
  fetchCoOwners, addCoOwner, removeCoOwner,
  logAudit,
} from "../lib/db";
import { useAuth } from "../lib/AuthContext";

/* ==================================================================
   FACULTY CLASSROOM MANAGER
   Create rooms (name / section / year), hand the join code to
   students, manage co-owners (team-taught), see the roster,
   archive or soft-delete rooms.
   ================================================================== */
export default function ClassroomManager({ classrooms, setClassrooms }) {
  const { user, profile } = useAuth();
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);
  const toast2 = (msg, tone = "emerald") => { setToast({ msg, tone }); setTimeout(() => setToast(null), 3500); };

  const mine = classrooms.filter(c => c.owner_id === user.id);

  /* ── Soft-delete: detaches quizzes so attempts survive ───────── */
  const removeRoom = async (room) => {
    try {
      await softDeleteClassroom(room.id);
      setClassrooms(prev => prev.filter(c => c.id !== room.id));
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "classroom.delete", target: room.name, meta: { soft: true } });
      toast2(`"${room.name}" removed. Its quizzes and student attempts are preserved.`, "amber");
    } catch (err) { toast2(err.message, "rose"); }
  };

  const toggleArchive = async (room) => {
    try {
      const updated = await updateClassroom(room.id, { is_archived: !room.is_archived });
      setClassrooms(prev => prev.map(c => c.id === room.id ? updated : c));
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "classroom.update", target: room.name, meta: { is_archived: updated.is_archived } });
      toast2(`"${room.name}" ${updated.is_archived ? "archived — join code disabled" : "restored"}.`);
    } catch (err) { toast2(err.message, "rose"); }
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} tone={toast.tone} onDismiss={() => setToast(null)} />}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">My classrooms</h3>
          <p className="text-xs text-slate-400">{mine.length} classroom{mine.length === 1 ? "" : "s"} · students join with the code</p>
        </div>
        <button className={btnP} onClick={() => setCreating(v => !v)}><Plus size={15}/> New classroom</button>
      </div>

      {creating && (
        <CreateClassroom
          onCreated={(room) => { setClassrooms(prev => [...prev, room]); setCreating(false); toast2(`"${room.name}" created. Share code ${room.join_code} with your students.`); }}
          onCancel={() => setCreating(false)}
          onError={(m) => toast2(m, "rose")}
        />
      )}

      {!mine.length && !creating && (
        <Empty icon={School} title="No classrooms yet"
          hint="Create a classroom, then share its 6-character join code with your students. Quizzes you assign to it are visible only to its members."/>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {mine.map(room => (
          <ClassroomCard key={room.id} room={room}
            onDelete={() => removeRoom(room)}
            onToggleArchive={() => toggleArchive(room)}
            onToast={toast2}/>
        ))}
      </div>
    </div>
  );
}

function CreateClassroom({ onCreated, onCancel, onError }) {
  const { user, profile } = useAuth();
  const [name, setName]       = useState("");
  const [section, setSection] = useState("");
  const [year, setYear]       = useState("");
  const [saving, setSaving]   = useState(false);
  const ready = name.trim();

  const save = async () => {
    setSaving(true);
    try {
      const room = await insertClassroom({ name: name.trim(), section: section.trim(), year: year.trim(), owner_id: user.id });
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "classroom.create", target: room.name, meta: { section: room.section, year: room.year } });
      onCreated(room);
    } catch (err) { onError(err.message); }
    setSaving(false);
  };

  return (
    <div className={`${card} p-5`}>
      <h4 className="mb-4 text-sm font-bold text-slate-900">New classroom</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-semibold text-slate-500">Course / class name</label>
          <input className={inp} placeholder="e.g. Managerial Economics" value={name} onChange={e => setName(e.target.value)}/>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Section</label>
          <input className={inp} placeholder="e.g. A" value={section} onChange={e => setSection(e.target.value)}/>
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><CalendarDays size={12}/> Year / batch</label>
          <input className={inp} placeholder="e.g. 2026-27" value={year} onChange={e => setYear(e.target.value)}/>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">A unique join code is generated automatically. Students enter it on their dashboard to get in.</p>
      <div className="mt-4 flex gap-2">
        <button className={btnP} disabled={!ready || saving} onClick={save}>{saving ? "Creating..." : "Create classroom"}</button>
        <button className={btnG} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Typed confirmation modal ──────────────────────────────────── */
function TypedConfirm({ roomName, onConfirm, onCancel }) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === roomName.trim().toLowerCase();
  return (
    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
      <p className="text-xs font-semibold text-rose-700">
        This will remove the classroom and detach its quizzes. Student attempt records are preserved.
      </p>
      <p className="mt-2 text-xs text-rose-600">
        Type <strong>{roomName}</strong> to confirm:
      </p>
      <input
        className={`${inp} mt-2 text-sm`}
        value={typed}
        onChange={e => setTyped(e.target.value)}
        placeholder={roomName}
        autoFocus
      />
      <div className="mt-3 flex gap-2">
        <button className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-40"
          disabled={!matches} onClick={onConfirm}>
          <Trash2 size={12}/> Remove classroom
        </button>
        <button className={btnG} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function ClassroomCard({ room, onDelete, onToggleArchive, onToast }) {
  const { user, profile } = useAuth();
  const [open, setOpen]       = useState(false);
  const [members, setMembers] = useState(null);
  const [coOwners, setCoOwners] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [email, setEmail]     = useState("");
  const [adding, setAdding]   = useState(false);
  const [coEmail, setCoEmail] = useState("");
  const [addingCo, setAddingCo] = useState(false);
  const [showCoOwners, setShowCoOwners] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const [m, co] = await Promise.all([
        fetchClassroomMembers(room.id),
        fetchCoOwners(room.id),
      ]);
      setMembers(m);
      setCoOwners(co);
    } catch (err) { onToast(err.message, "rose"); }
    setLoading(false);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && members === null) loadMembers();
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(room.join_code); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch (_) { onToast("Copy failed — select the code manually.", "amber"); }
  };

  const addStudent = async () => {
    if (!email.trim()) return;
    setAdding(true);
    try {
      const prof = await addMemberByEmail(room.id, email);
      setMembers(prev => (prev || []).some(m => m.user_id === prof.id) ? prev
        : [...(prev || []), { user_id: prof.id, joined_at: new Date().toISOString(), profile: prof }]);
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "classroom.member_add", target: `${prof.email} → ${room.name}`, meta: {} });
      setEmail("");
      onToast(`${prof.full_name} added to ${room.name}.`);
    } catch (err) { onToast(err.message, "rose"); }
    setAdding(false);
  };

  const kick = async (m) => {
    if (!window.confirm(`Remove ${m.profile?.full_name || "this student"} from "${room.name}"? Their past attempts are kept.`)) return;
    try {
      await removeMember(room.id, m.user_id);
      setMembers(prev => prev.filter(x => x.user_id !== m.user_id));
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "classroom.member_remove", target: `${m.profile?.email} ← ${room.name}`, meta: {} });
      onToast("Student removed.", "amber");
    } catch (err) { onToast(err.message, "rose"); }
  };

  /* ── Co-owner management ─────────────────────────────────────── */
  const handleAddCoOwner = async () => {
    if (!coEmail.trim()) return;
    setAddingCo(true);
    try {
      const prof = await addCoOwner(room.id, coEmail);
      setCoOwners(prev => (prev || []).some(c => c.user_id === prof.id) ? prev
        : [...(prev || []), { user_id: prof.id, added_at: new Date().toISOString(), profile: prof }]);
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "classroom.co_owner_add", target: `${prof.email} → ${room.name}`, meta: {} });
      setCoEmail("");
      onToast(`${prof.full_name} added as co-owner of ${room.name}.`);
    } catch (err) { onToast(err.message, "rose"); }
    setAddingCo(false);
  };

  const handleRemoveCoOwner = async (co) => {
    if (!window.confirm(`Remove ${co.profile?.full_name || "this co-owner"} as co-owner?`)) return;
    try {
      await removeCoOwner(room.id, co.user_id);
      setCoOwners(prev => prev.filter(x => x.user_id !== co.user_id));
      logAudit({ actor_id: user.id, actor_name: profile.full_name, action: "classroom.co_owner_remove", target: `${co.profile?.email} ← ${room.name}`, meta: {} });
      onToast("Co-owner removed.", "amber");
    } catch (err) { onToast(err.message, "rose"); }
  };

  return (
    <div className={`${cardH} p-5 ${room.is_archived ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {room.section && <Badge tone="violet">Section {room.section}</Badge>}
            {room.year && <Badge tone="sky">{room.year}</Badge>}
            {room.is_archived && <Badge tone="amber">Archived</Badge>}
          </div>
          <h4 className="mt-2 truncate font-bold text-slate-900">{room.name}</h4>
          <p className="mt-0.5 text-xs text-slate-400">Created {dateStr(room.created_at)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onToggleArchive} className="rounded-xl p-2 text-slate-300 transition hover:bg-amber-50 hover:text-amber-600" title={room.is_archived ? "Restore" : "Archive (disables join code)"}>
            {room.is_archived ? <ArchiveRestore size={14}/> : <Archive size={14}/>}
          </button>
          <button onClick={() => setConfirmDelete(true)} className="rounded-xl p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500" title="Remove classroom"><Trash2 size={14}/></button>
        </div>
      </div>

      {/* ── Typed confirmation for delete ─────────────────────────── */}
      {confirmDelete && (
        <TypedConfirm
          roomName={room.name}
          onConfirm={() => { setConfirmDelete(false); onDelete(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-dashed border-violet-200 bg-violet-50/50 px-4 py-2.5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Join code</div>
          <div className={`text-lg font-extrabold tracking-[0.25em] text-violet-700 ${num}`}>{room.join_code}</div>
        </div>
        <button className={`${btnG} px-3 py-1.5 text-xs`} onClick={copyCode}>
          {copied ? <><Check size={13} className="text-emerald-500"/> Copied</> : <><Copy size={13}/> Copy</>}
        </button>
      </div>

      {/* ── Co-owners toggle ──────────────────────────────────────── */}
      <button onClick={() => { setShowCoOwners(v => !v); if (!coOwners && !showCoOwners) loadMembers(); }}
        className="mt-3 flex w-full items-center justify-between rounded-xl px-1 py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800">
        <span className="flex items-center gap-1.5"><UserCog size={13}/>{coOwners ? `${coOwners.length} co-owner${coOwners.length === 1 ? "" : "s"}` : "Manage co-owners"}</span>
        {showCoOwners ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
      </button>

      {showCoOwners && (
        <div className="mt-1 space-y-2">
          <div className="flex gap-2">
            <input className={`${inp} py-2 text-xs`} placeholder="Add faculty co-owner by email" value={coEmail}
              onChange={e => setCoEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddCoOwner()}/>
            <button className={`${btnP} shrink-0 px-3 py-2 text-xs`} disabled={addingCo || !coEmail.trim()} onClick={handleAddCoOwner}><UserPlus size={13}/> Add</button>
          </div>
          <p className="text-[10px] text-slate-400">Co-owners can view the roster, see attempts, and publish quizzes to this classroom.</p>
          {coOwners && coOwners.length > 0 && (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {coOwners.map(co => (
                <div key={co.user_id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {co.profile?.avatar_url
                      ? <img src={co.profile.avatar_url} className="h-6 w-6 rounded-full border border-slate-200 object-cover" alt=""/>
                      : <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600">{(co.profile?.full_name || "?").charAt(0)}</div>}
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-slate-800">{co.profile?.full_name}</div>
                      <div className="truncate text-[10px] text-slate-400">{co.profile?.email}</div>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveCoOwner(co)} className="shrink-0 rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500" title="Remove co-owner"><X size={12}/></button>
                </div>
              ))}
            </div>
          )}
          {coOwners && !coOwners.length && <p className="py-2 text-center text-xs text-slate-400">No co-owners yet.</p>}
        </div>
      )}

      {/* ── Students roster ───────────────────────────────────────── */}
      <button onClick={toggle} className="mt-1 flex w-full items-center justify-between rounded-xl px-1 py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800">
        <span className="flex items-center gap-1.5"><Users size={13}/>{members === null ? "View students" : `${members.length} student${members.length === 1 ? "" : "s"}`}</span>
        {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
      </button>

      {open && (
        <div className="mt-1 space-y-2">
          <div className="flex gap-2">
            <input className={`${inp} py-2 text-xs`} placeholder="Add student by email (must have signed in once)" value={email}
              onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addStudent()}/>
            <button className={`${btnP} shrink-0 px-3 py-2 text-xs`} disabled={adding || !email.trim()} onClick={addStudent}><UserPlus size={13}/> Add</button>
          </div>
          {loading && <p className="py-3 text-center text-xs text-slate-400">Loading roster...</p>}
          {!loading && members !== null && !members.length && <p className="py-3 text-center text-xs text-slate-400">No students yet — share the join code.</p>}
          {!loading && members !== null && members.length > 0 && (
            <div className="max-h-56 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-100">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {m.profile?.avatar_url
                      ? <img src={m.profile.avatar_url} className="h-6 w-6 rounded-full border border-slate-200 object-cover" alt=""/>
                      : <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600">{(m.profile?.full_name || "?").charAt(0)}</div>}
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-slate-800">{m.profile?.full_name}</div>
                      <div className="truncate text-[10px] text-slate-400">{m.profile?.email}</div>
                    </div>
                  </div>
                  <button onClick={() => kick(m)} className="shrink-0 rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500" title="Remove from classroom"><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
