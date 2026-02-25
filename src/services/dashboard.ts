import { supabase } from "@/lib/supabase";

type SellRow = {
  sell_price: number | null;
  sell_date: string | null;
  created_at: string | null;
  buy_transactions: {
    buy_price: number | null;
  } | null;
};

export type DashboardKpi = {
  totalSales: number;
  totalProfit: number;
  growthRate: number;
  currentMonthSales: number;
  previousMonthSales: number;
};

function toNumber(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Number(value);
}

function isSameMonth(date: Date, year: number, month: number) {
  return date.getFullYear() === year && date.getMonth() === month;
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function getDashboardKpi(params: { storeId: string }): Promise<DashboardKpi> {
  const { storeId } = params;
  if (!storeId) {
    return {
      totalSales: 0,
      totalProfit: 0,
      growthRate: 0,
      currentMonthSales: 0,
      previousMonthSales: 0,
    };
  }

  const { data, error } = await supabase
    .from("sell_transactions")
    .select(
      `
      sell_price,
      sell_date,
      created_at,
      buy_transactions (
        buy_price
      )
    `,
    )
    .eq("store_id", storeId);

  if (error) throw error;

  const rows = (data ?? []) as SellRow[];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const previousYear = previousMonthDate.getFullYear();
  const previousMonth = previousMonthDate.getMonth();

  let totalSales = 0;
  let totalProfit = 0;
  let currentMonthSales = 0;
  let previousMonthSales = 0;

  for (const row of rows) {
    const sellPrice = toNumber(row.sell_price);
    const buyPrice = toNumber(row.buy_transactions?.buy_price);
    const soldAt = toDate(row.sell_date) ?? toDate(row.created_at);

    totalSales += sellPrice;
    totalProfit += sellPrice - buyPrice;

    if (!soldAt) continue;

    if (isSameMonth(soldAt, currentYear, currentMonth)) {
      currentMonthSales += sellPrice;
      continue;
    }

    if (isSameMonth(soldAt, previousYear, previousMonth)) {
      previousMonthSales += sellPrice;
    }
  }

  const growthRate =
    previousMonthSales > 0
      ? ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100
      : currentMonthSales > 0
        ? 100
        : 0;

  return {
    totalSales,
    totalProfit,
    growthRate,
    currentMonthSales,
    previousMonthSales,
  };
}
