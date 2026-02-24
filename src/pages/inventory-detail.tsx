import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import DashboardPageLayout from "@/components/dashboard/layout";
import ProcessorIcon from "@/components/icons/proccesor";
import { InventoryDetailDialog } from "@/components/inventory/inventory-detail-dialog";
import { Button } from "@/components/ui/button";
import { useStoreId } from "@/src/hooks/use-store-id";
import { getInventoryById, type InventoryItem } from "@/src/services/inventory";

function formatDate(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("vi-VN");
}

function toDialogItem(item: InventoryItem) {
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

export default function InventoryDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { storeId, loading: loadingStoreId } = useStoreId();
  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;

  const [item, setItem] = React.useState<ReturnType<typeof toDialogItem> | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id || !storeId || loadingStoreId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void getInventoryById({ id, storeId })
      .then((result) => {
        if (!active) return;
        setItem(result ? toDialogItem(result) : null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load inventory");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, storeId, loadingStoreId]);

  if (isDesktop) {
    return <Navigate to="/inventory" replace />;
  }

  if (!id || (!loadingStoreId && !storeId)) {
    return <Navigate to="/inventory" replace />;
  }

  if (!loading && !item && !error) {
    return <Navigate to="/404" replace />;
  }

  return (
    <DashboardPageLayout
      header={{
        title: "Inventory Detail",
        description: id.toUpperCase(),
        icon: ProcessorIcon,
      }}
    >
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => navigate("/inventory")}
        >
          <ArrowLeft className="size-4" />
          Back to inventory
        </Button>

        {loading && (
          <div className="rounded-lg border border-border/60 bg-card px-4 py-8 text-center text-sm text-muted-foreground uppercase">
            Loading inventory detail...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && item && (
          <InventoryDetailDialog
            item={item}
            open
            embedded
            storeId={storeId}
            onOpenChange={() => undefined}
            onDeleted={() => navigate("/inventory", { replace: true })}
          />
        )}
      </div>
    </DashboardPageLayout>
  );
}
