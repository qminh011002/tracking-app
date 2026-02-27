import * as React from "react";
import { useNavigate } from "react-router-dom";
import DashboardPageLayout from "@/components/dashboard/layout";
import ProcessorIcon from "@/components/icons/proccesor";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownAZ, Search } from "lucide-react";
import {
  InventoryCard,
  type InventoryItem as InventoryCardItem,
  type InventoryStatus,
} from "@/components/inventory/inventory-card";
import { InventoryDetailDialog } from "@/components/inventory/inventory-detail-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useStoreId } from "@/src/hooks/use-store-id";
import {
  type InventoryItem as SupabaseInventoryItem,
  type InventorySortBy,
} from "@/src/services/inventory";
import type { ModelItem } from "@/src/services/models";
import type { ProvinceItem } from "@/src/services/provinces";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EMPTY_INVENTORY_FILTERS,
  InventoryFilterPopover,
  type InventoryFilterDraft,
  toInventoryListFilters,
} from "@/src/components/inventory/inventory-filter-popover";
import { InventoryPaginationControls } from "@/src/components/inventory/inventory-pagination-controls";
import { InventoryActions } from "@/src/components/inventory/inventory-actions";
import {
  sortModelsForPicker,
  useInventoryListQuery,
  useModelsQuery,
  useProvincesQuery,
} from "@/src/queries/hooks";

type InventoryFilter = "all" | InventoryStatus;

const ITEMS_PER_PAGE = 9;
const SEARCH_DEBOUNCE_MS = 300;

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
      transactionId: item.buy?.id,
      amount: item.buy?.buy_price ?? 0,
      name: item.buy?.snapshot_name ?? "N/A",
      phone: item.buy?.snapshot_phone ?? "-",
      provinceId: item.buy?.snapshot_province_id ?? null,
      province: item.buy?.snapshot_province_name ?? "-",
      addressDetail: item.buy?.snapshot_address ?? "",
      date: formatDate(item.buy?.buy_date),
      dateRaw: item.buy?.buy_date,
    },
    sellInfo: {
      transactionId: item.sell?.id,
      amount: item.sell?.sell_price ?? null,
      name: item.sell?.snapshot_name ?? "Pending",
      phone: item.sell?.snapshot_phone ?? "-",
      provinceId: item.sell?.snapshot_province_id ?? null,
      province: item.sell?.snapshot_province_name ?? "-",
      addressDetail: item.sell?.snapshot_address ?? "",
      date: formatDate(item.sell?.sell_date),
      dateRaw: item.sell?.sell_date,
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

  const [queryInput, setQueryInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<InventoryFilter>("all");
  const [sortBy, setSortBy] = React.useState<InventorySortBy>("in_stock_first");
  const [page, setPage] = React.useState(1);
  const [appliedFilters, setAppliedFilters] =
    React.useState<InventoryFilterDraft>(EMPTY_INVENTORY_FILTERS);
  const [selectedItem, setSelectedItem] =
    React.useState<InventoryCardItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setPage(1);
  }, [query, filter, sortBy, appliedFilters]);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setQuery(queryInput.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [queryInput]);

  const { data: modelsData = [], isLoading: modelsLoading } = useModelsQuery({
    storeId,
    searchTerm: "",
  });
  const { data: provincesData = [], isLoading: provincesLoading } =
    useProvincesQuery(Boolean(storeId));
  const models = React.useMemo(
    () => sortModelsForPicker(modelsData as ModelItem[]),
    [modelsData],
  );
  const provinces = provincesData as ProvinceItem[];
  const inventoryFilters = React.useMemo(
    () => toInventoryListFilters(appliedFilters),
    [appliedFilters],
  );

  const {
    data,
    isLoading: loading,
    error,
  } = useInventoryListQuery({
    storeId,
    status: filter,
    sortBy,
    searchTerm: query,
    page,
    pageSize: ITEMS_PER_PAGE,
    filters: inventoryFilters,
  });

  const items = React.useMemo(
    () => (data?.items ?? []).map(toCardItem),
    [data],
  );
  const totalItems = data?.meta.totalItems ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  React.useEffect(() => {
    if (!data?.meta.page) return;
    setPage(data.meta.page);
  }, [data?.meta.page]);

  React.useEffect(() => {
    if (!selectedItem) return;
    const nextSelected = items.find((entry) => entry.id === selectedItem.id);
    if (nextSelected) setSelectedItem(nextSelected);
  }, [items, selectedItem]);

  return (
    <DashboardPageLayout
      header={{
        title: "Inventory",
        icon: ProcessorIcon,
        actions: (
          <InventoryActions storeId={storeId} onCreated={() => undefined} />
        ),
      }}
    >
      <div className="space-y-4">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
          <div className="flex w-full items-center gap-2 xl:max-w-3xl">
            <InventoryFilterPopover
              appliedFilters={appliedFilters}
              onApplyFilters={setAppliedFilters}
              models={models}
              modelsLoading={modelsLoading}
              provinces={provinces}
              provincesLoading={provincesLoading}
            />
            <div className="relative w-full xl:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Search model, IMEI, contact..."
                className="pl-9 bg-card border-border/60"
              />
            </div>
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
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as InventorySortBy)}
          >
            <SelectTrigger className="w-42.5 bg-card border-none">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Created</SelectItem>
              <SelectItem value="buy_date_desc">
                <span className="inline-flex items-center gap-1">
                  Buy date <ArrowDownAZ className="size-3.5" />
                </span>
              </SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="in_stock_first">In stock</SelectItem>
              <SelectItem value="stock_age_desc">Longest stock</SelectItem>
            </SelectContent>
          </Select>
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
            {error instanceof Error
              ? error.message
              : "Failed to load inventory"}
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

        <InventoryPaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      <InventoryDetailDialog
        item={selectedItem}
        open={isDialogOpen}
        storeId={storeId}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
        onDeleted={() => undefined}
      />
    </DashboardPageLayout>
  );
}
