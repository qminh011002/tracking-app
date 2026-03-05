import { supabase } from "@/lib/supabase";

function toNumber(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Number(value);
}

function normalizeChannel(raw: string | null | undefined) {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return "unknown";
  if (value.includes("shopee")) return "shopee";
  if (value.includes("lazada")) return "lazada";
  if (value.includes("tiktok")) return "tiktok_shop";
  if (
    value.includes("offline") ||
    value.includes("direct") ||
    value.includes("store") ||
    value.includes("website") ||
    value.includes("web") ||
    value.includes("ship")
  ) {
    return "offline";
  }
  return "other";
}

function inferCategory(modelName: string | null | undefined) {
  const value = (modelName ?? "").trim().toLowerCase();
  if (!value) return "accessories";
  if (value.includes("gaming") || value.includes("g435") || value.includes("razer") || value.includes("hyperx")) {
    return "gaming_headset";
  }
  if (value.includes("wh") || value.includes("headphone") || value.includes("major") || value.includes("over")) {
    return "over_ear";
  }
  if (value.includes("wf") || value.includes("airpods") || value.includes("buds") || value.includes("tws")) {
    return "tws_earbuds";
  }
  if (value.includes("in-ear") || value.includes("earphone") || value.includes("ex") || value.includes("iem")) {
    return "in_ear";
  }
  return "accessories";
}

function estimatePlatformFee(revenue: number, channel: string) {
  if (channel === "shopee") return revenue * 0.075;
  if (channel === "lazada") return revenue * 0.065;
  if (channel === "tiktok_shop") return revenue * 0.08;
  return 0;
}

const CATEGORY_KEYS = [
  "tws_earbuds",
  "over_ear",
  "gaming_headset",
  "in_ear",
  "accessories",
] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];

export type SalesTransaction = {
  date: string;
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  channel: string;
  category: CategoryKey;
  model: string;
  brand: string;
  provinceId: number | null;
  provinceName: string | null;
  customerKey: string;
  shippingFee: number;
  platformFee: number;
};

export type SalesOverviewData = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  returnedOrders: number;
  cancelledOrders: number;
  netRevenue: number;
  totalProfit: number;
  totalCost: number;
  prevPeriodRevenue: number;
  revenueByDate: {
    date: string;
    revenue: number;
    profit: number;
    cost: number;
    orders: number;
  }[];
  revenueByChannel: { channel: string; revenue: number; orders: number }[];
  revenueByModel: { model: string; revenue: number; orders: number }[];
  revenueByBrand: { brand: string; revenue: number; orders: number }[];
  revenueByCategoryMonthly: Array<{ month: string } & Record<CategoryKey, number>>;
  transactions: SalesTransaction[];
};

