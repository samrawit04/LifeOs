import { useRef, useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Check, Trash2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  type Notification,
  type NotifCategory,
} from "@/lib/notification-context";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_COLORS: Record<NotifCategory, string> = {
  calendar: "bg-blue-500/20 text-blue-400 border-blue-400/20",
  task: "bg-amber-500/20 text-amber-400 border-amber-400/20",
  expense: "bg-rose-500/20 text-rose-400 border-rose-400/20",
  general: "bg-primary/20 text-primary border-primary/20",
};

const CATEGORY_DOT: Record<NotifCategory, string> = {
  calendar: "bg-blue-400",
  task: "bg-amber-400",
  expense: "bg-rose-400",
  general: "bg-primary",
};

function NotifItem({
  n,
  onRead,
  onDismiss,
  onNavigate,
}: {
  n: Notification;
  onRead: () => void;
  onDismiss: () => void;
  onNavigate: () => void;
}) {
  const catKey = (n.category as NotifCategory) in CATEGORY_DOT ? (n.category as NotifCategory) : "general";

  return (
    <div
      className={cn(
        "group relative flex gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 transition hover:bg-white/[0.04] rounded-xl cursor-pointer",
        !n.isRead && "bg-white/[0.02]"
      )}
      onClick={() => {
        onRead();
        if (n.link) onNavigate();
      }}
    >
      {/* Unread indicator */}
      {!n.isRead && (
        <span
          className={cn(
            "absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full",
            CATEGORY_DOT[catKey]
          )}
        />
      )}

      {/* Icon */}
      <span className="text-lg sm:text-xl leading-none shrink-0 mt-0.5 select-none">{n.icon ?? "🔔"}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1.5">
          <p className={cn("text-xs sm:text-sm font-semibold leading-snug truncate", n.isRead ? "text-foreground/70" : "text-foreground")}>
            {n.title}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="shrink-0 h-5 w-5 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
            title="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 mt-1">
          {(() => {
            try {
              const d = new Date(n.createdAt);
              if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "just now";
              return formatDistanceToNow(d, { addSuffix: true });
            } catch {
              return "just now";
            }
          })()}
        </p>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, dismiss, clearAll } =
    useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const openPanel = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const top = rect.bottom + 8;
    const panelWidth = Math.min(384, window.innerWidth - 24);

    // If button has space to expand rightwards, align left edge
    if (rect.left + panelWidth <= window.innerWidth - 12) {
      setCoords({ top, left: Math.max(12, rect.left) });
    } else {
      // Otherwise align right edge
      setCoords({ top, right: Math.max(12, window.innerWidth - rect.right) });
    }
    setOpen((v) => !v);
  };

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(t) &&
        panelRef.current && !panelRef.current.contains(t)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isEmpty = notifications.length === 0;

  return (
    <>
      <button
        ref={btnRef}
        id="notification-bell-btn"
        onClick={openPanel}
        aria-label={`Notifications (${unreadCount} unread)`}
        className={cn(
          "relative grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl border transition-all",
          open
            ? "border-primary/40 bg-primary/15 text-primary shadow-[0_0_16px_oklch(0.78_0.14_160/0.25)]"
            : "border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground hover:border-white/20"
        )}
      >
        <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-lg animate-in zoom-in-75 duration-150">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left !== undefined ? `${coords.left}px` : undefined,
            right: coords.right !== undefined ? `${coords.right}px` : undefined,
            maxWidth: "calc(100vw - 24px)",
            zIndex: 9999
          }}
          className="w-[calc(100vw-24px)] max-w-xs sm:max-w-sm sm:w-96 rounded-2xl border border-white/10 bg-sidebar/95 shadow-2xl backdrop-blur-2xl overflow-hidden animate-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-display text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground transition"
                  title="Mark all as read"
                >
                  <Check className="h-3 w-3" /> All read
                </button>
              )}
              {!isEmpty && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400 transition"
                  title="Clear all"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[70vh] overflow-y-auto p-1.5">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-2xl">
                  🎉
                </div>
                <p className="text-sm font-semibold text-foreground">You're all caught up!</p>
                <p className="mt-1 text-xs text-muted-foreground">No notifications right now.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {notifications.map((n) => (
                  <NotifItem
                    key={n.id}
                    n={n}
                    onRead={() => markRead(n.id)}
                    onDismiss={() => dismiss(n.id)}
                    onNavigate={() => {
                      setOpen(false);
                      if (n.link) navigate({ to: n.link as any });
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Category legend */}
          {!isEmpty && (
            <div className="flex items-center gap-3 border-t border-white/5 px-4 py-2.5">
              {(["calendar", "task", "expense"] as NotifCategory[]).map((cat) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", CATEGORY_DOT[cat])} />
                  <span className="text-[10px] capitalize text-muted-foreground">{cat}</span>
                </div>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
