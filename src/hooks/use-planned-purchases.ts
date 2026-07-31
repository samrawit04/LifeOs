import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";

export interface PlannedPurchase {
  id: string;
  userId: string;
  name: string;
  amount: number;
  category: string;
  purchased: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlannedPurchaseInput {
  name: string;
  amount: number;
  category: string;
}

export interface UpdatePlannedPurchaseInput {
  name?: string;
  amount?: number;
  category?: string;
  purchased?: boolean;
}

const KEY = ["planned-purchases"] as const;

function normalizePlannedPurchase(p: any): PlannedPurchase {
  return {
    id: p.id,
    userId: p.userId ?? p.user_id ?? "",
    name: p.name ?? "",
    amount: Number(p.amount ?? 0),
    category: p.category ?? "Shopping",
    purchased: p.purchased ?? false,
    createdAt: p.createdAt ?? p.created_at ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? p.updated_at ?? new Date().toISOString(),
  };
}

export function usePlannedPurchases() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<PlannedPurchase[]> => {
      const data = await apiClient.get<any[]>("/api/planned-purchases");
      return data.map(normalizePlannedPurchase);
    },
  });
}

export function useCreatePlannedPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePlannedPurchaseInput): Promise<PlannedPurchase> => {
      const data = await apiClient.post<any>("/api/planned-purchases", input);
      return normalizePlannedPurchase(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdatePlannedPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdatePlannedPurchaseInput }) => {
      const data = await apiClient.patch<any>(`/api/planned-purchases/${id}`, patch);
      return normalizePlannedPurchase(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePlannedPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/planned-purchases/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
