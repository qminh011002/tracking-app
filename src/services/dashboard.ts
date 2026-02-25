import { supabase } from "@/lib/supabase";

type SellRow = {
  sell_price: number | null;
  sell_date: string | null;
  buy_transactions: {
    buy_price: number | null;
    devices: {
      status: string | null;
      store_id: string | null;
    } | null;
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
      buy_transactions!inner (
        buy_price,
        store_id,
        devices!inner (
          status,
          store_id
        )
      )
    `,
    )
    .eq("store_id", storeId)
    .eq("buy_transactions.store_id", storeId)
    .eq("buy_transactions.devices.store_id", storeId)
    .eq("buy_transactions.devices.status", "sold")
    .not("sell_price", "is", null);

  if (error) throw error;

  const rows = (data ?? []) as SellRow[];
  let totalSales = 0;
  let totalProfit = 0;
  let totalBuyCost = 0;

  for (const row of rows) {
    if (row.buy_transactions?.devices?.status !== "sold") continue;

    const sellPrice = toNumber(row.sell_price);
    const buyPrice = toNumber(row.buy_transactions?.buy_price);

    totalSales += sellPrice;
    totalProfit += sellPrice - buyPrice;
    totalBuyCost += buyPrice;
  }

  const growthRate = totalBuyCost > 0 ? (totalProfit / totalBuyCost) * 100 : 0;

  return {
    totalSales,
    totalProfit,
    growthRate,
    currentMonthSales: 0,
    previousMonthSales: 0,
  };
}
