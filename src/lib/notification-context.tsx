import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type AppNotification } from "@/integrations/api/client";

export type NotifCategory = "calendar" | "task" | "expense" | "general";

// Re-export as Notification for the rest of the app
export type Notification = AppNotification;

const NOTIF_KEY = ["notifications"] as const;

interface NotifState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
}

interface NotifActions {
  add: (n: Omit<Notification, "id" | "userId" | "createdAt" | "isRead">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const NotifContext = createContext<(NotifState & NotifActions) | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  // ── Fetch all notifications from the DB ────────────────────────────────────
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: NOTIF_KEY,
    queryFn: () => apiClient.notifications.getAll(),
    refetchInterval: 60_000, // refresh every minute
    staleTime: 30_000,
  });

  // ── Create notification ────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (n: { category: string; title: string; body: string; icon?: string; link?: string }) =>
      apiClient.notifications.create(n),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIF_KEY }),
  });

  const createMutRef = useRef(createMut.mutate);
  createMutRef.current = createMut.mutate;

  // ── Mark single read ───────────────────────────────────────────────────────
  const markReadMut = useMutation({
    mutationFn: (id: string) => apiClient.notifications.markRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIF_KEY });
      const prev = qc.getQueryData<Notification[]>(NOTIF_KEY);
      qc.setQueryData<Notification[]>(NOTIF_KEY, (old = []) =>
        old.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(NOTIF_KEY, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIF_KEY }),
  });

  // ── Mark all read ──────────────────────────────────────────────────────────
  const markAllReadMut = useMutation({
    mutationFn: () => apiClient.notifications.markAllRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIF_KEY });
      const prev = qc.getQueryData<Notification[]>(NOTIF_KEY);
      qc.setQueryData<Notification[]>(NOTIF_KEY, (old = []) =>
        old.map((n) => ({ ...n, isRead: true }))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(NOTIF_KEY, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIF_KEY }),
  });

  // ── Delete single ──────────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiClient.notifications.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIF_KEY });
      const prev = qc.getQueryData<Notification[]>(NOTIF_KEY);
      qc.setQueryData<Notification[]>(NOTIF_KEY, (old = []) => old.filter((n) => n.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(NOTIF_KEY, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIF_KEY }),
  });

  // ── Delete all ─────────────────────────────────────────────────────────────
  const deleteAllMut = useMutation({
    mutationFn: () => apiClient.notifications.deleteAll(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIF_KEY });
      const prev = qc.getQueryData<Notification[]>(NOTIF_KEY);
      qc.setQueryData<Notification[]>(NOTIF_KEY, []);
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(NOTIF_KEY, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIF_KEY }),
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const add = useCallback(
    (n: Omit<Notification, "id" | "userId" | "createdAt" | "isRead">) => {
      createMutRef.current(n);
    },
    []
  );

  return (
    <NotifContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        add,
        markRead: (id) => markReadMut.mutate(id),
        markAllRead: () => markAllReadMut.mutate(),
        dismiss: (id) => deleteMut.mutate(id),
        clearAll: () => deleteAllMut.mutate(),
      }}
    >
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
}

// ─── Date helpers for notification deduplication ──────────────────────────────
function isDateToday(dateStr: string): boolean {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  } catch {
    return false;
  }
}

function isDateSameMonth(dateStr: string): boolean {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  } catch {
    return false;
  }
}

// ─── Smart poller: generates notifications from live data ────────────────────
interface SmartPollerProps {
  items: import("@/lib/lifeos-types").Item[];
  expenses: import("@/lib/lifeos-types").Expense[];
  categoryBudgets: Record<string, number>;
  monthlyBudget: number;
}

