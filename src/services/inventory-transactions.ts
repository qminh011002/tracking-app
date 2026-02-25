import { supabase } from "@/lib/supabase";

export type CreateBuyInput = {
  storeId: string;
  model_id: string;
  serial_or_imei?: string;
  seller_name?: string;
  seller_phone?: string;
  seller_address?: string;
  seller_province_id?: number;
  buy_price?: number;
  buy_date?: string;
  images?: File[];
};

export type CreateSellInput = {
  storeId: string;
  buy_transaction_id: string;
  sell_type: "SHIP" | "DIRECT";
  city?: "Da Nang" | "Sai Gon" | "Ha Noi" | "Other";
  buyer_name: string;
  buyer_phone?: string;
  buyer_address?: string;
  buyer_province_id?: number;
  sell_price: number;
  deposit_amount?: number | null;
  shipping_fee?: number;
  shipping_paid_by?: "seller" | "buyer" | "";
  sell_date: string;
  images?: File[];
};

export type CreateTransactionResult = {
  ok: boolean;
  device_id?: string;
  contact_id?: string;
  error?: string;
};

export type SellableBuyTransactionItem = {
  buy_transaction_id: string;
  model_name: string;
  model_image: string | null;
  serial_or_imei: string;
};

function normalizePhone(phone?: string) {
  const clean = (phone ?? "").replace(/\D/g, "");
  return clean;
}

function validatePhone(phone?: string) {
  if (!phone) return null;
  const clean = normalizePhone(phone);
  if (clean.length !== 10) return "Phone must be exactly 10 digits";
  return null;
}

function normalizeProvinceId(value?: number) {
  if (!Number.isFinite(value)) return null;
  const normalized = Number(value);
  return normalized > 0 ? normalized : null;
}

function inferLegacyCityFromProvinceId(provinceId: number | null) {
  if (!provinceId) return null;
  if (provinceId === 1) return "Ha Noi";
  if (provinceId === 4) return "Da Nang";
  if (provinceId === 2) return "Sai Gon";
  return "Other";
}

export async function getSellableBuyTransactions(params: { storeId: string }) {
  const { storeId } = params;
  const { data, error } = await supabase
    .from("buy_transactions")
    .select(
      `
      id,
      created_at,
      sell_transactions (id),
      devices!inner (
        id,
        status,
        serial_or_imei,
        models (
          name,
          image
        )
      )
    `,
    )
    .eq("store_id", storeId)
    .eq("devices.store_id", storeId)
    .eq("devices.status", "in_stock")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    sell_transactions?: Array<{ id: string }> | null;
    devices?: {
      status?: string | null;
      serial_or_imei?: string | null;
      models?: { name?: string | null; image?: string | null } | null;
    } | null;
  }>;

  const getModelPriority = (name: string) => {
    const upper = name.trim().toUpperCase();
    if (upper.startsWith("WF")) return 0;
    if (upper.startsWith("WH")) return 1;
    return 2;
  };

  return rows
    .filter((row) => (row.sell_transactions?.length ?? 0) === 0)
    .map((row) => ({
      buy_transaction_id: row.id,
      model_name: row.devices?.models?.name ?? "N/A",
      model_image: row.devices?.models?.image ?? null,
      serial_or_imei: row.devices?.serial_or_imei ?? "",
    }))
    .sort((a, b) => {
      const pa = getModelPriority(a.model_name);
      const pb = getModelPriority(b.model_name);
      if (pa !== pb) return pa - pb;
      return a.model_name.localeCompare(b.model_name, "vi", { sensitivity: "base" });
    }) as SellableBuyTransactionItem[];
}

async function uploadDeviceImages(params: {
  storeId: string;
  ownerId: string;
  deviceId: string;
  images?: File[];
}) {
  const { storeId, ownerId, deviceId, images } = params;
  if (!images || images.length === 0) return;

  for (const file of images) {
    const safeFileName = file.name.replace(/\s+/g, "-");
    const path = `${storeId}/${deviceId}/${Date.now()}-${safeFileName}`;
    const { error: uploadError } = await supabase.storage
      .from("device-images")
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicData } = supabase.storage
      .from("device-images")
      .getPublicUrl(path);

    const { error: imageError } = await supabase.from("device_images").insert({
      owner_id: ownerId,
      store_id: storeId,
      device_id: deviceId,
      image_url: publicData.publicUrl,
    });

    if (imageError) {
      throw new Error(imageError.message);
    }
  }
}

