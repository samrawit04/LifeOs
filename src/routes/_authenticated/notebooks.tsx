import { createFileRoute } from "@tanstack/react-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  FolderPlus,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Archive as ArchiveIcon,
  Paperclip,
  X,
  Play,
  ChevronLeft,
  Camera,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Square,
  Circle,
  FileText,
  Loader2,
  Table2,
  Smile,
  PlusCircle,
  Minus,
  SwitchCamera,
} from "lucide-react";
import {
  useCreateFolder,
  useCreateItem,
  useDeleteFolder,
  useDeleteItem,
  useFolders,
  useItems,
  useUpdateFolder,
  useUpdateItem,
} from "@/hooks/use-lifeos";
import type { Folder, Item } from "@/lib/lifeos-types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/_authenticated/notebooks")({
  component: Notebooks,
});

// ─── Block-based content model ────────────────────────────────────────────────

type TextBlock  = { id: string; kind: "text"; content: string };
type MediaBlock = { id: string; kind: "media"; type: "image" | "audio" | "video" | "file"; name: string; dataUrl: string; mimeType: string };
type TableBlock = { id: string; kind: "table"; rows: string[][] };
type Block = TextBlock | MediaBlock | TableBlock;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const NOTEBOOK_COLORS = [
  "#6ee7b7", "#fbbf24", "#f9a8d4", "#93c5fd", "#c4b5fd", "#86efac",
];

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function parseBlocks(raw: string | null): Block[] {
  const empty: Block[] = [{ id: genId(), kind: "text", content: "" }];
  if (!raw) return empty;
  try {
    const p = JSON.parse(raw);
    // New block format
    if (p.version === 2 && Array.isArray(p.blocks) && p.blocks.length > 0) {
      const blocks = p.blocks as Block[];
      // Always end with a text block so cursor has somewhere to land
      if (blocks[blocks.length - 1].kind !== "text") blocks.push({ id: genId(), kind: "text", content: "" });
      return blocks;
    }
    // Legacy { text, attachments } format
    if (typeof p === "object" && p !== null && "text" in p) {
      const blocks: Block[] = [{ id: genId(), kind: "text", content: p.text ?? "" }];
      for (const att of (Array.isArray(p.attachments) ? p.attachments : [])) {
        blocks.push({ id: att.id ?? genId(), kind: "media", type: att.type, name: att.name, dataUrl: att.dataUrl, mimeType: att.mimeType });
        blocks.push({ id: genId(), kind: "text", content: "" });
      }
      return blocks;
    }
  } catch { /* plain text fallback */ }
  return [{ id: genId(), kind: "text", content: raw ?? "" }, { id: genId(), kind: "text", content: "" }];
}

function serializeBlocks(blocks: Block[]): string {
  return JSON.stringify({ version: 2, blocks });
}

