import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import DashboardCard from "@/components/dashboard/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { GeoAnalyticsData } from "@/src/services/analytics";
import { formatNumber, formatVnd, REGION_LABELS } from "./format";
import InfoHint from "./info-hint";

const MAP_WIDTH = 420;
const MAP_HEIGHT = 520;

type ProvinceRow = GeoAnalyticsData["byProvince"][number];
type TopologyFeature = {
  type: string;
  properties?: {
    name_en?: string;
    name_vi?: string;
    [key: string]: unknown;
  };
  geometry: unknown;
};

const PROVINCE_ALIASES: Record<string, string[]> = {
  tphochiminh: ["hochiminhcity", "hochiminh"],
  hue: ["thuathienhue"],
  daknong: ["dacnong"],
  daklak: ["daclac"],
  backan: ["baccan"],
};

function normalizeProvinceKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function provinceKeys(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return [];

  const normalized = normalizeProvinceKey(trimmed);
  const keys = new Set<string>([normalized]);

  if (normalized.startsWith("tp")) {
    keys.add(normalized.slice(2));
  }

  const aliases = PROVINCE_ALIASES[normalized] ?? [];
  aliases.forEach((alias) => keys.add(alias));

  return Array.from(keys).filter(Boolean);
}

function mapFeatureKeys(featureName: string) {
  return featureName
    .split("|")
    .map((part) => normalizeProvinceKey(part))
    .filter(Boolean);
}

function heatColor(value: number, max: number) {
  if (max <= 0) return "rgba(148, 163, 184, 0.16)";
  const ratio = Math.min(1, value / max);
  return `rgba(29, 78, 216, ${0.16 + ratio * 0.78})`;
}

