import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type InventoryStatus = "in_stock" | "sold";

export type InventoryImage = {
  id?: string;
  url: string;
};

export type InventoryItem = {
  id: string;
  title: string;
  label: string;
  status: InventoryStatus;
  modelImage?: string | null;
  images?: InventoryImage[];
  warrantyExpiryDate?: string | null;
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

function profitMargin(item: InventoryItem) {
  if (item.sellInfo.amount === null || item.buyInfo.amount <= 0) return null;
  return ((item.sellInfo.amount - item.buyInfo.amount) / item.buyInfo.amount) * 100;
}

function getStockAgeDays(dateRaw?: string) {
  if (!dateRaw) return 0;
  const start = Date.parse(dateRaw);
  if (Number.isNaN(start)) return 0;
  const now = Date.now();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

type TimelineStepProps = {
  label: string;
  date?: string;
  amount: number | null;
  name: string;
  province: string;
  state: "done" | "pending";
  isLast?: boolean;
};

function TimelineStep({
  label,
  date,
  amount,
  name,
  province,
  state,
  isLast,
}: TimelineStepProps) {
  const isDone = state === "done";
  return (
    <div className="relative flex gap-3 pb-0">
      {/* Rail */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "mt-1 size-2 shrink-0 rounded-full ring-4",
            isDone
              ? "bg-primary ring-primary/15"
              : "bg-transparent ring-0 border border-dashed border-muted-foreground/50 size-2.5 mt-0.75",
          )}
        />
        {!isLast && (
          <span
            className={cn(
              "mt-1 w-px flex-1",
              isDone
                ? "bg-border"
                : "border-l border-dashed border-border bg-transparent",
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            {label}
            {date ? (
              <span className="font-normal text-muted-foreground/70">
                {" "}
                · {date}
              </span>
            ) : null}
          </span>
          <span
            className={cn(
              "whitespace-nowrap text-sm font-semibold tabular-nums",
              amount === null ? "font-normal text-muted-foreground" : "text-foreground",
            )}
          >
            {formatMoney(amount)}
          </span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <span
            className={cn(
              "truncate text-sm",
              isDone ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {name}
          </span>
          {province && province !== "-" ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              {province}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function InventoryCard({ item }: { item: InventoryItem }) {
  const profit = netProfit(item);
  const margin = profitMargin(item);
  const stockAgeDays = getStockAgeDays(item.buyInfo.dateRaw);
  const isSold = item.status === "sold";

  return (
    <div className="group flex h-full flex-col rounded-xl bg-card text-card-foreground shadow-sm transition-all duration-200 hover:cursor-pointer hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          {item.modelImage ? (
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg">
              <img
                src={item.modelImage}
                alt={item.title}
                loading="lazy"
                decoding="async"
                className="size-full object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>
          ) : null}
          <div className="min-w-0 space-y-0.5">
            <h3 className="truncate text-sm font-semibold leading-tight text-foreground">
              {item.title}
            </h3>
            <p className="truncate text-xs text-muted-foreground tabular-nums">
              {item.label}
            </p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="shrink-0 gap-1.5 rounded-md font-normal text-muted-foreground"
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              isSold ? "bg-muted-foreground/60" : "bg-success",
            )}
          />
          {isSold ? "Đã bán" : "Còn hàng"}
        </Badge>
      </div>

      {/* Transaction timeline */}
      <div className="flex-1 px-4 pb-4">
        <TimelineStep
          label="Nhập hàng"
          date={item.buyInfo.date}
          amount={item.buyInfo.amount}
          name={item.buyInfo.name}
          province={item.buyInfo.province}
          state="done"
        />
        {isSold ? (
          <TimelineStep
            label="Đã bán"
            date={item.sellInfo.date}
            amount={item.sellInfo.amount}
            name={item.sellInfo.name}
            province={item.sellInfo.province}
            state="done"
            isLast
          />
        ) : (
          <TimelineStep
            label="Chờ bán"
            amount={null}
            name={`Tồn kho ${stockAgeDays} ngày`}
            province=""
            state="pending"
            isLast
          />
        )}
      </div>

      {/* Footer — net profit */}
      <div className="flex items-center justify-between gap-4 rounded-b-xl border-t bg-muted/40 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">
          Lợi nhuận ròng
        </span>
        {profit === null ? (
          <span className="text-sm text-muted-foreground">Đang chờ</span>
        ) : (
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "whitespace-nowrap text-sm font-semibold tabular-nums",
                profit >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {profit > 0 ? "+" : ""}
              {formatMoney(profit)}
            </span>
            {margin !== null && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
                  profit >= 0
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {margin > 0 ? "+" : ""}
                {margin.toFixed(1)}%
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
