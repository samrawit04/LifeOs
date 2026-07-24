import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths, subWeeks,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useCreateItem, useDeleteItem, useFolders, useItems, useUpdateItem } from "@/hooks/use-lifeos";
import type { Item } from "@/lib/lifeos-types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

type View = "month" | "week" | "day";

function CalendarPage() {
  const { data: items = [] } = useItems();
  const { data: folders = [] } = useFolders();
  const create = useCreateItem();
  const update = useUpdateItem();
  const del = useDeleteItem();

  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);

  const events = useMemo(() =>
    items.filter((i) => !i.archived && ((i.type === "event" && i.event_date) || (i.type === "task" && i.due_date))),
  [items]);

  const eventsForDay = (d: Date) =>
    events.filter((e) => {
      const dt = e.type === "event" ? e.event_date! : e.due_date!;
      return isSameDay(new Date(dt), d);
    });

  const folderColor = (id: string | null) => folders.find((f) => f.id === id)?.color ?? "#3B4A6B";

  const openNew = (d: Date) => setSelectedDate(d);
  const shift = (dir: 1 | -1) => {
    if (view === "month") setCursor((c) => (dir > 0 ? addMonths(c, 1) : subMonths(c, 1)));
    if (view === "week") setCursor((c) => (dir > 0 ? addWeeks(c, 1) : subWeeks(c, 1)));
    if (view === "day") setCursor((c) => addDays(c, dir));
  };

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-8">
      <header className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl sm:text-3xl text-lagoon">
            <CalendarDays className="h-5.5 w-5.5 sm:h-6 sm:w-6 text-primary" /> Calendar
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {view === "month" && format(cursor, "MMMM yyyy")}
            {view === "week" && `Week of ${format(startOfWeek(cursor), "MMM d")}`}
            {view === "day" && format(cursor, "EEEE, MMMM d")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <Tabs value={view} onValueChange={(v) => setView(v as View)} className="w-full md:w-auto">
            <TabsList className="w-full md:w-auto grid grid-cols-3 h-8 p-0.5">
              <TabsTrigger value="month" className="text-xs py-1 h-7">Month</TabsTrigger>
              <TabsTrigger value="week" className="text-xs py-1 h-7">Week</TabsTrigger>
              <TabsTrigger value="day" className="text-xs py-1 h-7">Day</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1 w-full md:w-auto justify-between md:justify-start mt-1 md:mt-0">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 px-0" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" className="h-8 text-xs px-2.5" onClick={() => setCursor(new Date())}>Today</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 px-0" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button size="sm" className="bg-lagoon text-cream hover:bg-lagoon/90 h-8 text-xs font-semibold px-3" onClick={() => openNew(new Date())}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Event
            </Button>
          </div>
        </div>
      </header>

      {view === "month" && (
        <MonthGrid cursor={cursor} eventsForDay={eventsForDay} folderColor={folderColor} onDayClick={openNew} onEventClick={setEditing} />
      )}
      {view === "week" && (
        <WeekList cursor={cursor} eventsForDay={eventsForDay} folderColor={folderColor} onDayClick={openNew} onEventClick={setEditing} />
      )}
      {view === "day" && (
        <DayList day={cursor} eventsForDay={eventsForDay} folderColor={folderColor} onEventClick={setEditing} onAdd={() => openNew(cursor)} />
      )}

      <EventDialog
        open={!!selectedDate || !!editing}
        onClose={() => { setSelectedDate(null); setEditing(null); }}
        date={selectedDate}
        existing={editing}
        folders={folders}
        onCreate={(payload) => create.mutate(payload)}
        onUpdate={(id, patch) => update.mutate({ id, patch })}
        onDelete={(id) => del.mutate(id)}
      />
    </div>
  );
}

