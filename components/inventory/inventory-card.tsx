import { ArrowDownRight, CalendarDays, MapPin, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  if (value === null) return "—";
  return `${value.toLocaleString("vi-VN")} ₫`;
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

type TransactionRowProps = {
  kind: "buy" | "sell";
  amount: number | null;
  name: string;
  province: string;
  date: string;
};

function TransactionRow({ kind, amount, name, province, date }: TransactionRowProps) {
  const isBuy = kind === "buy";
  return (
    <div className="space-y-2 px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider",
            isBuy ? "text-warning" : "text-primary",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              isBuy ? "bg-warning" : "bg-primary",
            )}
          />
          {isBuy ? "Buy" : "Sell"}
        </span>
        <span
          className={cn(
            "whitespace-nowrap font-mono text-base font-bold tabular-nums",
            amount === null
              ? "text-muted-foreground"
              : isBuy
                ? "text-warning"
                : "text-primary",
          )}
        >
          {formatMoney(amount)}
        </span>
      </div>
      <div className="truncate text-sm font-medium text-foreground">{name}</div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{province || "—"}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <CalendarDays className="size-3.5 shrink-0" />
          {date}
        </span>
      </div>
    </div>
  );
}

export function InventoryCard({ item }: { item: InventoryItem }) {
  const profit = netProfit(item);
  const stockAgeDays = getStockAgeDays(item.buyInfo.dateRaw);
  const isSold = item.status === "sold";

  return (
    <Card className="group flex h-full flex-col gap-0 overflow-hidden rounded-xl border-border/60 py-0 transition-all duration-200 hover:cursor-pointer hover:-translate-y-0.5 hover:border-border hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/40">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          {item.modelImage ? (
            <div className="size-14 shrink-0 overflow-hidden ">
              <img
                src={item.modelImage}
                alt={item.title}
                loading="lazy"
                decoding="async"
                className="size-full object-contain object-center p-1"
              />
            </div>
          ) : null}
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-base font-semibold leading-tight text-foreground">
              {item.title}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Tag className="size-3 shrink-0" />
              <span className="truncate font-mono">{item.label}</span>
            </div>
          </div>
        </div>
        <Badge
          variant={isSold ? "secondary" : "outline-success"}
          className="shrink-0 gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide"
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              isSold ? "bg-muted-foreground" : "bg-success",
            )}
          />
          {isSold ? "Sold" : "In stock"}
        </Badge>
      </div>

      {/* Transaction ledger */}
      <div className="flex flex-1 flex-col px-5 pb-5">
        <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-muted/30">
          <TransactionRow
            kind="buy"
            amount={item.buyInfo.amount}
            name={item.buyInfo.name}
            province={item.buyInfo.province}
            date={item.buyInfo.date}
          />

          {isSold ? (
            <TransactionRow
              kind="sell"
              amount={item.sellInfo.amount}
              name={item.sellInfo.name}
              province={item.sellInfo.province}
              date={item.sellInfo.date}
            />
          ) : (
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                Stock age
              </span>
              <span className="whitespace-nowrap font-mono text-base font-bold tabular-nums text-foreground">
                {stockAgeDays}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  day{stockAgeDays === 1 ? "" : "s"}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Net profit footer */}
        <div className="mt-auto flex items-center justify-between gap-4 pt-4">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ArrowDownRight className="size-3.5" />
            Net profit
          </span>
          <span
            className={cn(
              "whitespace-nowrap font-mono text-lg font-bold tabular-nums",
              profit === null
                ? "text-sm font-medium text-muted-foreground"
                : profit >= 0
                  ? "text-success"
                  : "text-destructive",
            )}
          >
            {profit === null
              ? "Pending"
              : `${profit > 0 ? "+" : ""}${formatMoney(profit)}`}
          </span>
        </div>
      </div>
    </Card>
  );
}
