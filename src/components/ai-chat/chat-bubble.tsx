import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatBubbleButtonProps {
  open: boolean;
  onClick: () => void;
  hasUnread?: boolean;
}

export function ChatBubbleButton({ open, onClick, hasUnread }: ChatBubbleButtonProps) {
  return (
    <button
      id="ai-chat-bubble"
      onClick={onClick}
      aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      className={cn(
        "group relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300",
        "text-white",
        open
          ? "scale-90 rotate-12 opacity-80"
          : "hover:scale-110",
      )}
      style={{
        background: "linear-gradient(135deg, #14532d 0%, #16a34a 60%, #4ade80 100%)",
        boxShadow: open
          ? "none"
          : "0 8px 32px -8px rgba(21,128,61,0.75), 0 0 0 1px rgba(255,255,255,0.15)",
      }}
    >
      {/* Pulsing ring when closed */}
      {!open && (
        <span
          className="absolute inset-0 rounded-2xl animate-ping"
          style={{
            background: "rgba(34,197,94,0.35)",
            animationDuration: "2000ms",
          }}
        />
      )}

      {/* Unread dot */}
      {hasUnread && !open && (
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
      )}

      <Sparkles
        className={cn(
          "h-6 w-6 text-white transition-transform duration-300",
          !open && "group-hover:rotate-12",
        )}
        strokeWidth={2}
      />
    </button>
  );
}
