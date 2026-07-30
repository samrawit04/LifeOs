import { useEffect, useRef } from "react";
import { X, Send, RotateCcw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/gemini";

interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  error: string | null;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
  onReset: () => void;
}

const SUGGESTIONS = [
  "What tasks are due this week?",
  "Am I spending too much?",
  "Help me feel motivated today",
  "Summarize my open notes",
];

export function ChatPanel({
  messages,
  input,
  loading,
  error,
  onInputChange,
  onSend,
  onClose,
  onReset,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div
      id="ai-chat-panel"
      className={cn(
        "flex flex-col overflow-hidden rounded-3xl",
        "bg-white",
        "shadow-[0_24px_80px_-12px_rgba(22,163,74,0.3),0_0_0_1px_rgba(22,163,74,0.12)]",
        "w-[calc(100vw-1.5rem)] max-w-[380px] h-[calc(100vh-6.5rem)] max-h-[560px] min-h-[350px]"
      )}
    >
      {/* Header — green gradient */}
      <div
        className="relative flex items-center gap-3 px-4 py-3"
        style={{
          background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)",
        }}
      >
        {/* Subtle shine line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30" />

        <img
          src="/logo.png"
          alt="LifePulse AI"
          className="h-8 w-8 rounded-xl object-cover border border-white/20 shadow-sm shrink-0"
        />

        <div className="flex-1 leading-tight">
          <p className="font-display text-sm font-bold text-white">LifePulse AI</p>
          <p className="text-[10px] text-green-100">
            {loading ? "Thinking…" : "Your personal life assistant"}
          </p>
        </div>

        <button
          onClick={onReset}
          title="New conversation"
          className="grid h-7 w-7 place-items-center rounded-lg text-green-100 transition hover:bg-white/20 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onClose}
          title="Close"
          className="grid h-7 w-7 place-items-center rounded-lg text-green-100 transition hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ background: "#f0faf4" }}
      >
        {isEmpty && (
          <div className="flex flex-col items-center gap-5 pt-6 pb-2 text-center">
            <img
              src="/logo.png"
              alt="LifePulse AI"
              className="h-16 w-16 rounded-3xl object-cover shadow-[0_8px_24px_rgba(22,163,74,0.25)] border border-emerald-500/20"
            />
            <div>
              <p className="font-display text-base font-bold text-slate-800">Hey, I'm your AI</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-[240px]">
                I know your tasks, notes, events &amp; spending. Ask me anything.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full mt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onInputChange(s);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  className="rounded-xl border border-green-200 bg-white px-3 py-2 text-left text-xs text-slate-600 transition hover:border-green-400 hover:bg-green-50 hover:text-green-800 shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {msg.role === "model" && (
              <img
                src="/logo.png"
                alt="AI"
                className="mt-1 h-6 w-6 flex-shrink-0 rounded-lg object-cover shadow-sm border border-emerald-500/20"
              />
            )}
            <div
              className={cn(
                "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "rounded-tr-sm text-white shadow-[0_4px_16px_rgba(21,128,61,0.35)]"
                  : "rounded-tl-sm bg-white border border-green-100 text-slate-800 shadow-sm",
              )}
              style={
                msg.role === "user"
                  ? { background: "linear-gradient(135deg, #15803d, #16a34a)" }
                  : undefined
              }
            >
              {msg.text.split("\n").map((line, j) =>
                line ? <p key={j} className={j > 0 ? "mt-1" : ""}>{line}</p> : <br key={j} />,
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="AI"
              className="mt-1 h-6 w-6 flex-shrink-0 rounded-lg object-cover shadow-sm border border-emerald-500/20"
            />
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white border border-green-100 px-4 py-3 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-green-100 bg-white px-3 py-3">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 transition focus-within:border-green-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(22,163,74,0.12)]">
          <textarea
            ref={inputRef}
            id="ai-chat-input"
            rows={1}
            value={input}
            onChange={(e) => {
              onInputChange(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKey}
            placeholder="Ask me anything…"
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none disabled:opacity-50"
            style={{ maxHeight: 120 }}
          />
          <button
            id="ai-chat-send"
            onClick={onSend}
            disabled={!input.trim() || loading}
            className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl text-white shadow-[0_4px_12px_rgba(21,128,61,0.4)] transition hover:scale-105 hover:shadow-[0_6px_20px_rgba(21,128,61,0.5)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            style={{ background: "linear-gradient(135deg, #15803d, #16a34a)" }}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-slate-400">
          Powered by Gemini · Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
