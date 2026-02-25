import { supabase } from "@/lib/supabase";

export type ProvinceItem = {
  id: number;
  name: string;
};

const FALLBACK_PROVINCES: ProvinceItem[] = [
  { id: 1, name: "Ha Noi" },
  { id: 2, name: "TP Ho Chi Minh" },
  { id: 3, name: "Hai Phong" },
  { id: 4, name: "Da Nang" },
  { id: 5, name: "Can Tho" },
  { id: 6, name: "An Giang" },
  { id: 7, name: "Ba Ria - Vung Tau" },
  { id: 8, name: "Bac Lieu" },
  { id: 9, name: "Bac Giang" },
  { id: 10, name: "Bac Kan" },
  { id: 11, name: "Bac Ninh" },
  { id: 12, name: "Ben Tre" },
  { id: 13, name: "Binh Duong" },
  { id: 14, name: "Binh Dinh" },
  { id: 15, name: "Binh Phuoc" },
  { id: 16, name: "Binh Thuan" },
  { id: 17, name: "Ca Mau" },
  { id: 18, name: "Cao Bang" },
  { id: 19, name: "Dak Lak" },
  { id: 20, name: "Dak Nong" },
  { id: 21, name: "Dien Bien" },
  { id: 22, name: "Dong Nai" },
  { id: 23, name: "Dong Thap" },
  { id: 24, name: "Gia Lai" },
  { id: 25, name: "Ha Giang" },
  { id: 26, name: "Ha Nam" },
  { id: 27, name: "Ha Tinh" },
  { id: 28, name: "Hai Duong" },
  { id: 29, name: "Hau Giang" },
  { id: 30, name: "Hoa Binh" },
  { id: 31, name: "Hung Yen" },
  { id: 32, name: "Khanh Hoa" },
  { id: 33, name: "Kien Giang" },
  { id: 34, name: "Kon Tum" },
  { id: 35, name: "Lai Chau" },
  { id: 36, name: "Lam Dong" },
  { id: 37, name: "Lang Son" },
  { id: 38, name: "Lao Cai" },
  { id: 39, name: "Long An" },
  { id: 40, name: "Nam Dinh" },
  { id: 41, name: "Nghe An" },
  { id: 42, name: "Ninh Binh" },
  { id: 43, name: "Ninh Thuan" },
  { id: 44, name: "Phu Tho" },
  { id: 45, name: "Phu Yen" },
  { id: 46, name: "Quang Binh" },
  { id: 47, name: "Quang Nam" },
  { id: 48, name: "Quang Ngai" },
  { id: 49, name: "Quang Ninh" },
  { id: 50, name: "Quang Tri" },
  { id: 51, name: "Soc Trang" },
  { id: 52, name: "Son La" },
  { id: 53, name: "Tay Ninh" },
  { id: 54, name: "Thai Binh" },
  { id: 55, name: "Thai Nguyen" },
  { id: 56, name: "Thanh Hoa" },
  { id: 57, name: "Hue" },
  { id: 58, name: "Tien Giang" },
  { id: 59, name: "Tra Vinh" },
  { id: 60, name: "Tuyen Quang" },
  { id: 61, name: "Vinh Long" },
  { id: 62, name: "Vinh Phuc" },
  { id: 63, name: "Yen Bai" },
];

export async function getProvinces() {
  const { data, error } = await supabase
    .from("provinces")
    .select("id,name")
    .order("id", { ascending: true });

  if (error) {
    const e = error as { code?: string; message?: string; details?: string };
    const msg = `${e.message ?? ""} ${e.details ?? ""}`.toLowerCase();
    const isForbidden =
      e.code === "PGRST301" ||
      e.code === "42501" ||
      msg.includes("forbidden") ||
      msg.includes("permission denied");
    if (isForbidden) return FALLBACK_PROVINCES;
    throw error;
  }
  return (data ?? []) as ProvinceItem[];
}
