import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { feature } from "topojson-client";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  ZoomControl,
  LayersControl,
} from "react-leaflet";
import type {
  Layer,
  LeafletMouseEvent,
  PathOptions,
  StyleFunction,
} from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import "leaflet/dist/leaflet.css";
import DashboardCard from "@/components/dashboard/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { GeoAnalyticsData } from "@/src/services/analytics";
import { formatNumber, formatVnd, formatVndFull, REGION_LABELS } from "./format";
import InfoHint from "./info-hint";

type ProvinceRow = GeoAnalyticsData["byProvince"][number];

// Vietnam bounding box (lat/lng) used to frame the initial view.
const VN_CENTER: [number, number] = [16.2, 106.5];
const VN_BOUNDS: [[number, number], [number, number]] = [
  [8.0, 102.0],
  [23.6, 109.6],
];

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
    // Vietnamese "\u0111" (U+0111) is NOT decomposed by NFD, so it would be
    // stripped by the alphanumeric filter below \u2014 map it to "d" first.
    .replace(/\u0111/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function provinceKeys(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return [];

  const normalized = normalizeProvinceKey(trimmed);
  const keys = new Set<string>([normalized]);

  // Province names in the DB carry a "TP." / "th\u00e0nh ph\u1ed1" prefix that the
  // map's feature names don't \u2014 index the stripped variant too.
  if (normalized.startsWith("tp")) keys.add(normalized.slice(2));
  if (normalized.startsWith("thanhpho")) keys.add(normalized.slice(8));

  // Apply aliases to every base key (including the prefix-stripped ones)
  // so e.g. "tphue" -> "hue" -> "thuathienhue" reaches the map feature.
  for (const key of Array.from(keys)) {
    (PROVINCE_ALIASES[key] ?? []).forEach((alias) => keys.add(alias));
  }

  return Array.from(keys).filter(Boolean);
}

function featureNameKeys(props: Record<string, unknown> | undefined) {
  const raw = String(props?.name_en ?? props?.name_vi ?? "");
  return raw
    .split("|")
    .map((part) => normalizeProvinceKey(part))
    .filter(Boolean);
}

// Sequential indigo choropleth scale; kept semi-transparent so the
// underlying street tiles stay visible when zoomed in to see addresses.
function fillFor(revenue: number, max: number) {
  if (max <= 0 || revenue <= 0) return { color: "#6366f1", opacity: 0.06 };
  const ratio = Math.min(1, revenue / max);
  return { color: "#4f46e5", opacity: 0.18 + ratio * 0.52 };
}

function VietnamMap({ data, revenueMax }: { data: GeoAnalyticsData; revenueMax: number }) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/maps/vietnam-adm2.json")
      .then((res) => res.json())
      .then((topology) => {
        if (!active) return;
        const objects = (topology as { objects?: Record<string, unknown> }).objects;
        const key = objects ? Object.keys(objects)[0] : undefined;
        if (!objects || !key) {
          setGeojson({ type: "FeatureCollection", features: [] });
          return;
        }
        const collection = feature(
          topology as never,
          objects[key] as never,
        ) as unknown as FeatureCollection;
        setGeojson(collection);
      })
      .catch(() => {
        if (active) setGeojson({ type: "FeatureCollection", features: [] });
      });
    return () => {
      active = false;
    };
  }, []);

  // Index province sales rows by all of their normalized name keys.
  const provinceByKey = useMemo(() => {
    const map = new Map<string, ProvinceRow>();
    data.byProvince.forEach((province) => {
      provinceKeys(province.provinceName).forEach((key) => map.set(key, province));
    });
    return map;
  }, [data.byProvince]);

  const top5Ids = useMemo(
    () => new Set(data.byProvince.slice(0, 5).map((item) => item.provinceId)),
    [data.byProvince],
  );

  const matchProvince = (feat: Feature<Geometry>): ProvinceRow | null => {
    for (const key of featureNameKeys(feat.properties as Record<string, unknown>)) {
      const found = provinceByKey.get(key);
      if (found) return found;
    }
    return null;
  };

  const style: StyleFunction = (feat) => {
    const province = feat ? matchProvince(feat as Feature<Geometry>) : null;
    const { color, opacity } = fillFor(province?.revenue ?? 0, revenueMax);
    const isTop = province ? top5Ids.has(province.provinceId) : false;
    return {
      fillColor: color,
      fillOpacity: opacity,
      color: isTop ? "#ef4444" : "#94a3b8",
      weight: isTop ? 2 : 0.6,
    } satisfies PathOptions;
  };

  const onEachFeature = (feat: Feature<Geometry>, layer: Layer) => {
    const province = matchProvince(feat);
    const rawName = String(
      (feat.properties as Record<string, unknown>)?.name_en ??
        (feat.properties as Record<string, unknown>)?.name_vi ??
        "",
    );
    const name = province?.provinceName || rawName || "Unknown";

    const tooltip = province
      ? `<div style="font-weight:600">${name}</div>
         <div>Revenue: ${formatVndFull(province.revenue)}</div>
         <div>Orders: ${formatNumber(province.orders)}</div>
         <div>AOV: ${formatVndFull(province.aov)}</div>
         <div>Top: ${province.topProduct}</div>`
      : `<div style="font-weight:600">${name}</div><div>No sales</div>`;

    layer.bindTooltip(tooltip, { sticky: true, direction: "top", opacity: 0.95 });

    layer.on({
      mouseover: (event: LeafletMouseEvent) => {
        const target = event.target as Layer & { setStyle?: (s: PathOptions) => void };
        target.setStyle?.({ weight: 2.4, color: "#4f46e5" });
      },
      mouseout: (event: LeafletMouseEvent) => {
        const target = event.target as Layer & { setStyle?: (s: PathOptions) => void };
        const isTop = province ? top5Ids.has(province.provinceId) : false;
        target.setStyle?.({
          weight: isTop ? 2 : 0.6,
          color: isTop ? "#ef4444" : "#94a3b8",
        });
      },
    });
  };

  return (
    <MapContainer
      center={VN_CENTER}
      zoom={5}
      minZoom={5}
      maxZoom={18}
      bounds={VN_BOUNDS}
      scrollWheelZoom
      zoomControl={false}
      style={{ height: "100%", width: "100%", background: "var(--accent)", borderRadius: "0.5rem" }}
    >
      <LayersControl position="topleft">
        <LayersControl.BaseLayer checked name="Đường phố (OSM)">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Sáng (Carto)">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Vệ tinh (Esri)">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      <ZoomControl position="topright" />
      {geojson ? (
        <GeoJSON
          key={`${data.byProvince.length}-${revenueMax}`}
          data={geojson}
          style={style}
          onEachFeature={onEachFeature}
        />
      ) : null}
    </MapContainer>
  );
}

export default function GeoAnalytics({ data }: { data: GeoAnalyticsData | undefined }) {
  if (!data) {
    return (
      <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-muted-foreground uppercase">
        Loading data...
      </div>
    );
  }

  const revenueMax = Math.max(...data.byProvince.map((item) => item.revenue), 0);
  const top10Provinces = data.byProvince.slice(0, 10);

  const provinceBarConfig = {
    revenue: { label: "Revenue", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <DashboardCard
        title="VIETNAM PROVINCE REVENUE MAP"
        addon={<InfoHint text="Interactive map: scroll or use +/- to zoom down to street level, drag to pan, switch base layers (street / light / satellite) top-left. Province shading shows revenue; top 5 provinces are outlined in red. Hover a province for details." />}
      >
        <div className="bg-accent rounded-lg p-3 w-full">
          <div className="w-full h-[clamp(34rem,70vh,56rem)]">
            <VietnamMap data={data} revenueMax={revenueMax} />
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Top contributors: {data.byProvince.slice(0, 5).map((item) => item.provinceName).join(", ") || "No data"}
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
