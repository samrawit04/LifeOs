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

  // Reusable popups state
  const [createSubFolderParentId, setCreateSubFolderParentId] = useState<string | null>(null);
  const [createSubFolderName, setCreateSubFolderName] = useState("");
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  // Filter folders at the current navigation level
  const currentFolders = useMemo(() => {
    return folders.filter((f) => (f.parent_folder_id ?? null) === selectedFolderId);
  }, [folders, selectedFolderId]);

  // Filter pages inside the active folder
  const pages = useMemo(
    () => items.filter((i) => i.type === "notebook_page" && !i.archived && (i.folder_id ?? null) === selectedFolderId),
    [items, selectedFolderId],
  );

  // Calculate breadcrumbs path for navigation
  const breadcrumbs = useMemo(() => {
    if (!selectedFolderId) return [];
    const path: Folder[] = [];
    let currentId: string | null = selectedFolderId;
    while (currentId) {
      const folder = folders.find((f) => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parent_folder_id ?? null;
      } else {
        break;
      }
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
      { type: "notebook_page", title: "Untitled", content: "", folder_id: selectedFolderId },
      { onSuccess: (i) => setSelectedPage(i) },
    );
  };

  const handleCreateSubFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createSubFolderName.trim() || !createSubFolderParentId) return;
    createFolder.mutate(
      { name: createSubFolderName.trim(), parent_folder_id: createSubFolderParentId },
      {
        onSuccess: () => {
          setCreateSubFolderParentId(null);
          setCreateSubFolderName("");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleRenameFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameFolderName.trim() || !renameFolderId) return;
    updateFolder.mutate(
      { id: renameFolderId, patch: { name: renameFolderName.trim() } },
      {
        onSuccess: () => {
          setRenameFolderId(null);
          setRenameFolderName("");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleDeleteFolder = () => {
    if (!deleteFolderId) return;
    deleteFolder.mutate(deleteFolderId, {
      onSuccess: () => {
        if (selectedFolderId === deleteFolderId) {
          const deletedFolder = folders.find((f) => f.id === deleteFolderId);
          setSelectedFolderId(deletedFolder?.parent_folder_id || null);
        }
        setDeleteFolderId(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen bg-cozy-grain">
      {/* Breadcrumb Header Row */}
      <header className="flex items-center justify-between border-b px-6 py-4 bg-background/30 backdrop-blur-md">
        <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap scrollbar-none py-1">
          <button
            onClick={() => {
              setSelectedFolderId(null);
              setSelectedPage(null);
            }}
            className={cn(
              "font-display text-lg font-semibold hover:text-primary transition-colors",
              selectedFolderId === null ? "text-lagoon" : "text-muted-foreground"
            )}
          >
            Notebooks
          </button>
          
          {breadcrumbs.map((folder, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={folder.id} className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground/45" />
                <button
                  disabled={isLast && !selectedPage}
                  onClick={() => {
                    setSelectedFolderId(folder.id);
                    setSelectedPage(null);
                  }}
                  className={cn(
                    "font-display text-lg font-semibold hover:text-primary transition-colors",
                    (isLast && !selectedPage) ? "text-lagoon" : "text-muted-foreground"
                  )}
                >
                  {folder.name}
                </button>
              </div>
            );
          })}

          {selectedPage && (
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground/45" />
              <span className="font-display text-lg font-semibold text-lagoon max-w-[120px] sm:max-w-[200px] truncate">
                {selectedPage.title || "Untitled"}
              </span>
            </div>
          )}
        </div>

        {/* Action bar at the right of Header */}
        {!selectedPage && (
          <div className="flex items-center gap-2 shrink-0">
            {selectedFolderId === null ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New notebook…"
                  className="h-9 w-40 sm:w-48 border-white/10 bg-white/[0.03] text-sm"
                  onKeyDown={(e) => e.key === "Enter" && addRoot()}
                />
                <Button onClick={addRoot} size="sm" className="bg-lagoon text-cream hover:bg-lagoon/90">
                  <FolderPlus className="h-4 w-4 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Add Notebook</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setCreateSubFolderParentId(selectedFolderId);
                    setCreateSubFolderName("");
                  }}
                  variant="outline"
                  size="sm"
                  className="border-white/10 bg-white/[0.03] hover:bg-white/[0.08]"
                >
                  <FolderPlus className="h-4 w-4 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Sub-notebook</span>
                </Button>
                <Button onClick={addPage} size="sm" className="bg-lagoon text-cream hover:bg-lagoon/90">
                  <Plus className="h-4 w-4 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">New page</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main content body area */}
      <div className="flex-1 overflow-auto">
        {selectedPage ? (
          <PageEditor
            key={selectedPage.id}
            page={selectedPage}
            onClose={() => setSelectedPage(null)}
            onChange={(patch) => updateItem.mutate({ id: selectedPage.id, patch })}
            onArchive={() => {
              updateItem.mutate({ id: selectedPage.id, patch: { archived: true } });
              setSelectedPage(null);
            }}
            onDelete={() => {
              deleteItem.mutate(selectedPage.id);
              setSelectedPage(null);
            }}
          />
        ) : (
          <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Folders/Notebooks Section */}
            {(currentFolders.length > 0 || selectedFolderId === null) && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  {selectedFolderId === null ? "My Notebooks" : "Sub-notebooks"}
                </h2>
                
                {currentFolders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-muted-foreground bg-white/[0.01]">
                    <FolderIcon className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm">No notebooks yet.</p>
                    <p className="text-xs mt-1">Create one using the input field above.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {currentFolders.map((folder) => (
                      <div
                        key={folder.id}
                        onClick={() => setSelectedFolderId(folder.id)}
                        className="group relative flex items-center justify-between p-4 bg-card/45 backdrop-blur-md border border-white/5 rounded-2xl hover:bg-card hover:border-primary/20 hover:shadow-soft transition-all duration-300 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FolderIcon className="h-5 w-5 shrink-0" style={{ color: folder.color || "#06b6d4" }} />
                          <span className="truncate font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                            {folder.name}
                          </span>
                        </div>
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setRenameFolderId(folder.id);
                              setRenameFolderName(folder.name);
                            }}
                            className="rounded p-1 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteFolderId(folder.id)}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pages Section */}
            {selectedFolderId !== null && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Pages
                </h2>
                
                {pages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-muted-foreground bg-white/[0.01]">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm">No pages here yet.</p>
                    <Button onClick={addPage} size="sm" variant="link" className="mt-2 text-lagoon hover:text-lagoon/90 font-medium">
                      Create your first page
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pages.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPage(p)}
                        className="rounded-2xl border border-white/5 bg-card/45 p-5 text-left shadow-soft transition-all duration-300 hover:shadow-note hover:bg-card hover:border-primary/20"
                      >
                        <div className="flex items-center gap-2 text-clay">
                          <FileText className="h-4 w-4" />
                          <span className="text-xs uppercase tracking-wider font-semibold">Page</span>
                        </div>
                        <h3 className="mt-3 truncate font-display text-lg text-lagoon font-semibold">{p.title || "Untitled"}</h3>
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground h-12 leading-relaxed">{p.content || "No content yet..."}</p>
                        <p className="mt-4 text-xs text-muted-foreground/70">Edited {format(new Date(p.updated_at), "MMM d, yyyy")}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Sub-Notebook Dialog */}
      <Dialog open={createSubFolderParentId !== null} onOpenChange={(open) => !open && setCreateSubFolderParentId(null)}>
        <DialogContent className="border-white/10 bg-[#1e1a1d] text-foreground sm:max-w-[425px]">
          <form onSubmit={handleCreateSubFolder}>
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-lagoon">New notebook name</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={createSubFolderName}
                onChange={(e) => setCreateSubFolderName(e.target.value)}
                placeholder="Notebook name…"
                className="col-span-3"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateSubFolderParentId(null)} className="border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/10 hover:text-foreground">
                Cancel
              </Button>
              <Button type="submit" className="bg-lagoon text-cream hover:bg-lagoon/90">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Notebook Dialog */}
      <Dialog open={renameFolderId !== null} onOpenChange={(open) => !open && setRenameFolderId(null)}>
        <DialogContent className="border-white/10 bg-[#1e1a1d] text-foreground sm:max-w-[425px]">
          <form onSubmit={handleRenameFolder}>
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-lagoon">Rename notebook</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                placeholder="New name…"
                className="col-span-3"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setRenameFolderId(null)} className="border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/10 hover:text-foreground">
                Cancel
              </Button>
              <Button type="submit" className="bg-lagoon text-cream hover:bg-lagoon/90">Rename</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Notebook Dialog */}
      <AlertDialog open={deleteFolderId !== null} onOpenChange={(open) => !open && setDeleteFolderId(null)}>
        <AlertDialogContent className="border-white/10 bg-[#1e1a1d] text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-lagoon">Delete this notebook?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action will delete this notebook and all its pages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/10 hover:text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/95">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
