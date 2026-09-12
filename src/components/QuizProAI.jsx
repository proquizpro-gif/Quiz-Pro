import { useState, useMemo } from "react";
import { Sparkles, Wand2, Loader, Plus, Trash2, Edit3, RefreshCw, Send, CheckCircle2, AlertCircle, Clock, GraduationCap, BookOpen, Target, ListChecks, Save, Eye, X, RotateCcw, ShieldCheck, Shuffle, Award } from "lucide-react";
import { card, cardH, btn, btnP, btnG, inp, num, Badge, Empty, Toast, Spinner } from "./ui.jsx";
import { insertQuiz, insertQuestions } from "../lib/db";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || "";
const AI_MODEL = "claude-haiku-4-5-20251001";

const DRAFT_SYSTEM = `You are an academic assessment design assistant generating multiple-choice questions for a university-level course.
Rules:
1. Output valid JSON only — no prose, no markdown, no commentary.
2. Each question has exactly one unambiguous correct answer.
3. Distractors must be plausible and same-category.
4. No "All of the above" / "None of the above" unless explicitly instructed.
5. Tag each question with actual Bloom's level.
6. Every question needs a 1-2 sentence explanation.
Return ONLY a JSON array of objects with this schema:
{"question_text":"string","options":["A","B","C","D"],"correct":0,"explanation":"string","difficulty":"easy|medium|hard","bloom_level":"remember|understand|apply|analyze","topic_tag":"string"}`;

const CRITIC_SYSTEM = `You are a strict quality-critic for MCQ items. Score each against: correctness (one clear answer), distractor quality (plausible, same-category), stem clarity, cognitive demand, bias-free. Score 0-10. Return ONLY JSON array: [{"score":0-10,"flags":["reason"],"verdict":"keep|revise|reject"}]`;

