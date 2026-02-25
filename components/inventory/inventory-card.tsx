import { CalendarDays, MapPin, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import MoneyPlus from "../icons/money-plus";

export type InventoryStatus = "in_stock" | "sold";

export type InventoryItem = {
  id: string;
  title: string;
  label: string;
  status: InventoryStatus;
  modelImage?: string | null;
  images?: string[];
  buyInfo: {
    transactionId?: string;
    amount: number;
    name: string;
    phone: string;
    provinceId?: number | null;
    province: string;
    addressDetail: string;
    date: string;
    dateRaw?: string;
  };
  sellInfo: {
    transactionId?: string;
    amount: number | null;
    name: string;
    phone: string;
    provinceId?: number | null;
    province: string;
    addressDetail: string;
    date: string;
    dateRaw?: string;
  };
};

function formatMoney(value: number | null) {
  if (value === null) return "-";
  return value.toLocaleString("vi-VN");
}

function netProfit(item: InventoryItem) {
  if (item.sellInfo.amount === null) return null;
  return item.sellInfo.amount - item.buyInfo.amount;
}

function getStockAgeDays(dateRaw?: string) {
  if (!dateRaw) return 0;
  const start = Date.parse(dateRaw);
  if (Number.isNaN(start)) return 0;
  const now = Date.now();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function InventoryCard({ item }: { item: InventoryItem }) {
  const profit = netProfit(item);
  const stockAgeDays = getStockAgeDays(item.buyInfo.dateRaw);
  const sellName =
    item.status === "in_stock"
      ? `In stock ${stockAgeDays} day${stockAgeDays === 1 ? "" : "s"}`
      : item.sellInfo.name;

  return (
    <Card className="h-full rounded-lg transition-all duration-150 hover:cursor-pointer hover:shadow-[0_0_18px_rgba(255,255,255,0.1)]">
      <CardHeader className="h-auto gap-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            {item.modelImage ? (
              <div className="size-15 shrink-0 overflow-hidden rounded-md bg-muted">
                <img
                  src={item.modelImage}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-contain object-center p-1 scale-110"
                />
              </div>
            ) : null}
            <CardTitle className="text-xl md:text-2xl font-mono truncate">
              {item.title}
            </CardTitle>
          </div>
          <Badge
            variant={item.status === "sold" ? "secondary" : "outline-success"}
            className="uppercase px-3 py-1 rounded-full"
          >
            {item.status === "sold" ? "Sold" : "In stock"}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[14px] text-white/80 uppercase tracking-[0.16em]">
          <Tag className="size-3.5" />
          <span>{item.label}</span>
        </div>
      </CardHeader>

      <CardContent className="flex h-full flex-col space-y-4 bg-background/50">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2 pr-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Buy info
            </div>
            <div className="text-xl font-semibold text-[#FACC15]">
              {formatMoney(item.buyInfo.amount)}
            </div>
            <div className="font-semibold">{item.buyInfo.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              <span>{item.buyInfo.province || "-"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              <span>{item.buyInfo.date}</span>
            </div>
          </div>

          {item.status === "in_stock" ? (
            <div className="space-y-2 pl-1">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Status
              </div>
              <div className="flex items-center gap-2.5 rounded-lg  bg-muted px-3 py-2.5">
                <div className="relative grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <CalendarDays className="size-7 opacity-75" color="white" />
                </div>
                <div className="leading-tight">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    In Stock
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {stockAgeDays} day{stockAgeDays === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pl-1">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Sell info
              </div>
              <div
                className={cn(
                  "text-xl font-bold",
                  item.sellInfo.amount === null
                    ? "text-muted-foreground"
                    : "text-[#3B82F6]",
                )}
              >
                {formatMoney(item.sellInfo.amount)}
              </div>
              <div className="font-semibold">{sellName}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5" />
                <span>{item.sellInfo.province || "-"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" />
                <span>{item.sellInfo.date}</span>
              </div>
            </div>
          )}
        </div>

        <div className="pt-3">
          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-1">
            Net profit
          </div>
          <div
            className={cn(
              "text-2xl font-bold font-mono",
              profit === null
                ? "text-muted-foreground"
                : profit >= 0
                  ? "text-success"
                  : "text-destructive",
            )}
          >
            {profit === null
              ? "Pending"
              : `${profit > 0 ? "+" : ""}${formatMoney(profit)}`}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
