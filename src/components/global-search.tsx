import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useItems } from "@/hooks/use-lifeos";
import { useNavigate } from "@tanstack/react-router";
import { StickyNote, NotebookText, CheckSquare, CalendarDays } from "lucide-react";
import { useMemo } from "react";
import type { Item } from "@/lib/lifeos-types";

const ICON = {
  sticky: StickyNote,
  notebook_page: NotebookText,
  task: CheckSquare,
  event: CalendarDays,
} as const;

const ROUTE: Record<Item["type"], string> = {
  sticky: "/sticky",
  notebook_page: "/notebooks",
  task: "/tasks",
  event: "/calendar",
};

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: items = [] } = useItems();
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    const g: Record<Item["type"], Item[]> = { sticky: [], notebook_page: [], task: [], event: [] };
    for (const it of items) if (!it.archived) g[it.type].push(it);
    return g;
  }, [items]);

  const go = (type: Item["type"]) => {
    onOpenChange(false);
    navigate({ to: ROUTE[type] });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search notes, pages, tasks and events…" />
      <CommandList>
        <CommandEmpty>No matches yet.</CommandEmpty>
        {(Object.keys(grouped) as Item["type"][]).map((type) => {
          const list = grouped[type];
          if (!list.length) return null;
          const Icon = ICON[type];
          return (
            <CommandGroup key={type} heading={labelFor(type)}>
              {list.slice(0, 8).map((it) => (
                <CommandItem
                  key={it.id}
                  value={`${it.title ?? ""} ${it.content ?? ""} ${it.tags.join(" ")}`}
                  onSelect={() => go(type)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span className="truncate">{it.title || (it.content ?? "").slice(0, 60) || "Untitled"}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}

function labelFor(t: Item["type"]) {
  return t === "sticky" ? "Sticky notes" : t === "notebook_page" ? "Notebook pages" : t === "task" ? "Tasks" : "Events";
}
