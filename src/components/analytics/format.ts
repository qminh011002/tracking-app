export function formatVnd(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} ty`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString("vi-VN");
}

export function formatVndFull(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(value)) + " VND";
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(value));
}

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#f97316",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export const CHANNEL_LABELS: Record<string, string> = {
  shopee: "Shopee",
  lazada: "Lazada",
  tiktok_shop: "TikTok Shop",
  offline: "Offline",
  ship: "Offline",
  direct: "Offline",
  other: "Other",
  unknown: "Other",
};

export const CATEGORY_LABELS: Record<string, string> = {
  tws_earbuds: "TWS Earbuds",
  over_ear: "Over-ear Headphones",
  gaming_headset: "Gaming Headsets",
  in_ear: "In-ear Earphones",
  accessories: "Accessories",
};

export const REGION_LABELS: Record<string, string> = {
  north: "North",
  central: "Central",
  south: "South",
  unknown: "Other",
};
