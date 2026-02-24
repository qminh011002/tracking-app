import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Images,
  Pencil,
  Phone,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/components/inventory/inventory-card";
import { ConfirmDialog } from "@/src/components/common/confirm-dialog";
import { deleteInventoryById } from "@/src/services/inventory";
import { toast } from "@/hooks/use-toast";

function formatMoney(value: number | null) {
  if (value === null) return "-";
  return value.toLocaleString("vi-VN");
}

function netProfit(item: InventoryItem) {
  if (item.sellInfo.amount === null) return null;
  return item.sellInfo.amount - item.buyInfo.amount;
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
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const profit = item ? netProfit(item) : null;

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
    setDeleting(false);
  }, [item?.id]);

  const previewImages = images.slice(0, 3);

  if (!item) return null;

  const handleDelete = async () => {
    if (!storeId) {
      setDeleteError("Missing store ID");
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteInventoryById({ storeId, id: item.id });
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
    } finally {
      setDeleting(false);
    }
  };

  const detailContent = (
    <>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {item.modelImage ? (
                <div className="size-20 shrink-0 overflow-hidden rounded-md bg-muted/20">
                  <img
                    src={item.modelImage}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-contain object-center p-0.5"
                  />
                </div>
              ) : null}
              <div className="space-y-1 min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">
                  Inventory detail
                </p>
                <h2 className="text-3xl font-bold text-foreground truncate">
                  {item.title}
                </h2>
              </div>
            </div>
          </div>
          <Badge
            variant={item.status === "sold" ? "secondary" : "outline-success"}
            className="uppercase px-3 mr-4 py-1 rounded-full text-sm tracking-wide font-semibold shrink-0 mt-1"
          >
            {item.status === "sold" ? "Sold" : "In stock"}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60 uppercase tracking-[0.16em]">
          <Tag className="size-3.5" />
          <span>{item.label}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-6 space-y-5">
        {/* Summary Cards - Simplified */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg p-4 bg-success/5 space-y-2 transition-all">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
              Buy Price
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-success">
                {formatMoney(item.buyInfo.amount)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground/70 pt-1">
              from {item.buyInfo.name}
            </div>
          </div>

          <div className="rounded-lg p-4 bg-primary/5 space-y-2 transition-all">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
              Sell Price
            </div>
            <div
              className={cn(
                "text-3xl font-bold",
                item.sellInfo.amount === null
                  ? "text-muted-foreground"
                  : "text-primary",
              )}
            >
              {formatMoney(item.sellInfo.amount)}
            </div>
            <div className="text-xs text-muted-foreground/70 pt-1">
              to {item.sellInfo.name}
            </div>
          </div>

          <div
            className={cn(
              "rounded-lg p-4 space-y-2 transition-all",
              profit === null
                ? "bg-muted/30"
                : profit >= 0
                  ? "bg-success/10"
                  : "bg-destructive/10",
            )}
          >
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
              Net Profit
            </div>
            <div
              className={cn(
                "text-3xl font-bold",
                profit === null
                  ? "text-muted-foreground"
                  : profit >= 0
                    ? "text-success"
                    : "text-destructive",
              )}
            >
              {profit === null
                ? "-"
                : `${profit > 0 ? "+" : ""}${formatMoney(profit)}`}
            </div>
            <div className="text-xs text-muted-foreground/70 pt-1">
              {profit === null ? "Pending" : profit > 0 ? "Profit" : "Loss"}
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="relative space-y-3">
            <div className="absolute left-1 top-2.5 bottom-0 w-px bg-success/35" />
            <div className="flex items-center gap-2">
              <div className="relative z-10 size-2.5 rounded-full bg-success" />
              <h3 className="text-sm font-semibold text-foreground">
                Buy Information
              </h3>
            </div>

            <div className="space-y-3 pl-5 py-2">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70 mb-1">
                  Amount
                </div>
                <div className="text-lg font-bold text-success">
                  {formatMoney(item.buyInfo.amount)}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70 mb-1">
                  Contact Person
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {item.buyInfo.name}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone className="size-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground/80">
                  {item.buyInfo.phone}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CalendarDays className="size-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground/80">
                  {item.buyInfo.date}
                </div>
              </div>
            </div>
          </div>

          <div className="relative space-y-3">
            <div
              className={cn(
                "absolute left-1 top-2.5 bottom-0 w-px",
                item.sellInfo.amount === null
                  ? "bg-muted-foreground/20"
                  : "bg-primary/30",
              )}
            />
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "relative z-10 size-2.5 rounded-full",
                  item.sellInfo.amount === null
                    ? "bg-muted-foreground/40"
                    : "bg-primary",
                )}
              />
              <h3 className="text-sm font-semibold text-foreground">
                Sell Information
              </h3>
            </div>

            <div className="space-y-3 pl-5 py-2">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70 mb-1">
                  Amount
                </div>
                <div
                  className={cn(
                    "text-lg font-bold",
                    item.sellInfo.amount === null
                      ? "text-muted-foreground"
                      : "text-primary",
                  )}
                >
                  {formatMoney(item.sellInfo.amount)}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70 mb-1">
                  Contact Person
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {item.sellInfo.name}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone className="size-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground/80">
                  {item.sellInfo.phone}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CalendarDays className="size-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground/80">
                  {item.sellInfo.date}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Images Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-x-3">
            <div className="flex items-center gap-2">
              <Images className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-[0.12em]">
                Images
              </h3>
            </div>
            <span className="text-xs text-muted-foreground/80">
              {images.length} photo{images.length === 1 ? "" : "s"}
            </span>
          </div>

          {images.length > 0 ? (
            <button
              type="button"
              className="group block w-fit mt-7 hover:cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
              onClick={() => openLightboxAt(0)}
            >
              <div className="relative size-30">
                {previewImages.slice(1).map((src, index) => (
                  <img
                    key={src}
                    src={src}
                    alt={`Inventory preview ${index + 3}`}
                    className={cn(
                      "absolute top-0 left-1/2 -translate-x-1/2 size-full rounded-xl object-cover border border-border/50 shadow-md transition-transform duration-300 ease-out",
                      index === 0
                        ? "-translate-y-2 -rotate-8 group-hover:-translate-y-3 group-hover:-translate-x-[54%] group-hover:-rotate-11 group-hover:scale-[1.03]"
                        : "-translate-y-4 rotate-6 group-hover:-translate-y-6 group-hover:-translate-x-[46%] group-hover:rotate-9 group-hover:scale-[1.05]",
                    )}
                  />
                ))}

                <img
                  src={previewImages[0]}
                  alt="Inventory preview cover"
                  className="absolute inset-0 mx-auto size-full rounded-xl object-cover border border-border/60 shadow-xl transition-transform duration-300 ease-out group-hover:translate-y-0.5 group-hover:scale-[1.02]"
                />
              </div>
            </button>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              No images
            </div>
          )}
          <div className="pt-2 text-xs text-muted-foreground/80">
            Click to view full screen
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button type="button" variant="outline" disabled>
            <Pencil className="size-4" />
            Update
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteConfirmOpen(true)}
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
        <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
          {detailContent}
        </div>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-4xl p-0 overflow-hidden border-none bg-background">
            <DialogTitle className="sr-only">{item.title}</DialogTitle>
            <DialogDescription className="sr-only">
              Inventory detail for {item.title}
            </DialogDescription>
            {detailContent}
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
                src={images[activeImageIndex]}
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
