import { supabase } from "@/lib/supabase";

export type InventoryStatusFilter = "all" | "in_stock" | "sold";
export type InventoryDeviceStatus = "in_stock" | "sold";
export type InventorySortBy =
  | "created_desc"
  | "name"
  | "in_stock_first"
  | "stock_age_desc"
  | "buy_date_desc";

export type InventoryItem = {
  id: string;
  model_id: string;
  model_name: string | null;
  model_image: string | null;
  serial_or_imei: string;
  status: InventoryDeviceStatus;
  created_at: string;
  images: { image_url: string }[];
  buy: {
    id?: string;
    buy_price?: number;
    buy_date?: string;
    snapshot_name?: string;
    snapshot_phone?: string;
    snapshot_address?: string;
    snapshot_province_id?: number | null;
    snapshot_province_name?: string;
  } | null;
  sell: {
    id?: string;
    sell_price?: number;
    sell_date?: string;
    snapshot_name?: string;
    snapshot_phone?: string;
    snapshot_address?: string;
    snapshot_province_id?: number | null;
    snapshot_province_name?: string;
    shipping_fee?: number;
    shipping_paid_by?: string | null;
  } | null;
};

export type UpdateBuyTransactionInput = {
  storeId: string;
  buyTransactionId: string;
  buy_price: number;
  buy_date: string;
  snapshot_name: string;
  snapshot_phone?: string;
  snapshot_address?: string;
  snapshot_province_id?: number | null;
};

export type UpdateSellTransactionInput = {
  storeId: string;
  sellTransactionId: string;
  sell_price: number;
  sell_date: string;
  snapshot_name: string;
  snapshot_phone?: string;
  snapshot_address?: string;
  snapshot_province_id?: number | null;
};

export type UpdateInventoryStatusInput = {
  storeId: string;
  deviceId: string;
  status: InventoryDeviceStatus;
};

export type UploadInventoryImagesInput = {
  storeId: string;
  deviceId: string;
  images: File[];
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type InventoryListFilters = {
  dateFrom?: string;
  dateTo?: string;
  modelIds?: string[];
  buyProvinceId?: number;
  sellProvinceId?: number;
};

type GetInventoryListParams = {
  storeId: string;
  status: InventoryStatusFilter;
  sortBy?: InventorySortBy;
  searchTerm: string;
  page: number;
  pageSize: number;
  filters?: InventoryListFilters;
};

function normalizeText(v: string | undefined | null) {
  return (v || "").trim().toLowerCase();
}

function matchesFullText(haystack: string, query: string) {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  return terms.every((t) => haystack.includes(t));
}

function applyStatusFilter(items: InventoryItem[], status: InventoryStatusFilter) {
  if (status === "all") return items;
  return items.filter((x) => x.status === status);
}

function applySearch(items: InventoryItem[], searchTerm: string) {
  return items.filter((x) => {
    const haystack = normalizeText(
      [
        x.model_name,
        x.serial_or_imei,
        x.buy?.snapshot_name,
        x.buy?.snapshot_phone,
        x.sell?.snapshot_name,
        x.sell?.snapshot_phone,
      ]
        .filter(Boolean)
        .join(" "),
    );
    return matchesFullText(haystack, searchTerm);
  });
}

function normalizeDateInput(value?: string) {
  const normalized = (value ?? "").trim();
  if (!normalized) return null;
  const parsed = Date.parse(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed)) return null;
  return normalized;
}

function getFilterDate(item: InventoryItem) {
  return item.sell?.sell_date ?? item.buy?.buy_date ?? item.created_at;
}

