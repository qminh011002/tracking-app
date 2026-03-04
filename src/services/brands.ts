import { supabase } from "@/lib/supabase";

export type BrandItem = {
  id: string;
  name: string;
  logo: string | null;
  created_at: string;
};

const BRAND_IMAGE_BUCKET =
  import.meta.env.VITE_SUPABASE_BRAND_IMAGE_BUCKET?.trim() || "brand-images";
const FALLBACK_IMAGE_BUCKET = "device-images";

export async function getBrands() {
  const { data, error } = await supabase
    .from("brand")
    .select("id,name,logo,created_at")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BrandItem[];
}

async function uploadBrandLogo(params: {
  brandName: string;
  file?: File | null;
}) {
  const { brandName, file } = params;
  if (!file) return null;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedExt = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
  if (!allowedExt.has(ext)) {
    throw new Error("Image must be one of: png, jpg, jpeg, webp, gif");
  }

  const safeName = brandName.trim().replace(/\s+/g, "-").toLowerCase();
  const path = `${Date.now()}-${safeName}.${ext}`;
  const buckets = Array.from(
    new Set([BRAND_IMAGE_BUCKET, FALLBACK_IMAGE_BUCKET]),
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
    if (!isBucketMissing) throw uploadError;
  }

  throw new Error(
    `Storage bucket not found. Create "${BRAND_IMAGE_BUCKET}" (or "${FALLBACK_IMAGE_BUCKET}") in Supabase Storage. Last error: ${lastError ?? "unknown"}`,
  );
}

export async function createBrand(params: { name: string; logoFile?: File | null }) {
  const name = params.name.trim();
  if (!name) throw new Error("Brand name is required");
  const logo = await uploadBrandLogo({
    brandName: name,
    file: params.logoFile,
  });

  const { data, error } = await supabase
    .from("brand")
    .insert({ name, logo })
    .select("id,name,logo,created_at")
    .single();

  if (error) throw error;
  return data as BrandItem;
}

export async function updateBrand(params: {
  id: string;
  name: string;
  logoFile?: File | null;
}) {
  const id = params.id.trim();
  const name = params.name.trim();
  if (!id) throw new Error("Brand ID is required");
  if (!name) throw new Error("Brand name is required");

  const payload: { name: string; logo?: string | null } = { name };
  if (params.logoFile) {
    payload.logo = await uploadBrandLogo({
      brandName: name,
      file: params.logoFile,
    });
  }

  const { data, error } = await supabase
    .from("brand")
    .update(payload)
    .eq("id", id)
    .select("id,name,logo,created_at")
    .single();

  if (error) throw error;
  return data as BrandItem;
}

export async function deleteBrand(params: { id: string }) {
  const id = params.id.trim();
  if (!id) throw new Error("Brand ID is required");

  const { error } = await supabase.from("brand").delete().eq("id", id);
  if (error) throw error;
  return { ok: true };
}
