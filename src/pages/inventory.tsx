import * as React from "react";
import { useNavigate } from "react-router-dom";
import DashboardPageLayout from "@/components/dashboard/layout";
import ProcessorIcon from "@/components/icons/proccesor";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search } from "lucide-react";
import {
  InventoryCard,
  type InventoryItem as InventoryCardItem,
  type InventoryStatus,
} from "@/components/inventory/inventory-card";
import { InventoryDetailDialog } from "@/components/inventory/inventory-detail-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useStoreId } from "@/src/hooks/use-store-id";
import {
  getInventoryList,
  type InventoryItem as SupabaseInventoryItem,
} from "@/src/services/inventory";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryActions } from "@/src/components/inventory/inventory-actions";

type InventoryFilter = "all" | InventoryStatus;

const ITEMS_PER_PAGE = 9;

function buildPageItems(current: number, total: number) {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, "ellipsis-right", total] as const;
  }

  if (current >= total - 2) {
    return [1, "ellipsis-left", total - 2, total - 1, total] as const;
  }

  return [1, "ellipsis-left", current, "ellipsis-right", total] as const;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("vi-VN");
}

function toCardItem(item: SupabaseInventoryItem): InventoryCardItem {
  return {
    id: item.id,
    title: item.model_name ?? item.serial_or_imei,
    label: item.serial_or_imei,
    status: item.status,
    modelImage: item.model_image,
    images: item.images.map((x) => x.image_url),
    buyInfo: {
      amount: item.buy?.buy_price ?? 0,
      name: item.buy?.snapshot_name ?? "N/A",
      phone: item.buy?.snapshot_phone ?? "-",
      date: formatDate(item.buy?.buy_date),
    },
    sellInfo: {
      amount: item.sell?.sell_price ?? null,
      name: item.sell?.snapshot_name ?? "Pending",
      phone: item.sell?.snapshot_phone ?? "-",
      date: formatDate(item.sell?.sell_date),
    },
  };
}

function InventoryCardSkeleton() {
  return (
    <Card className="rounded-lg">
      <CardHeader className="h-auto gap-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent className="space-y-4 bg-background/50">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2 pr-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="space-y-2 pl-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="pt-3 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const { storeId, loading: loadingStoreId } = useStoreId();

  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<InventoryFilter>("all");
  const [page, setPage] = React.useState(1);
  const [selectedItem, setSelectedItem] =
    React.useState<InventoryCardItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const [items, setItems] = React.useState<InventoryCardItem[]>([]);
  const [totalItems, setTotalItems] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadTick, setReloadTick] = React.useState(0);

  React.useEffect(() => {
    setPage(1);
  }, [query, filter]);

  React.useEffect(() => {
    if (!storeId) return;

    let active = true;
    setLoading(true);
    setError(null);

    void getInventoryList({
      storeId,
      status: filter,
      searchTerm: query,
      page,
      pageSize: ITEMS_PER_PAGE,
    })
      .then((result) => {
        if (!active) return;
        setItems(result.items.map(toCardItem));
        setTotalItems(result.meta.totalItems);
        setTotalPages(result.meta.totalPages);
        setPage(result.meta.page);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load inventory",
        );
        setItems([]);
        setTotalItems(0);
        setTotalPages(1);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [storeId, query, filter, page, reloadTick]);

  return (
    <DashboardPageLayout
      header={{
        title: "Inventory",
        icon: ProcessorIcon,
        actions: (
          <InventoryActions
            storeId={storeId}
            onCreated={() => setReloadTick((prev) => prev + 1)}
          />
        ),
      }}
    >
      <div className="space-y-4">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search model, IMEI, contact..."
              className="pl-9 bg-card border-border/60"
            />
          </div>

          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as InventoryFilter)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="in_stock">In stock</TabsTrigger>
              <TabsTrigger value="sold">Sold</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-[0.12em]">
          {totalItems} assets found
        </div>

        {!loadingStoreId && !storeId && (
          <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-muted-foreground uppercase">
            Missing store ID in your account. Please sign up again with Store ID
            or update your user metadata.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                <InventoryCardSkeleton key={`inventory-skeleton-${index}`} />
              ))
            : items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="h-full w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={() => {
                    const isDesktop = window.matchMedia(
                      "(min-width: 1024px)",
                    ).matches;
                    if (!isDesktop) {
                      navigate(`/inventory/${item.id}`);
                      return;
                    }
                    setSelectedItem(item);
                    setIsDialogOpen(true);
                  }}
                >
                  <InventoryCard item={item} />
                </button>
              ))}
        </div>

        {!loading && items.length === 0 && !error && storeId && (
          <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-muted-foreground uppercase">
            No inventory matched your filter.
          </div>
        )}

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page === 1}
                className={page === 1 ? "pointer-events-none opacity-40" : ""}
                onClick={(event) => {
                  event.preventDefault();
                  if (page === 1) return;
                  setPage((prev) => Math.max(1, prev - 1));
                }}
              />
            </PaginationItem>

            {buildPageItems(page, totalPages).map((entry, index) =>
              typeof entry === "number" ? (
                <PaginationItem key={entry}>
                  <PaginationLink
                    href="#"
                    isActive={entry === page}
                    onClick={(event) => {
                      event.preventDefault();
                      setPage(entry);
                    }}
                  >
                    {entry}
                  </PaginationLink>
                </PaginationItem>
              ) : (
                <PaginationItem key={`${entry}-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page === totalPages}
                className={
                  page === totalPages ? "pointer-events-none opacity-40" : ""
                }
                onClick={(event) => {
                  event.preventDefault();
                  if (page === totalPages) return;
                  setPage((prev) => Math.min(totalPages, prev + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <InventoryDetailDialog
        item={selectedItem}
        open={isDialogOpen}
        storeId={storeId}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
        onDeleted={() => setReloadTick((prev) => prev + 1)}
      />
    </DashboardPageLayout>
  );
}
