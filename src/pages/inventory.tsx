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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCheck,
  Loader2,
  PackageSearch,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  InventoryCard,
  type InventoryItem as InventoryCardItem,
  type InventoryStatus,
} from "@/components/inventory/inventory-card";
import { InventoryDetailDialog } from "@/components/inventory/inventory-detail-dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
  useDeleteInventoryMutation,
  useInventoryListQuery,
  useModelsQuery,
  useProvincesQuery,
} from "@/src/queries/hooks";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
    images: item.images.map((x) => ({ id: x.id, url: x.image_url })),
    warrantyExpiryDate: item.warranty_expiry_date ?? null,
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
      name: item.sell?.snapshot_name ?? "Chờ xử lý",
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
    <div className="flex h-full flex-col rounded-xl bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-16 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <div className="flex-1 space-y-4 px-4 pb-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="mt-1 size-2 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const { storeId, loading: loadingStoreId } = useStoreId();

  const [queryInput, setQueryInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<InventoryFilter>("all");
  const [sortBy, setSortBy] = React.useState<InventorySortBy>("created_desc");
  const [page, setPage] = React.useState(1);
  const [appliedFilters, setAppliedFilters] =
    React.useState<InventoryFilterDraft>(EMPTY_INVENTORY_FILTERS);
  const [selectedItem, setSelectedItem] =
    React.useState<InventoryCardItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const deleteInventoryMutation = useDeleteInventoryMutation();
  const isBulkDeleting = deleteInventoryMutation.isPending;

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

  const exitSelectionMode = React.useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const pageItemIds = React.useMemo(() => items.map((x) => x.id), [items]);
  const allPageSelected =
    pageItemIds.length > 0 && pageItemIds.every((id) => selectedIds.has(id));

  const toggleSelectAllOnPage = React.useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const everySelected =
        pageItemIds.length > 0 && pageItemIds.every((id) => next.has(id));
      if (everySelected) pageItemIds.forEach((id) => next.delete(id));
      else pageItemIds.forEach((id) => next.add(id));
      return next;
    });
  }, [pageItemIds]);

  const handleBulkDelete = React.useCallback(async () => {
    if (!storeId || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(
      ids.map((id) =>
        deleteInventoryMutation.mutateAsync({ storeId, id }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    const succeeded = ids.length - failed;

    if (succeeded > 0) {
      toast({
        title: "Đã xóa kho hàng",
        description: `Đã xóa ${succeeded} mục.`,
      });
    }
    if (failed > 0) {
      toast({
        variant: "destructive",
        title: "Một số mục xóa thất bại",
        description: `Không thể xóa ${failed} mục.`,
      });
    }

    setBulkDeleteOpen(false);
    exitSelectionMode();
  }, [storeId, selectedIds, deleteInventoryMutation, exitSelectionMode]);

  return (
    <DashboardPageLayout
      header={{
        title: "Kho hàng",
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
                placeholder="Tìm model, IMEI, liên hệ..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tabs
              value={filter}
              onValueChange={(value) => setFilter(value as InventoryFilter)}
            >
              <TabsList>
                <TabsTrigger value="all">Tất cả</TabsTrigger>
                <TabsTrigger value="in_stock">Còn hàng</TabsTrigger>
                <TabsTrigger value="sold">Đã bán</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as InventorySortBy)}
            >
              <SelectTrigger className="w-42.5">
                <SelectValue placeholder="Sắp xếp theo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">Ngày tạo</SelectItem>
                <SelectItem value="buy_date_desc">Ngày mua</SelectItem>
                <SelectItem value="name">Tên</SelectItem>
                <SelectItem value="in_stock_first">Còn hàng</SelectItem>
                <SelectItem value="stock_age_desc">Tồn kho lâu nhất</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={selectionMode ? "secondary" : "outline"}
              onClick={() =>
                selectionMode ? exitSelectionMode() : setSelectionMode(true)
              }
            >
              {selectionMode ? (
                <>
                  <X className="size-4" />

                </>
              ) : (
                <>
                  <CheckCheck className="size-4" />

                </>
              )}
            </Button>
          </div>
        </div>

        {selectionMode ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allPageSelected}
                onCheckedChange={toggleSelectAllOnPage}
                aria-label="Chọn tất cả trên trang này"
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0
                  ? `Đã chọn ${selectedIds.size}`
                  : "Chọn mục để xóa"}
              </span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedIds.size === 0 || isBulkDeleting}
              onClick={() => setBulkDeleteOpen(true)}
            >
              {isBulkDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Xóa{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
            </Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {totalItems} mục
          </div>
        )}

        {!loadingStoreId && !storeId && (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TriangleAlert />
              </EmptyMedia>
              <EmptyTitle>Thiếu mã cửa hàng</EmptyTitle>
              <EmptyDescription>
                Tài khoản của bạn không có mã cửa hàng. Vui lòng đăng ký lại với
                mã cửa hàng hoặc cập nhật thông tin người dùng.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Không thể tải kho hàng"}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
              <InventoryCardSkeleton key={`inventory-skeleton-${index}`} />
            ))
            : items.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <div key={item.id} className="relative h-full">
                  <button
                    type="button"
                    aria-pressed={selectionMode ? isSelected : undefined}
                    className={cn(
                      "h-full w-full rounded-xl text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      selectionMode &&
                      isSelected &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    )}
                    onClick={() => {
                      if (selectionMode) {
                        toggleSelect(item.id);
                        return;
                      }
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
                  {selectionMode && (
                    <div className="absolute left-3 top-3 z-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(item.id)}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Chọn ${item.title}`}
                        className="size-5 border-2 bg-background shadow-sm data-[state=checked]:border-primary"
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {!loading && items.length === 0 && !error && storeId && (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageSearch />
              </EmptyMedia>
              <EmptyTitle>Không có kết quả</EmptyTitle>
              <EmptyDescription>
                Không có kho hàng nào khớp với tìm kiếm hoặc bộ lọc của bạn. Hãy
                thử điều chỉnh lại.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
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

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Xóa {selectedIds.size} mục?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Thao tác này sẽ xóa vĩnh viễn kho hàng đã chọn cùng với các giao
              dịch mua và bán của chúng. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleBulkDelete();
              }}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPageLayout>
  );
}
