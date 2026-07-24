import { useCallback, useEffect, useRef, useState } from "react";
import { useItems } from "@/hooks/use-lifeos";
import { useExpenses } from "@/hooks/use-expenses";
import { LifeOSChat, type ChatMessage } from "@/lib/gemini";
import { ChatBubbleButton } from "./chat-bubble";
import { ChatPanel } from "./chat-panel";

export function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);

  const { data: items = [] } = useItems();
  const { data: expenses = [] } = useExpenses();

  // Keep a stable chat instance; rebuild when data changes meaningfully
  const chatRef = useRef<LifeOSChat | null>(null);

  useEffect(() => {
    chatRef.current = new LifeOSChat(items, expenses);
  }, [items, expenses]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      if (!chatRef.current) {
        chatRef.current = new LifeOSChat(items, expenses);
      }
      const reply = await chatRef.current.send(text);
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
      if (!open) setHasUnread(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.includes("VITE_GEMINI_API_KEY")
            ? "No API key found. Add VITE_GEMINI_API_KEY to your .env file and restart the server."
            : err.message.includes("API_KEY_INVALID")
            ? "Invalid API key. Check your VITE_GEMINI_API_KEY in .env."
            : "Something went wrong. Please try again."
          : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [input, loading, items, expenses, open]);

  const handleOpen = () => {
    setOpen(true);
    setHasUnread(false);
  };

  const handleReset = () => {
    chatRef.current?.reset();
    chatRef.current = new LifeOSChat(items, expenses);
    setMessages([]);
    setError(null);
    setInput("");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {/* Panel — slides up */}
      <div
        className="transition-all duration-300 origin-bottom-right"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "scale(1) translateY(0)" : "scale(0.92) translateY(16px)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <ChatPanel
          messages={messages}
          input={input}
          loading={loading}
          error={error}
          onInputChange={setInput}
          onSend={handleSend}
          onClose={() => setOpen(false)}
          onReset={handleReset}
        />
      </div>

      {/* Floating bubble */}
      <div className="pointer-events-auto">
        <ChatBubbleButton
          open={open}
          onClick={open ? () => setOpen(false) : handleOpen}
          hasUnread={hasUnread}
        />
      </div>
    </div>
  );
}
