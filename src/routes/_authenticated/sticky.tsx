import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Pin, Trash2, X } from "lucide-react";
import { useCreateItem, useDeleteItem, useItems, useUpdateItem } from "@/hooks/use-lifeos";
import { NOTE_COLORS, noteColorCss, type Item } from "@/lib/lifeos-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sticky")({
  component: StickyBoard,
});

const DEFAULT_W = 220;
const DEFAULT_H = 200;

function StickyBoard() {
  const { data: items = [] } = useItems();
  const create = useCreateItem();
  const update = useUpdateItem();
  const del = useDeleteItem();
  const boardRef = useRef<HTMLDivElement>(null);

  const notes = items.filter((i) => i.type === "sticky" && !i.archived);

  const onDoubleClick = (e: React.MouseEvent) => {
    if (e.target !== boardRef.current) return;
    const rect = boardRef.current!.getBoundingClientRect();
    create.mutate(
      {
        type: "sticky",
        content: "",
        color: NOTE_COLORS[0].value,
        pos_x: e.clientX - rect.left - DEFAULT_W / 2,
        pos_y: e.clientY - rect.top - 30 + boardRef.current!.scrollTop,
        width: DEFAULT_W,
        height: DEFAULT_H,
      },
      { onError: (err) => toast.error(err.message) },
    );
  };

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col lg:h-screen">
      <header className="flex items-center justify-between border-b border-border/60 bg-background/60 px-6 py-4 backdrop-blur">
        <div>
          <h1 className="font-display text-2xl text-lagoon">Sticky board</h1>
          <p className="text-sm text-muted-foreground">
            Double-click anywhere on the board to drop a new note. Drag by the header.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">{notes.length} notes</div>
      </header>

      <div
        ref={boardRef}
        onDoubleClick={onDoubleClick}
        className="relative flex-1 overflow-auto bg-corkboard"
        style={{ minHeight: 600 }}
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
        setSize({ w: Math.max(160, s.w + (e.clientX - s.mx)), h: Math.max(140, s.h + (e.clientY - s.my)) });
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

  return (
    <div
      onDoubleClick={(e) => e.stopPropagation()}
      className={cn(
        "group absolute rounded-xl shadow-note transition-shadow",
        dragging && "cursor-grabbing shadow-2xl",
      )}
      style={{
        left: pos.x, top: pos.y, width: size.w, height: size.h,
        background: noteColorCss(note.color),
      }}
    >
      <div
        onMouseDown={startDrag}
        className="flex h-7 cursor-grab items-center justify-between rounded-t-xl px-2 text-clay/80"
      >
        <div className="flex gap-1">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={(e) => { e.stopPropagation(); onChange({ color: c.value }); }}
              className={cn(
                "h-3 w-3 rounded-full border border-clay/30 transition-transform",
                note.color === c.value && "scale-125 ring-1 ring-lagoon",
              )}
              style={{ background: c.css }}
              title={c.meaning}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onChange({ pinned: !note.pinned }); }}
            className={cn("rounded p-1 hover:bg-black/5", note.pinned && "text-lagoon")}
            title="Pin"
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded p-1 hover:bg-black/5" title="Delete">
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
        className="h-[calc(100%-28px)] w-full resize-none rounded-b-xl bg-transparent px-3 pb-3 pt-1 text-sm text-lagoon placeholder:text-clay/60 focus:outline-none"
      />
      <div
        onMouseDown={startResize}
        className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
        style={{
          background:
            "linear-gradient(135deg, transparent 50%, oklch(0.4 0.05 60 / 0.35) 50%)",
          borderBottomRightRadius: 12,
        }}
      />
    </div>
  );
}

export { X };
