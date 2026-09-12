import { useState, useRef } from "react";
import { Bot, X, Send, Loader } from "lucide-react";
import { inp, btnP } from "./ui.jsx";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || "";
const GROQ_KEY      = import.meta.env.VITE_GROQ_KEY      || "";
const SYSTEM = `You are QuizPro AI, an academic assistant for university faculty and students. For faculty: help write high-quality MCQs, improve answer choices, calibrate difficulty, align to learning outcomes. For students: help understand course topics and prepare for quizzes. Be concise and educational.`;

async function callAI(messages) {
  if (ANTHROPIC_KEY) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json", "x-api-key":ANTHROPIC_KEY, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
      body:JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:600, system:SYSTEM, messages }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.content?.[0]?.text || "No response.";
  }
  if (GROQ_KEY) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${GROQ_KEY}` },
      body:JSON.stringify({ model:"llama3-70b-8192", max_tokens:600, messages:[{ role:"system", content:SYSTEM },...messages] }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices?.[0]?.message?.content || "No response.";
  }
  return null;
}

const NO_KEY_MSG = `AI assistant needs an API key.\n\nTo enable:\n1. Get a free key at console.anthropic.com\n2. In Netlify → Site settings → Environment variables\n3. Add: VITE_ANTHROPIC_KEY = your key\n4. Redeploy from GitHub (auto-deploys now)`;

export default function AIAssistant({ role = "faculty" }) {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [noKey, setNoKey]     = useState(false);
  const bottomRef = useRef(null);
  const hasKey = !!(ANTHROPIC_KEY||GROQ_KEY);
  const greeting = role==="faculty" ? "Hi! I can help you write quiz questions, improve answer choices, or calibrate difficulty. What subject are you working on?" : "Hi! I can help you understand course topics or prepare for quizzes. What would you like to know?";

  const send = async () => {
    if (!input.trim()||loading) return;
    const text = input.trim();
    const userMsg = { role:"user", content:text };
    setMessages(m=>[...m,userMsg]); setInput(""); setLoading(true); setNoKey(false);
    try {
      const reply = await callAI([...messages,userMsg]);
      if (reply===null) setNoKey(true);
      else setMessages(m=>[...m,{ role:"assistant", content:reply }]);
    } catch (e) { setMessages(m=>[...m,{ role:"assistant", content:`Error: ${e.message}` }]); }
    setLoading(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({ behavior:"smooth" }),50);
  };

  return (
    <>
      <button onClick={()=>setOpen(v=>!v)} className="fixed bottom-6 right-6 z-50 grid h-12 w-12 place-items-center rounded-full bg-violet-600 text-white shadow-xl hover:bg-violet-700 transition" title="QuizPro AI">
        {open?<X size={20}/>:<Bot size={20}/>}
      </button>
      {open && (
        <div className="fixed bottom-20 right-6 z-50 flex w-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" style={{ height:440 }}>
          <div className="flex items-center justify-between border-b border-violet-700 bg-violet-600 px-4 py-3">
            <div className="flex items-center gap-2"><Bot size={16} className="text-white"/><span className="text-sm font-bold text-white">QuizPro AI</span></div>
            <button onClick={()=>setOpen(false)} className="text-white/60 hover:text-white"><X size={16}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="bg-slate-100 text-slate-800 text-xs rounded-xl px-3 py-2 max-w-[92%]">{greeting}</div>
            {!hasKey&&<div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-3 py-2"><p className="font-semibold mb-1">API key not configured</p><p>Add <code className="bg-amber-100 px-1 rounded">VITE_ANTHROPIC_KEY</code> in Netlify environment variables.</p></div>}
            {messages.map((m,i)=><div key={i} className={`text-xs rounded-xl px-3 py-2 whitespace-pre-wrap ${m.role==="user"?"ml-auto bg-violet-600 text-white max-w-[85%]":"bg-slate-100 text-slate-800 max-w-[92%]"}`}>{m.content}</div>)}
            {noKey&&<div className="bg-slate-100 text-slate-700 text-xs rounded-xl px-3 py-2 max-w-[92%] whitespace-pre-wrap">{NO_KEY_MSG}</div>}
            {loading&&<div className="bg-slate-100 rounded-xl px-3 py-2 text-xs text-slate-400 flex items-center gap-1.5"><Loader size={12} className="animate-spin"/> Thinking…</div>}
            <div ref={bottomRef}/>
          </div>
          <div className="flex gap-2 border-t border-slate-100 p-2">
            <input className={`${inp} py-1.5 text-xs`} placeholder={hasKey?"Ask me anything…":"Add API key to enable AI…"} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} disabled={loading}/>
            <button className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${loading||!input.trim()?"bg-slate-100 text-slate-400 cursor-not-allowed":"bg-violet-600 text-white hover:bg-violet-700"}`} onClick={send} disabled={loading||!input.trim()}><Send size={14}/></button>
          </div>
        </div>
      )}
    </>
  );
}