function applyAdvancedFilters(items: InventoryItem[], filters?: InventoryListFilters) {
  if (!filters) return items;

  const dateFrom = normalizeDateInput(filters.dateFrom);
  const dateTo = normalizeDateInput(filters.dateTo);
  const fromTime = dateFrom ? Date.parse(`${dateFrom}T00:00:00`) : null;
  const toTime = dateTo ? Date.parse(`${dateTo}T23:59:59.999`) : null;
  const modelSet = new Set((filters.modelIds ?? []).map((id) => id.trim()).filter(Boolean));
  const buyProvinceId = Number.isFinite(filters.buyProvinceId)
    ? Number(filters.buyProvinceId)
    : null;
  const sellProvinceId = Number.isFinite(filters.sellProvinceId)
    ? Number(filters.sellProvinceId)
    : null;

  return items.filter((item) => {
    if (modelSet.size > 0 && !modelSet.has(item.model_id)) return false;

    if (buyProvinceId && item.buy?.snapshot_province_id !== buyProvinceId) return false;
    if (sellProvinceId && item.sell?.snapshot_province_id !== sellProvinceId) return false;

    if (fromTime !== null || toTime !== null) {
      const filterDate = getFilterDate(item);
      const itemTime = Date.parse(filterDate);
      if (Number.isNaN(itemTime)) return false;
      if (fromTime !== null && itemTime < fromTime) return false;
      if (toTime !== null && itemTime > toTime) return false;
    }

    return true;
  });
}

function applyPagination(items: InventoryItem[], page: number, pageSize: number) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const start = (safePage - 1) * pageSize;
  const pagedItems = items.slice(start, start + pageSize);

  const meta: PaginationMeta = {
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
  };

  return { pagedItems, meta };
}

function getNameSortPriority(name: string) {
  const normalized = name.trim().toUpperCase().replace(/\s+/g, "");
  if (normalized.startsWith("WH-1000") || normalized.startsWith("WH1000")) return 0;
  if (normalized.startsWith("WF")) return 1;
  if (normalized.startsWith("WH")) return 2;
  return 3;
}

function getModelGenerationRank(name: string) {
  const normalized = name.trim().toUpperCase().replace(/\s+/g, "");
  const xmMatch = normalized.match(/XM(\d+)/);
  if (xmMatch) return Number(xmMatch[1]);

  const allNumbers = normalized.match(/\d+/g);
  if (!allNumbers || allNumbers.length === 0) return -1;
  const lastNumber = allNumbers[allNumbers.length - 1];
  return Number(lastNumber);
}

