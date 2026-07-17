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
        "group relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-[0_8px_32px_-8px_oklch(0.78_0.14_160/0.8)] transition-all duration-300",
        "bg-gradient-to-br from-primary via-primary to-accent",
        open
          ? "scale-90 rotate-12 opacity-80"
          : "hover:scale-110 hover:shadow-[0_12px_40px_-8px_oklch(0.78_0.14_160/0.9)]",
      )}
    >
      {/* Pulsing ring when closed */}
      {!open && (
        <span className="absolute inset-0 rounded-2xl animate-ping bg-primary/40 duration-[2000ms]" />
      )}

      {/* Unread dot */}
      {hasUnread && !open && (
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-accent shadow-[0_0_8px_oklch(0.82_0.12_85/0.8)]" />
      )}

      <Sparkles
        className={cn(
          "h-6 w-6 text-primary-foreground transition-transform duration-300",
          !open && "group-hover:rotate-12",
        )}
        strokeWidth={2}
      />
    </button>
  );
}
