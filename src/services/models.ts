import { supabase } from "@/lib/supabase";

const MODEL_IMAGE_BUCKET =
  import.meta.env.VITE_SUPABASE_MODEL_IMAGE_BUCKET?.trim() || "model-images";
const FALLBACK_IMAGE_BUCKET = "device-images";

export type ModelItem = {
  id: string;
  name: string;
  image: string | null;
  created_at: string;
  store_id: string;
  brand_id: string | null;
  brand_name: string | null;
  brand_logo: string | null;
};

function normalizeSearch(value: string) {
  return value.trim();
}

export async function getModels(params: { storeId: string; searchTerm: string }) {
  const { storeId, searchTerm } = params;
  const normalized = normalizeSearch(searchTerm);

  let query = supabase
    .from("models")
    .select("id,name,image,created_at,store_id,brand_id,brand:brand_id(name,logo)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (normalized) {
    query = query.ilike("name", `%${normalized}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(normalizeModelRow);
}

function normalizeModelRow(row: any): ModelItem {
  return {
    id: row.id,
    name: row.name,
    image: row.image ?? null,
    created_at: row.created_at,
    store_id: row.store_id,
    brand_id: row.brand_id ?? null,
    brand_name: row.brand?.name ?? null,
    brand_logo: row.brand?.logo ?? null,
  };
}

async function uploadModelImage(params: {
  storeId: string;
  modelName: string;
  file?: File | null;
}) {
  const { storeId, modelName, file } = params;
  if (!file) return null;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedExt = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
  if (!allowedExt.has(ext)) {
    throw new Error("Image must be one of: png, jpg, jpeg, webp, gif");
  }

  const safeName = modelName.trim().replace(/\s+/g, "-").toLowerCase();
  const path = `${storeId}/${Date.now()}-${safeName}.${ext}`;
  const buckets = Array.from(
    new Set([MODEL_IMAGE_BUCKET, FALLBACK_IMAGE_BUCKET]),
  ).filter(Boolean);

  let lastError: string | null = null;
  for (const bucket of buckets) {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

    if (!uploadError) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }

    const message = uploadError.message || "";
    const isBucketMissing =
      message.toLowerCase().includes("bucket not found") ||
      message.toLowerCase().includes("not found");
    lastError = message;
    if (!isBucketMissing) {
      throw uploadError;
    }
  }

  throw new Error(
    `Storage bucket not found. Create "${MODEL_IMAGE_BUCKET}" (or "${FALLBACK_IMAGE_BUCKET}") in Supabase Storage. Last error: ${lastError ?? "unknown"}`,
  );
}

export async function createModel(params: {
  storeId: string;
  name: string;
  brandId: string;
  imageFile?: File | null;
}) {
  const { storeId, name, brandId, imageFile } = params;
  const normalizedName = name.trim();
  if (!storeId) throw new Error("No store assigned");
  if (!normalizedName) throw new Error("Model name is required");
  if (!brandId) throw new Error("Brand is required");
  const imageUrl = await uploadModelImage({
    storeId,
    modelName: normalizedName,
    file: imageFile,
  });

  const { data, error } = await supabase
    .from("models")
    .insert({
      store_id: storeId,
      name: normalizedName,
      brand_id: brandId,
      image: imageUrl,
    })
    .select("id,name,image,created_at,store_id,brand_id,brand:brand_id(name,logo)")
    .single();

  if (error) throw error;
  return normalizeModelRow(data);
}

export async function updateModel(params: {
  storeId: string;
  id: string;
  name: string;
  brandId: string;
  imageFile?: File | null;
}) {
  const { storeId, id, name, brandId, imageFile } = params;
  const normalizedName = name.trim();
  if (!storeId) throw new Error("No store assigned");
  if (!id) throw new Error("Model ID is required");
  if (!normalizedName) throw new Error("Model name is required");
  if (!brandId) throw new Error("Brand is required");
  const payload: { name: string; brand_id: string; image?: string | null } = {
    name: normalizedName,
    brand_id: brandId,
  };

  if (imageFile) {
    payload.image = await uploadModelImage({
      storeId,
      modelName: normalizedName,
      file: imageFile,
    });
  }

  const { data, error } = await supabase
    .from("models")
    .update(payload)
    .eq("id", id)
    .eq("store_id", storeId)
    .select("id,name,image,created_at,store_id,brand_id,brand:brand_id(name,logo)")
    .single();

  if (error) throw error;
  return normalizeModelRow(data);
}

export async function deleteModel(params: { storeId: string; id: string }) {
  const { storeId, id } = params;
  if (!storeId) throw new Error("No store assigned");
  if (!id) throw new Error("Model ID is required");

  const { error } = await supabase
    .from("models")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) throw error;
  return { ok: true };
}