// For page card preview — extract plain text & first image from blocks
function blockPreview(raw: string | null): { text: string; firstImage?: string; mediaCount: number } {
  const blocks = parseBlocks(raw);
  const text = blocks.filter((b): b is TextBlock => b.kind === "text").map(b => b.content).join(" ").trim();
  const mediaBlocks = blocks.filter((b): b is MediaBlock => b.kind === "media");
  const firstImage = mediaBlocks.find(b => b.type === "image")?.dataUrl;
  return { text, firstImage, mediaCount: mediaBlocks.length };
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function Notebooks() {
  const { data: folders = [], isLoading: foldersLoading } = useFolders();
  const { data: items = [], isLoading: itemsLoading } = useItems();
  const isLoading = foldersLoading || itemsLoading;
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<Item | null>(null);
  const [newName, setNewName] = useState("");

  const [createSubFolderParentId, setCreateSubFolderParentId] = useState<string | null>(null);
  const [createSubFolderName, setCreateSubFolderName] = useState("");
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  const currentFolders = useMemo(
    () => folders.filter((f) => (f.parent_folder_id ?? null) === selectedFolderId),
    [folders, selectedFolderId]
  );

  const pages = useMemo(
    () =>
      items
        .filter(
          (i) =>
            i.type === "notebook_page" &&
            !i.archived &&
            (i.folder_id ?? null) === selectedFolderId
        )
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [items, selectedFolderId]
  );

  const breadcrumbs = useMemo(() => {
    if (!selectedFolderId) return [];
    const path: Folder[] = [];
    let cur: string | null = selectedFolderId;
    while (cur) {
      const f = folders.find((x) => x.id === cur);
      if (f) { path.unshift(f); cur = f.parent_folder_id ?? null; }
      else break;
    }
    return path;
  }, [folders, selectedFolderId]);

  const addRoot = () => {
    if (!newName.trim()) return;
    createFolder.mutate({ name: newName.trim(), parent_folder_id: null }, { onError: (e) => toast.error(e.message) });
    setNewName("");
  };

  const addPage = () => {
    if (!selectedFolderId) return toast.error("Choose a notebook first");
    createItem.mutate(
      { type: "notebook_page", title: "Untitled", content: serializeBlocks([{ id: genId(), kind: "text", content: "" }]), folder_id: selectedFolderId },
      { onSuccess: (i) => setSelectedPage(i) }
    );
  };

  const handleCreateSubFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createSubFolderName.trim() || !createSubFolderParentId) return;
    createFolder.mutate(
      { name: createSubFolderName.trim(), parent_folder_id: createSubFolderParentId },
      { onSuccess: () => { setCreateSubFolderParentId(null); setCreateSubFolderName(""); }, onError: (err) => toast.error(err.message) }
    );
  };

  const handleRenameFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameFolderName.trim() || !renameFolderId) return;
    updateFolder.mutate(
      { id: renameFolderId, patch: { name: renameFolderName.trim() } },
      { onSuccess: () => { setRenameFolderId(null); setRenameFolderName(""); }, onError: (err) => toast.error(err.message) }
    );
  };

  const handleDeleteFolder = () => {
    if (!deleteFolderId) return;
    deleteFolder.mutate(deleteFolderId, {
      onSuccess: () => {
        if (selectedFolderId === deleteFolderId) {
          const del = folders.find((f) => f.id === deleteFolderId);
          setSelectedFolderId(del?.parent_folder_id || null);
        }
        setDeleteFolderId(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen bg-cozy-grain">
      {/* ── Compact Breadcrumb Header ── */}
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-1.5 bg-background/40 backdrop-blur-md shrink-0 min-h-0">
        {/* Breadcrumbs — very compact */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none whitespace-nowrap">
          <button
            onClick={() => { setSelectedFolderId(null); setSelectedPage(null); }}
            className={cn(
              "flex items-center gap-1 text-xs font-medium transition-colors hover:text-primary rounded px-1 py-0.5",
              selectedFolderId === null ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <BookOpen className="h-3 w-3 shrink-0" />
            <span>Notebooks</span>
          </button>

          {breadcrumbs.map((folder, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={folder.id} className="flex items-center gap-0.5">
                <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <button
                  disabled={isLast && !selectedPage}
                  onClick={() => { setSelectedFolderId(folder.id); setSelectedPage(null); }}
                  className={cn(
                    "text-xs font-medium transition-colors hover:text-primary rounded px-1 py-0.5",
                    isLast && !selectedPage ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {folder.name}
                </button>
              </div>
            );
          })}

          {selectedPage && (
            <div className="flex items-center gap-0.5">
              <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
              <span className="text-xs font-medium text-primary max-w-[120px] sm:max-w-[220px] truncate px-1">
                {selectedPage.title || "Untitled"}
              </span>
            </div>
          )}
        </div>

        {/* Actions — only on list view */}
        {!selectedPage && (
          <div className="flex items-center gap-1.5 shrink-0">
            {selectedFolderId === null ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New notebook…"
                  className="h-7 w-32 sm:w-44 text-xs border-white/10 bg-white/[0.03]"
                  onKeyDown={(e) => e.key === "Enter" && addRoot()}
                />
                <Button
                  onClick={addRoot}
                  size="sm"
                  disabled={createFolder.isPending}
                  className="h-7 px-2.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {createFolder.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <FolderPlus className="h-3.5 w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline">Add</span>
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={() => { setCreateSubFolderParentId(selectedFolderId); setCreateSubFolderName(""); }}
                  variant="outline" size="sm"
                  className="h-7 px-2.5 text-xs border-white/10 bg-white/[0.03] hover:bg-white/[0.08]"
                >
                  <FolderPlus className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Sub-notebook</span>
                </Button>
                <Button
                  onClick={addPage}
                  size="sm"
                  disabled={createItem.isPending}
                  className="h-7 px-2.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {createItem.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline">New page</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Body ── */}
      <div className="flex-1 overflow-auto min-h-0">
        {selectedPage ? (
          <NoteEditor
            key={selectedPage.id}
            page={selectedPage}
            onClose={() => setSelectedPage(null)}
            onChange={(patch) => updateItem.mutate({ id: selectedPage.id, patch })}
            onArchive={() => { updateItem.mutate({ id: selectedPage.id, patch: { archived: true } }); setSelectedPage(null); }}
            onDelete={() => { deleteItem.mutate(selectedPage.id); setSelectedPage(null); }}
          />
        ) : (
          <div className="p-5 max-w-5xl mx-auto space-y-8">
            {/* Notebooks grid */}
            {(currentFolders.length > 0 || selectedFolderId === null) && (
              <section>
                <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
                  {selectedFolderId === null ? "My Notebooks" : "Sub-notebooks"}
                </h2>
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-24 rounded-2xl bg-white/[0.04] border border-white/[0.06] animate-skeleton" />
                    ))}
                  </div>
                ) : currentFolders.length === 0 ? (
                  <EmptyState
                    icon={<BookOpen className="h-9 w-9 text-muted-foreground/25" />}
                    title="No notebooks yet"
                    description="Create one with the field above."
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {currentFolders.map((folder, idx) => (
                      <NotebookCard
                        key={folder.id}
                        folder={folder}
                        colorAccent={NOTEBOOK_COLORS[idx % NOTEBOOK_COLORS.length]}
                        onClick={() => setSelectedFolderId(folder.id)}
                        onRename={() => { setRenameFolderId(folder.id); setRenameFolderName(folder.name); }}
                        onDelete={() => setDeleteFolderId(folder.id)}
                        pageCount={items.filter((i) => i.type === "notebook_page" && !i.archived && i.folder_id === folder.id).length}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Pages list */}
            {selectedFolderId !== null && (
              <section>
                <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">Pages</h2>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 rounded-xl bg-white/[0.04] border border-white/[0.06] animate-skeleton" />
                    ))}
                  </div>
                ) : pages.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="h-9 w-9 text-muted-foreground/25" />}
                    title="No pages yet"
                    description="Start writing your first page."
                    action={
                      <Button
                        onClick={addPage}
                        size="sm"
                        disabled={createItem.isPending}
                        className="mt-3 bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs"
                      >
                        {createItem.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        New page
                      </Button>
                    }
                  />
                ) : (
                  <div className="relative">
                    <div className="absolute left-[22px] top-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-primary/10 to-transparent hidden sm:block" />
                    <div className="space-y-3">
                      {pages.map((p) => (
                        <PageCard key={p.id} page={p} onClick={() => setSelectedPage(p)} />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      <Dialog open={createSubFolderParentId !== null} onOpenChange={(o) => !o && setCreateSubFolderParentId(null)}>
        <DialogContent className="border border-border bg-card text-card-foreground shadow-2xl rounded-2xl sm:max-w-sm p-6">
          <form onSubmit={handleCreateSubFolder}>
            <DialogHeader><DialogTitle className="font-display text-lg font-bold text-foreground">New sub-notebook</DialogTitle></DialogHeader>
            <div className="py-4">
              <Input value={createSubFolderName} onChange={(e) => setCreateSubFolderName(e.target.value)} placeholder="Name…" autoFocus className="border border-input bg-background text-foreground text-sm h-9 rounded-xl" />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateSubFolderParentId(null)} className="border border-border bg-background text-foreground hover:bg-muted text-xs h-9 rounded-xl">Cancel</Button>
              <Button type="submit" size="sm" disabled={createFolder.isPending} className="bg-primary text-primary-foreground text-xs font-semibold h-9 rounded-xl px-4">
                {createFolder.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={renameFolderId !== null} onOpenChange={(o) => !o && setRenameFolderId(null)}>
        <DialogContent className="border border-border bg-card text-card-foreground shadow-2xl rounded-2xl sm:max-w-sm p-6">
          <form onSubmit={handleRenameFolder}>
            <DialogHeader><DialogTitle className="font-display text-lg font-bold text-foreground">Rename notebook</DialogTitle></DialogHeader>
            <div className="py-4">
              <Input value={renameFolderName} onChange={(e) => setRenameFolderName(e.target.value)} placeholder="New name…" autoFocus className="border border-input bg-background text-foreground text-sm h-9 rounded-xl" />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setRenameFolderId(null)} className="border border-border bg-background text-foreground hover:bg-muted text-xs h-9 rounded-xl">Cancel</Button>
              <Button type="submit" size="sm" disabled={updateFolder.isPending} className="bg-primary text-primary-foreground text-xs font-semibold h-9 rounded-xl px-4">
                {updateFolder.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteFolderId !== null}
        onOpenChange={(o) => !o && setDeleteFolderId(null)}
        title="Delete notebook?"
        description="All pages inside this notebook will be deleted permanently. This cannot be undone."
        confirmLabel="Delete Notebook"
        onConfirm={handleDeleteFolder}
      />
    </div>
  );
}

// ─── Notebook Card ─────────────────────────────────────────────────────────────

function NotebookCard({ folder, colorAccent, onClick, onRename, onDelete, pageCount }: {
  folder: Folder; colorAccent: string; onClick: () => void; onRename: () => void; onDelete: () => void; pageCount: number;
}) {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col gap-2 p-4 rounded-2xl cursor-pointer transition-all duration-300 bg-card/50 border border-white/[0.06] hover:border-white/[0.14] hover:bg-card hover:shadow-note overflow-hidden"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: colorAccent }} />
      <div className="flex items-start justify-between gap-2 pl-3">
        <div>
          <p className="text-lg mb-0.5">📓</p>
          <h3 className="font-display font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">{folder.name}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">{pageCount} {pageCount === 1 ? "page" : "pages"}</p>
        </div>
        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={onRename} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"><Pencil className="h-3 w-3" /></button>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Page Card ─────────────────────────────────────────────────────────────────

function PageCard({ page, onClick }: { page: Item; onClick: () => void }) {
  const preview = useMemo(() => blockPreview(page.content), [page.content]);

  return (
    <button
      onClick={onClick}
      className="group relative flex items-start gap-4 text-left w-full p-4 rounded-2xl bg-card/40 border border-white/[0.05] hover:bg-card/70 hover:border-white/[0.12] hover:shadow-note transition-all duration-300"
    >
      <div className="hidden sm:flex flex-col items-center gap-1 shrink-0 pt-1">
        <div className="h-4 w-4 rounded-full border-2 border-primary/40 bg-background group-hover:border-primary group-hover:bg-primary/20 transition-all flex items-center justify-center">
          <div className="h-1 w-1 rounded-full bg-primary/60 group-hover:bg-primary" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] text-muted-foreground/50 font-medium">{formatDateLabel(page.updated_at)}</span>
          {preview.mediaCount > 0 && (
            <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5">
              <Paperclip className="h-2.5 w-2.5" />{preview.mediaCount}
            </span>
          )}
        </div>
        <h3 className="font-display font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{page.title || "Untitled"}</h3>
        <div className="flex gap-3 items-start mt-1">
          <p className="flex-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {preview.text || <span className="italic opacity-40">Empty…</span>}
          </p>
          {preview.firstImage && (
            <div className="shrink-0 h-10 w-10 rounded-lg overflow-hidden border border-white/10">
              <img src={preview.firstImage} alt="" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Note Editor (block-based) ─────────────────────────────────────────────────

function NoteEditor({ page, onClose, onChange, onArchive, onDelete }: {
  page: Item; onClose: () => void; onChange: (p: Partial<Item>) => void; onArchive: () => void; onDelete: () => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(page.content));
  const [title, setTitle] = useState(page.title ?? "");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recorderMode, setRecorderMode] = useState<"idle" | "photo" | "audio" | "video">("idle");
  const activeBlockIdRef = useRef<string | null>(null);
  const focusPendingRef = useRef<string | null>(null);
  const activeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [pasteHint, setPasteHint] = useState<string | null>(null);

  const save = useCallback(
    (overrideBlocks?: Block[], overrideTitle?: string) => {
      onChange({
        title: overrideTitle ?? title,
        content: serializeBlocks(overrideBlocks ?? blocks),
      });
    },
    [blocks, title, onChange]
  );

  const updateText = (id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => b.id === id && b.kind === "text" ? { ...b, content } : b));
  };

  const insertMedia = useCallback((media: Omit<MediaBlock, "kind">) => {
    setBlocks((prev) => {
      const activeId = activeBlockIdRef.current ?? prev[prev.length - 1]?.id;
      const idx = prev.findIndex((b) => b.id === activeId);
      const insertAt = idx >= 0 ? idx + 1 : prev.length;
      const mediaBlock: MediaBlock = { ...media, kind: "media" };
      const continuationBlock: TextBlock = { id: genId(), kind: "text", content: "" };
      focusPendingRef.current = continuationBlock.id;
      const next = [
        ...prev.slice(0, insertAt),
        mediaBlock,
        continuationBlock,
        ...prev.slice(insertAt),
      ];
      onChange({ title, content: serializeBlocks(next) });
      return next;
    });
  }, [onChange, title]);

<<<<<<< HEAD
  // ── Clipboard paste handler (images & files) ──────────────────────────────
  const handlePaste = useCallback((e: React.ClipboardEvent | ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    const fileItems = items.filter((item) => item.kind === "file");
    if (fileItems.length === 0) return; // let plain-text paste fall through
    e.preventDefault();
    fileItems.forEach((item) => {
      const file = item.getAsFile();
      if (!file) return;
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`"${file.name || "Pasted file"}" exceeds the 10 MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        let type: MediaBlock["type"] = "file";
        if (file.type.startsWith("image/")) type = "image";
        else if (file.type.startsWith("audio/")) type = "audio";
        else if (file.type.startsWith("video/")) type = "video";
        const name = file.name && file.name !== "image.png" ? file.name : `pasted-${type}-${Date.now()}.${file.type.split("/")[1] ?? "bin"}`;
        insertMedia({ id: genId(), type, name, dataUrl, mimeType: file.type });
        // Brief toast hint
        const hint = type === "image" ? "📸 Image pasted!" : type === "audio" ? "🎵 Audio pasted!" : type === "video" ? "🎬 Video pasted!" : "📎 File pasted!";
        setPasteHint(hint);
        setTimeout(() => setPasteHint(null), 2000);
      };
      reader.readAsDataURL(file);
    });
  }, [insertMedia]);

  // Focus the continuation textarea after inserting media
=======
>>>>>>> 0d9701f39730416f62db6dc1fec17cf47c0378f7
  useEffect(() => {
    if (!focusPendingRef.current) return;
    const id = focusPendingRef.current;
    focusPendingRef.current = null;
    setTimeout(() => {
      (document.getElementById(`tb-${id}`) as HTMLTextAreaElement | null)?.focus();
    }, 30);
  }, [blocks]);

  const removeBlock = (id: string) => {
    setBlocks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      if (next.filter(b => b.kind === "text").length === 0) next.push({ id: genId(), kind: "text", content: "" });
      save(next);
      return next;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach((file) => {
      if (file.size > MAX_FILE_BYTES) { toast.error(`"${file.name}" exceeds 10 MB limit.`); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        let type: MediaBlock["type"] = "file";
        if (file.type.startsWith("image/")) type = "image";
        else if (file.type.startsWith("audio/")) type = "audio";
        else if (file.type.startsWith("video/")) type = "video";
        insertMedia({ id: genId(), type, name: file.name, dataUrl, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const insertTable = useCallback((rows = 3, cols = 3) => {
    setBlocks((prev) => {
      const activeId = activeBlockIdRef.current ?? prev[prev.length - 1]?.id;
      const idx = prev.findIndex((b) => b.id === activeId);
      const insertAt = idx >= 0 ? idx + 1 : prev.length;
      const tableBlock: TableBlock = {
        id: genId(),
        kind: "table",
        rows: Array.from({ length: rows }, () => Array(cols).fill("")),
      };
      const continuationBlock: TextBlock = { id: genId(), kind: "text", content: "" };
      focusPendingRef.current = continuationBlock.id;
      const next = [...prev.slice(0, insertAt), tableBlock, continuationBlock, ...prev.slice(insertAt)];
      onChange({ title, content: serializeBlocks(next) });
      return next;
    });
  }, [onChange, title]);

  const updateTableCell = useCallback((tableId: string, row: number, col: number, value: string) => {
    setBlocks((prev) => {
      const next = prev.map((b) => {
        if (b.id !== tableId || b.kind !== "table") return b;
        const rows = b.rows.map((r, ri) => ri === row ? r.map((c, ci) => ci === col ? value : c) : r);
        return { ...b, rows };
      });
      return next;
    });
  }, []);

  const addTableRow = useCallback((tableId: string) => {
    setBlocks((prev) => {
      const next = prev.map((b) => {
        if (b.id !== tableId || b.kind !== "table") return b;
        const cols = b.rows[0]?.length ?? 3;
        return { ...b, rows: [...b.rows, Array(cols).fill("")] };
      });
      onChange({ title, content: serializeBlocks(next) });
      return next;
    });
  }, [onChange, title]);

  const addTableCol = useCallback((tableId: string) => {
    setBlocks((prev) => {
      const next = prev.map((b) => {
        if (b.id !== tableId || b.kind !== "table") return b;
        return { ...b, rows: b.rows.map((r) => [...r, ""]) };
      });
      onChange({ title, content: serializeBlocks(next) });
      return next;
    });
  }, [onChange, title]);

  const removeTableRow = useCallback((tableId: string) => {
    setBlocks((prev) => {
      const next = prev.map((b) => {
        if (b.id !== tableId || b.kind !== "table") return b;
        if (b.rows.length <= 1) return b;
        return { ...b, rows: b.rows.slice(0, -1) };
      });
      onChange({ title, content: serializeBlocks(next) });
      return next;
    });
  }, [onChange, title]);

  const removeTableCol = useCallback((tableId: string) => {
    setBlocks((prev) => {
      const next = prev.map((b) => {
        if (b.id !== tableId || b.kind !== "table") return b;
        const cols = b.rows[0]?.length ?? 0;
        if (cols <= 1) return b;
        return { ...b, rows: b.rows.map((r) => r.slice(0, -1)) };
      });
      onChange({ title, content: serializeBlocks(next) });
      return next;
    });
  }, [onChange, title]);

  const insertEmoji = useCallback((emoji: string) => {
    setShowEmojiPicker(false);
    const ta = activeTextareaRef.current;
    if (ta) {
      const start = ta.selectionStart ?? ta.value.length;
      const end = ta.selectionEnd ?? ta.value.length;
      const id = activeBlockIdRef.current;
      if (id) {
        setBlocks((prev) => prev.map((b) => {
          if (b.id !== id || b.kind !== "text") return b;
          const next = b.content.slice(0, start) + emoji + b.content.slice(end);
          return { ...b, content: next };
        }));
        setTimeout(() => {
          ta.focus();
          const pos = start + emoji.length;
          ta.setSelectionRange(pos, pos);
        }, 10);
      }
    } else {
      const id = activeBlockIdRef.current;
      if (id) {
        setBlocks((prev) => prev.map((b) => b.id === id && b.kind === "text" ? { ...b, content: b.content + emoji } : b));
      }
    }
  }, []);

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
<<<<<<< HEAD
        {/* ── Scrollable writing area ── */}
        <div
          className="flex-1 overflow-auto min-h-0 relative"
          onPaste={handlePaste}
        >
          {/* Paste hint toast */}
          {pasteHint && (
            <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/90 text-primary-foreground shadow-lg animate-fade-in">
              {pasteHint}
            </div>
          )}
=======
        <div className="flex-1 overflow-auto min-h-0">
>>>>>>> 0d9701f39730416f62db6dc1fec17cf47c0378f7
          <div className="mx-auto max-w-4xl px-4 pt-5 pb-6">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => save()}
              placeholder="Title"
              className="w-full bg-transparent font-display text-2xl sm:text-3xl font-semibold text-foreground placeholder:text-muted-foreground/25 focus:outline-none leading-tight"
            />
            <p className="text-[10px] text-muted-foreground/40 mt-1 mb-4 font-medium tracking-wider uppercase">
              {format(new Date(page.updated_at), "EEEE, MMM d · yyyy")}
            </p>
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent mb-4" />
            {blocks.map((block, idx) => {
              if (block.kind === "text") {
                return (
                  <AutoTextarea
                    key={block.id}
                    id={`tb-${block.id}`}
                    value={block.content}
                    placeholder={idx === 0 ? "Start writing…" : "Continue writing…"}
                    onChange={(val) => updateText(block.id, val)}
                    onFocus={(ta) => { activeBlockIdRef.current = block.id; activeTextareaRef.current = ta; }}
                    onBlur={() => save()}
                    onPaste={handlePaste}
                  />
                );
              }
              if (block.kind === "table") {
                return (
                  <div key={block.id} className="my-3">
                    <TableEditor
                      block={block}
                      onCellChange={(r, c, v) => updateTableCell(block.id, r, c, v)}
                      onCellBlur={() => save()}
                      onAddRow={() => addTableRow(block.id)}
                      onAddCol={() => addTableCol(block.id)}
                      onRemoveRow={() => removeTableRow(block.id)}
                      onRemoveCol={() => removeTableCol(block.id)}
                      onRemove={() => removeBlock(block.id)}
                    />
                  </div>
                );
              }
              return (
                <div key={block.id} className="my-2">
                  <AttachmentView
                    attachment={{ id: block.id, type: (block as MediaBlock).type, name: (block as MediaBlock).name, dataUrl: (block as MediaBlock).dataUrl, mimeType: (block as MediaBlock).mimeType }}
                    onRemove={() => removeBlock(block.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/[0.06] bg-background/60 backdrop-blur-md">
          <div className="mx-auto max-w-4xl overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1 px-3 py-2 min-w-max">
              <button
                onClick={() => { save(); onClose(); }}
                className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-white/[0.06] mr-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>

              <div className="shrink-0 w-px h-4 bg-white/[0.08] mx-1" />

              <ToolbarBtn icon={<Camera className="h-4 w-4" />} label="Photo" onClick={() => setRecorderMode("photo")} title="Take a photo" />
              <ToolbarBtn icon={<Mic className="h-4 w-4" />} label="Audio" onClick={() => setRecorderMode("audio")} title="Record audio" />
              <ToolbarBtn icon={<Video className="h-4 w-4" />} label="Video" onClick={() => setRecorderMode("video")} title="Record video" />
              <ToolbarBtn icon={<Paperclip className="h-4 w-4" />} label="File" onClick={() => fileInputRef.current?.click()} title="Attach file" />
              <ToolbarBtn icon={<Table2 className="h-4 w-4" />} label="Table" onClick={() => insertTable(3, 3)} title="Insert table" />
              <ToolbarBtn
                btnRef={emojiButtonRef}
                icon={<Smile className="h-4 w-4" />}
                label="Emoji"
                onClick={() => setShowEmojiPicker((p) => !p)}
                title="Insert emoji"
              />
              {showEmojiPicker && emojiButtonRef.current && createPortal(
                <EmojiPicker
                  anchorEl={emojiButtonRef.current}
                  onSelect={insertEmoji}
                  onClose={() => setShowEmojiPicker(false)}
                />,
                document.body
              )}

              <div className="shrink-0 w-px h-4 bg-white/[0.08] mx-1" />

              <button
                onClick={onArchive}
                className="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-white/[0.06]"
                title="Archive"
              >
                <ArchiveIcon className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Archive</span>
              </button>
              <button
                onClick={() => setDeleteDialogOpen(true)}
                className="shrink-0 flex items-center gap-1 text-[11px] text-destructive hover:text-destructive transition-colors px-2 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

      {recorderMode !== "idle" && (
        <RecorderOverlay
          mode={recorderMode}
          onCapture={(att) => { insertMedia(att); setRecorderMode("idle"); }}
          onClose={() => setRecorderMode("idle")}
        />
      )}

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete this page?"
        description="This notebook page will be permanently deleted. This cannot be undone."
        confirmLabel="Delete Page"
        onConfirm={onDelete}
      />
    </>
  );
}

<<<<<<< HEAD
// ─── Auto-growing textarea block ───────────────────────────────────────────────

function AutoTextarea({ id, value, placeholder, onChange, onFocus, onBlur, onPaste }: {
=======
function AutoTextarea({ id, value, placeholder, onChange, onFocus, onBlur }: {
>>>>>>> 0d9701f39730416f62db6dc1fec17cf47c0378f7
  id: string; value: string; placeholder: string;
  onChange: (v: string) => void; onFocus: (ta: HTMLTextAreaElement) => void; onBlur: () => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => ref.current && onFocus(ref.current)}
      onBlur={onBlur}
      onPaste={onPaste}
      className="w-full bg-transparent text-sm sm:text-base leading-[1.85] text-foreground/85 placeholder:text-muted-foreground/20 focus:outline-none resize-none min-h-[2rem] font-sans block overflow-hidden"
    />
  );
}


function ToolbarBtn({ icon, label, onClick, title, btnRef }: { icon: React.ReactNode; label: string; onClick: () => void; title?: string; btnRef?: React.RefObject<HTMLButtonElement | null> }) {
  return (
    <button
      ref={btnRef}
      onClick={onClick}
      title={title}
      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/[0.08] border border-transparent hover:border-white/[0.08] transition-all duration-150"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ─── Recorder Overlay ──────────────────────────────────────────────────────────

function RecorderOverlay({ mode, onCapture, onClose }: {
  mode: "photo" | "audio" | "video";
  onCapture: (att: AttachmentLike) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Photo defaults to front (selfie) camera; video/audio default to rear
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    mode === "photo" ? "user" : "environment"
  );

  const isSelfie = facingMode === "user";

  // Start camera/mic stream — re-runs when facingMode changes
  useEffect(() => {
    let cancelled = false;
    setIsReady(false);
    setError(null);

    // Stop prior tracks before requesting a new stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    const constraints: MediaStreamConstraints =
      mode === "audio"
        ? { audio: true }
        : mode === "photo"
        ? { video: { facingMode }, audio: false }
        : { video: { facingMode }, audio: true };

    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current && mode !== "audio") {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsReady(true);
    }).catch((err) => {
      if (!cancelled) setError(err?.message ?? "Could not access camera/microphone.");
    });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, facingMode]);

  const flipCamera = () => {
    if (isRecording) return;
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = mode === "audio" ? "audio/webm" : "video/webm";
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        onCapture({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: mode === "audio" ? "audio" : "video",
          name: `recording-${Date.now()}.${mode === "audio" ? "webm" : "webm"}`,
          dataUrl,
          mimeType,
        });
      };
      reader.readAsDataURL(blob);
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (isSelfie) {
      // Mirror the captured frame so the selfie matches the mirrored preview
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    onCapture({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: "image",
      name: `photo-${Date.now()}.jpg`,
      dataUrl,
      mimeType: "image/jpeg",
    });
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
      {/* Close */}
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-sm font-medium text-white/70">
          {mode === "photo" ? "Take Photo" : mode === "audio" ? "Record Audio" : "Record Video"}
        </span>
        <button onClick={onClose} className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5">
        {error ? (
          <div className="text-center">
            <p className="text-red-400 text-sm mb-2">⚠️ {error}</p>
            <Button onClick={onClose} size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">Close</Button>
          </div>
        ) : mode === "audio" ? (
          /* Audio UI */
          <div className="flex flex-col items-center gap-6">
            <div className={cn(
              "h-32 w-32 rounded-full flex items-center justify-center transition-all duration-300",
              isRecording
                ? "bg-red-500/20 shadow-[0_0_0_12px_rgba(239,68,68,0.1),0_0_0_24px_rgba(239,68,68,0.05)] animate-pulse"
                : "bg-white/10"
            )}>
              {isRecording ? <MicOff className="h-12 w-12 text-red-400" /> : <Mic className="h-12 w-12 text-white/60" />}
            </div>

            {isRecording && (
              <p className="text-2xl font-mono text-red-400 font-bold">{fmtTime(elapsed)}</p>
            )}

            {isReady && (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all duration-200",
                  isRecording
                    ? "bg-red-500 text-white hover:bg-red-400"
                    : "bg-white text-black hover:bg-white/90"
                )}
              >
                {isRecording ? <><Square className="h-4 w-4 fill-white" /> Stop & Save</> : <><Circle className="h-4 w-4 fill-red-500 text-red-500" /> Start Recording</>}
              </button>
            )}
          </div>
        ) : (
          /* Camera UI (photo or video) */
          <div className="flex flex-col items-center gap-4 w-full max-w-md">
            <div className="relative w-full rounded-2xl overflow-hidden bg-black/50 border border-white/10">
              {/* Mirror the preview when using front (selfie) camera */}
              <video
                ref={videoRef}
                muted
                playsInline
                className={cn(
                  "w-full h-64 sm:h-80 object-cover transition-transform duration-200",
                  isSelfie && "-scale-x-100"
                )}
              />
              {isRecording && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur rounded-full px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-white font-mono">{fmtTime(elapsed)}</span>
                </div>
              )}
              {/* Facing mode badge */}
              <div className="absolute top-3 right-3">
                <span className="text-[10px] text-white/60 bg-black/50 rounded-full px-2 py-0.5 backdrop-blur">
                  {isSelfie ? "Front" : "Rear"}
                </span>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {isReady && (
              <div className="flex items-center gap-6">
                {/* Flip camera button */}
                <button
                  onClick={flipCamera}
                  disabled={isRecording}
                  title="Flip camera"
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center border border-white/20 bg-white/10 text-white transition-all duration-150",
                    isRecording ? "opacity-30 cursor-not-allowed" : "hover:bg-white/20 active:scale-95"
                  )}
                >
                  <SwitchCamera className="h-5 w-5" />
                </button>

                {mode === "photo" ? (
                  <button
                    onClick={takePhoto}
                    className="h-16 w-16 rounded-full bg-white border-4 border-white/30 hover:scale-105 active:scale-95 transition-all duration-150 flex items-center justify-center shadow-lg"
                    title="Take photo"
                  >
                    <Camera className="h-6 w-6 text-black" />
                  </button>
                ) : (
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                      "h-16 w-16 rounded-full flex items-center justify-center border-4 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg",
                      isRecording
                        ? "bg-red-500 border-red-300 text-white"
                        : "bg-red-500 border-white/30 text-white"
                    )}
                    title={isRecording ? "Stop" : "Record"}
                  >
                    {isRecording
                      ? <Square className="h-6 w-6 fill-white" />
                      : <VideoOff className="h-6 w-6" />}
                  </button>
                )}

                {/* Spacer to visually centre the main button */}
                <div className="h-10 w-10" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Attachment View ───────────────────────────────────────────────────────────

type AttachmentLike = { id: string; type: "image" | "audio" | "video" | "file"; name: string; dataUrl: string; mimeType: string };

function AttachmentView({ attachment, onRemove }: { attachment: AttachmentLike; onRemove: () => void }) {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (attachment.type === "image") {
    return (
      <div className="relative group inline-block">
        <img src={attachment.dataUrl} alt={attachment.name} className="max-h-72 max-w-full rounded-xl object-cover border border-white/10 shadow-note" />
        <button onClick={onRemove} className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
          <X className="h-3 w-3" />
        </button>
        <p className="text-[10px] text-muted-foreground/40 mt-1">{attachment.name}</p>
      </div>
    );
  }

  if (attachment.type === "audio") {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] group">
        <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
          <Mic className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground font-medium truncate mb-1">{attachment.name}</p>
          <audio controls src={attachment.dataUrl} className="w-full h-7" />
        </div>
        <button onClick={onRemove} className="shrink-0 h-6 w-6 rounded-full bg-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (attachment.type === "video") {
    return (
      <div className="relative group rounded-xl overflow-hidden border border-white/10 shadow-note">
        <video ref={videoRef} src={attachment.dataUrl} className="max-h-64 w-full object-cover" controls={videoPlaying} />
        {!videoPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer" onClick={() => { setVideoPlaying(true); videoRef.current?.play(); }}>
            <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
              <Play className="h-5 w-5 text-white fill-white" />
            </div>
          </div>
        )}
        <button onClick={onRemove} className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
          <X className="h-3 w-3" />
        </button>
        <p className="text-[10px] text-muted-foreground/40 p-1.5">{attachment.name}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] group">
      <div className="h-8 w-8 rounded-lg bg-accent/15 flex items-center justify-center text-accent shrink-0">
        <Paperclip className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground font-medium truncate">{attachment.name}</p>
        <a href={attachment.dataUrl} download={attachment.name} className="text-[10px] text-primary/60 hover:text-primary transition-colors">Download</a>
      </div>
      <button onClick={onRemove} className="shrink-0 h-6 w-6 rounded-full bg-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.01]">
      <div className="mb-3">{icon}</div>
      <h3 className="font-display font-semibold text-foreground/60 text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground/40 max-w-xs">{description}</p>
      {action}
    </div>
  );
}

// ─── Table Editor ──────────────────────────────────────────────────────────────

function TableEditor({ block, onCellChange, onCellBlur, onAddRow, onAddCol, onRemoveRow, onRemoveCol, onRemove }: {
  block: TableBlock;
  onCellChange: (row: number, col: number, value: string) => void;
  onCellBlur: () => void;
  onAddRow: () => void;
  onAddCol: () => void;
  onRemoveRow: () => void;
  onRemoveCol: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="group relative rounded-xl border border-white/[0.10] bg-white/[0.03] overflow-x-auto">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.07] bg-white/[0.02]">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
          <Table2 className="h-3 w-3" /> Table
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onAddRow} title="Add row" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary px-1.5 py-1 rounded-lg hover:bg-primary/10 transition-colors">
            <PlusCircle className="h-3 w-3" /><span>Row</span>
          </button>
          <button onClick={onAddCol} title="Add column" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary px-1.5 py-1 rounded-lg hover:bg-primary/10 transition-colors">
            <PlusCircle className="h-3 w-3" /><span>Col</span>
          </button>
          <button onClick={onRemoveRow} title="Remove last row" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-orange-400 px-1.5 py-1 rounded-lg hover:bg-orange-400/10 transition-colors">
            <Minus className="h-3 w-3" /><span>Row</span>
          </button>
          <button onClick={onRemoveCol} title="Remove last column" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-orange-400 px-1.5 py-1 rounded-lg hover:bg-orange-400/10 transition-colors">
            <Minus className="h-3 w-3" /><span>Col</span>
          </button>
          <button onClick={onRemove} title="Remove table" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive px-1.5 py-1 rounded-lg hover:bg-destructive/10 transition-colors ml-1">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      <table className="w-full border-collapse min-w-max">
        <thead>
          <tr>
            {block.rows[0]?.map((_, ci) => (
              <th key={ci} className="border border-white/[0.08] px-1 py-0.5 bg-white/[0.04] text-[10px] text-muted-foreground/50 font-medium text-center w-8 select-none">
                {String.fromCharCode(65 + ci)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri} className="group/row">
              {row.map((cell, ci) => (
                <td key={ci} className="border border-white/[0.08] p-0 relative">
                  <input
                    value={cell}
                    onChange={(e) => onCellChange(ri, ci, e.target.value)}
                    onBlur={onCellBlur}
                    className={cn(
                      "w-full min-w-[80px] px-2.5 py-2 text-sm bg-transparent text-foreground/85 focus:outline-none focus:bg-primary/5 transition-colors",
                      ri === 0 && "font-semibold text-foreground"
                    )}
                    placeholder={ri === 0 ? `Header ${ci + 1}` : ""}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Emoji Picker ──────────────────────────────────────────────────────────────

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: "Smileys", emojis: ["😀","😄","😂","🤣","😊","😍","🥰","😘","😎","🤩","😜","🤪","😏","😒","😔","😢","😭","😤","😠","🤯","😱","😨","🥶","🤔","🤗","🫡","😴","🤐","🥳","🥺"] },
  { label: "Nature", emojis: ["🌸","🌺","🌻","🌹","🌷","🍀","🌿","🍃","🌱","🌲","🌳","🌴","🍄","🌾","🌊","🌈","☀️","🌙","⭐","❄️","🔥","💧","🌍","🌺","🦋","🐝","🦄","🐶","🐱","🦊"] },
  { label: "Food", emojis: ["🍕","🍔","🌮","🍜","🍣","🍦","🎂","🍩","🍎","🍓","🍇","☕","🍵","🧃","🍺","🥂","🥑","🥦","🍋","🍊","🍉","🍒","🍑","🥐","🧇","🥗","🍱","🍿","🥜","🫙"] },
  { label: "Activities", emojis: ["⚽","🏀","🎮","🎵","🎨","📚","✈️","🚀","🏆","🎯","🎲","🎭","🎤","🎸","🎹","📸","🎬","🏋️","🚴","🧘","⛷️","🏄","🎪","🎠","🎡","🎢","🎃","🎄","🎉","🎊"] },
  { label: "Objects", emojis: ["💡","🔑","💎","📱","💻","🖥️","📷","🎙️","📝","📌","📎","✏️","🖊️","🔒","🔓","💰","💳","🎁","🛍️","🧳","⏰","📅","🗂️","📊","🔬","🔭","⚙️","🧲","💊","🏥"] },
  { label: "Symbols", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","💕","💖","✨","⚡","💫","🌟","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","✅","❌","⭕","💯","🔔","💬","👍"] },
];

function EmojiPicker({ anchorEl, onSelect, onClose }: { anchorEl: HTMLElement; onSelect: (emoji: string) => void; onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const rect = anchorEl.getBoundingClientRect();
    const pickerWidth = 288; // w-72 = 18rem = 288px
    const pickerHeight = 240;
    const left = Math.max(8, Math.min(rect.right - pickerWidth, window.innerWidth - pickerWidth - 8));
    const top = rect.top - pickerHeight - 8;
    setPos({ top: Math.max(8, top), left });
  }, [anchorEl]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, anchorEl]);

  if (!pos) return null;

  return (
    <div
      ref={ref}
      style={{ top: pos.top, left: pos.left }}
      className="fixed w-72 rounded-2xl border border-white/10 bg-[#1a1e1a]/98 dark:bg-[#1a1e1a]/98 backdrop-blur-xl shadow-2xl z-[9999] overflow-hidden"
    >
      <div className="flex border-b border-white/[0.07] overflow-x-auto scrollbar-none">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={i}
            onMouseDown={(e) => { e.preventDefault(); setActiveCategory(i); }}
            className={cn(
              "shrink-0 px-3 py-2 text-[10px] font-medium whitespace-nowrap transition-colors",
              activeCategory === i
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, i) => (
          <button
            key={i}
            onMouseDown={(e) => { e.preventDefault(); onSelect(emoji); }}
            className="h-8 w-8 flex items-center justify-center text-lg rounded-lg hover:bg-white/10 transition-colors"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
