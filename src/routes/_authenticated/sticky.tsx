import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Pin, Trash2, Plus } from "lucide-react";
import { useCreateItem, useDeleteItem, useItems, useUpdateItem } from "@/hooks/use-lifeos";
import { NOTE_COLORS, noteColor, noteGradient, type Item } from "@/lib/lifeos-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/sticky")({
  component: StickyBoard,
});

const DEFAULT_W = 240;
const DEFAULT_H = 220;

function StickyBoard() {
  const { data: items = [] } = useItems();
  const create = useCreateItem();
  const update = useUpdateItem();
  const del = useDeleteItem();
  const boardRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef<number>(0);

  const notes = items.filter((i) => i.type === "sticky" && !i.archived);

  const spawnNote = (x: number, y: number) => {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const palette = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
    create.mutate(
      {
        type: "sticky",
        content: "",
        color: palette.value,
        pos_x: Math.max(10, x - rect.left - DEFAULT_W / 2 + board.scrollLeft),
        pos_y: Math.max(10, y - rect.top - 30 + board.scrollTop),
        width: DEFAULT_W,
        height: DEFAULT_H,
      },
      { onError: (err) => toast.error(err.message) },
    );
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-sticky-note]")) return;
    spawnNote(e.clientX, e.clientY);
  };

  // Mobile double-tap touch handler
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-sticky-note]")) return;
    const now = Date.now();
    if (now - lastTouchRef.current < 300) {
      const touch = e.changedTouches[0];
      if (touch) {
        spawnNote(touch.clientX, touch.clientY);
      }
    }
    lastTouchRef.current = now;
  };

  const handleAddCenter = () => {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    spawnNote(rect.left + rect.width / 2, rect.top + rect.height / 3);
  };

  return (
    <div className="relative flex h-[calc(100vh-56px)] flex-col p-3 sm:p-6 lg:h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/60 px-4 sm:px-6 py-3.5 backdrop-blur rounded-2xl mb-3">
        <div>
          <h1 className="font-display text-xl sm:text-3xl text-gradient-primary">Sticky Board</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            Double-click or tap anywhere on the board to drop a note.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">{notes.length} notes</span>
          <Button
            onClick={handleAddCenter}
            size="sm"
            className="h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Note
          </Button>
        </div>
      </header>

      <div
        ref={boardRef}
        onDoubleClick={onDoubleClick}
        onTouchEnd={onTouchEnd}
        className="relative flex-1 overflow-auto bg-corkboard rounded-2xl"
        style={{ minHeight: 550 }}
      >
        <div className="relative h-[1800px] w-[1800px]">
          {notes.map((n) => (
            <Note
              key={n.id}
              note={n}
              onChange={(patch) => update.mutate({ id: n.id, patch })}
              onDelete={() => del.mutate(n.id)}
            />
          ))}
          {notes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-4 text-center text-sm text-muted-foreground backdrop-blur">
                Double-tap anywhere to drop your first note
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Note({
  note, onChange, onDelete,
}: { note: Item; onChange: (patch: Partial<Item>) => void; onDelete: () => void }) {
  const [pos, setPos] = useState({ x: note.pos_x ?? 60, y: note.pos_y ?? 60 });
  const [size, setSize] = useState({ w: note.width ?? DEFAULT_W, h: note.height ?? DEFAULT_H });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const startRef = useRef<{ mx: number; my: number; px: number; py: number; w: number; h: number }>({ mx: 0, my: 0, px: 0, py: 0, w: 0, h: 0 });

  useEffect(() => {
    setPos({ x: note.pos_x ?? 60, y: note.pos_y ?? 60 });
    setSize({ w: note.width ?? DEFAULT_W, h: note.height ?? DEFAULT_H });
  }, [note.pos_x, note.pos_y, note.width, note.height]);

  useEffect(() => {
    if (!dragging && !resizing) return;
    const onMove = (e: MouseEvent) => {
      const s = startRef.current;
      if (dragging) {
        setPos({ x: s.px + (e.clientX - s.mx), y: s.py + (e.clientY - s.my) });
      } else {
        setSize({ w: Math.max(180, s.w + (e.clientX - s.mx)), h: Math.max(160, s.h + (e.clientY - s.my)) });
      }
    };
    const onUp = () => {
      if (dragging) onChange({ pos_x: pos.x, pos_y: pos.y });
      if (resizing) onChange({ width: size.w, height: size.h });
      setDragging(false);
      setResizing(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, resizing, pos, size, onChange]);

  const startDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    startRef.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y, w: size.w, h: size.h };
    setDragging(true);
  };
  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    startRef.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y, w: size.w, h: size.h };
    setResizing(true);
  };

  const active = noteColor(note.color);

  return (
    <div
      data-sticky-note
      onDoubleClick={(e) => e.stopPropagation()}
      className={cn(
        "group absolute overflow-hidden rounded-2xl shadow-note ring-1 ring-black/10 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-15px_oklch(0_0_0/0.7)]",
        dragging && "cursor-grabbing !shadow-2xl scale-[1.02] rotate-[-0.5deg]",
      )}
      style={{
        left: pos.x, top: pos.y, width: size.w, height: size.h,
        background: noteGradient(note.color),
      }}
    >
      {/* soft top sheen */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-10"
        style={{ background: "linear-gradient(180deg, oklch(1 0 0 / 0.25), transparent)" }}
      />
      {/* pin */}
      {note.pinned && (
        <div className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2">
          <div className="h-3 w-3 rounded-full bg-gradient-to-b from-rose-400 to-rose-700 shadow-[0_2px_4px_oklch(0_0_0/0.4)]" />
        </div>
      )}

      <div
        onMouseDown={startDrag}
        className="relative flex h-8 cursor-grab items-center justify-between px-2.5 text-black/70"
      >
        <div className="flex items-center gap-1">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={(e) => { e.stopPropagation(); onChange({ color: c.value }); }}
              className={cn(
                "h-2.5 w-2.5 rounded-full border border-black/20 transition-transform hover:scale-125",
                note.color === c.value && "ring-2 ring-black/40 ring-offset-1 ring-offset-transparent scale-110",
              )}
              style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
              title={`${c.name} — ${c.meaning}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onChange({ pinned: !note.pinned }); }}
            className={cn(
              "rounded-md p-1 transition hover:bg-black/10",
              note.pinned && "text-rose-700",
            )}
            title="Pin"
          >
            <Pin className="h-3.5 w-3.5" fill={note.pinned ? "currentColor" : "none"} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded-md p-1 transition hover:bg-black/10 hover:text-rose-700"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <textarea
        defaultValue={note.content ?? ""}
        onBlur={(e) => {
          if (e.target.value !== note.content) onChange({ content: e.target.value });
        }}
        placeholder="Type your note…"
        className="relative h-[calc(100%-32px)] w-full resize-none bg-transparent px-4 pb-4 pt-1 font-display text-[15px] leading-relaxed text-black/85 placeholder:font-sans placeholder:text-black/40 focus:outline-none"
      />

      {/* accent corner */}
      <div
        className="pointer-events-none absolute -bottom-6 -right-6 h-20 w-20 rounded-full opacity-40 blur-2xl"
        style={{ background: active.to }}
      />

      <div
        onMouseDown={startResize}
        className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
        style={{
          background: "linear-gradient(135deg, transparent 50%, oklch(0 0 0 / 0.25) 50%)",
          borderBottomRightRadius: 16,
        }}
      />
    </div>
  );
}
