import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronRight,
  ChevronDown,
  NotebookText,
  Folder,
  FolderOpen,
  FileText,
  Plus,
  BookOpen,
} from "lucide-react";
import { useCreateFolder, useCreateItem, useFolders, useItems } from "@/hooks/use-lifeos";
import type { Folder as FolderType, Item } from "@/lib/lifeos-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SidebarNotebookTreeProps {
  currentPath: string;
}

export function SidebarNotebookTree({ currentPath }: SidebarNotebookTreeProps) {
  const { data: folders = [] } = useFolders();
  const { data: items = [] } = useItems();
  const createFolder = useCreateFolder();
  const createItem = useCreateItem();
  const navigate = useNavigate();

  const routerSearch = useRouterState({
    select: (s) => (s.location.search as { folderId?: string; pageId?: string }) || {},
  });

  const currentFolderId = routerSearch.folderId || null;
  const currentPageId = routerSearch.pageId || null;

  // Root expandable state (default true)
  const [rootExpanded, setRootExpanded] = useState(true);

  // Map of expanded folder IDs
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const isNotebooksRoute = currentPath === "/notebooks" || currentPath.startsWith("/notebooks");

  // Filter only notebook pages (non-archived)
  const notebookPages = useMemo(
    () => items.filter((i) => i.type === "notebook_page" && !i.archived),
    [items]
  );

  // Auto expand parent folders when active folder/page changes
  useEffect(() => {
    let targetFolderId = currentFolderId;
    if (currentPageId && !targetFolderId) {
      const page = notebookPages.find((p) => p.id === currentPageId);
      if (page) targetFolderId = page.folder_id;
    }

    if (targetFolderId) {
      const parents: string[] = [];
      let cur: string | null = targetFolderId;
      while (cur) {
        parents.push(cur);
        const f = folders.find((x) => x.id === cur);
        cur = f?.parent_folder_id ?? null;
      }
      setExpandedFolders((prev) => {
        const next = { ...prev };
        let changed = false;
        parents.forEach((id) => {
          if (!next[id]) {
            next[id] = true;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [currentFolderId, currentPageId, folders, notebookPages]);

  const toggleFolderExpand = (folderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleQuickAddPage = (folderId: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!folderId) {
      toast.error("Open or create a folder first to add pages");
      return;
    }
    createItem.mutate(
      {
        type: "notebook_page",
        title: "Untitled",
        content: JSON.stringify({ version: 2, blocks: [{ id: `b-${Date.now()}`, kind: "text", content: "" }] }),
        folder_id: folderId,
      },
      {
        onSuccess: (newPage) => {
          toast.success("New page created");
          setExpandedFolders((prev) => ({ ...prev, [folderId]: true }));
          navigate({
            to: "/notebooks",
            search: { folderId, pageId: newPage.id },
          });
        },
      }
    );
  };

  const isRootActive = isNotebooksRoute && !currentFolderId && !currentPageId;

  // Recursive tree rendering function
  const renderSubTree = (parentId: string | null, depth: number) => {
    const childFolders = folders.filter((f) => (f.parent_folder_id ?? null) === parentId);
    const childPages = notebookPages.filter((p) => (p.folder_id ?? null) === parentId);

    if (childFolders.length === 0 && childPages.length === 0) return null;

    return (
      <div className="space-y-0.5">
        {childFolders.map((folder) => {
          const isExpanded = !!expandedFolders[folder.id];
          const hasChildren =
            folders.some((f) => f.parent_folder_id === folder.id) ||
            notebookPages.some((p) => p.folder_id === folder.id);
          const isFolderActive = isNotebooksRoute && currentFolderId === folder.id && !currentPageId;

          return (
            <div key={folder.id} className="select-none">
              <div
                onClick={() => {
                  setExpandedFolders((prev) => ({ ...prev, [folder.id]: true }));
                  navigate({
                    to: "/notebooks",
                    search: { folderId: folder.id, pageId: undefined },
                  });
                }}
                className={cn(
                  "group relative flex items-center gap-1.5 rounded-lg py-1.5 pr-2 text-xs font-medium transition-all cursor-pointer",
                  isFolderActive
                    ? "bg-white/10 text-foreground font-semibold shadow-sm border border-white/10"
                    : "text-sidebar-foreground/80 hover:bg-white/[0.05] hover:text-foreground"
                )}
                style={{ paddingLeft: `${depth * 14 + 16}px` }}
              >
                {/* Expand / Collapse Chevron */}
                <button
                  type="button"
                  onClick={(e) => toggleFolderExpand(folder.id, e)}
                  className={cn(
                    "p-0.5 rounded hover:bg-white/10 text-muted-foreground transition-colors shrink-0",
                    !hasChildren && "invisible"
                  )}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                {/* Folder Icon */}
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-amber-400" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0 text-amber-400/90 group-hover:text-amber-400" />
                )}

                {/* Folder Label */}
                <span className="truncate flex-1 text-xs">{folder.name}</span>

                {/* Quick Add Page on hover */}
                <button
                  type="button"
                  title="Add page inside folder"
                  onClick={(e) => handleQuickAddPage(folder.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all shrink-0 ml-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Sub-tree children */}
              {isExpanded && renderSubTree(folder.id, depth + 1)}
            </div>
          );
        })}

        {/* Notebook pages at this level */}
        {childPages.map((page) => {
          const isPageActive = isNotebooksRoute && currentPageId === page.id;

          return (
            <div key={page.id} className="select-none">
              <div
                onClick={() => {
                  navigate({
                    to: "/notebooks",
                    search: { folderId: page.folder_id ?? undefined, pageId: page.id },
                  });
                }}
                className={cn(
                  "group relative flex items-center gap-1.5 rounded-lg py-1.5 pr-2 text-xs font-medium transition-all cursor-pointer",
                  isPageActive
                    ? "bg-white/10 text-foreground font-semibold shadow-sm border border-white/10"
                    : "text-sidebar-foreground/75 hover:bg-white/[0.05] hover:text-foreground"
                )}
                style={{ paddingLeft: `${depth * 14 + 16}px` }}
              >
                {/* Alignment spacer matching chevron width */}
                <span className="w-4 shrink-0" />

                {/* Page Icon */}
                <FileText
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-colors",
                    isPageActive ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground"
                  )}
                />

                {/* Page Title */}
                <span className="truncate flex-1 text-xs">{page.title || "Untitled"}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="select-none space-y-0.5">
      {/* Root "Notebooks" Section Header */}
      <div
        className={cn(
          "group relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all cursor-pointer",
          isRootActive
            ? "bg-gradient-to-r from-primary/25 via-primary/10 to-transparent text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]"
            : "text-sidebar-foreground/80 hover:bg-white/[0.04] hover:text-foreground"
        )}
      >
        {isRootActive && (
          <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-accent shadow-[0_0_12px_oklch(0.78_0.14_160/0.8)]" />
        )}

        {/* Chevron expander for main Notebooks root */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRootExpanded((prev) => !prev);
          }}
          className="p-0.5 rounded hover:bg-white/10 text-muted-foreground transition-colors shrink-0"
        >
          {rootExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Main "Notebooks" Tab Label */}
        <div
          className="flex-1 flex items-center gap-2 min-w-0"
          onClick={() => {
            navigate({ to: "/notebooks" });
          }}
        >
          <NotebookText
            className={cn(
              "h-4 w-4 transition-colors shrink-0",
              isNotebooksRoute ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )}
            strokeWidth={isNotebooksRoute ? 2.25 : 1.75}
          />
          <span className="truncate text-sm font-medium">Notebooks</span>
        </div>
      </div>

      {/* Collapsible Tree Body */}
      {rootExpanded && (
        <div className="pt-0.5 space-y-0.5 animate-in fade-in duration-150">
          {renderSubTree(null, 0)}
        </div>
      )}
    </div>
  );
}
