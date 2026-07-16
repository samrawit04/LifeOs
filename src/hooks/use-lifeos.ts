import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import type { Folder, FolderInsert, Item, ItemInsert, ItemUpdate } from "@/lib/lifeos-types";

const ITEMS_KEY = ["items"] as const;
const FOLDERS_KEY = ["folders"] as const;

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ITEMS_KEY }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ItemUpdate }) => {
      const apiPatch = { ...patch } as any;
      
      // Map null values to explicit clear flags for EF Core DTO compatibility
      if (patch.folder_id === null) {
        apiPatch.clearFolderId = true;
      }
      if (patch.due_date === null) {
        apiPatch.clearDueDate = true;
      }
      if (patch.event_date === null) {
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ITEMS_KEY }),
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<FolderInsert, "user_id">) => {
      return apiClient.post<Folder>("/api/folders", input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FOLDERS_KEY }),
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Folder> }) => {
      await apiClient.patch(`/api/folders/${id}`, patch);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FOLDERS_KEY }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/folders/${id}`);
      await qc.invalidateQueries({ queryKey: ITEMS_KEY });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FOLDERS_KEY }),
  });
}