function MonthGrid({
  cursor, eventsForDay, folderColor, onDayClick, onEventClick,
}: { cursor: Date; eventsForDay: (d: Date) => Item[]; folderColor: (id: string | null) => string; onDayClick: (d: Date) => void; onEventClick: (i: Item) => void }) {
  const start = startOfWeek(startOfMonth(cursor));
  const end = endOfWeek(endOfMonth(cursor));
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-clay">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-1.5 sm:px-3 py-2 text-center">
            <span className="block sm:hidden">{d.charAt(0)}</span>
            <span className="hidden sm:block">{d}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const inMonth = isSameMonth(d, cursor);
          const evs = eventsForDay(d);
          const today = isSameDay(d, new Date());
          return (
            <button
              key={d.toISOString()}
              onClick={() => onDayClick(d)}
              className={cn(
                "min-h-[64px] sm:min-h-[110px] border-b border-r p-1 sm:p-2 text-left transition hover:bg-accent/20",
                !inMonth && "bg-muted/20 text-muted-foreground",
              )}
            >
              <div className={cn("mb-1 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[10px] sm:text-xs font-semibold",
                today ? "bg-lagoon text-cream" : "text-lagoon/80")}>
                {format(d, "d")}
              </div>

              {/* Desktop view: full tags */}
              <div className="hidden sm:block space-y-1">
                {evs.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                    className="truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium text-lagoon"
                    style={{ background: (e.color ?? folderColor(e.folder_id)) + "33" }}
                  >
                    {e.type === "task" ? "☑ " : ""}{e.title || "Untitled"}
                  </div>
                ))}
                {evs.length > 3 && <div className="text-[10px] text-muted-foreground">+{evs.length - 3} more</div>}
              </div>

              {/* Mobile view: compact dot indicators */}
              <div className="flex sm:hidden flex-wrap items-center justify-center gap-0.5 max-w-full overflow-hidden mt-0.5">
                {evs.slice(0, 4).map((e) => (
                  <span
                    key={e.id}
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: e.color ?? folderColor(e.folder_id) }}
                    title={e.title ?? undefined}
                  />
                ))}
                {evs.length > 4 && (
                  <span className="text-[8px] font-bold text-muted-foreground">+</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekList({ cursor, eventsForDay, folderColor, onDayClick, onEventClick }: any) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid gap-3 sm:grid-cols-7">
      {days.map((d) => (
        <div key={d.toISOString()} className="min-h-[220px] rounded-2xl border bg-card p-3 shadow-soft">
          <button onClick={() => onDayClick(d)} className="w-full text-left">
            <p className="text-xs uppercase tracking-wider text-clay">{format(d, "EEE")}</p>
            <p className={cn("font-display text-xl", isSameDay(d, new Date()) ? "text-lagoon" : "text-lagoon/70")}>{format(d, "d")}</p>
          </button>
          <div className="mt-3 space-y-1.5">
            {eventsForDay(d).map((e: Item) => (
              <button key={e.id} onClick={() => onEventClick(e)} className="block w-full rounded-md px-2 py-1 text-left text-xs font-medium text-lagoon" style={{ background: (e.color ?? folderColor(e.folder_id)) + "33" }}>
                {e.title || "Untitled"}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DayList({ day, eventsForDay, folderColor, onEventClick, onAdd }: any) {
  const evs = eventsForDay(day);
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-lagoon">{format(day, "EEEE")}</h2>
        <Button onClick={onAdd} size="sm" variant="outline"><Plus className="h-4 w-4" /> Add</Button>
      </div>
      {evs.length === 0 ? (
        <p className="mt-6 rounded-xl bg-muted/50 py-8 text-center text-sm text-muted-foreground">No events on this day.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {evs.map((e: Item) => (
            <li key={e.id} onClick={() => onEventClick(e)} className="cursor-pointer rounded-xl border bg-background p-3 hover:bg-accent/20">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: e.color ?? folderColor(e.folder_id) }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-lagoon">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(e.type === "event" ? e.event_date! : e.due_date!), "p")}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EventDialog({
  open, onClose, date, existing, folders, onCreate, onUpdate, onDelete,
}: {
  open: boolean; onClose: () => void; date: Date | null; existing: Item | null;
  folders: any[];
  onCreate: (p: any) => void; onUpdate: (id: string, p: any) => void; onDelete: (id: string) => void;
}) {
  const initialDate = existing?.event_date ?? existing?.due_date ?? date?.toISOString() ?? new Date().toISOString();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [content, setContent] = useState(existing?.content ?? "");
  const [when, setWhen] = useState(toLocal(initialDate));
  const [folderId, setFolderId] = useState<string>(existing?.folder_id ?? "none");
  const [color, setColor] = useState(existing?.color ?? "#E48CA5");

  // reset when opened for a different item
  useMemo(() => {
    setTitle(existing?.title ?? "");
    setContent(existing?.content ?? "");
    setWhen(toLocal(existing?.event_date ?? existing?.due_date ?? date?.toISOString() ?? new Date().toISOString()));
    setFolderId(existing?.folder_id ?? "none");
    setColor(existing?.color ?? "#E48CA5");
  }, [existing?.id, date?.toISOString()]);

  const save = () => {
    const iso = new Date(when).toISOString();
    if (existing) {
      const patch: any = { title, content, color, folder_id: folderId === "none" ? null : folderId };
      if (existing.type === "event") patch.event_date = iso; else patch.due_date = iso;
      onUpdate(existing.id, patch);
    } else {
      onCreate({ type: "event", title, content, color, event_date: iso, folder_id: folderId === "none" ? null : folderId });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit" : "New event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          <Textarea placeholder="Notes…" value={content ?? ""} onChange={(e) => setContent(e.target.value)} />
          <div className="flex gap-2">
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 p-1" />
          </div>
          <div className="flex justify-between pt-2">
            {existing ? (
              <Button variant="outline" onClick={() => { onDelete(existing.id); onClose(); }} className="text-destructive">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={save} className="bg-lagoon text-cream hover:bg-lagoon/90">Save</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function toLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
