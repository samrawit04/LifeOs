import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckSquare, Plus, Trash2, ArchiveIcon, ChevronDown, Loader2 } from "lucide-react";
import { useCreateItem, useDeleteItem, useFolders, useItems, useUpdateItem } from "@/hooks/use-lifeos";
import { PRIORITIES, type Item } from "@/lib/lifeos-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const { data: items = [], isLoading } = useItems();
  const { data: folders = [] } = useFolders();
  const create = useCreateItem();
  const update = useUpdateItem();
  const del = useDeleteItem();

  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [folderId, setFolderId] = useState<string>("none");

  const tasks = useMemo(() => items.filter((i) => i.type === "task" && !i.archived), [items]);
  const active = tasks.filter((t) => !t.completed).sort(sortByDue);
  const done = tasks.filter((t) => t.completed).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    create.mutate({
      type: "task",
      title: title.trim(),
      priority,
      due_date: due ? new Date(due).toISOString() : null,
      folder_id: folderId === "none" ? null : folderId,
    });
    setTitle(""); setDue("");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-lagoon flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-primary" /> Tasks
        </h1>
        <p className="text-sm text-muted-foreground">Small wins add up.</p>
      </header>

      <form onSubmit={submit} className="mb-8 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            className="flex-1"
          />
          <Button type="submit" disabled={create.isPending} className="bg-lagoon text-cream hover:bg-lagoon/90">
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {create.isPending ? "Adding…" : "Add"}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-auto" />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={folderId} onValueChange={setFolderId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="No notebook" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No notebook</SelectItem>
              {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </form>

      {isLoading ? (
        <ul className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <li key={i} className="h-14 rounded-xl border bg-card animate-skeleton" />
          ))}
        </ul>
      ) : (
        <>
          {active.length === 0 && done.length === 0 && (
            <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
              A quiet list. Add your first task above.
            </div>
          )}

          <ul className="space-y-2">
            {active.map((t) => (
              <TaskRow key={t.id} task={t} onChange={(p) => update.mutate({ id: t.id, patch: p })} onDelete={() => del.mutate(t.id)} onArchive={() => update.mutate({ id: t.id, patch: { archived: true } })} />
            ))}
          </ul>

          {done.length > 0 && (
            <Collapsible className="mt-8">
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-lagoon">
                <ChevronDown className="h-4 w-4" /> Done ({done.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2">
                {done.map((t) => (
                  <TaskRow key={t.id} task={t} onChange={(p) => update.mutate({ id: t.id, patch: p })} onDelete={() => del.mutate(t.id)} onArchive={() => update.mutate({ id: t.id, patch: { archived: true } })} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  );
}

function sortByDue(a: Item, b: Item) {
  if (!a.due_date && !b.due_date) return 0;
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;
  return a.due_date < b.due_date ? -1 : 1;
}

function TaskRow({ task, onChange, onDelete, onArchive }: { task: Item; onChange: (p: Partial<Item>) => void; onDelete: () => void; onArchive: () => void }) {
  const overdue = task.due_date && !task.completed && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
  return (
    <li className={cn("group flex items-start gap-3 rounded-xl border bg-card p-3 shadow-soft transition", task.completed && "opacity-60")}>
      <Checkbox checked={task.completed} onCheckedChange={(v) => onChange({ completed: !!v })} className="mt-1" />
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium text-lagoon", task.completed && "line-through")}>{task.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {task.due_date && (
            <span className={cn(overdue && "text-destructive font-medium")}>
              {format(new Date(task.due_date), "EEE, MMM d")}
            </span>
          )}
          {task.priority && (
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              task.priority === "high" && "bg-destructive/15 text-destructive",
              task.priority === "medium" && "bg-sunbeam/40 text-clay",
              task.priority === "low" && "bg-muted text-muted-foreground",
            )}>
              {task.priority}
            </span>
          )}
        </div>
      </div>
      <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={onArchive} className="rounded p-1 text-muted-foreground hover:bg-accent/40" title="Archive"><ArchiveIcon className="h-4 w-4" /></button>
        <button onClick={onDelete} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
      </div>
    </li>
  );
}
