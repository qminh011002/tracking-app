import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/components/inventory/inventory-card";
import { ConfirmDialog } from "@/src/components/common/confirm-dialog";
import { ProvinceCombobox } from "@/src/components/inventory/province-combobox";
import {
  useDeleteInventoryMutation,
  useDeleteInventoryImageMutation,
  useProvincesQuery,
  useUploadInventoryImagesMutation,
  useUpdateDeviceWarrantyMutation,
  useUpdateInventoryStatusMutation,
  useUpdateBuyTransactionMutation,
  useUpdateSellTransactionMutation,
} from "@/src/queries/hooks";
import { toast } from "@/hooks/use-toast";

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function netProfit(item: InventoryItem) {
  if (item.sellInfo.amount === null) return null;
  return item.sellInfo.amount - item.buyInfo.amount;
}

function profitMargin(item: InventoryItem) {
  if (item.sellInfo.amount === null || item.buyInfo.amount <= 0) return null;
  return ((item.sellInfo.amount - item.buyInfo.amount) / item.buyInfo.amount) * 100;
}

function formatAddress(addressDetail: string, province: string) {
  const detail = addressDetail.trim();
  const provinceName = province.trim();
  if (detail && provinceName && provinceName !== "-") return `${detail}, ${provinceName}`;
  if (detail) return detail;
  if (provinceName && provinceName !== "-") return provinceName;
  return "-";
}

