import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Folder as FolderIcon, FolderPlus, ChevronRight, Plus, Trash2, Pencil, ArchiveIcon, FileText } from "lucide-react";
import { useCreateFolder, useCreateItem, useDeleteFolder, useDeleteItem, useFolders, useItems, useUpdateFolder, useUpdateItem } from "@/hooks/use-lifeos";
import type { Folder, Item } from "@/lib/lifeos-types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notebooks")({
  component: Notebooks,
});

function Notebooks() {
  const { data: folders = [] } = useFolders();
  const { data: items = [] } = useItems();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<Item | null>(null);
  const [newName, setNewName] = useState("");

  const tree = useMemo(() => buildTree(folders), [folders]);
  const pages = useMemo(
    () => items.filter((i) => i.type === "notebook_page" && !i.archived && i.folder_id === selectedFolderId),
    [items, selectedFolderId],
  );

  const addRoot = () => {
    if (!newName.trim()) return;
    createFolder.mutate({ name: newName.trim(), parent_folder_id: null }, { onError: (e) => toast.error(e.message) });
    setNewName("");
  };

  const addPage = () => {
    if (!selectedFolderId) return toast.error("Choose a notebook first");
    createItem.mutate(
      { type: "notebook_page", title: "Untitled", content: "", folder_id: selectedFolderId },
      { onSuccess: (i) => setSelectedPage(i) },
    );
  };

  return (
    <div className="flex h-[calc(100vh-56px)] lg:h-screen">
      <aside className="w-72 shrink-0 border-r bg-sidebar/70 p-4">
        <div className="mb-4 flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New notebook…" onKeyDown={(e) => e.key === "Enter" && addRoot()} />
          <Button size="icon" onClick={addRoot} className="bg-lagoon text-cream hover:bg-lagoon/90"><FolderPlus className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-0.5">
          {tree.length === 0 && (
            <p className="rounded-lg bg-muted/50 px-3 py-4 text-center text-xs text-muted-foreground">
              No notebooks yet.
            </p>
          )}
          {tree.map((n) => (
            <FolderNode
              key={n.id}
              node={n}
              level={0}
              selectedId={selectedFolderId}
              onSelect={setSelectedFolderId}
              onAddChild={(parentId) => {
                const name = prompt("New notebook name");
                if (name) createFolder.mutate({ name, parent_folder_id: parentId });
              }}
              onRename={(id, name) => updateFolder.mutate({ id, patch: { name } })}
              onDelete={(id) => { if (confirm("Delete this notebook and all its pages?")) deleteFolder.mutate(id); }}
            />
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h1 className="font-display text-2xl text-lagoon">
              {selectedFolderId ? folders.find((f) => f.id === selectedFolderId)?.name : "Notebooks"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedFolderId ? `${pages.length} page${pages.length === 1 ? "" : "s"}` : "Choose a notebook to see pages"}
            </p>
          </div>
          {selectedFolderId && (
            <Button onClick={addPage} className="bg-lagoon text-cream hover:bg-lagoon/90"><Plus className="h-4 w-4" /> New page</Button>
          )}
        </header>

        {selectedPage ? (
          <PageEditor
            key={selectedPage.id}
            page={selectedPage}
            onClose={() => setSelectedPage(null)}
            onChange={(patch) => updateItem.mutate({ id: selectedPage.id, patch })}
            onArchive={() => { updateItem.mutate({ id: selectedPage.id, patch: { archived: true } }); setSelectedPage(null); }}
            onDelete={() => { deleteItem.mutate(selectedPage.id); setSelectedPage(null); }}
          />
        ) : selectedFolderId ? (
          <div className="grid flex-1 grid-cols-1 gap-3 overflow-auto p-6 sm:grid-cols-2 lg:grid-cols-3">
            {pages.length === 0 ? (
              <div className="col-span-full rounded-2xl border bg-card p-10 text-center text-muted-foreground">
                No pages here yet. Start writing.
              </div>
            ) : (
              pages.map((p) => (
                <button key={p.id} onClick={() => setSelectedPage(p)} className="rounded-2xl border bg-card p-4 text-left shadow-soft transition hover:shadow-note">
                  <div className="flex items-center gap-2 text-clay"><FileText className="h-4 w-4" /><span className="text-xs uppercase tracking-wider">Page</span></div>
                  <h3 className="mt-2 truncate font-display text-lg text-lagoon">{p.title || "Untitled"}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{p.content}</p>
                  <p className="mt-3 text-xs text-muted-foreground">Edited {format(new Date(p.updated_at), "MMM d")}</p>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-10 text-center">
            <div className="max-w-sm">
              <FolderIcon className="mx-auto h-10 w-10 text-blossom" />
              <h2 className="mt-3 font-display text-xl text-lagoon">Pick a notebook</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create nested notebooks in the sidebar to keep long-form thoughts organized.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

type Node = Folder & { children: Node[] };
function buildTree(folders: Folder[]): Node[] {
  const map = new Map<string, Node>();
  folders.forEach((f) => map.set(f.id, { ...f, children: [] }));
  const roots: Node[] = [];
  map.forEach((n) => {
    if (n.parent_folder_id && map.has(n.parent_folder_id)) {
      map.get(n.parent_folder_id)!.children.push(n);
    } else {
      roots.push(n);
    }
  });
  return roots;
}

function FolderNode({
  node, level, selectedId, onSelect, onAddChild, onRename, onDelete,
}: {
  node: Node; level: number; selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const active = selectedId === node.id;
  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-lg pr-1 text-sm",
          active && "bg-lagoon/10",
        )}
        style={{ paddingLeft: level * 12 + 4 }}
      >
        <button onClick={() => setOpen(!open)} className="p-1 text-muted-foreground">
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
        </button>
        <button
          onClick={() => onSelect(node.id)}
          className={cn("flex flex-1 items-center gap-2 rounded-md px-1 py-1 text-left", active ? "font-semibold text-lagoon" : "text-sidebar-foreground hover:text-lagoon")}
        >
          <FolderIcon className="h-3.5 w-3.5" style={{ color: node.color }} />
          <span className="truncate">{node.name}</span>
        </button>
        <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => onAddChild(node.id)} className="rounded p-1 text-muted-foreground hover:bg-accent/40" title="Add sub-notebook"><FolderPlus className="h-3.5 w-3.5" /></button>
          <button onClick={() => { const n = prompt("Rename", node.name); if (n) onRename(node.id, n); }} className="rounded p-1 text-muted-foreground hover:bg-accent/40" title="Rename"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDelete(node.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {open && node.children.length > 0 && (
        <div>
          {node.children.map((c) => (
            <FolderNode key={c.id} node={c} level={level + 1} selectedId={selectedId} onSelect={onSelect} onAddChild={onAddChild} onRename={onRename} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function PageEditor({
  page, onClose, onChange, onArchive, onDelete,
}: {
  page: Item; onClose: () => void; onChange: (p: Partial<Item>) => void; onArchive: () => void; onDelete: () => void;
}) {
  const [title, setTitle] = useState(page.title ?? "");
  const [content, setContent] = useState(page.content ?? "");
  const [tagsInput, setTagsInput] = useState((page.tags ?? []).join(", "));

  const save = () => {
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    onChange({ title, content, tags });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <Button variant="ghost" onClick={() => { save(); onClose(); }}>← Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onArchive}><ArchiveIcon className="h-4 w-4" /> Archive</Button>
          <Button variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            placeholder="Untitled"
            className="w-full bg-transparent font-display text-4xl font-semibold text-lagoon placeholder:text-muted-foreground focus:outline-none"
          />
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onBlur={save}
            placeholder="tags, separated, by commas"
            className="mt-3 border-0 border-b bg-transparent px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={save}
            placeholder="Start writing…"
            className="mt-6 min-h-[60vh] resize-none border-0 bg-transparent px-0 text-base leading-relaxed shadow-none focus-visible:ring-0"
          />
        </div>
      </div>
    </div>
  );
}
