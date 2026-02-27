import { supabase } from "@/lib/supabase";

type SellRow = {
  sell_price: number | null;
  sell_date: string | null;
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

export async function getDashboardKpi(params: {
  storeId: string;
  fromDate?: string;
  toDate?: string;
}): Promise<DashboardKpi> {
  const { storeId, fromDate, toDate } = params;

  if (!storeId) {
    return {
      totalSales: 0,
      totalProfit: 0,
      growthRate: 0,
      currentMonthSales: 0,
      previousMonthSales: 0,
    };
  }

  let query = supabase
    .from("sell_transactions")
    .select(
      `
      sell_price,
      sell_date,
      buy_transactions (
        buy_price
      )
    `,
    )
    .eq("store_id", storeId);

  if (fromDate) query = query.gte("sell_date", fromDate);
  if (toDate) query = query.lte("sell_date", toDate);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as SellRow[];

  let totalSales = 0;
  let totalProfit = 0;
  let totalBuyOfSold = 0;

  for (const row of rows) {
    const sellPrice = toNumber(row.sell_price);
    const buyPrice = toNumber(row.buy_transactions?.buy_price);

    totalSales += sellPrice;
    totalProfit += sellPrice - buyPrice;
    totalBuyOfSold += buyPrice;
  }

  const growthRate = totalBuyOfSold > 0 ? (totalProfit / totalBuyOfSold) * 100 : 0;

  return {
    totalSales,
    totalProfit,
    growthRate,
    currentMonthSales: 0,
    previousMonthSales: 0,
  };
}