type SellRow = {
  sell_price: number | null;
  sell_date: string | null;
  sell_type: string | null;
  shipping_fee: number | null;
  snapshot_province_id: number | null;
  snapshot_name: string | null;
  snapshot_phone: string | null;
  buy_transactions: {
    buy_price: number | null;
    buy_date: string | null;
    snapshot_province_id: number | null;
    devices: {
      id: string;
      serial_or_imei: string | null;
      status: string | null;
      model_id: string | null;
      models: {
        name: string | null;
        image: string | null;
        brand_id: string | null;
        brand: {
          id: string;
          name: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export async function getAnalyticsSalesOverview(params: {
  storeId: string;
  fromDate?: string;
  toDate?: string;
  prevFromDate?: string;
  prevToDate?: string;
}): Promise<SalesOverviewData> {
  const { storeId, fromDate, toDate, prevFromDate, prevToDate } = params;

  let query = supabase
    .from("sell_transactions")
    .select(
      `
      sell_price,
      sell_date,
      sell_type,
      shipping_fee,
      snapshot_province_id,
      snapshot_name,
      snapshot_phone,
      buy_transactions (
        buy_price,
        buy_date,
        snapshot_province_id,
        devices (
          id,
          serial_or_imei,
          status,
          model_id,
          models (
            name,
            image,
            brand_id,
            brand:brand_id (
              id,
              name
            )
          )
        )
      )
    `,
    )
    .eq("store_id", storeId);

  if (fromDate) query = query.gte("sell_date", fromDate);
  if (toDate) query = query.lte("sell_date", toDate);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as SellRow[];

  let prevRevenue = 0;
  if (prevFromDate && prevToDate) {
    const prevQuery = supabase
      .from("sell_transactions")
      .select("sell_price")
      .eq("store_id", storeId)
      .gte("sell_date", prevFromDate)
      .lte("sell_date", prevToDate);
    const { data: prevData } = await prevQuery;
    prevRevenue = (prevData ?? []).reduce(
      (sum, r: { sell_price: number | null }) => sum + toNumber(r.sell_price),
      0,
    );
  }

  let totalRevenue = 0;
  let totalProfit = 0;
  let totalCost = 0;

  const dateMap = new Map<
    string,
    { revenue: number; profit: number; cost: number; orders: number }
  >();
  const channelMap = new Map<string, { revenue: number; orders: number }>();
  const modelMap = new Map<string, { revenue: number; orders: number }>();
  const brandMap = new Map<string, { revenue: number; orders: number }>();
  const categoryMonthMap = new Map<string, Record<CategoryKey, number>>();
  const transactions: SalesTransaction[] = [];

  rows.forEach((row, idx) => {
    const sellPrice = toNumber(row.sell_price);
    const buyPrice = toNumber(row.buy_transactions?.buy_price);
    const profit = sellPrice - buyPrice;
    const date = row.sell_date?.slice(0, 10) ?? "unknown";
    const month = date.slice(0, 7);

    const modelName = row.buy_transactions?.devices?.models?.name ?? "Unknown";
    const brandName = row.buy_transactions?.devices?.models?.brand?.name ?? "Unknown";
    const normalizedChannel = normalizeChannel(row.sell_type);
    const category = inferCategory(modelName);
    const provinceId = row.snapshot_province_id ?? row.buy_transactions?.snapshot_province_id ?? null;
    const provinceName = row.snapshot_name ?? null;
    const shippingFee = toNumber(row.shipping_fee);
    const platformFee = estimatePlatformFee(sellPrice, normalizedChannel);
    const customerKey =
      row.snapshot_phone?.trim() ||
      row.snapshot_name?.trim() ||
      row.buy_transactions?.devices?.serial_or_imei?.trim() ||
      `anon-${idx}`;

    totalRevenue += sellPrice;
    totalProfit += profit;
    totalCost += buyPrice;

    const dateEntry = dateMap.get(date) ?? {
      revenue: 0,
      profit: 0,
      cost: 0,
      orders: 0,
    };
    dateEntry.revenue += sellPrice;
    dateEntry.profit += profit;
    dateEntry.cost += buyPrice;
    dateEntry.orders += 1;
    dateMap.set(date, dateEntry);

    const channelEntry = channelMap.get(normalizedChannel) ?? {
      revenue: 0,
      orders: 0,
    };
    channelEntry.revenue += sellPrice;
    channelEntry.orders += 1;
    channelMap.set(normalizedChannel, channelEntry);

    const modelEntry = modelMap.get(modelName) ?? { revenue: 0, orders: 0 };
    modelEntry.revenue += sellPrice;
    modelEntry.orders += 1;
    modelMap.set(modelName, modelEntry);

    const brandEntry = brandMap.get(brandName) ?? { revenue: 0, orders: 0 };
    brandEntry.revenue += sellPrice;
    brandEntry.orders += 1;
    brandMap.set(brandName, brandEntry);

    const monthEntry =
      categoryMonthMap.get(month) ??
      CATEGORY_KEYS.reduce(
        (acc, key) => ({ ...acc, [key]: 0 }),
        {} as Record<CategoryKey, number>,
      );
    monthEntry[category] += sellPrice;
    categoryMonthMap.set(month, monthEntry);

    transactions.push({
      date,
      month,
      revenue: sellPrice,
      cost: buyPrice,
      profit,
      channel: normalizedChannel,
      category,
      model: modelName,
      brand: brandName,
      provinceId,
      provinceName,
      customerKey,
      shippingFee,
      platformFee,
    });
  });

  const revenueByDate = Array.from(dateMap.entries())
    .map(([date, value]) => ({ date, ...value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const revenueByChannel = Array.from(channelMap.entries())
    .map(([channel, value]) => ({ channel, ...value }))
    .sort((a, b) => b.revenue - a.revenue);

  const revenueByModel = Array.from(modelMap.entries())
    .map(([model, value]) => ({ model, ...value }))
    .sort((a, b) => b.revenue - a.revenue);

  const revenueByBrand = Array.from(brandMap.entries())
    .map(([brand, value]) => ({ brand, ...value }))
    .sort((a, b) => b.revenue - a.revenue);

  const revenueByCategoryMonthly = Array.from(categoryMonthMap.entries())
    .map(([month, value]) => ({ month, ...value }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const totalOrders = rows.length;

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    returnedOrders: 0,
    cancelledOrders: 0,
    netRevenue: totalRevenue,
    totalProfit,
    totalCost,
    prevPeriodRevenue: prevRevenue,
    revenueByDate,
    revenueByChannel,
    revenueByModel,
    revenueByBrand,
    revenueByCategoryMonthly,
    transactions,
  };
}

export type ProductAnalyticsData = {
  topProducts: {
    model: string;
    quantity: number;
    revenue: number;
    avgPrice: number;
    image: string | null;
  }[];
  priceVsQuantity: {
    model: string;
    avgPrice: number;
    quantity: number;
    revenue: number;
  }[];
  productByChannel: { model: string; channel: string; revenue: number }[];
};

export async function getAnalyticsProducts(params: {
  storeId: string;
  fromDate?: string;
  toDate?: string;
}): Promise<ProductAnalyticsData> {
  const { storeId, fromDate, toDate } = params;

  let query = supabase
    .from("sell_transactions")
    .select(
      `
      sell_price,
      sell_date,
      sell_type,
      buy_transactions (
        buy_price,
        devices (
          model_id,
          models (
            name,
            image
          )
        )
      )
    `,
    )
    .eq("store_id", storeId);

  if (fromDate) query = query.gte("sell_date", fromDate);
  if (toDate) query = query.lte("sell_date", toDate);

  const { data, error } = await query;
  if (error) throw error;

  const productMap = new Map<
    string,
    { quantity: number; revenue: number; totalPrice: number; image: string | null }
  >();
  const productChannelMap = new Map<string, { revenue: number }>();

  for (const row of data ?? []) {
    const r = row as unknown as SellRow;
    const sellPrice = toNumber(r.sell_price);
    const modelName = r.buy_transactions?.devices?.models?.name ?? "Unknown";
    const modelImage = r.buy_transactions?.devices?.models?.image ?? null;
    const channel = normalizeChannel(r.sell_type);

    const entry = productMap.get(modelName) ?? {
      quantity: 0,
      revenue: 0,
      totalPrice: 0,
      image: modelImage,
    };
    entry.quantity += 1;
    entry.revenue += sellPrice;
    entry.totalPrice += sellPrice;
    productMap.set(modelName, entry);

    const productChannelKey = `${modelName}||${channel}`;
    const productChannelEntry = productChannelMap.get(productChannelKey) ?? {
      revenue: 0,
    };
    productChannelEntry.revenue += sellPrice;
    productChannelMap.set(productChannelKey, productChannelEntry);
  }

  const topProducts = Array.from(productMap.entries())
    .map(([model, value]) => ({
      model,
      quantity: value.quantity,
      revenue: value.revenue,
      avgPrice: value.quantity > 0 ? value.totalPrice / value.quantity : 0,
      image: value.image,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const priceVsQuantity = topProducts.map((item) => ({
    model: item.model,
    avgPrice: item.avgPrice,
    quantity: item.quantity,
    revenue: item.revenue,
  }));

  const productByChannel = Array.from(productChannelMap.entries()).map(
    ([key, value]) => {
      const [model, channel] = key.split("||");
      return { model, channel, revenue: value.revenue };
    },
  );

  return { topProducts, priceVsQuantity, productByChannel };
}

const PROVINCE_REGIONS: Record<string, string> = {
  "Ha Noi": "north",
  "Hai Phong": "north",
  "Quang Ninh": "north",
  "Bac Ninh": "north",
  "Bac Giang": "north",
  "Bac Kan": "north",
  "Cao Bang": "north",
  "Dien Bien": "north",
  "Ha Giang": "north",
  "Ha Nam": "north",
  "Ha Tinh": "north",
  "Hai Duong": "north",
  "Hoa Binh": "north",
  "Hung Yen": "north",
  "Lai Chau": "north",
  "Lang Son": "north",
  "Lao Cai": "north",
  "Nam Dinh": "north",
  "Ninh Binh": "north",
  "Phu Tho": "north",
  "Son La": "north",
  "Thai Binh": "north",
  "Thai Nguyen": "north",
  "Tuyen Quang": "north",
  "Vinh Phuc": "north",
  "Yen Bai": "north",
  "Da Nang": "central",
  Hue: "central",
  "Khanh Hoa": "central",
  "Nghe An": "central",
  "Thanh Hoa": "central",
  "Quang Binh": "central",
  "Quang Nam": "central",
  "Quang Ngai": "central",
  "Quang Tri": "central",
  "Binh Dinh": "central",
  "Binh Thuan": "central",
  "Ninh Thuan": "central",
  "Phu Yen": "central",
  "Dak Lak": "central",
  "Dak Nong": "central",
  "Gia Lai": "central",
  "Kon Tum": "central",
  "Lam Dong": "central",
  "TP Ho Chi Minh": "south",
  "Binh Duong": "south",
  "Dong Nai": "south",
  "Can Tho": "south",
  "Ba Ria - Vung Tau": "south",
  "An Giang": "south",
  "Bac Lieu": "south",
  "Ben Tre": "south",
  "Binh Phuoc": "south",
  "Ca Mau": "south",
  "Dong Thap": "south",
  "Hau Giang": "south",
  "Kien Giang": "south",
  "Long An": "south",
  "Soc Trang": "south",
  "Tay Ninh": "south",
  "Tien Giang": "south",
  "Tra Vinh": "south",
  "Vinh Long": "south",
};

export type GeoAnalyticsData = {
  byProvince: {
    provinceId: number;
    provinceName: string;
    region: string;
    orders: number;
    revenue: number;
    aov: number;
    topChannel: string;
    topProduct: string;
  }[];
  byRegion: { region: string; orders: number; revenue: number }[];
  regionByChannel: { region: string; channel: string; revenue: number }[];
};

export async function getAnalyticsGeo(params: {
  storeId: string;
  fromDate?: string;
  toDate?: string;
  provinces: { id: number; name: string }[];
}): Promise<GeoAnalyticsData> {
  const { storeId, fromDate, toDate, provinces } = params;

  let query = supabase
    .from("sell_transactions")
    .select(
      `
      sell_price,
      sell_date,
      sell_type,
      snapshot_province_id,
      buy_transactions (
        devices (
          models (name)
        )
      )
    `,
    )
    .eq("store_id", storeId);

  if (fromDate) query = query.gte("sell_date", fromDate);
  if (toDate) query = query.lte("sell_date", toDate);

  const { data, error } = await query;
  if (error) throw error;

  const provinceIdMap = new Map(provinces.map((province) => [province.id, province.name]));

  const provinceStats = new Map<
    number,
    {
      orders: number;
      revenue: number;
      channelCounts: Map<string, number>;
      productCounts: Map<string, number>;
    }
  >();

  const regionChannelMap = new Map<string, { revenue: number }>();

  for (const row of data ?? []) {
    const r = row as any;
    const sellPrice = toNumber(r.sell_price);
    const provinceId = r.snapshot_province_id as number | null;
    const channel = normalizeChannel(r.sell_type);
    const modelName = r.buy_transactions?.devices?.models?.name ?? "Unknown";

    if (provinceId && provinceId > 0) {
      const entry = provinceStats.get(provinceId) ?? {
        orders: 0,
        revenue: 0,
        channelCounts: new Map(),
        productCounts: new Map(),
      };
      entry.orders += 1;
      entry.revenue += sellPrice;
      entry.channelCounts.set(channel, (entry.channelCounts.get(channel) ?? 0) + 1);
      entry.productCounts.set(modelName, (entry.productCounts.get(modelName) ?? 0) + 1);
      provinceStats.set(provinceId, entry);
    }

    const provinceName = provinceId ? provinceIdMap.get(provinceId) ?? "" : "";
    const region = PROVINCE_REGIONS[provinceName] ?? "unknown";
    const regionChannelKey = `${region}||${channel}`;
    const regionChannelEntry = regionChannelMap.get(regionChannelKey) ?? { revenue: 0 };
    regionChannelEntry.revenue += sellPrice;
    regionChannelMap.set(regionChannelKey, regionChannelEntry);
  }

  const byProvince = Array.from(provinceStats.entries())
    .map(([provinceId, value]) => {
      const provinceName = provinceIdMap.get(provinceId) ?? `Province ${provinceId}`;
      const region = PROVINCE_REGIONS[provinceName] ?? "unknown";
      let topChannel = "N/A";
      let maxChannelCount = 0;
      for (const [channel, count] of value.channelCounts) {
        if (count > maxChannelCount) {
          maxChannelCount = count;
          topChannel = channel;
        }
      }
      let topProduct = "N/A";
      let maxProductCount = 0;
      for (const [product, count] of value.productCounts) {
        if (count > maxProductCount) {
          maxProductCount = count;
          topProduct = product;
        }
      }
      return {
        provinceId,
        provinceName,
        region,
        orders: value.orders,
        revenue: value.revenue,
        aov: value.orders > 0 ? value.revenue / value.orders : 0,
        topChannel,
        topProduct,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const regionMap = new Map<string, { orders: number; revenue: number }>();
  for (const province of byProvince) {
    const entry = regionMap.get(province.region) ?? { orders: 0, revenue: 0 };
    entry.orders += province.orders;
    entry.revenue += province.revenue;
    regionMap.set(province.region, entry);
  }

  const byRegion = Array.from(regionMap.entries())
    .map(([region, value]) => ({ region, ...value }))
    .sort((a, b) => b.revenue - a.revenue);

  const regionByChannel = Array.from(regionChannelMap.entries()).map(
    ([key, value]) => {
      const [region, channel] = key.split("||");
      return { region, channel, revenue: value.revenue };
    },
  );

  return { byProvince, byRegion, regionByChannel };
}

export type CustomerAnalyticsData = {
  newVsReturning: { type: string; count: number }[];
  orderValueDistribution: { range: string; count: number }[];
  acquisitionByChannel: { channel: string; count: number }[];
  cohortData: { firstMonth: string; month: string; customers: number }[];
};

export async function getAnalyticsCustomers(params: {
  storeId: string;
  fromDate?: string;
  toDate?: string;
}): Promise<CustomerAnalyticsData> {
  const { storeId, fromDate, toDate } = params;

  let query = supabase
    .from("sell_transactions")
    .select(
      `
      sell_price,
      sell_date,
      sell_type,
      snapshot_phone,
      contact_id
    `,
    )
    .eq("store_id", storeId);

  if (fromDate) query = query.gte("sell_date", fromDate);
  if (toDate) query = query.lte("sell_date", toDate);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as {
    sell_price: number | null;
    sell_date: string | null;
    sell_type: string | null;
    snapshot_phone: string | null;
    contact_id: string | null;
  }[];

  const customerOrders = new Map<
    string,
    { date: string; month: string; channel: string; value: number }[]
  >();

  rows.forEach((row, index) => {
    const date = row.sell_date?.slice(0, 10) ?? "";
    if (!date) return;
    const key = row.contact_id ?? row.snapshot_phone ?? `anon-${index}`;
    const entry = customerOrders.get(key) ?? [];
    entry.push({
      date,
      month: date.slice(0, 7),
      channel: normalizeChannel(row.sell_type),
      value: toNumber(row.sell_price),
    });
    customerOrders.set(key, entry);
  });

  let newCount = 0;
  let returningCount = 0;
  customerOrders.forEach((orders) => {
    if (orders.length <= 1) newCount += 1;
    else returningCount += 1;
  });

  const ranges = [
    { label: "0-200K", min: 0, max: 200000 },
    { label: "200K-500K", min: 200000, max: 500000 },
    { label: "500K-1M", min: 500000, max: 1000000 },
    { label: "1M-2M", min: 1000000, max: 2000000 },
    { label: "2M-5M", min: 2000000, max: 5000000 },
    { label: "5M+", min: 5000000, max: Infinity },
  ];

  const distCounts = ranges.map((range) => ({ range: range.label, count: 0 }));
  rows.forEach((row) => {
    const value = toNumber(row.sell_price);
    const idx = ranges.findIndex((range) => value >= range.min && value < range.max);
    if (idx >= 0) distCounts[idx].count += 1;
  });

  const acquisitionByChannelMap = new Map<string, number>();
  customerOrders.forEach((orders) => {
    const firstOrder = [...orders].sort((a, b) => a.date.localeCompare(b.date))[0];
    acquisitionByChannelMap.set(
      firstOrder.channel,
      (acquisitionByChannelMap.get(firstOrder.channel) ?? 0) + 1,
    );
  });

  const cohortMap = new Map<string, Map<string, Set<string>>>();
  customerOrders.forEach((orders, customerKey) => {
    const sortedOrders = [...orders].sort((a, b) => a.date.localeCompare(b.date));
    const firstMonth = sortedOrders[0]?.month;
    if (!firstMonth) return;

    const activeMonths = new Set(sortedOrders.map((item) => item.month));
    for (const month of activeMonths) {
      if (!cohortMap.has(firstMonth)) cohortMap.set(firstMonth, new Map());
      if (!cohortMap.get(firstMonth)?.has(month)) {
        cohortMap.get(firstMonth)?.set(month, new Set());
      }
      cohortMap.get(firstMonth)?.get(month)?.add(customerKey);
    }
  });

  const cohortData: { firstMonth: string; month: string; customers: number }[] = [];
  cohortMap.forEach((months, firstMonth) => {
    months.forEach((customers, month) => {
      cohortData.push({ firstMonth, month, customers: customers.size });
    });
  });

  return {
    newVsReturning: [
      { type: "new", count: newCount },
      { type: "returning", count: returningCount },
    ],
    orderValueDistribution: distCounts,
    acquisitionByChannel: Array.from(acquisitionByChannelMap.entries())
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count),
    cohortData: cohortData.sort(
      (a, b) => a.firstMonth.localeCompare(b.firstMonth) || a.month.localeCompare(b.month),
    ),
  };
}

export type InventoryMarginData = {
  inStockCount: number;
  soldCount: number;
  totalInventoryValue: number;
  marginByMonth: {
    month: string;
    revenue: number;
    cost: number;
    margin: number;
    marginPct: number;
  }[];
  costBreakdown: {
    revenue: number;
    cogs: number;
    shippingCost: number;
    grossProfit: number;
  };
  inventoryByModel: {
    model: string;
    inStock: number;
    sold: number;
    safetyStock: number;
    stockRatio: number;
  }[];
};

export async function getAnalyticsInventoryMargin(params: {
  storeId: string;
  fromDate?: string;
  toDate?: string;
}): Promise<InventoryMarginData> {
  const { storeId, fromDate, toDate } = params;

  const { data: devices, error: devError } = await supabase
    .from("devices")
    .select(
      `
      id,
      status,
      models (name)
    `,
    )
    .eq("store_id", storeId);

  if (devError) throw devError;

  const inStockCount = (devices ?? []).filter((item: any) => item.status === "in_stock").length;
  const soldCount = (devices ?? []).filter((item: any) => item.status === "sold").length;

  const modelInventoryMap = new Map<string, { inStock: number; sold: number }>();
  for (const device of devices ?? []) {
    const row = device as any;
    const model = row.models?.name ?? "Unknown";
    const entry = modelInventoryMap.get(model) ?? { inStock: 0, sold: 0 };
    if (row.status === "in_stock") entry.inStock += 1;
    if (row.status === "sold") entry.sold += 1;
    modelInventoryMap.set(model, entry);
  }

  const inventoryByModel = Array.from(modelInventoryMap.entries())
    .map(([model, value]) => {
      const safetyStock = Math.max(2, Math.round(value.sold * 0.2));
      const stockRatio = safetyStock > 0 ? (value.inStock / safetyStock) * 100 : 0;
      return {
        model,
        inStock: value.inStock,
        sold: value.sold,
        safetyStock,
        stockRatio,
      };
    })
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 8);

  const { data: inStockBuys, error: buyErr } = await supabase
    .from("buy_transactions")
    .select(
      `
      buy_price,
      devices!inner (status)
    `,
    )
    .eq("store_id", storeId)
    .eq("devices.status", "in_stock");

  if (buyErr) throw buyErr;

  const totalInventoryValue = (inStockBuys ?? []).reduce(
    (sum: number, row: any) => sum + toNumber(row.buy_price),
    0,
  );

  let sellQuery = supabase
    .from("sell_transactions")
    .select(
      `
      sell_price,
      sell_date,
      shipping_fee,
      buy_transactions (buy_price)
    `,
    )
    .eq("store_id", storeId);

  if (fromDate) sellQuery = sellQuery.gte("sell_date", fromDate);
  if (toDate) sellQuery = sellQuery.lte("sell_date", toDate);

  const { data: sells, error: sellErr } = await sellQuery;
  if (sellErr) throw sellErr;

  const monthMap = new Map<string, { revenue: number; cost: number; shipping: number }>();

  let totalRevenue = 0;
  let totalCogs = 0;
  let totalShipping = 0;

  for (const row of sells ?? []) {
    const r = row as any;
    const sellPrice = toNumber(r.sell_price);
    const buyPrice = toNumber(r.buy_transactions?.buy_price);
    const shipping = toNumber(r.shipping_fee);
    const month = (r.sell_date as string)?.slice(0, 7) ?? "unknown";

    totalRevenue += sellPrice;
    totalCogs += buyPrice;
    totalShipping += shipping;

    const monthEntry = monthMap.get(month) ?? { revenue: 0, cost: 0, shipping: 0 };
    monthEntry.revenue += sellPrice;
    monthEntry.cost += buyPrice;
    monthEntry.shipping += shipping;
    monthMap.set(month, monthEntry);
  }

  const marginByMonth = Array.from(monthMap.entries())
    .map(([month, value]) => {
      const margin = value.revenue - value.cost;
      const marginPct = value.revenue > 0 ? (margin / value.revenue) * 100 : 0;
      return { month, revenue: value.revenue, cost: value.cost, margin, marginPct };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    inStockCount,
    soldCount,
    totalInventoryValue,
    marginByMonth,
    costBreakdown: {
      revenue: totalRevenue,
      cogs: totalCogs,
      shippingCost: totalShipping,
      grossProfit: totalRevenue - totalCogs - totalShipping,
    },
    inventoryByModel,
  };
}