export async function createBuy(
  input: CreateBuyInput,
): Promise<CreateTransactionResult> {
  try {
    const {
      storeId,
      model_id,
      serial_or_imei,
      seller_name,
      seller_phone,
      seller_address,
      seller_province_id,
      buy_price,
      buy_date,
      images,
    } = input;

    if (!storeId || !model_id) {
      return { ok: false, error: "Model is required" };
    }

    if ((buy_price ?? 0) < 0) {
      return { ok: false, error: "Buy price must be >= 0" };
    }

    const phoneError = validatePhone(seller_phone);
    if (phoneError) return { ok: false, error: phoneError };

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { ok: false, error: "Not authenticated" };

    const normalizedSerial = (serial_or_imei ?? "").trim() || `AUTO-${Date.now()}`;
    const normalizedSellerName = (seller_name ?? "").trim() || "N/A";
    const normalizedSellerAddress = (seller_address ?? "").trim();
    const normalizedSellerProvinceId = normalizeProvinceId(seller_province_id);
    const normalizedBuyPrice = Number.isFinite(buy_price) ? Number(buy_price) : 0;
    const normalizedBuyDate =
      buy_date && buy_date.trim() ? buy_date : new Date().toISOString().slice(0, 10);

    const normalizedPhone = normalizePhone(seller_phone);

    let contactId: string | undefined;
    if (normalizedPhone) {
      const { data: existingContact, error: findContactError } = await supabase
        .from("contacts")
        .select("id")
        .eq("owner_id", user.id)
        .eq("store_id", storeId)
        .eq("phone", normalizedPhone)
        .limit(1)
        .maybeSingle();
      if (findContactError) return { ok: false, error: findContactError.message };
      contactId = existingContact?.id;
    }

    if (!contactId) {
      const { data: newContact, error: createContactError } = await supabase
        .from("contacts")
        .insert({
          owner_id: user.id,
          store_id: storeId,
          name: normalizedSellerName,
          phone: normalizedPhone || null,
          province_id: normalizedSellerProvinceId,
          address: normalizedSellerAddress || "",
        })
        .select("id")
        .single();
      if (createContactError) return { ok: false, error: createContactError.message };
      contactId = newContact.id;
    }

    let deviceId: string | undefined;
    const { data: existingDevice, error: findDeviceError } = await supabase
      .from("devices")
      .select("id")
      .eq("owner_id", user.id)
      .eq("store_id", storeId)
      .eq("serial_or_imei", normalizedSerial)
      .limit(1)
      .maybeSingle();
    if (findDeviceError) return { ok: false, error: findDeviceError.message };
    deviceId = existingDevice?.id;

    if (!deviceId) {
      const { data: newDevice, error: createDeviceError } = await supabase
        .from("devices")
        .insert({
          owner_id: user.id,
          store_id: storeId,
          model_id,
          serial_or_imei: normalizedSerial,
          status: "in_stock",
        })
        .select("id")
        .single();
      if (createDeviceError) return { ok: false, error: createDeviceError.message };
      deviceId = newDevice.id;
    }

    const { error: buyError } = await supabase.from("buy_transactions").insert({
      owner_id: user.id,
      store_id: storeId,
      device_id: deviceId,
      contact_id: contactId,
      buy_price: normalizedBuyPrice,
      buy_date: normalizedBuyDate,
      snapshot_name: normalizedSellerName,
      snapshot_phone: normalizedPhone || null,
      snapshot_province_id: normalizedSellerProvinceId,
      snapshot_address: normalizedSellerAddress || "",
    });
    if (buyError) return { ok: false, error: buyError.message };

    const { error: statusError } = await supabase
      .from("devices")
      .update({ status: "in_stock" })
      .eq("id", deviceId)
      .eq("store_id", storeId);
    if (statusError) return { ok: false, error: statusError.message };

    await uploadDeviceImages({
      storeId,
      ownerId: user.id,
      deviceId,
      images,
    });

    return { ok: true, device_id: deviceId, contact_id: contactId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create buy",
    };
  }
}

