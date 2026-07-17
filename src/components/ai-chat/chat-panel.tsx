import { useEffect, useRef } from "react";
import { Sparkles, X, Send, RotateCcw, AlertCircle } from "lucide-react";
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
  "Give me relationship advice",
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
        "flex flex-col overflow-hidden rounded-3xl border border-white/10",
        "bg-[oklch(0.14_0.02_160/0.92)] backdrop-blur-2xl",
        "shadow-[0_32px_80px_-16px_oklch(0_0_0/0.8),0_0_0_1px_oklch(1_0_0/0.06)]",
      )}
      style={{ width: 380, height: 560 }}
    >
      {/* Header */}
      <div className="relative flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
        {/* Glow accent top */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-[0_4px_16px_-4px_oklch(0.78_0.14_160/0.7)]">
          <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2} />
        </div>

        <div className="flex-1 leading-tight">
          <p className="font-display text-sm font-semibold text-foreground">LifeOS AI</p>
          <p className="text-[10px] text-muted-foreground">
            {loading ? "Thinking…" : "Your personal life assistant"}
          </p>
        </div>

        <button
          onClick={onReset}
          title="New conversation"
          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onClose}
          title="Close"
          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
        {isEmpty && (
          <div className="flex flex-col items-center gap-5 pt-6 pb-2 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]">
              <Sparkles className="h-8 w-8 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-display text-base font-semibold text-foreground">Hey, I'm your AI</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-[240px]">
                I know your tasks, notes, events & spending. Ask me anything.
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
                  className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-left text-xs text-muted-foreground transition hover:border-primary/30 hover:bg-white/[0.06] hover:text-foreground"
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
              <div className="mt-1 grid h-6 w-6 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/20">
                <Sparkles className="h-3 w-3 text-primary" strokeWidth={2} />
              </div>
            )}
            <div
              className={cn(
                "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "rounded-tr-sm bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_4px_16px_-4px_oklch(0.78_0.14_160/0.5)]"
                  : "rounded-tl-sm border border-white/[0.07] bg-white/[0.04] text-foreground",
              )}
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
            <div className="mt-1 grid h-6 w-6 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/20">
              <Sparkles className="h-3 w-3 text-primary" strokeWidth={2} />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-white/[0.07] bg-white/[0.04] px-4 py-3">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.07] px-3 py-3">
        <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 transition focus-within:border-primary/40 focus-within:bg-white/[0.06] focus-within:shadow-[0_0_0_1px_oklch(0.78_0.14_160/0.2)]">
          <textarea
            ref={inputRef}
            id="ai-chat-input"
            rows={1}
            value={input}
            onChange={(e) => {
              onInputChange(e.target.value);
              // Auto-resize
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKey}
            placeholder="Ask me anything…"
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none disabled:opacity-50"
            style={{ maxHeight: 120 }}
          />
          <button
            id="ai-chat-send"
            onClick={onSend}
            disabled={!input.trim() || loading}
            className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_4px_12px_-4px_oklch(0.78_0.14_160/0.6)] transition hover:scale-105 hover:shadow-[0_6px_20px_-6px_oklch(0.78_0.14_160/0.8)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
          Powered by Gemini · Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