async function callClaude(system, user, maxTokens=6000) {
  if (!ANTHROPIC_KEY) throw new Error("AI not configured. Add VITE_ANTHROPIC_KEY.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "x-api-key":ANTHROPIC_KEY, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
    body:JSON.stringify({ model:AI_MODEL, max_tokens:maxTokens, system, messages:[{ role:"user", content:user }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text||"";
}

function extractJSON(text) {
  let c = text.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
  const fi = c.search(/[\[{]/);
  if (fi===-1) throw new Error("No JSON found");
  c = c.slice(fi);
  c = c.slice(0, Math.max(c.lastIndexOf("]"),c.lastIndexOf("}"))+1);
  return JSON.parse(c);
}

async function generatePipeline(config, onProgress) {
  const { subject, unit, count, difficulty, difficultySplit, bloomTarget, extraInstructions } = config;
  onProgress?.("Drafting questions…");
  const surplus = Math.ceil(count*1.5);
  const draftPrompt = `Generate ${surplus} MCQs:
- Subject: ${subject}
- Unit/Topic: ${unit}
- Difficulty: ${difficulty==="mixed"?`${difficultySplit.easy}% easy, ${difficultySplit.medium}% medium, ${difficultySplit.hard}% hard`:`all ${difficulty}`}
- Bloom's target: ${bloomTarget}
${extraInstructions?`- Extra: ${extraInstructions}`:""}
Return exactly ${surplus} questions as a JSON array.`;
  const draftText = await callClaude(DRAFT_SYSTEM, draftPrompt, 8000);
  let drafts;
  try { drafts = extractJSON(draftText); } catch { throw new Error("AI returned malformed JSON. Please try again."); }
  if (!Array.isArray(drafts)||drafts.length===0) throw new Error("AI returned no questions. Please try again.");

  onProgress?.(`Reviewing ${drafts.length} drafts…`);
  let critiques;
  try {
    const critiqueText = await callClaude(CRITIC_SYSTEM, JSON.stringify(drafts), 4000);
    critiques = extractJSON(critiqueText);
  } catch { critiques = drafts.map(()=>({ score:5, flags:[], verdict:"keep" })); }

  onProgress?.("Filtering and finalising…");
  const scored = drafts.map((q,i)=>({ ...q, critic_score:critiques[i]?.score??5, flags:critiques[i]?.flags??[], verdict:critiques[i]?.verdict??"keep" }));
  const eligible = scored.filter(q=>q.verdict!=="reject").sort((a,b)=>b.critic_score-a.critic_score);
  const seen = new Set();
  const deduped = [];
  for (const q of eligible) {
    const key = (q.question_text||"").toLowerCase().replace(/\s+/g," ").slice(0,60);
    if (!seen.has(key)) { seen.add(key); deduped.push(q); }
    if (deduped.length>=count) break;
  }
  // backfill if needed
  for (const q of scored) {
    if (deduped.length>=count) break;
    const key = (q.question_text||"").toLowerCase().replace(/\s+/g," ").slice(0,60);
    if (!seen.has(key)) { seen.add(key); deduped.push(q); }
  }
  return deduped.slice(0,count).map((q,i)=>({ ...q, _id:`ai_${Date.now()}_${i}`, source:"ai_generated" }));
}

const DEFAULT_CONFIG = {
  subject:"", unit:"", learningObjective:"",
  classroomId:"", count:10, difficulty:"medium",
  difficultySplit:{ easy:30, medium:50, hard:20 },
  bloomTarget:"understand", marksPerQ:1, negativeMark:0, passingPct:50,
  durationMin:20, openAt:"", closeAt:"", maxAttempts:1,
  shuffleQ:true, shuffleOpts:true, showAnswersAfter:"after_close",
  extraInstructions:"",
};

export default function QuizProAI({ classrooms, onQuizPublished }) {
  const [stage,    setStage]    = useState("configure");
  const [config,   setConfig]   = useState(DEFAULT_CONFIG);
  const [questions,setQuestions]= useState([]);
  const [progress, setProgress] = useState("");
  const [error,    setError]    = useState(null);
  const [toast,    setToast]    = useState(null);
  const [regenIdx, setRegenIdx] = useState(null);
  const [regenInst,setRegenInst]= useState("");
  const [editIdx,  setEditIdx]  = useState(null);
  const [moreCount,setMoreCount]= useState(5);
  const [preview,  setPreview]  = useState(false);

  const canGenerate = ANTHROPIC_KEY && config.subject.trim() && config.unit.trim() && config.count>0;
  const canPublish  = questions.length>0 && config.classroomId && config.openAt && config.closeAt;
  const set = (k,v) => setConfig(c=>({ ...c, [k]:v }));

  const handleGenerate = async () => {
    setError(null); setStage("generating");
    try { const qs = await generatePipeline(config, setProgress); setQuestions(qs); setStage("review"); }
    catch (e) { setError(e.message); setStage("configure"); }
  };

  const handleRegenOne = async (idx) => {
    setError(null);
    try {
      const prompt = `Rewrite this MCQ. Instruction: ${regenInst||"Improve it."}
Original: ${JSON.stringify(questions[idx])}
Subject: ${config.subject}, Unit: ${config.unit}
Return a single JSON question object.`;
      const text = await callClaude(DRAFT_SYSTEM, prompt, 1500);
      const res  = extractJSON(text);
      const q    = Array.isArray(res)?res[0]:res;
      setQuestions(qs=>qs.map((oq,i)=>i===idx?{ ...q, _id:`ai_${Date.now()}_r`, source:"ai_edited" }:oq));
      setRegenIdx(null); setRegenInst(""); setToast({ msg:"Regenerated", tone:"emerald" });
    } catch (e) { setError(`Regenerate failed: ${e.message}`); }
  };

  const handleMore = async () => {
    setProgress(`Generating ${moreCount} more…`); setStage("generating");
    try {
      const additional = await generatePipeline({ ...config, count:moreCount }, setProgress);
      setQuestions(qs=>[...qs,...additional]); setStage("review");
      setToast({ msg:`Added ${additional.length}`, tone:"emerald" });
    } catch (e) { setError(e.message); setStage("review"); }
  };

  const handlePublish = async () => {
    setStage("publishing"); setError(null);
    try {
      const rows = questions.map(q=>({ subject:config.subject, unit:config.unit, topic:q.topic_tag||config.unit, question:q.question_text, options:q.options, correct:q.correct, difficulty:q.difficulty||(config.difficulty==="mixed"?"medium":config.difficulty), points:config.marksPerQ }));
      const inserted = await insertQuestions(rows);
      const quiz = await insertQuiz({
        title:`${config.subject} — ${config.unit}`, subject:config.subject, week:1,
        units:[config.unit], question_ids:inserted.map(q=>q.id), draw_count:questions.length,
        duration_sec:config.durationMin*60, max_attempts:config.maxAttempts,
        classroom_id:config.classroomId, is_open:true,
        open_at:config.openAt?new Date(config.openAt).toISOString():null,
        close_at:config.closeAt?new Date(config.closeAt).toISOString():null,
        show_answers_policy:"after_close",
      });
      setStage("done");
      const dropped = quiz.__droppedColumns||[];
      if (dropped.includes("question_ids")) setToast({ msg:"Published — but exact-pick not locked (run Step 2 SQL).", tone:"amber" });
      else setToast({ msg:`Published ${questions.length} questions`, tone:"emerald" });
      onQuizPublished?.(quiz,inserted);
    } catch (e) { setError(`Publish failed: ${e.message}`); setStage("review"); }
  };

  const steps = [
    { id:"configure",  label:"Configure",  icon:Target },
    { id:"generating", label:"Generate",   icon:Sparkles },
    { id:"review",     label:"Review",     icon:Eye },
    { id:"publishing", label:"Publish",    icon:Send },
  ];
  const stageIdx = { configure:0, generating:1, review:2, publishing:3, done:4 };
  const si = stageIdx[stage]??0;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} tone={toast.tone} onDismiss={()=>setToast(null)}/>}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg"><Sparkles size={20}/></div>
        <div><h2 className="text-lg font-bold text-slate-900">Quiz Pro AI</h2><p className="text-xs text-slate-500">AI-drafted MCQs with mandatory teacher review before publishing</p></div>
        {stage!=="configure"&&<button onClick={()=>{ setConfig(DEFAULT_CONFIG); setQuestions([]); setStage("configure"); setError(null); }} className={`${btnG} ml-auto`}><RotateCcw size={14}/> Start over</button>}
      </div>

      {/* Stepper */}
      <div className={`${card} p-3 flex items-center gap-2 overflow-x-auto`}>
        {steps.map((s,i)=>{ const done=i<si,active=i===si; return (
          <div key={s.id} className="flex items-center gap-2 shrink-0">
            <div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${done?"bg-emerald-100 text-emerald-700":active?"bg-violet-600 text-white":"bg-slate-100 text-slate-400"}`}>{done?<CheckCircle2 size={14}/>:<s.icon size={13}/>}</div>
            <span className={`text-xs font-semibold ${active?"text-slate-900":done?"text-emerald-700":"text-slate-400"}`}>{s.label}</span>
            {i<steps.length-1&&<div className={`h-px w-6 ${done?"bg-emerald-300":"bg-slate-200"}`}/>}
          </div>
        );})}
      </div>

      {!ANTHROPIC_KEY&&<div className={`${card} border-amber-200 bg-amber-50 p-4 flex items-start gap-3`}><AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5"/><div><p className="font-semibold text-amber-900 text-sm">AI not configured</p><p className="text-xs text-amber-700 mt-1">Add <code className="bg-amber-100 px-1 rounded">VITE_ANTHROPIC_KEY</code> in Netlify environment variables. It will auto-deploy from GitHub.</p></div></div>}
      {error&&<div className={`${card} border-rose-200 bg-rose-50 p-4 flex items-start gap-3`}><AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5"/><div className="flex-1"><p className="text-xs text-rose-700">{error}</p></div><button onClick={()=>setError(null)} className="text-rose-400 hover:text-rose-600"><X size={16}/></button></div>}

      {stage==="configure"&&(
        <div className="space-y-4">
          <SectionBox icon={BookOpen} title="Content" subtitle="What is this quiz about?">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Subject *</label><input className={inp} value={config.subject} onChange={e=>set("subject",e.target.value)} placeholder="e.g. Marketing Management"/></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Unit / Topic *</label><input className={inp} value={config.unit} onChange={e=>set("unit",e.target.value)} placeholder="e.g. Unit III — Consumer Behaviour"/></div>
            </div>
          </SectionBox>
          <SectionBox icon={Sparkles} title="AI Generation">
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Number of MCQs *</label><input type="number" min={1} max={50} className={`${inp} ${num}`} value={config.count} onChange={e=>set("count",Math.max(1,Math.min(50,Number(e.target.value)||1)))}/></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Difficulty</label><select className={inp} value={config.difficulty} onChange={e=>set("difficulty",e.target.value)}><option value="easy">All Easy</option><option value="medium">All Medium</option><option value="hard">All Hard</option><option value="mixed">Mixed</option></select></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Bloom's target</label><select className={inp} value={config.bloomTarget} onChange={e=>set("bloomTarget",e.target.value)}><option value="remember">Remember</option><option value="understand">Understand</option><option value="apply">Apply</option><option value="analyze">Analyze</option></select></div>
            </div>
            {config.difficulty==="mixed"&&<div className="grid grid-cols-3 gap-2 mt-2"><div><label className="mb-1 block text-xs font-semibold text-slate-500">Easy %</label><input type="number" className={`${inp} ${num}`} value={config.difficultySplit.easy} onChange={e=>set("difficultySplit",{...config.difficultySplit,easy:Number(e.target.value)||0})}/></div><div><label className="mb-1 block text-xs font-semibold text-slate-500">Medium %</label><input type="number" className={`${inp} ${num}`} value={config.difficultySplit.medium} onChange={e=>set("difficultySplit",{...config.difficultySplit,medium:Number(e.target.value)||0})}/></div><div><label className="mb-1 block text-xs font-semibold text-slate-500">Hard %</label><input type="number" className={`${inp} ${num}`} value={config.difficultySplit.hard} onChange={e=>set("difficultySplit",{...config.difficultySplit,hard:Number(e.target.value)||0})}/></div></div>}
            <textarea className={`${inp} mt-2 min-h-[60px]`} value={config.extraInstructions} onChange={e=>set("extraInstructions",e.target.value)} placeholder="Additional instruction to AI (optional)…"/>
          </SectionBox>
          <SectionBox icon={Award} title="Scoring">
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Marks per question</label><input type="number" min={0.25} step={0.25} className={`${inp} ${num}`} value={config.marksPerQ} onChange={e=>set("marksPerQ",Number(e.target.value)||1)}/></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Negative marking</label><input type="number" min={0} step={0.25} className={`${inp} ${num}`} value={config.negativeMark} onChange={e=>set("negativeMark",Number(e.target.value)||0)}/></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Total marks (auto)</label><div className={`${inp} bg-slate-50 ${num} font-bold`}>{config.count*config.marksPerQ}</div></div>
            </div>
          </SectionBox>
          <SectionBox icon={Clock} title="Timing">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Duration (minutes)</label><input type="number" min={1} className={`${inp} ${num}`} value={config.durationMin} onChange={e=>set("durationMin",Math.max(1,Number(e.target.value)||1))}/></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Max attempts</label><input type="number" min={1} className={`${inp} ${num}`} value={config.maxAttempts} onChange={e=>set("maxAttempts",Math.max(1,Number(e.target.value)||1))}/></div>
            </div>
          </SectionBox>
          <div className={`${card} p-4 flex items-center justify-between`}>
            <div><p className="text-sm font-semibold text-slate-900">Ready to generate</p><p className="text-xs text-slate-500">AI drafts {config.count} questions. You review before anything reaches students.</p></div>
            <button onClick={handleGenerate} disabled={!canGenerate} className={`${btnP} disabled:opacity-40`}><Wand2 size={16}/> Generate with AI</button>
          </div>
        </div>
      )}

      {stage==="generating"&&<div className={`${card} p-12 text-center`}><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-violet-100 mb-4"><Loader size={24} className="text-violet-600 animate-spin"/></div><p className="font-semibold text-slate-900 mb-1">AI is working…</p><p className="text-sm text-slate-500">{progress}</p></div>}

      {stage==="review"&&(
        <div className="space-y-4">
          <div className={`${card} p-4 flex flex-wrap items-center gap-4`}>
            <div className="flex items-center gap-2"><ListChecks size={14} className="text-violet-600"/><span className={`${num} font-bold text-slate-900`}>{questions.length}</span><span className="text-xs text-slate-500">questions</span></div>
            <div className="flex items-center gap-2"><Award size={14} className="text-violet-600"/><span className={`${num} font-bold text-slate-900`}>{questions.length*config.marksPerQ}</span><span className="text-xs text-slate-500">total marks</span></div>
            <div className="ml-auto"><button onClick={()=>setPreview(v=>!v)} className={btnG}><Eye size={14}/> {preview?"Exit preview":"Student preview"}</button></div>
          </div>
          <div className="space-y-3">
            {questions.map((q,i)=>(
              <AIQuestionCard key={q._id||i} question={q} index={i} preview={preview}
                onEdit={()=>setEditIdx(i)} onDelete={()=>setQuestions(qs=>qs.filter((_,j)=>j!==i))} onRegen={()=>setRegenIdx(i)}/>
            ))}
          </div>
          <div className={`${card} p-4 flex items-center gap-3`}>
            <div className="flex-1"><p className="text-sm font-semibold">Need more questions?</p></div>
            <input type="number" min={1} max={20} className={`${inp} ${num} w-20`} value={moreCount} onChange={e=>setMoreCount(Math.max(1,Number(e.target.value)||1))}/>
            <button onClick={handleMore} className={btnG}><Plus size={14}/> Generate more</button>
          </div>
          {/* Publish gate */}
          <div className={`${card} p-4 space-y-3 border-2 ${canPublish?"border-emerald-200 bg-emerald-50/30":"border-amber-200 bg-amber-50/30"}`}>
            <div className="flex items-center gap-2"><Send size={16} className={canPublish?"text-emerald-600":"text-amber-600"}/><h3 className="font-bold text-slate-900">Publish to classroom</h3></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Classroom *</label><select className={inp} value={config.classroomId} onChange={e=>set("classroomId",e.target.value)}><option value="">Select…</option>{classrooms.map(c=><option key={c.id} value={c.id}>{c.name}{c.section?` · ${c.section}`:""}</option>)}</select></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Open at *</label><input type="datetime-local" className={inp} value={config.openAt} onChange={e=>set("openAt",e.target.value)}/></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Close at *</label><input type="datetime-local" className={inp} value={config.closeAt} onChange={e=>set("closeAt",e.target.value)}/></div>
            </div>
            <div className="flex justify-end"><button onClick={handlePublish} disabled={!canPublish} className={`${btnP} disabled:opacity-40`}><Send size={14}/> Publish {questions.length} questions</button></div>
          </div>
        </div>
      )}

      {stage==="publishing"&&<div className={`${card} p-12 text-center`}><Loader size={24} className="text-emerald-600 animate-spin mx-auto mb-3"/><p className="font-semibold">Publishing…</p></div>}
      {stage==="done"&&<div className={`${card} p-12 text-center`}><CheckCircle2 size={28} className="text-emerald-600 mx-auto mb-3"/><p className="font-bold text-slate-900 text-lg mb-1">Quiz published!</p><p className="text-sm text-slate-500 mb-6">{questions.length} questions live in the selected classroom.</p><button onClick={()=>{ setConfig(DEFAULT_CONFIG); setQuestions([]); setStage("configure"); setError(null); }} className={btnP}><Plus size={14}/> Create another quiz</button></div>}

      {regenIdx!==null&&(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={()=>{setRegenIdx(null);setRegenInst("");}}>
          <div className={`${card} w-full max-w-md p-6 space-y-4`} onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-slate-900">Regenerate this question</h3>
            <textarea className={`${inp} min-h-[80px]`} placeholder="Instruction (optional): make it harder, use a case study…" value={regenInst} onChange={e=>setRegenInst(e.target.value)}/>
            <div className="flex gap-2 justify-end"><button onClick={()=>{setRegenIdx(null);setRegenInst("");}} className={btnG}>Cancel</button><button onClick={()=>handleRegenOne(regenIdx)} className={btnP}><Wand2 size={14}/> Regenerate</button></div>
          </div>
        </div>
      )}
      {editIdx!==null&&(
        <AIEditModal question={questions[editIdx]} onSave={patch=>{ setQuestions(qs=>qs.map((q,i)=>i===editIdx?{...q,...patch,source:"ai_edited"}:q)); setEditIdx(null); setToast({msg:"Updated",tone:"emerald"}); }} onClose={()=>setEditIdx(null)}/>
      )}
    </div>
  );
}

function AIQuestionCard({ question:q, index, preview, onEdit, onDelete, onRegen }) {
  const [showExp, setShowExp] = useState(false);
  const srcTone = q.source==="teacher_written"?"sky":q.source==="ai_edited"?"amber":"violet";
  const srcLabel = q.source==="teacher_written"?"Written":q.source==="ai_edited"?"Edited":"AI";
  const diffTone = q.difficulty==="hard"?"rose":q.difficulty==="easy"?"emerald":"amber";
  return (
    <div className={`${cardH} p-4`}>
      <div className="flex items-start gap-3">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{index+1}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 text-sm leading-relaxed">{q.question_text}</p>
          <div className="mt-3 space-y-1.5">
            {q.options.map((opt,i)=>{ const isC=i===q.correct; return (
              <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${!preview&&isC?"bg-emerald-50 border border-emerald-200":"bg-slate-50 border border-slate-100"}`}>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${!preview&&isC?"bg-emerald-500 text-white":"bg-white border border-slate-300 text-slate-600"}`}>{String.fromCharCode(65+i)}</span>
                <span className="flex-1 text-slate-700">{opt}</span>
                {!preview&&isC&&<CheckCircle2 size={14} className="text-emerald-600 shrink-0"/>}
              </div>
            );})}
          </div>
          {!preview&&q.explanation&&<div className="mt-3"><button onClick={()=>setShowExp(!showExp)} className="text-xs text-violet-600 font-semibold">{showExp?"Hide":"Show"} explanation</button>{showExp&&<p className="mt-1.5 text-xs text-slate-600 bg-violet-50 border border-violet-100 rounded-lg p-2.5">{q.explanation}</p>}</div>}
          {!preview&&<div className="mt-3 flex flex-wrap items-center gap-2"><Badge tone={srcTone}>{srcLabel}</Badge><Badge tone={diffTone}>{q.difficulty}</Badge>{q.bloom_level&&<Badge tone="slate">{q.bloom_level}</Badge>}{q.critic_score!==null&&q.critic_score!==undefined&&<Badge tone={q.critic_score>=7?"emerald":q.critic_score>=4?"amber":"rose"}>score {q.critic_score}/10</Badge>}</div>}
        </div>
        {!preview&&(
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={onEdit} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Edit3 size={14}/></button>
            <button onClick={onRegen} className="grid h-8 w-8 place-items-center rounded-lg text-violet-500 hover:bg-violet-50"><RefreshCw size={14}/></button>
            <button onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 size={14}/></button>
          </div>
        )}
      </div>
    </div>
  );
}

function AIEditModal({ question, onSave, onClose }) {
  const [draft, setDraft] = useState({ question_text:question.question_text, options:[...question.options], correct:question.correct, explanation:question.explanation||"" });
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={`${card} w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto`} onClick={e=>e.stopPropagation()}>
        <h3 className="font-bold text-slate-900 mb-4">Edit question</h3>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-semibold text-slate-500">Question</label><textarea className={`${inp} min-h-[80px]`} value={draft.question_text} onChange={e=>setDraft(d=>({...d,question_text:e.target.value}))}/></div>
          {draft.options.map((opt,i)=>(
            <div key={i}><label className="mb-1 block text-xs font-semibold text-slate-500">Option {String.fromCharCode(65+i)}</label>
              <div className="flex gap-2 items-center"><input type="radio" name="correct" checked={draft.correct===i} onChange={()=>setDraft(d=>({...d,correct:i}))} className="shrink-0"/><input className={inp} value={opt} onChange={e=>{ const o=[...draft.options]; o[i]=e.target.value; setDraft(d=>({...d,options:o})); }}/></div>
            </div>
          ))}
          <p className="text-xs text-slate-400">Radio = correct answer</p>
          <div><label className="mb-1 block text-xs font-semibold text-slate-500">Explanation</label><textarea className={`${inp} min-h-[60px]`} value={draft.explanation} onChange={e=>setDraft(d=>({...d,explanation:e.target.value}))}/></div>
        </div>
        <div className="flex gap-2 mt-4 justify-end"><button onClick={onClose} className={btnG}>Cancel</button><button onClick={()=>onSave(draft)} className={btnP}><Save size={14}/> Save</button></div>
      </div>
    </div>
  );
}

function SectionBox({ icon:Icon, title, subtitle, children }) {
  return (
    <div className={`${card} p-5 space-y-4`}>
      <div className="flex items-center gap-2"><Icon size={16} className="text-violet-600"/><div><h3 className="font-semibold text-slate-900 text-sm">{title}</h3>{subtitle&&<p className="text-xs text-slate-500">{subtitle}</p>}</div></div>
      {children}
    </div>
  );
}
