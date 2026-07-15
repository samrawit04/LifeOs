import type { Database } from "@/integrations/supabase/types";

export type Item = Database["public"]["Tables"]["items"]["Row"];
export type ItemInsert = Database["public"]["Tables"]["items"]["Insert"];
export type ItemUpdate = Database["public"]["Tables"]["items"]["Update"];
export type Folder = Database["public"]["Tables"]["folders"]["Row"];
export type FolderInsert = Database["public"]["Tables"]["folders"]["Insert"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type ExpenseInsert = Database["public"]["Tables"]["expenses"]["Insert"];
export type ExpenseUpdate = Database["public"]["Tables"]["expenses"]["Update"];

/**
 * Sticky-note palette — soft, painterly pastels. Values are stable slugs
 * kept short so they persist cleanly in the DB. Each color includes a
 * gradient pair for the fancy card look.
 */
export const NOTE_COLORS = [
  {
    name: "Peach",
    value: "peach",
    meaning: "Warm idea",
    from: "oklch(0.88 0.08 55)",
    to: "oklch(0.78 0.10 40)",
  },
  {
    name: "Rose",
    value: "rose",
    meaning: "Urgent",
    from: "oklch(0.86 0.07 15)",
    to: "oklch(0.75 0.10 10)",
  },
  {
    name: "Sky",
    value: "sky",
    meaning: "Reference",
    from: "oklch(0.87 0.06 235)",
    to: "oklch(0.76 0.09 240)",
  },
  {
    name: "Sage",
    value: "sage",
    meaning: "Done",
    from: "oklch(0.88 0.06 150)",
    to: "oklch(0.78 0.08 155)",
  },
  {
    name: "Lilac",
    value: "lilac",
    meaning: "Later",
    from: "oklch(0.85 0.07 300)",
    to: "oklch(0.74 0.10 300)",
  },
] as const;

export type NoteColorValue = (typeof NOTE_COLORS)[number]["value"];

export function noteColor(color: string | null | undefined) {
  return NOTE_COLORS.find((c) => c.value === color) ?? NOTE_COLORS[0];
}

/** Gradient CSS for a sticky-note surface. */
export function noteGradient(color: string | null | undefined): string {
  const c = noteColor(color);
  return `linear-gradient(155deg, ${c.from} 0%, ${c.to} 100%)`;
}

/** Solid-ish color for legacy usages (e.g. dashboard tiles). */
export function noteColorCss(color: string | null | undefined): string {
  return noteColor(color).from;
}

export const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "Food", emoji: "🍜" },
  { value: "Transport", emoji: "🚕" },
  { value: "Rent", emoji: "🏠" },
  { value: "Shopping", emoji: "🛍️" },
  { value: "Bills", emoji: "🧾" },
  { value: "Health", emoji: "💊" },
  { value: "Entertainment", emoji: "🎬" },
  { value: "Travel", emoji: "✈️" },
  { value: "Savings", emoji: "🐖" },
  { value: "Other", emoji: "✨" },
] as const;

export function categoryEmoji(cat: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === cat)?.emoji ?? "✨";
}
