import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArchiveIcon, RotateCcw, Trash2, Search } from "lucide-react";
import { useDeleteItem, useItems, useUpdateItem } from "@/hooks/use-lifeos";
import type { Item } from "@/lib/lifeos-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/archive")({
  component: Archive,
});

function Archive() {
  const { data: items = [] } = useItems();
  const update = useUpdateItem();
  const del = useDeleteItem();
  const [q, setQ] = useState("");
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const archived = useMemo(
    () => items.filter((i) => i.archived && matches(i, q)),
    [items, q],
  );

  const handleDelete = () => {
    if (deleteItemId) {
      del.mutate(deleteItemId);
      setDeleteItemId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 font-display text-3xl text-lagoon">
          <ArchiveIcon className="h-6 w-6 text-blossom" /> Archive
        </h1>
        <p className="text-sm text-muted-foreground">Restore or permanently delete old items.</p>
      </header>
      <div className="mb-6 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search archived items…" className="pl-9" />
      </div>

      {archived.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
          Nothing archived. When you archive an item it appears here.
        </div>
      ) : (
        <ul className="space-y-2">
          {archived.map((i) => (
            <li key={i.id} className="flex items-start gap-3 rounded-xl border bg-card p-3 shadow-soft">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-clay">{typeLabel(i.type)}</p>
                <p className="mt-0.5 truncate font-medium text-lagoon">{i.title || (i.content ?? "").slice(0, 80) || "Untitled"}</p>
                <p className="text-xs text-muted-foreground">Archived · updated {format(new Date(i.updated_at), "MMM d, yyyy")}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => update.mutate({ id: i.id, patch: { archived: false } })}>
                <RotateCcw className="h-4 w-4" /> Restore
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteItemId(i.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={deleteItemId !== null} onOpenChange={(open) => !open && setDeleteItemId(null)}>
        <AlertDialogContent className="border-white/10 bg-[#1e1a1d] text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-lagoon">Delete forever?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This item will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/10 hover:text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/95">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function typeLabel(t: Item["type"]) {
  return t === "sticky" ? "Sticky note" : t === "notebook_page" ? "Notebook page" : t === "task" ? "Task" : "Event";
}
function matches(i: Item, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [(i.title ?? ""), (i.content ?? ""), ...(i.tags ?? [])].join(" ").toLowerCase().includes(needle);
}