function toDateInputValue(value?: string) {
  if (!value || value === "-") return "";
  const match = value.match(/^\d{4}-\d{2}-\d{2}$/);
  if (match) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function validatePhone(phone: string) {
  const clean = normalizePhone(phone);
  if (!clean) return null;
  if (clean.length !== 10) return "Phone must be exactly 10 digits";
  return null;
}

type EditableTransactionForm = {
  buy: {
    amount: string;
    date: string;
    name: string;
    phone: string;
    addressDetail: string;
    provinceId: string;
    warrantyExpiryDate: string;
  };
  sell: {
    amount: string;
    date: string;
    name: string;
    phone: string;
    addressDetail: string;
    provinceId: string;
  };
};

function createEditForm(item: InventoryItem): EditableTransactionForm {
  return {
    buy: {
      amount: String(item.buyInfo.amount ?? 0),
      date: toDateInputValue(item.buyInfo.dateRaw ?? item.buyInfo.date),
      name: item.buyInfo.name === "N/A" ? "" : item.buyInfo.name,
      phone: item.buyInfo.phone === "-" ? "" : item.buyInfo.phone,
      addressDetail: item.buyInfo.addressDetail ?? "",
      provinceId: item.buyInfo.provinceId ? String(item.buyInfo.provinceId) : "",
      warrantyExpiryDate: toDateInputValue(item.warrantyExpiryDate ?? ""),
    },
    sell: {
      amount: item.sellInfo.amount === null ? "" : String(item.sellInfo.amount),
      date: toDateInputValue(item.sellInfo.dateRaw ?? item.sellInfo.date),
      name: item.sellInfo.name === "Pending" ? "" : item.sellInfo.name,
      phone: item.sellInfo.phone === "-" ? "" : item.sellInfo.phone,
      addressDetail: item.sellInfo.addressDetail ?? "",
      provinceId: item.sellInfo.provinceId ? String(item.sellInfo.provinceId) : "",
    },
  };
}

type InventoryDetailDialogProps = {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
  storeId?: string;
  onDeleted?: () => void;
};

export function InventoryDetailDialog({
  item,
  open,
  onOpenChange,
  embedded = false,
  storeId,
  onDeleted,
}: InventoryDetailDialogProps) {
  const images = item?.images ?? [];
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [pendingBuyImages, setPendingBuyImages] = React.useState<File[]>([]);
  const [pendingSellImages, setPendingSellImages] = React.useState<File[]>([]);
  const [deletingImageId, setDeletingImageId] = React.useState<string | null>(
    null,
  );
  const [form, setForm] = React.useState<EditableTransactionForm | null>(
    item ? createEditForm(item) : null,
  );
  const deleteInventoryMutation = useDeleteInventoryMutation();
  const updateBuyMutation = useUpdateBuyTransactionMutation();
  const updateSellMutation = useUpdateSellTransactionMutation();
  const uploadImagesMutation = useUploadInventoryImagesMutation();
  const deleteImageMutation = useDeleteInventoryImageMutation();
  const updateWarrantyMutation = useUpdateDeviceWarrantyMutation();
  const updateStatusMutation = useUpdateInventoryStatusMutation();
  const { data: provincesData = [], isLoading: provincesLoading } =
    useProvincesQuery(Boolean(open && storeId));
  const deleting = deleteInventoryMutation.isPending;
  const saving =
    updateBuyMutation.isPending ||
    updateSellMutation.isPending ||
    uploadImagesMutation.isPending ||
    deleteImageMutation.isPending ||
    updateWarrantyMutation.isPending;
  const updatingStatus = updateStatusMutation.isPending;
  const profit = item ? netProfit(item) : null;
  const margin = item ? profitMargin(item) : null;
  const [statusValue, setStatusValue] = React.useState(item?.status ?? "in_stock");

  const openLightboxAt = React.useCallback((index: number) => {
    setActiveImageIndex(index);
    setIsLightboxOpen(true);
  }, []);

  const showPrevImage = React.useCallback(() => {
    if (!images.length) return;
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const showNextImage = React.useCallback(() => {
    if (!images.length) return;
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  React.useEffect(() => {
    if (!isLightboxOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevImage();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showNextImage();
      } else if (event.key === "Escape") {
        event.preventDefault();
        setIsLightboxOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLightboxOpen, showPrevImage, showNextImage]);

  React.useEffect(() => {
    setActiveImageIndex(0);
    setIsLightboxOpen(false);
    setDeleteConfirmOpen(false);
    setDeleteError(null);
    setIsEditing(false);
    setEditError(null);
    setPendingBuyImages([]);
    setPendingSellImages([]);
    setDeletingImageId(null);
    setForm(item ? createEditForm(item) : null);
    setStatusValue(item?.status ?? "in_stock");
  }, [item, item?.id]);

  React.useEffect(() => {
    if (!item || provincesData.length === 0) return;
    setForm((prev) => {
      if (!prev) return prev;
      const findProvinceId = (provinceName: string) => {
        const found = provincesData.find((province) => province.name === provinceName);
        return found ? String(found.id) : "";
      };
      return {
        ...prev,
        buy: {
          ...prev.buy,
          provinceId: prev.buy.provinceId || findProvinceId(item.buyInfo.province),
        },
        sell: {
          ...prev.sell,
          provinceId: prev.sell.provinceId || findProvinceId(item.sellInfo.province),
        },
      };
    });
  }, [item, provincesData]);

  const previewImages = isEditing ? images : images.slice(0, 5);
  const buyImagePreviews = React.useMemo(
    () => pendingBuyImages.map((file) => URL.createObjectURL(file)),
    [pendingBuyImages],
  );
  const sellImagePreviews = React.useMemo(
    () => pendingSellImages.map((file) => URL.createObjectURL(file)),
    [pendingSellImages],
  );

  React.useEffect(() => {
    return () => {
      buyImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [buyImagePreviews]);

  React.useEffect(() => {
    return () => {
      sellImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [sellImagePreviews]);

  if (!item) return null;

  const handleDelete = async () => {
    if (!storeId) {
      setDeleteError("Missing store ID");
      return;
    }
    setDeleteError(null);
    try {
      await deleteInventoryMutation.mutateAsync({ storeId, id: item.id });
      setDeleteConfirmOpen(false);
      toast({
        title: "Inventory deleted",
        description: `"${item.title}" has been removed.`,
      });
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete inventory";
      setDeleteError(
        message,
      );
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: message,
      });
    }
  };

  const handleSave = async () => {
    if (!item || !form) return;
    if (!storeId) {
      setEditError("Missing store ID");
      return;
    }
    if (!item.buyInfo.transactionId) {
      setEditError("Missing BUY transaction ID");
      return;
    }

    const buyAmount = Number(form.buy.amount);
    if (!Number.isFinite(buyAmount) || buyAmount < 0) {
      setEditError("Buy amount must be a valid non-negative number");
      return;
    }
    if (!form.buy.date) {
      setEditError("Buy date is required");
      return;
    }
    const buyPhoneError = validatePhone(form.buy.phone);
    if (buyPhoneError) {
      setEditError(buyPhoneError);
      return;
    }

    if (item.sellInfo.transactionId) {
      const sellAmount = Number(form.sell.amount);
      if (!Number.isFinite(sellAmount) || sellAmount < 0) {
        setEditError("Sell amount must be a valid non-negative number");
        return;
      }
      if (!form.sell.date) {
        setEditError("Sell date is required");
        return;
      }
      const sellPhoneError = validatePhone(form.sell.phone);
      if (sellPhoneError) {
        setEditError(sellPhoneError);
        return;
      }
    }

    setEditError(null);

    try {
      await updateBuyMutation.mutateAsync({
        storeId,
        buyTransactionId: item.buyInfo.transactionId,
        buy_price: buyAmount,
        buy_date: form.buy.date,
        snapshot_name: form.buy.name.trim() || "N/A",
        snapshot_phone: normalizePhone(form.buy.phone) || undefined,
        snapshot_address: form.buy.addressDetail.trim(),
        snapshot_province_id: form.buy.provinceId ? Number(form.buy.provinceId) : null,
      });

      await updateWarrantyMutation.mutateAsync({
        storeId,
        deviceId: item.id,
        warranty_expiry_date: form.buy.warrantyExpiryDate || null,
      });

      if (item.sellInfo.transactionId) {
        await updateSellMutation.mutateAsync({
          storeId,
          sellTransactionId: item.sellInfo.transactionId,
          sell_price: Number(form.sell.amount),
          sell_date: form.sell.date,
          snapshot_name: form.sell.name.trim() || "N/A",
          snapshot_phone: normalizePhone(form.sell.phone) || undefined,
          snapshot_address: form.sell.addressDetail.trim(),
          snapshot_province_id: form.sell.provinceId ? Number(form.sell.provinceId) : null,
        });
      }

      const allPendingImages = [...pendingBuyImages, ...pendingSellImages];
      if (allPendingImages.length > 0) {
        await uploadImagesMutation.mutateAsync({
          storeId,
          deviceId: item.id,
          images: allPendingImages,
        });
      }

      toast({
        title: "Inventory updated",
        description:
          allPendingImages.length > 0
            ? `BUY/SELL information saved and ${allPendingImages.length} image(s) uploaded.`
            : "BUY/SELL information has been saved.",
      });
      setIsEditing(false);
      setPendingBuyImages([]);
      setPendingSellImages([]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update inventory";
      setEditError(message);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: message,
      });
    }
  };

  const handleDeleteImage = async (image: { id?: string; url: string }) => {
    if (!storeId) {
      setEditError("Missing store ID");
      return;
    }
    setDeletingImageId(image.id ?? image.url);
    setEditError(null);
    try {
      await deleteImageMutation.mutateAsync({
        storeId,
        deviceId: item.id,
        imageId: image.id,
        imageUrl: image.url,
      });
      toast({
        title: "Image deleted",
        description: "Saved image has been removed.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete image";
      setEditError(message);
      toast({
        variant: "destructive",
        title: "Delete image failed",
        description: message,
      });
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleStatusChange = async (nextStatus: "in_stock" | "sold") => {
    if (!item || !storeId) return;
    if (nextStatus === statusValue) return;
    setStatusValue(nextStatus);
    try {
      await updateStatusMutation.mutateAsync({
        storeId,
        deviceId: item.id,
        status: nextStatus,
      });
      toast({
        title: "Status updated",
        description: `Device marked as ${nextStatus === "sold" ? "Sold" : "In stock"}.`,
      });
    } catch (error) {
      setStatusValue(item.status);
      const message =
        error instanceof Error ? error.message : "Failed to update status";
      toast({
        variant: "destructive",
        title: "Update status failed",
        description: message,
      });
    }
  };

  const detailContent = (
    <>
      {/* Header */}
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            {item.modelImage ? (
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                <img
                  src={item.modelImage}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-contain"
                />
              </div>
            ) : null}
            <div className="min-w-0 space-y-1">
              <h2 className="truncate text-lg font-semibold leading-tight tracking-tight text-foreground">
                {item.title}
              </h2>
              <p className="truncate text-sm text-muted-foreground tabular-nums">
                {item.label}
              </p>
            </div>
          </div>
          <div className="mr-6 mt-0.5 shrink-0">
            <Select
              value={statusValue}
              onValueChange={(value) =>
                handleStatusChange(value as "in_stock" | "sold")
              }
              disabled={updatingStatus}
            >
              <SelectTrigger className="h-8 gap-1.5 rounded-md px-3 text-xs">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    statusValue === "sold" ? "bg-muted-foreground/60" : "bg-success",
                  )}
                />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_stock">In stock</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-6 space-y-5">
        {/* Summary stats */}
        <div className="grid grid-cols-1 divide-y rounded-xl bg-muted/40 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="space-y-1 p-4">
            <div className="text-xs font-medium text-muted-foreground">
              Purchase price
            </div>
            <div className="whitespace-nowrap text-lg font-semibold tabular-nums tracking-tight text-foreground">
              {formatMoney(item.buyInfo.amount)}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              from {item.buyInfo.name}
            </div>
          </div>

          <div className="space-y-1 p-4">
            <div className="text-xs font-medium text-muted-foreground">
              Sale price
            </div>
            <div
              className={cn(
                "whitespace-nowrap text-lg font-semibold tabular-nums tracking-tight",
                item.sellInfo.amount === null
                  ? "text-muted-foreground"
                  : "text-foreground",
              )}
            >
              {formatMoney(item.sellInfo.amount)}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {item.sellInfo.amount === null ? "Awaiting sale" : `to ${item.sellInfo.name}`}
            </div>
          </div>

          <div className="space-y-1 p-4">
            <div className="text-xs font-medium text-muted-foreground">
              Net profit
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "whitespace-nowrap text-lg font-semibold tabular-nums tracking-tight",
                  profit === null
                    ? "text-muted-foreground"
                    : profit >= 0
                      ? "text-success"
                      : "text-destructive",
                )}
              >
                {profit === null
                  ? "—"
                  : `${profit > 0 ? "+" : ""}${formatMoney(profit)}`}
              </span>
              {margin !== null && (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
                    (profit ?? 0) >= 0
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {margin > 0 ? "+" : ""}
                  {margin.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {profit === null ? "Pending" : profit >= 0 ? "Profit" : "Loss"}
            </div>
          </div>
        </div>

        {/* Details Section */}
        {isEditing && form ? (
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-medium text-foreground">
              Update information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 rounded-xl bg-muted/40 p-4">
                <span className="text-sm font-medium text-foreground">
                  Purchase
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount (VND)" htmlFor="buy-edit-amount">
                    <Input
                      id="buy-edit-amount"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={form.buy.amount}
                      onChange={(event) =>
                        setForm((prev) =>
                          prev
                            ? { ...prev, buy: { ...prev.buy, amount: event.target.value } }
                            : prev,
                        )
                      }
                    />
                  </Field>
                  <Field label="Buy date" htmlFor="buy-edit-date">
                    <DatePicker
                      id="buy-edit-date"
                      value={form.buy.date}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(value) =>
                        setForm((prev) =>
                          prev ? { ...prev, buy: { ...prev.buy, date: value } } : prev,
                        )
                      }
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Contact person" htmlFor="buy-edit-name">
                    <Input
                      id="buy-edit-name"
                      placeholder="Name"
                      value={form.buy.name}
                      onChange={(event) =>
                        setForm((prev) =>
                          prev ? { ...prev, buy: { ...prev.buy, name: event.target.value } } : prev,
                        )
                      }
                    />
                  </Field>
                  <Field label="Phone" htmlFor="buy-edit-phone">
                    <Input
                      id="buy-edit-phone"
                      inputMode="numeric"
                      placeholder="0xxxxxxxxx"
                      value={form.buy.phone}
                      onChange={(event) =>
                        setForm((prev) =>
                          prev ? { ...prev, buy: { ...prev.buy, phone: event.target.value } } : prev,
                        )
                      }
                    />
                  </Field>
                </div>
                <Field label="Warranty expiry (optional)" htmlFor="buy-edit-warranty">
                  <div className="flex gap-2">
                    <DatePicker
                      id="buy-edit-warranty"
                      value={form.buy.warrantyExpiryDate}
                      min={new Date().toISOString().slice(0, 10)}
                      max="2030-12-31"
                      placeholder="Select warranty expiry date"
                      onChange={(value) =>
                        setForm((prev) =>
                          prev
                            ? {
                              ...prev,
                              buy: {
                                ...prev.buy,
                                warrantyExpiryDate: value,
                              },
                            }
                            : prev,
                        )
                      }
                    />
                    {form.buy.warrantyExpiryDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setForm((prev) =>
                            prev
                              ? {
                                ...prev,
                                buy: {
                                  ...prev.buy,
                                  warrantyExpiryDate: "",
                                },
                              }
                              : prev,
                          )
                        }
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </Field>
                <Field label="Address detail" htmlFor="buy-edit-address">
                  <Input
                    id="buy-edit-address"
                    placeholder="Street, ward, district..."
                    value={form.buy.addressDetail}
                    onChange={(event) =>
                      setForm((prev) =>
                        prev
                          ? { ...prev, buy: { ...prev.buy, addressDetail: event.target.value } }
                          : prev,
                      )
                    }
                  />
                </Field>
                <Field label="Province">
                  <ProvinceCombobox
                    value={form.buy.provinceId}
                    onChange={(value) =>
                      setForm((prev) =>
                        prev ? { ...prev, buy: { ...prev.buy, provinceId: value } } : prev,
                      )
                    }
                    provinces={provincesData}
                    loading={provincesLoading}
                    placeholder="Buy province"
                  />
                </Field>
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Upload images
                  </label>
                  <input
                    id="buy-edit-images-input"
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const nextFiles = Array.from(event.target.files ?? []);
                      if (nextFiles.length === 0) return;
                      setPendingBuyImages((prev) => [...prev, ...nextFiles]);
                      event.currentTarget.value = "";
                    }}
                  />
                  <div className="mt-2 flex flex-wrap items-start gap-3">
                    {pendingBuyImages.map((file, index) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                        className="relative size-20 shrink-0"
                      >
                        <img
                          src={buyImagePreviews[index]}
                          alt={`Buy edit preview ${index + 1}`}
                          className="size-full rounded-md object-cover border border-border/60"
                        />
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 size-6 rounded-full"
                          onClick={() =>
                            setPendingBuyImages((prev) =>
                              prev.filter((_, imageIndex) => imageIndex !== index),
                            )
                          }
                        >
                          <X className="size-3" />
                          <span className="sr-only">Remove image</span>
                        </Button>
                      </div>
                    ))}
                    <label
                      htmlFor="buy-edit-images-input"
                      className="group size-20 rounded-xl border border-dashed border-border/70 bg-card/60 hover:bg-card/90 hover:border-foreground/40 transition-colors grid place-items-center cursor-pointer"
                    >
                      <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
                        <Plus className="size-4" />
                        <span className="text-[10px] font-medium">Image</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl bg-muted/40 p-4">
                <span className="text-sm font-medium text-foreground">
                  Sale
                </span>
                {item.sellInfo.transactionId ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Amount (VND)" htmlFor="sell-edit-amount">
                        <Input
                          id="sell-edit-amount"
                          type="number"
                          min={0}
                          placeholder="0"
                          value={form.sell.amount}
                          onChange={(event) =>
                            setForm((prev) =>
                              prev
                                ? { ...prev, sell: { ...prev.sell, amount: event.target.value } }
                                : prev,
                            )
                          }
                        />
                      </Field>
                      <Field label="Sell date" htmlFor="sell-edit-date">
                        <DatePicker
                          id="sell-edit-date"
                          value={form.sell.date}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(value) =>
                            setForm((prev) =>
                              prev
                                ? { ...prev, sell: { ...prev.sell, date: value } }
                                : prev,
                            )
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Contact person" htmlFor="sell-edit-name">
                        <Input
                          id="sell-edit-name"
                          placeholder="Name"
                          value={form.sell.name}
                          onChange={(event) =>
                            setForm((prev) =>
                              prev
                                ? { ...prev, sell: { ...prev.sell, name: event.target.value } }
                                : prev,
                            )
                          }
                        />
                      </Field>
                      <Field label="Phone" htmlFor="sell-edit-phone">
                        <Input
                          id="sell-edit-phone"
                          inputMode="numeric"
                          placeholder="0xxxxxxxxx"
                          value={form.sell.phone}
                          onChange={(event) =>
                            setForm((prev) =>
                              prev
                                ? { ...prev, sell: { ...prev.sell, phone: event.target.value } }
                                : prev,
                            )
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Address detail" htmlFor="sell-edit-address">
                      <Input
                        id="sell-edit-address"
                        placeholder="Street, ward, district..."
                        value={form.sell.addressDetail}
                        onChange={(event) =>
                          setForm((prev) =>
                            prev
                              ? {
                                ...prev,
                                sell: { ...prev.sell, addressDetail: event.target.value },
                              }
                              : prev,
                          )
                        }
                      />
                    </Field>
                    <Field label="Province">
                      <ProvinceCombobox
                        value={form.sell.provinceId}
                        onChange={(value) =>
                          setForm((prev) =>
                            prev ? { ...prev, sell: { ...prev.sell, provinceId: value } } : prev,
                          )
                        }
                        provinces={provincesData}
                        loading={provincesLoading}
                        placeholder="Sell province"
                      />
                    </Field>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                    No sale transaction yet
                  </div>
                )}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Upload images
                  </label>
                  <input
                    id="sell-edit-images-input"
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const nextFiles = Array.from(event.target.files ?? []);
                      if (nextFiles.length === 0) return;
                      setPendingSellImages((prev) => [...prev, ...nextFiles]);
                      event.currentTarget.value = "";
                    }}
                  />
                  <div className="mt-2 flex flex-wrap items-start gap-3">
                    {pendingSellImages.map((file, index) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                        className="relative size-20 shrink-0"
                      >
                        <img
                          src={sellImagePreviews[index]}
                          alt={`Sell edit preview ${index + 1}`}
                          className="size-full rounded-md object-cover border border-border/60"
                        />
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 size-6 rounded-full"
                          onClick={() =>
                            setPendingSellImages((prev) =>
                              prev.filter((_, imageIndex) => imageIndex !== index),
                            )
                          }
                        >
                          <X className="size-3" />
                          <span className="sr-only">Remove image</span>
                        </Button>
                      </div>
                    ))}
                    <label
                      htmlFor="sell-edit-images-input"
                      className="group size-20 rounded-xl border border-dashed border-border/70 bg-card/60 hover:bg-card/90 hover:border-foreground/40 transition-colors grid place-items-center cursor-pointer"
                    >
                      <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
                        <Plus className="size-4" />
                        <span className="text-[10px] font-medium">Image</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-4 rounded-xl bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-foreground">
                  Purchase
                </h3>
                <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
                  {formatMoney(item.buyInfo.amount)}
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="text-sm font-semibold text-foreground">
                  {item.buyInfo.name}
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="size-4 text-muted-foreground/60 mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    {item.buyInfo.phone}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="size-4 text-muted-foreground/60 mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground break-words">
                    {formatAddress(item.buyInfo.addressDetail, item.buyInfo.province)}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarDays className="size-4 text-muted-foreground/60 mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    {item.buyInfo.date}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarDays className="size-4 text-muted-foreground/60 mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    Warranty:{" "}
                    {item.warrantyExpiryDate
                      ? toDateInputValue(item.warrantyExpiryDate)
                      : "No warranty date"}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-foreground">Sale</h3>
                <span
                  className={cn(
                    "whitespace-nowrap text-sm font-semibold tabular-nums",
                    item.sellInfo.amount === null
                      ? "text-muted-foreground"
                      : "text-foreground",
                  )}
                >
                  {formatMoney(item.sellInfo.amount)}
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="text-sm font-semibold text-foreground">
                  {item.sellInfo.name}
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="size-4 text-muted-foreground/60 mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    {item.sellInfo.phone}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="size-4 text-muted-foreground/60 mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground break-words">
                    {formatAddress(item.sellInfo.addressDetail, item.sellInfo.province)}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarDays className="size-4 text-muted-foreground/60 mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    {item.sellInfo.date}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Images Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-medium text-foreground">Images</h3>
            <span className="text-xs text-muted-foreground">
              {images.length} photo{images.length === 1 ? "" : "s"}
            </span>
          </div>

          {images.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {previewImages.map((image, index) => {
                const isLastPreview =
                  index === previewImages.length - 1 &&
                  images.length > previewImages.length;
                const imageKey = image.id ?? image.url;
                const isDeletingThisImage = deletingImageId === imageKey;
                return (
                  <div
                    key={imageKey}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-muted/40"
                  >
                    <button
                      type="button"
                      className="size-full hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={() => openLightboxAt(index)}
                    >
                      <img
                        src={image.url}
                        alt={`Inventory preview ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                      />
                      {isLastPreview && (
                        <div className="absolute inset-0 grid place-items-center bg-black/55 text-base font-semibold text-white">
                          +{images.length - previewImages.length}
                        </div>
                      )}
                    </button>
                    {isEditing && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="destructive"
                        className="absolute right-1.5 top-1.5 size-7 rounded-full opacity-95"
                        disabled={saving || isDeletingThisImage}
                        onClick={() => handleDeleteImage(image)}
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Delete saved image</span>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No images
            </div>
          )}
          {images.length > 0 && (
            <div className="text-xs text-muted-foreground/80">
              Click a photo to view full screen
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditError(null);
                  setPendingBuyImages([]);
                  setPendingSellImages([]);
                  setForm(createEditForm(item));
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(true);
                setEditError(null);
                setForm(createEditForm(item));
              }}
            >
              <Pencil className="size-4" />
              Update
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={saving}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
        {deleteError && (
          <p className="text-sm text-destructive text-right">{deleteError}</p>
        )}
      </div>
    </>
  );

  return (
    <>
      {embedded ? (
        <div className="overflow-hidden rounded-xl bg-card shadow-sm">
          {detailContent}
        </div>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-4xl p-0 border-none bg-background max-h-[90vh] overflow-hidden">
            <DialogTitle className="sr-only">{item.title}</DialogTitle>
            <DialogDescription className="sr-only">
              Inventory detail for {item.title}
            </DialogDescription>
            <div className="max-h-[90vh] overflow-y-auto">
              {detailContent}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent
          showCloseButton={false}
          aria-labelledby="inventory-lightbox-title"
          aria-describedby="inventory-lightbox-description"
          className="w-screen h-screen max-w-none sm:max-w-none rounded-none border-none bg-black/95 p-0"
        >
          <DialogTitle id="inventory-lightbox-title" className="sr-only">
            Inventory image viewer
          </DialogTitle>
          <DialogDescription
            id="inventory-lightbox-description"
            className="sr-only"
          >
            Full screen gallery. Use left and right arrow keys to navigate
            images, and press Escape to close.
          </DialogDescription>
          <div className="relative h-full w-full flex items-center justify-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/10 hover:text-white z-20"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X className="size-5" />
              <span className="sr-only">Close gallery</span>
            </Button>

            {images.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white z-20"
                onClick={showPrevImage}
              >
                <ChevronLeft className="size-6" />
                <span className="sr-only">Previous image</span>
              </Button>
            )}

            {images.length > 0 && (
              <img
                src={images[activeImageIndex]?.url}
                alt={`Inventory image ${activeImageIndex + 1}`}
                className="max-h-[85vh] max-w-[92vw] object-contain select-none"
              />
            )}

            {images.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white z-20"
                onClick={showNextImage}
              >
                <ChevronRight className="size-6" />
                <span className="sr-only">Next image</span>
              </Button>
            )}

            {images.length > 0 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                {activeImageIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Delete "${item.title}"?`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
