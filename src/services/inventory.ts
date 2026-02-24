import { supabase } from "@/lib/supabase";

export type InventoryStatusFilter = "all" | "in_stock" | "sold";
export type InventoryDeviceStatus = "in_stock" | "sold";

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
    buy_price?: number;
    buy_date?: string;
    snapshot_name?: string;
    snapshot_phone?: string;
  } | null;
  sell: {
    sell_price?: number;
    sell_date?: string;
    snapshot_name?: string;
    snapshot_phone?: string;
    shipping_fee?: number;
    shipping_paid_by?: string | null;
  } | null;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type GetInventoryListParams = {
  storeId: string;
  status: InventoryStatusFilter;
  searchTerm: string;
  page: number;
  pageSize: number;
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
          buy_price: buy.buy_price,
          buy_date: buy.buy_date,
          snapshot_name: buy.snapshot_name,
          snapshot_phone: buy.snapshot_phone,
        }
      : null,
    sell: sell
      ? {
          sell_price: sell.sell_price,
          sell_date: sell.sell_date,
          snapshot_name: sell.snapshot_name,
          snapshot_phone: sell.snapshot_phone,
          shipping_fee: sell.shipping_fee,
          shipping_paid_by: sell.shipping_paid_by,
        }
      : null,
  };
}

export async function getInventoryList(params: GetInventoryListParams) {
  const { storeId, status, searchTerm, page, pageSize } = params;

  const { data, error } = await supabase
    .from("devices")
    .select(
      `
      *,
      models (name,image),
      device_images (image_url),
      buy_transactions (
        *,
        sell_transactions (*)
      )
    `,
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const normalized = (data || []).map(normalizeDevice);
  const byStatus = applyStatusFilter(normalized, status);
  const bySearch = applySearch(byStatus, searchTerm);
  const { pagedItems, meta } = applyPagination(bySearch, page, pageSize);

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
        sell_transactions (*)
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
