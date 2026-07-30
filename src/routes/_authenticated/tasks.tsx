import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CheckSquare,
  Plus,
  Trash2,
  ArchiveIcon,
  Loader2,
  GripVertical,
  Calendar,
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
  CalendarDays,
  FolderIcon,
} from "lucide-react";
import { useCreateItem, useDeleteItem, useFolders, useItems, useUpdateItem } from "@/hooks/use-lifeos";
import { PRIORITIES, type Item } from "@/lib/lifeos-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isBefore, isToday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

type ColumnId = "backlog" | "today" | "done";

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
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<ColumnId | null>(null);

  const tasks = useMemo(() => items.filter((i) => i.type === "task" && !i.archived), [items]);

  const backlogTasks = useMemo(
    () => tasks.filter((t) => !t.completed).sort(sortByDue),
    [tasks]
  );

  const todayTasks = useMemo(
    () => tasks.filter((t) => !t.completed && t.due_date && isToday(new Date(t.due_date))).sort(sortByDue),
    [tasks]
  );

  const doneTasks = useMemo(
    () => tasks.filter((t) => t.completed).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)),
    [tasks]
  );

  const submit = (e: React.FormEvent, targetColumn?: ColumnId) => {
    e.preventDefault();
    if (!title.trim()) return;

    let targetDue: string | null = due ? new Date(due).toISOString() : null;
    if (targetColumn === "today") {
      targetDue = new Date().toISOString();
    }

    create.mutate({
      type: "task",
      title: title.trim(),
      priority,
      due_date: targetDue,
      folder_id: folderId === "none" ? null : folderId,
      completed: targetColumn === "done",
    });

    setTitle("");
    setDue("");
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (activeDropTarget !== columnId) {
      setActiveDropTarget(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault();
    if (activeDropTarget === columnId) {
      setActiveDropTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain") || draggedItemId;
    setActiveDropTarget(null);
    setDraggedItemId(null);

    if (!itemId) return;

    const targetItem = tasks.find((t) => t.id === itemId);
    if (!targetItem) return;

    if (columnId === "done") {
      update.mutate({ id: itemId, patch: { completed: true } });
    } else if (columnId === "today") {
      update.mutate({
        id: itemId,
        patch: { completed: false, due_date: new Date().toISOString() },
      });
    } else if (columnId === "backlog") {
      update.mutate({
        id: itemId,
        patch: { completed: false, clearDueDate: true },
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-lagoon">
            Task Board
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            Organize, prioritize, and track your progress in real-time.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-soft self-start sm:self-auto">
          <Button
            variant={viewMode === "board" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("board")}
            className={cn("h-8 gap-1.5 text-xs font-medium", viewMode === "board" && "bg-lagoon text-cream")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Board
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className={cn("h-8 gap-1.5 text-xs font-medium", viewMode === "list" && "bg-lagoon text-cream")}
          >
            <List className="h-3.5 w-3.5" /> List
          </Button>
        </div>
      </header>

      <form onSubmit={(e) => submit(e)} className="mb-8 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing? (e.g. Finish project roadmap)"
            className="flex-1"
          />
          <Button type="submit" disabled={create.isPending} className="bg-lagoon text-cream hover:bg-lagoon/90 shrink-0">
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {create.isPending ? "Adding…" : "Add Task"}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-auto text-xs" />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-32 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={folderId} onValueChange={setFolderId}>
            <SelectTrigger className="w-44 text-xs"><SelectValue placeholder="No notebook" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No notebook</SelectItem>
              {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </form>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-96 rounded-2xl border bg-card p-4 animate-skeleton" />
          ))}
        </div>
      ) : viewMode === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <KanbanColumn
            columnId="backlog"
            title="All Tasks"
            icon={<Clock className="h-4 w-4 text-amber-500" />}
            tasks={backlogTasks}
            folders={folders}
            isActiveDrop={activeDropTarget === "backlog"}
            draggedItemId={draggedItemId}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onToggle={(t) => update.mutate({ id: t.id, patch: { completed: !t.completed } })}
            onDelete={(t) => del.mutate(t.id)}
            onArchive={(t) => update.mutate({ id: t.id, patch: { archived: true } })}
          />

          <KanbanColumn
            columnId="today"
            title="Today's Focus"
            icon={<CalendarDays className="h-4 w-4 text-primary" />}
            tasks={todayTasks}
            folders={folders}
            isActiveDrop={activeDropTarget === "today"}
            draggedItemId={draggedItemId}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onToggle={(t) => update.mutate({ id: t.id, patch: { completed: !t.completed } })}
            onDelete={(t) => del.mutate(t.id)}
            onArchive={(t) => update.mutate({ id: t.id, patch: { archived: true } })}
          />

          <KanbanColumn
            columnId="done"
            title="Done"
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            tasks={doneTasks}
            folders={folders}
            isActiveDrop={activeDropTarget === "done"}
            draggedItemId={draggedItemId}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onToggle={(t) => update.mutate({ id: t.id, patch: { completed: !t.completed } })}
            onDelete={(t) => del.mutate(t.id)}
            onArchive={(t) => update.mutate({ id: t.id, patch: { archived: true } })}
          />
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          {backlogTasks.length === 0 && todayTasks.length === 0 && doneTasks.length === 0 && (
            <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
              A quiet list. Add your first task above.
            </div>
          )}

          {todayTasks.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-primary flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Today ({todayTasks.length})
              </h2>
              <div className="space-y-2">
                {todayTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    folders={folders}
                    isDragging={draggedItemId === t.id}
                    onDragStart={handleDragStart}
                    onToggle={() => update.mutate({ id: t.id, patch: { completed: !t.completed } })}
                    onDelete={() => del.mutate(t.id)}
                    onArchive={() => update.mutate({ id: t.id, patch: { archived: true } })}
                  />
                ))}
              </div>
            </div>
          )}

          {backlogTasks.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-lagoon flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Backlog ({backlogTasks.length})
              </h2>
              <div className="space-y-2">
                {backlogTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    folders={folders}
                    isDragging={draggedItemId === t.id}
                    onDragStart={handleDragStart}
                    onToggle={() => update.mutate({ id: t.id, patch: { completed: !t.completed } })}
                    onDelete={() => del.mutate(t.id)}
                    onArchive={() => update.mutate({ id: t.id, patch: { archived: true } })}
                  />
                ))}
              </div>
            </div>
          )}

          {doneTasks.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Completed ({doneTasks.length})
              </h2>
              <div className="space-y-2">
                {doneTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    folders={folders}
                    isDragging={draggedItemId === t.id}
                    onDragStart={handleDragStart}
                    onToggle={() => update.mutate({ id: t.id, patch: { completed: !t.completed } })}
                    onDelete={() => del.mutate(t.id)}
                    onArchive={() => update.mutate({ id: t.id, patch: { archived: true } })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface KanbanColumnProps {
  columnId: ColumnId;
  title: string;
  icon: React.ReactNode;
  tasks: Item[];
  folders: Array<{ id: string; name: string }>;
  isActiveDrop: boolean;
  draggedItemId: string | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, columnId: ColumnId) => void;
  onDragLeave: (e: React.DragEvent, columnId: ColumnId) => void;
  onDrop: (e: React.DragEvent, columnId: ColumnId) => void;
  onToggle: (task: Item) => void;
  onDelete: (task: Item) => void;
  onArchive: (task: Item) => void;
}

function KanbanColumn({
  columnId,
  title,
  icon,
  tasks,
  folders,
  isActiveDrop,
  draggedItemId,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onToggle,
  onDelete,
  onArchive,
}: KanbanColumnProps) {
  return (
    <div
      onDragOver={(e) => onDragOver(e, columnId)}
      onDragLeave={(e) => onDragLeave(e, columnId)}
      onDrop={(e) => onDrop(e, columnId)}
      className={cn(
        "flex flex-col rounded-2xl border bg-card/60 p-4 transition-all min-h-[420px]",
        isActiveDrop && "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-lg"
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-semibold text-sm text-foreground">{title}</h2>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 space-y-2.5">
        {tasks.length === 0 ? (
          <div
            className={cn(
              "flex h-32 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground transition",
              isActiveDrop ? "border-primary text-primary font-medium bg-primary/5" : "border-border"
            )}
          >
            {isActiveDrop ? "Drop task here" : "No tasks here"}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              folders={folders}
              isDragging={draggedItemId === task.id}
              onDragStart={onDragStart}
              onToggle={() => onToggle(task)}
              onDelete={() => onDelete(task)}
              onArchive={() => onArchive(task)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Item;
  folders: Array<{ id: string; name: string }>;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onToggle: () => void;
  onDelete: () => void;
  onArchive: () => void;
}

function TaskCard({ task, folders, isDragging, onDragStart, onToggle, onDelete, onArchive }: TaskCardProps) {
  const folder = folders.find((f) => f.id === task.folder_id);
  const overdue =
    task.due_date &&
    !task.completed &&
    isBefore(startOfDay(new Date(task.due_date)), startOfDay(new Date()));

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className={cn(
        "group relative flex items-start gap-2.5 rounded-xl border bg-card p-3 shadow-soft transition hover:shadow-md cursor-grab active:cursor-grabbing select-none",
        task.completed && "opacity-60 bg-muted/30",
        isDragging && "opacity-40 border-dashed border-primary"
      )}
    >
      <div className="mt-0.5 text-muted-foreground/40 group-hover:text-muted-foreground transition">
        <GripVertical className="h-4 w-4" />
      </div>

      <Checkbox checked={task.completed} onCheckedChange={onToggle} className="mt-0.5" />

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium text-foreground leading-snug", task.completed && "line-through text-muted-foreground")}>
          {task.title}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {task.priority && (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 font-semibold uppercase tracking-wider text-[10px]",
                task.priority === "high" && "bg-destructive/15 text-destructive",
                task.priority === "medium" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                task.priority === "low" && "bg-muted text-muted-foreground"
              )}
            >
              {task.priority}
            </span>
          )}

          {folder && (
            <span className="flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-secondary-foreground">
              <FolderIcon className="h-3 w-3" /> {folder.name}
            </span>
          )}

          {task.due_date && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5",
                overdue
                  ? "bg-destructive/15 text-destructive font-medium"
                  : isToday(new Date(task.due_date))
                  ? "bg-primary/15 text-primary font-medium"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {isToday(new Date(task.due_date)) ? "Today" : format(new Date(task.due_date), "MMM d")}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100 shrink-0">
        <button
          onClick={onArchive}
          className="rounded p-1 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          title="Archive"
        >
          <ArchiveIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function sortByDue(a: Item, b: Item) {
  if (!a.due_date && !b.due_date) return 0;
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;
  return a.due_date < b.due_date ? -1 : 1;
}
