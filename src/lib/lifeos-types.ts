import type { Database } from "@/integrations/supabase/types";

export type Item = Database["public"]["Tables"]["items"]["Row"];
export type ItemInsert = Database["public"]["Tables"]["items"]["Insert"];
export type ItemUpdate = Database["public"]["Tables"]["items"]["Update"];
export type Folder = Database["public"]["Tables"]["folders"]["Row"];
export type FolderInsert = Database["public"]["Tables"]["folders"]["Insert"];

export const NOTE_COLORS = [
  { name: "Yellow", value: "yellow", css: "var(--note-yellow)", meaning: "Idea" },
  { name: "Pink", value: "pink", css: "var(--note-pink)", meaning: "Urgent" },
  { name: "Blue", value: "blue", css: "var(--note-blue)", meaning: "Reference" },
  { name: "Green", value: "green", css: "var(--note-green)", meaning: "Done" },
  { name: "Lavender", value: "lavender", css: "var(--note-lavender)", meaning: "Later" },
] as const;

export function noteColorCss(color: string | null | undefined): string {
  const found = NOTE_COLORS.find((c) => c.value === color);
  return found ? found.css : "var(--note-yellow)";
}

export const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;