function getStockAgeDays(item: InventoryItem) {
  const baseDate = item.buy?.buy_date ?? item.created_at;
  const start = Date.parse(baseDate);
  if (Number.isNaN(start)) return 0;
  const diff = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function getBuyDateTime(item: InventoryItem) {
  const buyDateTime = Date.parse(item.buy?.buy_date ?? "");
  if (!Number.isNaN(buyDateTime)) return buyDateTime;
  return Date.parse(item.created_at);
}

function applySort(items: InventoryItem[], sortBy: InventorySortBy) {
  if (sortBy === "name") {
    return [...items].sort((a, b) => {
      const aName = a.model_name ?? a.serial_or_imei;
      const bName = b.model_name ?? b.serial_or_imei;
      const pa = getNameSortPriority(aName);
      const pb = getNameSortPriority(bName);
      if (pa !== pb) return pa - pb;

      const aRank = getModelGenerationRank(aName);
      const bRank = getModelGenerationRank(bName);
      if (aRank !== bRank) return bRank - aRank;

      return aName.localeCompare(bName, "vi", { sensitivity: "base" });
    });
  }

  if (sortBy === "in_stock_first") {
    return [...items].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "in_stock" ? -1 : 1;
      }
      return Date.parse(b.created_at) - Date.parse(a.created_at);
    });
  }

  if (sortBy === "stock_age_desc") {
    return [...items].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "in_stock" ? -1 : 1;
      }
      if (a.status === "in_stock" && b.status === "in_stock") {
        return getStockAgeDays(b) - getStockAgeDays(a);
      }
      return Date.parse(b.created_at) - Date.parse(a.created_at);
    });
  }

  if (sortBy === "buy_date_desc") {
    return [...items].sort((a, b) => getBuyDateTime(b) - getBuyDateTime(a));
  }

  return [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function selectLatestByDate<T extends { created_at?: string; buy_date?: string; sell_date?: string }>(
  rows: T[] | null | undefined,
) {
  if (!rows || rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => {
    const aTime = Date.parse(a.created_at ?? a.buy_date ?? a.sell_date ?? "");
    const bTime = Date.parse(b.created_at ?? b.buy_date ?? b.sell_date ?? "");
    return bTime - aTime;
  });
  return sorted[0] ?? null;
}

function normalizeDevice(device: any): InventoryItem {
  const buy = selectLatestByDate(device.buy_transactions) as any | null;
  const sell = selectLatestByDate(buy?.sell_transactions) as any | null;
  const buyProvinceName = buy?.provinces?.name ?? null;
  const sellProvinceName = sell?.provinces?.name ?? null;

  return {
    id: device.id,
    model_id: device.model_id,
    model_name: device.models?.name ?? null,
    model_image: device.models?.image ?? null,
    serial_or_imei: device.serial_or_imei,
    status: device.status,
    created_at: device.created_at,
    images: device.device_images ?? [],
    buy: buy
      ? {
          id: buy.id,
          buy_price: buy.buy_price,
          buy_date: buy.buy_date,
          snapshot_name: buy.snapshot_name,
          snapshot_phone: buy.snapshot_phone,
          snapshot_address: buy.snapshot_address ?? "",
          snapshot_province_id: buy.snapshot_province_id ?? null,
          snapshot_province_name: buyProvinceName ?? undefined,
        }
      : null,
    sell: sell
      ? {
          id: sell.id,
          sell_price: sell.sell_price,
          sell_date: sell.sell_date,
          snapshot_name: sell.snapshot_name,
          snapshot_phone: sell.snapshot_phone,
          snapshot_address: sell.snapshot_address ?? "",
          snapshot_province_id: sell.snapshot_province_id ?? null,
          snapshot_province_name: sellProvinceName ?? undefined,
          shipping_fee: sell.shipping_fee,
          shipping_paid_by: sell.shipping_paid_by,
        }
      : null,
  };
}

function normalizePhone(phone?: string) {
  return (phone ?? "").replace(/\D/g, "");
}

function validatePhone(phone?: string) {
  if (!phone) return null;
  const clean = normalizePhone(phone);
  if (clean.length !== 10) return "Phone must be exactly 10 digits";
  return null;
}

function normalizeProvinceId(value?: number | null) {
  if (!Number.isFinite(value)) return null;
  const normalized = Number(value);
  return normalized > 0 ? normalized : null;
}

export async function updateBuyTransaction(input: UpdateBuyTransactionInput) {
  const phoneError = validatePhone(input.snapshot_phone);
  if (phoneError) throw new Error(phoneError);

  const payload = {
    buy_price: input.buy_price,
    buy_date: input.buy_date,
    snapshot_name: (input.snapshot_name ?? "").trim() || "N/A",
    snapshot_phone: normalizePhone(input.snapshot_phone) || "",
    snapshot_address: (input.snapshot_address ?? "").trim(),
    snapshot_province_id: normalizeProvinceId(input.snapshot_province_id),
  };

  const { error } = await supabase
    .from("buy_transactions")
    .update(payload)
    .eq("store_id", input.storeId)
    .eq("id", input.buyTransactionId);

  if (error) throw error;
  return { ok: true };
}

export async function updateSellTransaction(input: UpdateSellTransactionInput) {
  const phoneError = validatePhone(input.snapshot_phone);
  if (phoneError) throw new Error(phoneError);

  const payload = {
    sell_price: input.sell_price,
    sell_date: input.sell_date,
    snapshot_name: (input.snapshot_name ?? "").trim() || "N/A",
    snapshot_phone: normalizePhone(input.snapshot_phone) || "",
    snapshot_address: (input.snapshot_address ?? "").trim(),
    snapshot_province_id: normalizeProvinceId(input.snapshot_province_id),
  };

  const { error } = await supabase
    .from("sell_transactions")
    .update(payload)
    .eq("store_id", input.storeId)
    .eq("id", input.sellTransactionId);

  if (error) throw error;
  return { ok: true };
}

export async function uploadInventoryImages(input: UploadInventoryImagesInput) {
  if (!input.images || input.images.length === 0) return { ok: true };

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  for (const file of input.images) {
    const safeFileName = file.name.replace(/\s+/g, "-");
    const path = `${input.storeId}/${input.deviceId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("device-images")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage
      .from("device-images")
      .getPublicUrl(path);

    const { error: imageError } = await supabase.from("device_images").insert({
      owner_id: user.id,
      store_id: input.storeId,
      device_id: input.deviceId,
      image_url: publicData.publicUrl,
    });
    if (imageError) throw imageError;
  }

  return { ok: true };
}

export async function updateInventoryStatus(input: UpdateInventoryStatusInput) {
  const { error } = await supabase
    .from("devices")
    .update({ status: input.status })
    .eq("store_id", input.storeId)
    .eq("id", input.deviceId);

  if (error) throw error;
  return { ok: true };
}

export async function getInventoryList(params: GetInventoryListParams) {
  const {
    storeId,
    status,
    sortBy = "created_desc",
    searchTerm,
    page,
    pageSize,
    filters,
  } = params;

  const { data, error } = await supabase
    .from("devices")
    .select(
      `
      *,
      models (name,image),
      device_images (image_url),
      buy_transactions (
        *,
        provinces(name),
        sell_transactions (
          *,
          provinces(name)
        )
      )
    `,
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const normalized = (data || []).map(normalizeDevice);
  const byStatus = applyStatusFilter(normalized, status);
  const bySearch = applySearch(byStatus, searchTerm);
  const byAdvancedFilters = applyAdvancedFilters(bySearch, filters);
  const bySort = applySort(byAdvancedFilters, sortBy);
  const { pagedItems, meta } = applyPagination(bySort, page, pageSize);

  return {
    items: pagedItems,
    meta,
  };
}

export async function getInventoryById(params: { storeId: string; id: string }) {
  const { storeId, id } = params;
  const { data, error } = await supabase
    .from("devices")
    .select(
      `
      *,
      models (name,image),
      device_images (image_url),
      buy_transactions (
        *,
        provinces(name),
        sell_transactions (
          *,
          provinces(name)
        )
      )
    `,
    )
    .eq("store_id", storeId)
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeDevice(data);
}

export async function deleteInventoryById(params: { storeId: string; id: string }) {
  const { storeId, id } = params;
  if (!storeId) throw new Error("Missing store ID");
  if (!id) throw new Error("Missing inventory ID");

  const { data: buyRows, error: buySelectError } = await supabase
    .from("buy_transactions")
    .select("id")
    .eq("store_id", storeId)
    .eq("device_id", id);
  if (buySelectError) throw buySelectError;

  const buyIds = (buyRows ?? []).map((row) => row.id).filter(Boolean) as string[];

  if (buyIds.length > 0) {
    const { error: sellDeleteError } = await supabase
      .from("sell_transactions")
      .delete()
      .eq("store_id", storeId)
      .in("buy_transaction_id", buyIds);
    if (sellDeleteError) throw sellDeleteError;
  }

  const { error: buyDeleteError } = await supabase
    .from("buy_transactions")
    .delete()
    .eq("store_id", storeId)
    .eq("device_id", id);
  if (buyDeleteError) throw buyDeleteError;

  const { error: imageDeleteError } = await supabase
    .from("device_images")
    .delete()
    .eq("store_id", storeId)
    .eq("device_id", id);
  if (imageDeleteError) throw imageDeleteError;

  const { error: deviceDeleteError } = await supabase
    .from("devices")
    .delete()
    .eq("store_id", storeId)
    .eq("id", id);
  if (deviceDeleteError) throw deviceDeleteError;

  return { ok: true };
}