export function useNotificationPoller({
  items,
  expenses,
  categoryBudgets,
  monthlyBudget,
}: SmartPollerProps) {
  const { notifications, add } = useNotifications();
  // Track which dedup keys we've already fired this session to avoid duplicate DB writes
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!items.length && !expenses.length) return;

    const now = new Date();

    // ── 1. Calendar events starting within 60 minutes ──────────────────────
    const upcomingEvents = items.filter((i) => {
      if (i.type !== "event" || !i.event_date || i.archived) return false;
      const dt = new Date(i.event_date);
      const diff = dt.getTime() - now.getTime();
      return diff > 0 && diff <= 60 * 60 * 1000;
    });
    for (const ev of upcomingEvents) {
      const key = `event-upcoming-${ev.id}-${now.toDateString()}`;
      if (firedRef.current.has(key)) continue;
      const alreadyNotified = notifications.some(
        (n) => n.category === "calendar" && n.body.includes(ev.title || "Untitled") && isDateToday(n.createdAt)
      );
      if (alreadyNotified) {
        firedRef.current.add(key);
        continue;
      }
      firedRef.current.add(key);
      const mins = Math.round((new Date(ev.event_date!).getTime() - now.getTime()) / 60000);
      add({ category: "calendar", icon: "📅", title: "Event coming up", body: `${ev.title || "Untitled"} starts in ${mins} min`, link: "/calendar" });
    }

    // ── 2. Overdue tasks ───────────────────────────────────────────────────
    const overdueTasks = items.filter((i) => i.type === "task" && !i.completed && !i.archived && i.due_date && new Date(i.due_date) < now);
    if (overdueTasks.length > 0) {
      const key = `tasks-overdue-${overdueTasks.length}-${now.toDateString()}`;
      if (!firedRef.current.has(key)) {
        firedRef.current.add(key);
        const alreadyNotified = notifications.some(
          (n) => n.category === "task" && n.title.includes("overdue task") && isDateToday(n.createdAt)
        );
        if (!alreadyNotified) {
          add({
            category: "task", icon: "⚠️",
            title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`,
            body: overdueTasks.length === 1
              ? `"${overdueTasks[0].title || "Untitled"}" is past due`
              : `${overdueTasks.slice(0, 2).map((t) => t.title || "Untitled").join(", ")}${overdueTasks.length > 2 ? ` and ${overdueTasks.length - 2} more` : ""}`,
            link: "/tasks",
          });
        }
      }
    }

    // ── 3. Tasks due today ─────────────────────────────────────────────────
    const dueTodayTasks = items.filter((i) => {
      if (i.type !== "task" || !i.due_date || i.completed || i.archived) return false;
      const due = new Date(i.due_date);
      return due >= now && due.toDateString() === now.toDateString();
    });
    if (dueTodayTasks.length > 0) {
      const key = `tasks-due-today-${dueTodayTasks.length}-${now.toDateString()}`;
      if (!firedRef.current.has(key)) {
        firedRef.current.add(key);
        const alreadyNotified = notifications.some(
          (n) => n.category === "task" && n.title.includes("due today") && isDateToday(n.createdAt)
        );
        if (!alreadyNotified) {
          add({
            category: "task", icon: "✅",
            title: `${dueTodayTasks.length} task${dueTodayTasks.length > 1 ? "s" : ""} due today`,
            body: dueTodayTasks.slice(0, 2).map((t) => t.title || "Untitled").join(", ") + (dueTodayTasks.length > 2 ? "…" : ""),
            link: "/tasks",
          });
        }
      }
    }

    // ── 4. Monthly budget warnings ─────────────────────────────────────────
    if (monthlyBudget > 0 && expenses.length > 0) {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthTotal = expenses.filter((e) => new Date(e.occurred_at) >= monthStart).reduce((s, e) => s + Number(e.amount), 0);
      const pct = (thisMonthTotal / monthlyBudget) * 100;
      if (pct >= 100) {
        const key = `expense-over-budget-${now.getMonth()}-${now.getFullYear()}`;
        if (!firedRef.current.has(key)) {
          firedRef.current.add(key);
          const alreadyNotified = notifications.some(
            (n) => n.category === "expense" && n.title.includes("Monthly budget exceeded") && isDateSameMonth(n.createdAt)
          );
          if (!alreadyNotified) {
            add({ category: "expense", icon: "🚨", title: "Monthly budget exceeded!", body: `You've spent ${Math.round(pct)}% of your ${monthlyBudget.toLocaleString()} Birr budget this month`, link: "/expenses" });
          }
        }
      } else if (pct >= 80) {
        const key = `expense-budget-80-${now.getMonth()}-${now.getFullYear()}`;
        if (!firedRef.current.has(key)) {
          firedRef.current.add(key);
          const alreadyNotified = notifications.some(
            (n) => n.category === "expense" && n.title.includes("Budget at 80%") && isDateSameMonth(n.createdAt)
          );
          if (!alreadyNotified) {
            add({ category: "expense", icon: "💰", title: "Budget at 80%", body: `You've used ${Math.round(pct)}% of your monthly budget (${thisMonthTotal.toLocaleString()} / ${monthlyBudget.toLocaleString()} Birr)`, link: "/expenses" });
          }
        }
      }
    }

    // ── 5. Per-category budget warnings ───────────────────────────────────
    const monthStart2 = new Date(now.getFullYear(), now.getMonth(), 1);
    for (const [cat, budget] of Object.entries(categoryBudgets)) {
      if (!budget) continue;
      const spent = expenses.filter((e) => e.category === cat && new Date(e.occurred_at) >= monthStart2).reduce((s, e) => s + Number(e.amount), 0);
      const pct = (spent / budget) * 100;
      if (pct >= 90) {
        const key = `expense-cat-${cat}-${now.getMonth()}-${now.getFullYear()}`;
        if (!firedRef.current.has(key)) {
          firedRef.current.add(key);
          const alreadyNotified = notifications.some(
            (n) => n.category === "expense" && n.title.includes(`${cat} budget`) && isDateSameMonth(n.createdAt)
          );
          if (!alreadyNotified) {
            add({ category: "expense", icon: "💸", title: `${cat} budget ${pct >= 100 ? "exceeded" : "almost full"}`, body: `Spent ${spent.toLocaleString()} of ${budget.toLocaleString()} Birr on ${cat} this month`, link: "/expenses" });
          }
        }
      }
    }
  }, [items, expenses, categoryBudgets, monthlyBudget, notifications, add]);
}
