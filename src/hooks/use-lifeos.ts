import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import type { Folder, FolderInsert, Item, ItemInsert, ItemUpdate } from "@/lib/lifeos-types";

const ITEMS_KEY = ["items"] as const;
const FOLDERS_KEY = ["folders"] as const;

/** Generate a temporary local id for optimistic inserts. */
function tempId() {
  return `__optimistic__${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useItems() {
  return useQuery({
    queryKey: ITEMS_KEY,
    queryFn: async (): Promise<Item[]> => {
      return apiClient.get<Item[]>("/api/items");
    },
  });
}

export function useFolders() {
  return useQuery({
    queryKey: FOLDERS_KEY,
    queryFn: async (): Promise<Folder[]> => {
      return apiClient.get<Folder[]>("/api/folders");
    },
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<ItemInsert, "user_id">) => {
      return apiClient.post<Item>("/api/items", input);
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ITEMS_KEY });
      const prev = qc.getQueryData<Item[]>(ITEMS_KEY);
      const optimistic: Item = {
        id: tempId(),
        user_id: "",
        title: input.title ?? null,
        content: input.content ?? null,
        type: input.type,
        folder_id: input.folder_id ?? null,
        color: input.color ?? null,
        tags: input.tags ?? [],
        due_date: input.due_date ?? null,
        event_date: input.event_date ?? null,
        pos_x: input.pos_x ?? null,
        pos_y: input.pos_y ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        priority: input.priority ?? null,
        completed: input.completed ?? false,
        pinned: input.pinned ?? false,
        archived: input.archived ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      qc.setQueryData<Item[]>(ITEMS_KEY, (old = []) => [optimistic, ...old]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ITEMS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ITEMS_KEY }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ItemUpdate }) => {
      const apiPatch = { ...patch } as any;
      
      // Map null values to explicit clear flags for EF Core DTO compatibility
      if (patch.folder_id === null) {
        apiPatch.clear_folder_id = true;
        apiPatch.clearFolderId = true;
      }
      if (patch.due_date === null) {
        apiPatch.clear_due_date = true;
        apiPatch.clearDueDate = true;
      }
      if (patch.event_date === null) {
        apiPatch.clear_event_date = true;
        apiPatch.clearEventDate = true;
      }

      return apiClient.patch<Item>(`/api/items/${id}`, apiPatch);
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ITEMS_KEY });
      const prev = qc.getQueryData<Item[]>(ITEMS_KEY);
      if (prev) {
        qc.setQueryData<Item[]>(
          ITEMS_KEY,
          prev.map((i) => (i.id === id ? { ...i, ...patch } as Item : i)),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ITEMS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ITEMS_KEY }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/items/${id}`);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ITEMS_KEY });
      const prev = qc.getQueryData<Item[]>(ITEMS_KEY);
      qc.setQueryData<Item[]>(ITEMS_KEY, (old = []) => old.filter((i) => i.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ITEMS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ITEMS_KEY }),
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<FolderInsert, "user_id">) => {
      return apiClient.post<Folder>("/api/folders", input);
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: FOLDERS_KEY });
      const prev = qc.getQueryData<Folder[]>(FOLDERS_KEY);
      const optimistic: Folder = {
        id: tempId(),
        user_id: "",
        name: input.name,
        parent_folder_id: input.parent_folder_id ?? null,
        color: input.color ?? "#6ee7b7",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      qc.setQueryData<Folder[]>(FOLDERS_KEY, (old = []) => [...old, optimistic]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(FOLDERS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: FOLDERS_KEY }),
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Folder> }) => {
      await apiClient.patch(`/api/folders/${id}`, patch);
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: FOLDERS_KEY });
      const prev = qc.getQueryData<Folder[]>(FOLDERS_KEY);
      qc.setQueryData<Folder[]>(
        FOLDERS_KEY,
        (old = []) => old.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(FOLDERS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: FOLDERS_KEY }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/folders/${id}`);
      await qc.invalidateQueries({ queryKey: ITEMS_KEY });
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: FOLDERS_KEY });
      const prev = qc.getQueryData<Folder[]>(FOLDERS_KEY);
      qc.setQueryData<Folder[]>(FOLDERS_KEY, (old = []) => old.filter((f) => f.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(FOLDERS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: FOLDERS_KEY }),
  });
}
