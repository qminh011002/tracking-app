import * as React from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ProvinceCombobox } from "@/src/components/inventory/province-combobox";
import type { InventoryListFilters } from "@/src/services/inventory";
import type { ModelItem } from "@/src/services/models";
import type { ProvinceItem } from "@/src/services/provinces";

export type InventoryFilterDraft = {
  dateFrom: string;
  dateTo: string;
  modelIds: string[];
  buyProvinceId: string;
  sellProvinceId: string;
};

export const EMPTY_INVENTORY_FILTERS: InventoryFilterDraft = {
  dateFrom: "",
  dateTo: "",
  modelIds: [],
  buyProvinceId: "",
  sellProvinceId: "",
};

function countActiveFilters(filters: InventoryFilterDraft) {
  let count = 0;
  if (filters.dateFrom || filters.dateTo) count += 1;
  if (filters.modelIds.length > 0) count += 1;
  if (filters.buyProvinceId) count += 1;
  if (filters.sellProvinceId) count += 1;
  return count;
}

export function toInventoryListFilters(
  filters: InventoryFilterDraft,
): InventoryListFilters | undefined {
  const payload: InventoryListFilters = {
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    modelIds: filters.modelIds.length > 0 ? filters.modelIds : undefined,
    buyProvinceId: filters.buyProvinceId ? Number(filters.buyProvinceId) : undefined,
    sellProvinceId: filters.sellProvinceId ? Number(filters.sellProvinceId) : undefined,
  };

  if (
    !payload.dateFrom &&
    !payload.dateTo &&
    (!payload.modelIds || payload.modelIds.length === 0) &&
    !payload.buyProvinceId &&
    !payload.sellProvinceId
  ) {
    return undefined;
  }

  return payload;
}

type InventoryFilterPopoverProps = {
  appliedFilters: InventoryFilterDraft;
  onApplyFilters: (next: InventoryFilterDraft) => void;
  models: ModelItem[];
  modelsLoading: boolean;
  provinces: ProvinceItem[];
  provincesLoading: boolean;
};

function InventoryFilterPopoverInner({
  appliedFilters,
  onApplyFilters,
  models,
  modelsLoading,
  provinces,
  provincesLoading,
}: InventoryFilterPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [modelFilterQuery, setModelFilterQuery] = React.useState("");
  const [draftFilters, setDraftFilters] = React.useState<InventoryFilterDraft>(
    appliedFilters,
  );

  const visibleModels = React.useMemo(() => {
    const q = modelFilterQuery.trim().toLowerCase();
    if (!q) return models;
    return models.filter((model) => model.name.toLowerCase().includes(q));
  }, [modelFilterQuery, models]);

  const activeFilterCount = countActiveFilters(appliedFilters);
  const hasActiveFilters = activeFilterCount > 0;
  const invalidDateRange = Boolean(
    draftFilters.dateFrom &&
    draftFilters.dateTo &&
    draftFilters.dateFrom > draftFilters.dateTo,
  );

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setDraftFilters(appliedFilters);
        } else {
          setModelFilterQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "aspect-square gap-2 border-none bg-card px-3 hover:bg-accent",
            hasActiveFilters &&
            "bg-primary! text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
          )}
        >
          <Filter
            className={cn(
              "size-4",
              hasActiveFilters && "fill-current text-primary-foreground",
            )}
          />

          {hasActiveFilters && (
            <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[80vh] w-[min(92vw,760px)] shadow-2xl! border bg-popover space-y-4 overflow-y-auto p-4"
      >
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">Filter inventory</h4>
          <p className="text-xs text-muted-foreground">
            Filter by date range, model, and buy/sell province.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Models
            </label>
            <Input
              value={modelFilterQuery}
              onChange={(event) => setModelFilterQuery(event.target.value)}
              placeholder="Search model..."
              className="h-9"
            />
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border/60 bg-card p-2">
              {modelsLoading ? (
                <div className="text-xs text-muted-foreground">Loading models...</div>
              ) : visibleModels.length === 0 ? (
                <div className="text-xs text-muted-foreground">No model matched.</div>
              ) : (
                visibleModels.map((model) => {
                  const checked = draftFilters.modelIds.includes(model.id);
                  return (
                    <label
                      key={model.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) => {
                          setDraftFilters((prev) => ({
                            ...prev,
                            modelIds:
                              nextChecked === true
                                ? [...prev.modelIds, model.id]
                                : prev.modelIds.filter((id) => id !== model.id),
                          }));
                        }}
                      />
                      <span className="text-sm">{model.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Date from
                </label>
                <Input
                  type="date"
                  value={draftFilters.dateFrom}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Date to
                </label>
                <Input
                  type="date"
                  value={draftFilters.dateTo}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, dateTo: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Buy province
                </label>
                {draftFilters.buyProvinceId && (
                  <button
                    type="button"
                    className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setDraftFilters((prev) => ({ ...prev, buyProvinceId: "" }))
                    }
                  >
                    Clear
                  </button>
                )}
              </div>
              <ProvinceCombobox
                value={draftFilters.buyProvinceId}
                onChange={(value) =>
                  setDraftFilters((prev) => ({ ...prev, buyProvinceId: value }))
                }
                provinces={provinces}
                loading={provincesLoading}
                placeholder="All provinces"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Sell province
                </label>
                {draftFilters.sellProvinceId && (
                  <button
                    type="button"
                    className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setDraftFilters((prev) => ({ ...prev, sellProvinceId: "" }))
                    }
                  >
                    Clear
                  </button>
                )}
              </div>
              <ProvinceCombobox
                value={draftFilters.sellProvinceId}
                onChange={(value) =>
                  setDraftFilters((prev) => ({ ...prev, sellProvinceId: value }))
                }
                provinces={provinces}
                loading={provincesLoading}
                placeholder="All provinces"
              />
            </div>
          </div>
        </div>

        {invalidDateRange && (
          <p className="text-xs text-destructive">
            Date range is invalid. "Date from" must be before "Date to".
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onApplyFilters(EMPTY_INVENTORY_FILTERS);
              setModelFilterQuery("");
              setOpen(false);
            }}
          >
            Clear all
          </Button>
            <Button
              type="button"
              onClick={() => {
                if (invalidDateRange) return;
                onApplyFilters(draftFilters);
                setOpen(false);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={invalidDateRange}
            >
            Apply filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const InventoryFilterPopover = React.memo(InventoryFilterPopoverInner);
