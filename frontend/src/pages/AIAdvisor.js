import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import { Send, Loader2, Bot, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "How can we reduce our Scope 2 emissions in 90 days?",
  "What ESG risks should our board focus on this quarter?",
  "Suggest 3 gamified initiatives to boost CSR participation.",
  "Explain how we can align our reports with GRI standards.",
];

function renderMarkdown(text, isUser = false) {
  if (!text) return "";
  
  const textClass = isUser ? "text-slate-100 leading-relaxed my-0.5" : "text-slate-700 leading-relaxed my-0.5";
  const strongClass = isUser ? "font-semibold text-white" : "font-semibold text-slate-950";
  const headingClass = isUser ? "font-heading font-semibold text-sm text-white mt-3 mb-1" : "font-heading font-semibold text-sm text-slate-950 mt-3 mb-1";
  
  const lines = text.split("\n");
  let inList = false;
  const listItems = [];
  const rendered = [];

  const flushList = () => {
    if (listItems.length > 0) {
      rendered.push(
        <ul key={`list-${rendered.length}`} className="list-disc list-inside space-y-0.5 my-1.5">
          {listItems.map((item, idx) => (
            <li key={idx} className={textClass}>{item}</li>
          ))}
        </ul>
      );
      listItems.length = 0;
      inList = false;
    }
  };

  const parseInline = (str) => {
    const parts = [];
    let current = "";
    let i = 0;
    while (i < str.length) {
      if (str.substr(i, 2) === "**") {
        if (current) {
          parts.push(current);
          current = "";
        }
        let endIdx = str.indexOf("**", i + 2);
        if (endIdx !== -1) {
          parts.push(<strong key={i} className={strongClass}>{str.substring(i + 2, endIdx)}</strong>);
          i = endIdx + 2;
          continue;
        }
      }
      current += str[i];
      i++;
    }
    if (current) {
      parts.push(current);
    }
    return parts;
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith("### ")) {
      flushList();
      rendered.push(
        <h4 key={lineIdx} className={headingClass}>
          {parseInline(trimmed.substring(4))}
        </h4>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList();
      rendered.push(
        <h3 key={lineIdx} className={isUser ? "font-heading font-semibold text-base text-white mt-3 mb-1" : "font-heading font-semibold text-base text-slate-950 mt-3 mb-1"}>
          {parseInline(trimmed.substring(3))}
        </h3>
      );
    } else if (trimmed.startsWith("# ")) {
      flushList();
      rendered.push(
        <h2 key={lineIdx} className={isUser ? "font-heading font-semibold text-lg text-white mt-3 mb-1" : "font-heading font-semibold text-lg text-slate-950 mt-3 mb-1"}>
          {parseInline(trimmed.substring(2))}
        </h2>
      );
    } else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      inList = true;
      listItems.push(parseInline(trimmed.substring(2)));
    } else if (trimmed === "") {
      flushList();
      rendered.push(<div key={lineIdx} className="h-1.5" />);
    } else {
      flushList();
      rendered.push(
        <p key={lineIdx} className={textClass}>
          {parseInline(trimmed)}
        </p>
      );
    }
  });
  
  flushList();
  return rendered;
}

export default function AIAdvisor() {
  const [msgs, setMsgs] = useState([
    { role: "assistant", content: "Hi, I'm your EcoSphere AI advisor. Ask me anything about ESG strategy, carbon reduction, compliance or reporting — I'll always explain the **why** behind my recommendations." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId] = useState(() => `sess-${Date.now()}`);
  const scroller = useRef();

  useEffect(() => { scroller.current?.scrollTo({ top: 999999, behavior: "smooth" }); }, [msgs, busy]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const { data } = await api.post("/ai/advisor", { message: q, session_id: sessionId });
      setMsgs((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: "Sorry, I couldn't process that request. Please try again." }]);
    }
    setBusy(false);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col fade-in" style={{ height: "calc(100vh - 128px)" }} data-testid="ai-advisor-page">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Bot size={22} className="text-emerald-700" />
          <h1 className="font-heading text-2xl font-semibold tracking-tight">AI Sustainability Advisor</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">Powered by Groq · Llama 3.3 70B · Every answer explains WHY</p>
      </div>

      <div ref={scroller} className="flex-1 card p-6 overflow-y-auto space-y-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center ${m.role === "user" ? "bg-slate-800 text-white" : "bg-emerald-600 text-white"}`}>
              {m.role === "user" ? <span className="text-xs font-semibold">You</span> : <Sparkles size={14} />}
            </div>
            <div className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm ${m.role === "user" ? "bg-slate-900 text-white rounded-tr-sm" : "bg-slate-50 border border-slate-200 rounded-tl-sm"}`}
                 data-testid={`msg-${m.role}-${i}`}>
              <div>{renderMarkdown(m.content, m.role === "user")}</div>
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full shrink-0 bg-emerald-600 text-white flex items-center justify-center"><Sparkles size={14} /></div>
            <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200">
              <Loader2 size={16} className="animate-spin text-slate-500" />
            </div>
          </div>
        )}
      </div>

      {msgs.length <= 1 && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="btn-outline text-left !py-2 text-xs" data-testid={`suggestion-${SUGGESTIONS.indexOf(s)}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex gap-2" data-testid="advisor-form">
        <input placeholder="Ask about ESG strategy, carbon, compliance..." value={input}
               onChange={(e) => setInput(e.target.value)} data-testid="advisor-input"
               className="flex-1" />
        <button type="submit" disabled={busy || !input.trim()} className="btn-primary flex items-center gap-2" data-testid="advisor-send">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send
        </button>
      </form>
    </div>
  );
}
