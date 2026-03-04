import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  createBuy,
  createSell,
  getSellableBuyTransactions,
  type CreateBuyInput,
  type CreateSellInput,
} from "@/src/services/inventory-transactions";
import {
  deleteInventoryById,
  getInventoryById,
  getInventoryList,
  uploadInventoryImages,
  updateInventoryStatus,
  updateBuyTransaction,
  updateSellTransaction,
  type UploadInventoryImagesInput,
  type UpdateInventoryStatusInput,
  type UpdateBuyTransactionInput,
  type UpdateSellTransactionInput,
  type InventoryListFilters,
  type InventorySortBy,
  type InventoryStatusFilter,
} from "@/src/services/inventory";
import {
  createModel,
  deleteModel,
  getModels,
  updateModel,
  type ModelItem,
} from "@/src/services/models";
import { getProvinces } from "@/src/services/provinces";
import { getDashboardKpi } from "@/src/services/dashboard";

export const queryKeys = {
  inventory: {
    all: ["inventory"] as const,
    list: (params: {
      storeId: string;
      status: InventoryStatusFilter;
      sortBy: InventorySortBy;
      searchTerm: string;
      page: number;
      pageSize: number;
      filters?: InventoryListFilters;
    }) => ["inventory", "list", params] as const,
    detail: (params: { storeId: string; id: string }) =>
      ["inventory", "detail", params] as const,
  },
  models: {
    all: ["models"] as const,
    list: (params: { storeId: string; searchTerm: string }) =>
      ["models", "list", params] as const,
  },
  provinces: {
    all: ["provinces"] as const,
    list: ["provinces", "list"] as const,
  },
  transactions: {
    sellableBuys: (params: { storeId: string }) =>
      ["transactions", "sellable-buys", params] as const,
  },
  auth: {
    session: ["auth", "session"] as const,
  },
  store: {
    id: (userId: string) => ["store", "id", userId] as const,
  },
  dashboard: {
    kpi: (params: { storeId: string; fromDate?: string; toDate?: string }) =>
      ["dashboard", "kpi", params] as const,
  },
};

export function useInventoryListQuery(params: {
  storeId: string;
  status: InventoryStatusFilter;
  sortBy: InventorySortBy;
  searchTerm: string;
  page: number;
  pageSize: number;
  filters?: InventoryListFilters;
}) {
  return useQuery({
    queryKey: queryKeys.inventory.list(params),
    queryFn: () => getInventoryList(params),
    enabled: Boolean(params.storeId),
  });
}

export function useInventoryDetailQuery(params: { storeId: string; id: string }) {
  return useQuery({
    queryKey: queryKeys.inventory.detail(params),
    queryFn: () => getInventoryById(params),
    enabled: Boolean(params.storeId && params.id),
  });
}

export function useDeleteInventoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInventoryById,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void queryClient.invalidateQueries({
        queryKey: ["transactions", "sellable-buys"],
      });
    },
  });
}

export function useModelsQuery(params: { storeId: string; searchTerm: string }) {
  return useQuery({
    queryKey: queryKeys.models.list(params),
    queryFn: () => getModels(params),
    enabled: Boolean(params.storeId),
  });
}

export function useCreateModelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createModel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.models.all });
    },
  });
}

export function useUpdateModelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateModel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.models.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useDeleteModelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteModel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.models.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useProvincesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.provinces.list,
    queryFn: getProvinces,
    enabled,
    staleTime: 1000 * 60 * 10,
  });
}

export function useSellableBuyTransactionsQuery(params: { storeId: string }) {
  return useQuery({
    queryKey: queryKeys.transactions.sellableBuys(params),
    queryFn: () => getSellableBuyTransactions(params),
    enabled: Boolean(params.storeId),
  });
}

export function useCreateBuyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBuyInput) => createBuy(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void queryClient.invalidateQueries({
        queryKey: ["transactions", "sellable-buys"],
      });
    },
  });
}

export function useCreateSellMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSellInput) => createSell(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void queryClient.invalidateQueries({
        queryKey: ["transactions", "sellable-buys"],
      });
    },
  });
}

export function useUpdateBuyTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBuyTransactionInput) => updateBuyTransaction(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useUpdateSellTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSellTransactionInput) => updateSellTransaction(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useUploadInventoryImagesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadInventoryImagesInput) => uploadInventoryImages(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useUpdateInventoryStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInventoryStatusInput) => updateInventoryStatus(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useSignInMutation() {
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword(input);
      if (error) throw error;
      return { ok: true };
    },
  });
}

export function useSignUpMutation() {
  return useMutation({
    mutationFn: async (input: {
      email: string;
      password: string;
      storeId: string;
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            store_id: input.storeId,
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useAuthSessionQuery() {
  return useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
    staleTime: 1000 * 30,
  });
}

export function useStoreIdQuery(params: {
  userId: string;
  enabled: boolean;
  fallbackStoreId?: string;
}) {
  return useQuery({
    queryKey: queryKeys.store.id(params.userId),
    enabled: params.enabled,
    queryFn: async () => {
      if (params.fallbackStoreId) return params.fallbackStoreId;

      const byId = await supabase
        .from("profiles")
        .select("store_id")
        .eq("id", params.userId)
        .maybeSingle();

      if (!byId.error && byId.data?.store_id) {
        return String(byId.data.store_id);
      }

      const byUserId = await supabase
        .from("profiles")
        .select("store_id")
        .eq("user_id", params.userId)
        .maybeSingle();

      if (!byUserId.error && byUserId.data?.store_id) {
        return String(byUserId.data.store_id);
      }

      return "";
    },
  });
}

export function useDashboardKpiQuery(params: {
  storeId: string;
  fromDate?: string;
  toDate?: string;
}) {
  return useQuery({
    queryKey: queryKeys.dashboard.kpi(params),
    queryFn: () => getDashboardKpi(params),
    enabled: Boolean(params.storeId),
  });
}

export function sortModelsForPicker(models: ModelItem[]) {
  const getPriority = (name: string) => {
    const upper = name.trim().toUpperCase();
    if (upper.startsWith("WF")) return 0;
    if (upper.startsWith("WH")) return 1;
    return 2;
  };

  return [...models].sort((a, b) => {
    const pa = getPriority(a.name);
    const pb = getPriority(b.name);
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
  });
}
