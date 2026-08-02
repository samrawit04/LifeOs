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
  CalendarOff,
  Pencil,
} from "lucide-react";
import { useCreateItem, useDeleteItem, useFolders, useItems, useUpdateItem } from "@/hooks/use-lifeos";
import { PRIORITIES, type Item, type ItemUpdate } from "@/lib/lifeos-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetColumn, setTargetColumn] = useState<ColumnId>("backlog");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Task Edit State
  const [editingTask, setEditingTask] = useState<Item | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editPriority, setEditPriority] = useState<string>("medium");
  const [editFolderId, setEditFolderId] = useState<string>("none");

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<ColumnId | null>(null);

  const tasks = useMemo(() => items.filter((i) => i.type === "task" && !i.archived), [items]);

  const backlogTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.completed && (!t.due_date || !isToday(new Date(t.due_date))))
        .sort(sortByDue),
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

  const openModal = (col: ColumnId = "backlog") => {
    setTargetColumn(col);
    setTitle("");
    setDue(col === "today" ? format(new Date(), "yyyy-MM-dd") : "");
    setPriority("medium");
    setFolderId("none");
    setIsModalOpen(true);
  };

  const openEditModal = (task: Item) => {
    setEditingTask(task);
    setEditTitle(task.title || "");
    setEditContent(task.content || "");
    setEditDue(task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : "");
    setEditPriority(task.priority || "medium");
    setEditFolderId(task.folder_id || "none");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let targetDue: string | null = due ? new Date(due).toISOString() : null;
    if (targetColumn === "today" && !due) {
      targetDue = new Date().toISOString();
    }

    create.mutate(
      {
        type: "task",
        title: title.trim(),
        priority,
        due_date: targetDue,
        folder_id: folderId !== "none" ? folderId : null,
        completed: false,
      },
      {
        onSuccess: () => {
          toast.success("Task created");
        },
      }
    );

    setTitle("");
    setDue("");
    setFolderId("none");
    setIsModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    const patch: ItemUpdate = {
      title: editTitle.trim(),
      content: editContent.trim() || null,
      priority: editPriority,
      due_date: editDue ? new Date(editDue).toISOString() : null,
      folder_id: editFolderId !== "none" ? editFolderId : null,
    };

    update.mutate(
      { id: editingTask.id, patch },
      {
        onSuccess: () => {
          toast.success("Task updated");
          setEditingTask(null);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update task");
        },
      }
    );
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
        patch: { completed: false, due_date: null },
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-48px)] lg:h-dvh overflow-hidden">
      {/* Sticky header — never scrolls */}
      <header className="shrink-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 pt-4 pb-4 sm:pt-6 sm:pb-5 border-b border-border/40">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-lagoon">
            Task Board
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            Organize, prioritize, and track your progress in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            onClick={() => openModal("backlog")}
            className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> New Task
          </Button>

          <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-soft">
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
        </div>
      </header>

      {/* Scrollable task area only */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">

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
              onDelete={(t) => setConfirmDeleteId(t.id)}
              onArchive={(t) => update.mutate({ id: t.id, patch: { archived: true } })}
              onEdit={openEditModal}
              onMoveToToday={(t) => update.mutate({ id: t.id, patch: { completed: false, due_date: new Date().toISOString() } })}
              onAddTask={() => openModal("backlog")}
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
              onDelete={(t) => setConfirmDeleteId(t.id)}
              onArchive={(t) => update.mutate({ id: t.id, patch: { archived: true } })}
              onEdit={openEditModal}
              onMoveToBacklog={(t) => update.mutate({ id: t.id, patch: { completed: false, due_date: null } })}
              onAddTask={() => openModal("today")}
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
              onDelete={(t) => setConfirmDeleteId(t.id)}
              onArchive={(t) => update.mutate({ id: t.id, patch: { archived: true } })}
              onEdit={openEditModal}
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
                      onDelete={() => setConfirmDeleteId(t.id)}
                      onArchive={() => update.mutate({ id: t.id, patch: { archived: true } })}
                      onEdit={() => openEditModal(t)}
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
                      onDelete={() => setConfirmDeleteId(t.id)}
                      onArchive={() => update.mutate({ id: t.id, patch: { archived: true } })}
                      onEdit={() => openEditModal(t)}
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
                      onDelete={() => setConfirmDeleteId(t.id)}
                      onArchive={() => update.mutate({ id: t.id, patch: { archived: true } })}
                      onEdit={() => openEditModal(t)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="border border-border bg-card text-card-foreground shadow-2xl rounded-2xl sm:max-w-md p-6">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-foreground">
                {targetColumn === "today" ? "Add Task to Today's Focus" : "Add New Task"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="task-title" className="text-xs font-semibold text-foreground">Task Title</Label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs doing? (e.g. Finish project roadmap)"
                  autoFocus
                  className="border-input bg-background text-foreground placeholder:text-muted-foreground/70 text-sm h-10 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="task-due" className="text-xs font-semibold text-foreground">Due Date</Label>
                  <Input
                    id="task-due"
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                    className="border-input bg-background text-foreground text-xs h-9 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-priority" className="text-xs font-semibold text-foreground">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="task-priority" className="border-input bg-background text-foreground text-xs h-9 rounded-xl">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border">
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {folders.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="task-folder" className="text-xs font-semibold text-foreground">Folder / Project</Label>
                  <Select value={folderId} onValueChange={setFolderId}>
                    <SelectTrigger id="task-folder" className="border-input bg-background text-foreground text-xs h-9 rounded-xl">
                      <SelectValue placeholder="No Folder" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border">
                      <SelectItem value="none">No Folder</SelectItem>
                      {folders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground text-xs rounded-xl h-9">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={create.isPending || !title.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-xl h-9 px-4 shadow-sm">
                {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editingTask !== null} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="border border-border bg-card text-card-foreground shadow-2xl rounded-2xl sm:max-w-md p-6">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" /> Edit Task
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-task-title" className="text-xs font-semibold text-foreground">Task Title</Label>
                <Input
                  id="edit-task-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Task title"
                  className="border-input bg-background text-foreground text-sm h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-task-content" className="text-xs font-semibold text-foreground">Description / Notes</Label>
                <Textarea
                  id="edit-task-content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Add details, sub-notes, or links (optional)..."
                  className="border-input bg-background text-foreground text-xs rounded-xl min-h-[70px] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-task-due" className="text-xs font-semibold text-foreground">Due Date</Label>
                  <Input
                    id="edit-task-due"
                    type="date"
                    value={editDue}
                    onChange={(e) => setEditDue(e.target.value)}
                    className="border-input bg-background text-foreground text-xs h-9 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-task-priority" className="text-xs font-semibold text-foreground">Priority</Label>
                  <Select value={editPriority} onValueChange={setEditPriority}>
                    <SelectTrigger id="edit-task-priority" className="border-input bg-background text-foreground text-xs h-9 rounded-xl">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border">
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {folders.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="edit-task-folder" className="text-xs font-semibold text-foreground">Folder / Project</Label>
                  <Select value={editFolderId} onValueChange={setEditFolderId}>
                    <SelectTrigger id="edit-task-folder" className="border-input bg-background text-foreground text-xs h-9 rounded-xl">
                      <SelectValue placeholder="No Folder" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border">
                      <SelectItem value="none">No Folder</SelectItem>
                      {folders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingTask(null)} className="border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground text-xs rounded-xl h-9">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={update.isPending || !editTitle.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-xl h-9 px-4 shadow-sm">
                {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={confirmDeleteId !== null}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
        title="Delete this task?"
        description="This task will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete Task"
        onConfirm={() => {
          if (confirmDeleteId) {
            del.mutate(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
      />
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
  onEdit: (task: Item) => void;
  onMoveToToday?: (task: Item) => void;
  onMoveToBacklog?: (task: Item) => void;
  onAddTask?: () => void;
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
  onEdit,
  onMoveToToday,
  onMoveToBacklog,
  onAddTask,
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
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            {tasks.length}
          </span>
          {onAddTask && (
            <button
              onClick={onAddTask}
              className="grid h-6 w-6 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm"
              title={`Add task to ${title}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
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
              onEdit={() => onEdit(task)}
              onMoveToToday={onMoveToToday ? () => onMoveToToday(task) : undefined}
              onMoveToBacklog={onMoveToBacklog ? () => onMoveToBacklog(task) : undefined}
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
  onEdit: () => void;
  onMoveToToday?: () => void;
  onMoveToBacklog?: () => void;
}

function TaskCard({
  task,
  folders,
  isDragging,
  onDragStart,
  onToggle,
  onDelete,
  onArchive,
  onEdit,
  onMoveToToday,
  onMoveToBacklog,
}: TaskCardProps) {
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
        "group relative flex items-start gap-2 rounded-xl border bg-card p-2.5 sm:p-3 shadow-soft transition hover:shadow-md cursor-grab active:cursor-grabbing select-none",
        task.completed && "opacity-60 bg-muted/30",
        isDragging && "opacity-40 border-dashed border-primary"
      )}
    >
      <div className="mt-0.5 text-muted-foreground/40 group-hover:text-muted-foreground transition">
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      <Checkbox checked={task.completed} onCheckedChange={onToggle} className="mt-0.5 h-3.5 w-3.5" />

      <div className="min-w-0 flex-1 cursor-pointer" onClick={onEdit}>
        <p className={cn("text-xs sm:text-[13px] font-medium text-foreground leading-snug hover:text-primary transition", task.completed && "line-through text-muted-foreground")}>
          {task.title}
        </p>

        {task.content && (
          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {task.content}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
          {task.priority && (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 font-semibold uppercase tracking-wider text-[9px]",
                task.priority === "high" && "bg-destructive/15 text-destructive",
                task.priority === "medium" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                task.priority === "low" && "bg-muted text-muted-foreground"
              )}
            >
              {task.priority}
            </span>
          )}

          {folder && (
            <span className="flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-secondary-foreground text-[9px]">
              <FolderIcon className="h-2.5 w-2.5" /> {folder.name}
            </span>
          )}

          {task.due_date && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px]",
                overdue
                  ? "bg-destructive/15 text-destructive font-medium"
                  : isToday(new Date(task.due_date))
                  ? "bg-primary/15 text-primary font-medium"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Calendar className="h-2.5 w-2.5" />
              {isToday(new Date(task.due_date)) ? "Today" : format(new Date(task.due_date), "MMM d")}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100 shrink-0 gap-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
          title="Edit Task"
        >
          <Pencil className="h-3 w-3" />
        </button>
        {onMoveToToday && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveToToday(); }}
            className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
            title="Move to Today's Focus"
          >
            <CalendarDays className="h-3 w-3" />
          </button>
        )}
        {onMoveToBacklog && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveToBacklog(); }}
            className="rounded p-1 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition"
            title="Move back to All Tasks"
          >
            <CalendarOff className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={onArchive}
          className="rounded p-1 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          title="Archive"
        >
          <ArchiveIcon className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
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