export default function GeoAnalytics({ data }: { data: GeoAnalyticsData | undefined }) {
  const [topology, setTopology] = useState<Record<string, unknown> | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<{
    provinceName: string;
    orders: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/maps/vietnam-adm2.json")
      .then((response) => response.json())
      .then((json) => {
        if (active) setTopology(json as Record<string, unknown>);
      })
      .catch(() => {
        if (active) setTopology({ type: "Topology", objects: {} });
      });

    return () => {
      active = false;
    };
  }, []);

  const mapFeatures = useMemo(() => {
    if (!topology || !(topology as { objects?: Record<string, unknown> }).objects?.adm2) {
      return [];
    }

    const collection = feature(
      topology as unknown as Record<string, unknown>,
      (topology as { objects: Record<string, unknown> }).objects.adm2,
    ) as { features: TopologyFeature[] };
    return collection.features;
  }, [topology]);

  const projection = useMemo(() => {
    const fallback = geoMercator();
    if (mapFeatures.length === 0) return fallback;

    const collection = {
      type: "FeatureCollection",
      features: mapFeatures,
    } as const;

    return fallback.fitExtent(
      [
        [14, 14],
        [MAP_WIDTH - 14, MAP_HEIGHT - 14],
      ],
      collection as never,
    );
  }, [mapFeatures]);

  const pathBuilder = useMemo(() => geoPath(projection), [projection]);

  if (!data || mapFeatures.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-muted-foreground uppercase">
        Loading data...
      </div>
    );
  }

  const provinceByKey = new Map<string, ProvinceRow>();
  data.byProvince.forEach((province) => {
    provinceKeys(province.provinceName).forEach((key) => {
      provinceByKey.set(key, province);
    });
  });

  const featureRows = mapFeatures.map((featureItem) => {
    const featureName = String(featureItem.properties?.name_en ?? featureItem.properties?.name_vi ?? "");
    const keys = mapFeatureKeys(featureName);

    let province: ProvinceRow | null = null;
    for (const key of keys) {
      const found = provinceByKey.get(key);
      if (found) {
        province = found;
        break;
      }
    }

    return {
      featureName,
      geometryPath: pathBuilder(featureItem as never) ?? "",
      province,
    };
  });

  const revenueMax = Math.max(...data.byProvince.map((item) => item.revenue), 0);
  const top5 = data.byProvince.slice(0, 5).map((item) => item.provinceId);
  const top10Provinces = data.byProvince.slice(0, 10);

  const provinceBarConfig = {
    revenue: { label: "Revenue", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard
          title="VIETNAM PROVINCE REVENUE MAP"
          addon={<InfoHint text="Province fill intensity represents revenue. Hover provinces with sales to see units sold. Top 5 provinces are outlined in red." />}
        >
          <div
            className="relative bg-accent rounded-lg p-3 w-full"
            onMouseLeave={() => setHoveredProvince(null)}
          >
            <div className="w-full h-[32rem]">
              <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="w-full h-full">
                {featureRows.map((row, index) => {
                  const revenue = row.province?.revenue ?? 0;
                  const fill = row.province
                    ? heatColor(revenue, revenueMax)
                    : "rgba(148, 163, 184, 0.08)";
                  const isTop = row.province ? top5.includes(row.province.provinceId) : false;

                  return (
                    <path
                      key={`province-${index}`}
                      d={row.geometryPath}
                      fill={fill}
                      stroke={isTop ? "var(--destructive)" : "var(--border)"}
                      strokeWidth={isTop ? 1.1 : 0.6}
                      onMouseMove={(event) => {
                        if (!row.province || row.province.orders <= 0) {
                          setHoveredProvince(null);
                          return;
                        }

                        const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                        if (!bounds) return;

                        setHoveredProvince({
                          provinceName: row.province.provinceName,
                          orders: row.province.orders,
                          x: event.clientX - bounds.left,
                          y: event.clientY - bounds.top,
                        });
                      }}
                    >
                      <title>
                        {row.province
                          ? `${row.province.provinceName}: ${formatNumber(row.province.orders)} cai da ban`
                          : row.featureName}
                      </title>
                    </path>
                  );
                })}
              </svg>
            </div>

            {hoveredProvince ? (
              <div
                className="pointer-events-none absolute z-10 rounded-lg border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
                style={{
                  left: `min(${hoveredProvince.x + 12}px, calc(100% - 10rem))`,
                  top: `max(${hoveredProvince.y - 12}px, 3rem)`,
                  transform: "translateY(-100%)",
                }}
              >
                <div className="font-medium">{hoveredProvince.provinceName}</div>
                <div className="text-muted-foreground">
                  Da ban: {formatNumber(hoveredProvince.orders)} cai
                </div>
              </div>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Top contributors: {data.byProvince.slice(0, 5).map((item) => item.provinceName).join(", ")}
          </div>
        </DashboardCard>

        <DashboardCard
          title="TOP 10 PROVINCES BY REVENUE"
          addon={<InfoHint text="Sorted horizontal bars for fast province performance comparison." />}
        >
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-96">
              <ChartContainer className="w-full h-full" config={provinceBarConfig}>
                <BarChart data={top10Provinces} layout="vertical" margin={{ left: 10, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="8 8"
                    strokeWidth={2}
                    stroke="var(--muted-foreground)"
                    opacity={0.3}
                  />
                  <XAxis type="number" tickFormatter={formatVnd} tickLine={false} className="text-sm fill-muted-foreground" />
                  <YAxis type="category" dataKey="provinceName" width={110} tickLine={false} className="text-sm fill-muted-foreground" />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => `${formatVnd(Number(value))} VND`} />}
                  />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard
        title="PROVINCE DETAIL TABLE"
        addon={<InfoHint text="Province-level detail with orders, revenue, AOV, and top-selling product." />}
      >
        <div className="bg-accent rounded-lg overflow-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-accent">
              <tr className="border-b border-border/60">
                <th className="text-left p-2.5 font-medium text-muted-foreground uppercase tracking-wide text-xs">Province</th>
                <th className="text-left p-2.5 font-medium text-muted-foreground uppercase tracking-wide text-xs">Region</th>
                <th className="text-right p-2.5 font-medium text-muted-foreground uppercase tracking-wide text-xs">Orders</th>
                <th className="text-right p-2.5 font-medium text-muted-foreground uppercase tracking-wide text-xs">Revenue</th>
                <th className="text-right p-2.5 font-medium text-muted-foreground uppercase tracking-wide text-xs">AOV</th>
                <th className="text-left p-2.5 font-medium text-muted-foreground uppercase tracking-wide text-xs">Top product</th>
              </tr>
            </thead>
            <tbody>
              {data.byProvince.map((item) => (
                <tr key={item.provinceId} className="border-b border-border/30">
                  <td className="p-2.5 font-medium">{item.provinceName}</td>
                  <td className="p-2.5 text-muted-foreground">{REGION_LABELS[item.region] ?? item.region}</td>
                  <td className="p-2.5 text-right font-display whitespace-nowrap">{item.orders}</td>
                  <td className="p-2.5 text-right font-display whitespace-nowrap">{formatVnd(item.revenue)}</td>
                  <td className="p-2.5 text-right font-display whitespace-nowrap">{formatVnd(item.aov)}</td>
                  <td className="p-2.5 text-muted-foreground max-w-36 truncate">{item.topProduct}</td>
                </tr>
              ))}
              {data.byProvince.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-8 uppercase">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
