import { CalendarDays, Phone, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type InventoryStatus = "in_stock" | "sold";

export type InventoryItem = {
  id: string;
  title: string;
  label: string;
  status: InventoryStatus;
  modelImage?: string | null;
  images?: string[];
  buyInfo: {
    amount: number;
    name: string;
    phone: string;
    date: string;
  };
  sellInfo: {
    amount: number | null;
    name: string;
    phone: string;
    date: string;
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

export function InventoryCard({ item }: { item: InventoryItem }) {
  const profit = netProfit(item);

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
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-[0.16em]">
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
              <Phone className="size-3.5" />
              <span>{item.buyInfo.phone}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              <span>{item.buyInfo.date}</span>
            </div>
          </div>

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
            <div className="font-semibold">{item.sellInfo.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="size-3.5" />
              <span>{item.sellInfo.phone}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              <span>{item.sellInfo.date}</span>
            </div>
          </div>
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
