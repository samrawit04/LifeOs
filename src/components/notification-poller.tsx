/**
 * NotificationPoller — mounted inside the authenticated app shell.
 * Reads live items + expenses data and feeds them to the notification engine.
 * Budget state is read from localStorage (same source as expenses.tsx).
 */
import { useMemo } from "react";
import { useItems } from "@/hooks/use-lifeos";
import { useExpenses } from "@/hooks/use-expenses";
import { useNotificationPoller } from "@/lib/notification-context";

function getBudgets(): Record<string, number> {
  if (typeof window === "undefined") return { Food: 4000, Transport: 3000, Shopping: 1000 };
  try {
    const saved = localStorage.getItem("lifeos.expenses.category_budgets");
    return saved ? JSON.parse(saved) : { Food: 4000, Transport: 3000, Shopping: 1000 };
  } catch {
    return { Food: 4000, Transport: 3000, Shopping: 1000 };
  }
}

export function NotificationPoller() {
  const { data: items = [] } = useItems();
  const { data: expenses = [] } = useExpenses();

  const categoryBudgets = useMemo(getBudgets, []);
  const monthlyBudget = useMemo(
    () => Object.values(categoryBudgets).reduce((s, v) => s + v, 0),
    [categoryBudgets]
  );

  useNotificationPoller({ items, expenses, categoryBudgets, monthlyBudget });

  return null; // renders nothing, just fires effects
}