export async function createSell(
  input: CreateSellInput,
): Promise<CreateTransactionResult> {
  try {
    const {
      storeId,
      buy_transaction_id,
      sell_type,
      city,
      buyer_name,
      buyer_phone,
      buyer_address,
      buyer_province_id,
      sell_price,
      deposit_amount,
      shipping_fee = 0,
      shipping_paid_by = "",
      sell_date,
      images,
    } = input;

    if (!storeId || !buy_transaction_id || !buyer_name) {
      return { ok: false, error: "Missing required fields" };
    }

    if (sell_price < 0) return { ok: false, error: "Sell price must be >= 0" };
    if ((deposit_amount ?? 0) < 0) {
      return { ok: false, error: "Deposit amount must be >= 0" };
    }
    if (shipping_fee < 0) return { ok: false, error: "Shipping fee must be >= 0" };

    const phoneError = validatePhone(buyer_phone);
    if (phoneError) return { ok: false, error: phoneError };

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { ok: false, error: "Not authenticated" };

    const normalizedPhone = normalizePhone(buyer_phone);
    const normalizedBuyerAddress = (buyer_address ?? "").trim();
    const normalizedBuyerProvinceId = normalizeProvinceId(buyer_province_id);

    let contactId: string | undefined;
    if (normalizedPhone) {
      const { data: existingContact, error: findContactError } = await supabase
        .from("contacts")
        .select("id")
        .eq("owner_id", user.id)
        .eq("store_id", storeId)
        .eq("phone", normalizedPhone)
        .limit(1)
        .maybeSingle();
      if (findContactError) return { ok: false, error: findContactError.message };
      contactId = existingContact?.id;
    }

    if (!contactId) {
      const { data: newContact, error: createContactError } = await supabase
        .from("contacts")
        .insert({
          owner_id: user.id,
          store_id: storeId,
          name: buyer_name,
          phone: normalizedPhone || null,
          province_id: normalizedBuyerProvinceId,
          address: normalizedBuyerAddress || "",
        })
        .select("id")
        .single();
      if (createContactError) return { ok: false, error: createContactError.message };
      contactId = newContact.id;
    }

    const { data: buyTx, error: buyTxError } = await supabase
      .from("buy_transactions")
      .select("id, device_id")
      .eq("id", buy_transaction_id)
      .eq("store_id", storeId)
      .maybeSingle();
    if (buyTxError) return { ok: false, error: buyTxError.message };
    if (!buyTx?.device_id) {
      return { ok: false, error: "BUY transaction not found" };
    }

    const deviceId = buyTx.device_id as string;

    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("id, status")
      .eq("id", deviceId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (deviceError) return { ok: false, error: deviceError.message };
    if (!device || device.status !== "in_stock") {
      return { ok: false, error: "Device is no longer in stock" };
    }

    const { error: sellError } = await supabase.from("sell_transactions").insert({
      owner_id: user.id,
      store_id: storeId,
      buy_transaction_id,
      contact_id: contactId,
      sell_type,
      city:
        sell_type === "DIRECT"
          ? city ?? inferLegacyCityFromProvinceId(normalizedBuyerProvinceId)
          : null,
      sell_price,
      deposit_amount: deposit_amount ?? null,
      shipping_fee,
      shipping_paid_by: shipping_paid_by || null,
      sell_date,
      snapshot_name: buyer_name,
      snapshot_phone: normalizedPhone || null,
      snapshot_province_id: normalizedBuyerProvinceId,
      snapshot_address: normalizedBuyerAddress || "",
    });
    if (sellError) return { ok: false, error: sellError.message };

    const { error: statusError } = await supabase
      .from("devices")
      .update({ status: "sold" })
      .eq("id", deviceId)
      .eq("store_id", storeId);
    if (statusError) return { ok: false, error: statusError.message };

    await uploadDeviceImages({
      storeId,
      ownerId: user.id,
      deviceId,
      images,
    });

    return { ok: true, device_id: deviceId, contact_id: contactId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create sell",
    };
  }
}
