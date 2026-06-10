import * as React from "react";
import DashboardPageLayout from "@/components/dashboard/layout";
import GearIcon from "@/components/icons/gear";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModelCombobox } from "@/src/components/inventory/model-combobox";
import {
  Barcode,
  CalendarClock,
  ClipboardCheck,
  Hash,
  Loader2,
  PackageSearch,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Tag,
} from "lucide-react";
import { useStoreId } from "@/src/hooks/use-store-id";
import { sortModelsForPicker, useModelsQuery } from "@/src/queries/hooks";
import type { ModelItem } from "@/src/services/models";
import {
  parseSonyWarrantyHtml,
  type WarrantyInfo,
  type WarrantyParseResult,
} from "@/src/lib/warrantyParser";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\u0111/g, "d")
    .trim();
}

function parseDdMmYyyy(value: string) {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

type WarrantyBadgeVariant =
  | "outline-success"
  | "outline-destructive"
  | "outline-warning"
  | "secondary";

type WarrantyState = {
  kind: "active-valid" | "active-expired" | "not-activated" | "unknown";
  label: string;
  subtitle: string;
  badgeVariant: WarrantyBadgeVariant;
  panelClassName: string;
  Icon: React.ElementType;
  daysRemaining: number | null;
};

function getWarrantyState(
  warrantyStatus: string,
  expiryDate: string,
): WarrantyState {
  const normalizedStatus = normalizeText(warrantyStatus);
  const activated = normalizedStatus.includes("da kich hoat");
  const notActivated = normalizedStatus.includes("chua kich hoat");
  const expiry = parseDdMmYyyy(expiryDate);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daysRemaining = expiry
    ? Math.round((expiry.getTime() - now.getTime()) / 86_400_000)
    : null;

  if (notActivated) {
    return {
      kind: "not-activated",
      label: "Chưa kích hoạt",
      subtitle: "Sản phẩm chưa được kích hoạt bảo hành",
      badgeVariant: "outline-warning",
      panelClassName: "border-warning/40 bg-warning/10 text-warning",
      Icon: ShieldAlert,
      daysRemaining,
    };
  }

  if (activated && expiry && daysRemaining !== null) {
    if (daysRemaining >= 0) {
      return {
        kind: "active-valid",
        label: "Còn bảo hành",
        subtitle: `Còn ${daysRemaining} ngày · hết hạn ${expiryDate}`,
        badgeVariant: "outline-success",
        panelClassName: "border-success/40 bg-success/10 text-success",
        Icon: ShieldCheck,
        daysRemaining,
      };
    }
    return {
      kind: "active-expired",
      label: "Hết bảo hành",
      subtitle: `Đã hết hạn ${Math.abs(daysRemaining)} ngày · ${expiryDate}`,
      badgeVariant: "outline-destructive",
      panelClassName: "border-destructive/40 bg-destructive/10 text-destructive",
      Icon: ShieldX,
      daysRemaining,
    };
  }

  return {
    kind: "unknown",
    label: warrantyStatus,
    subtitle: expiry ? `Hết hạn ${expiryDate}` : "",
    badgeVariant: "secondary",
    panelClassName: "border-border/60 bg-muted/20 text-foreground",
    Icon: ShieldAlert,
    daysRemaining,
  };
}

const FIELD_ITEMS: Array<{
  label: string;
  key: keyof WarrantyInfo;
  Icon: React.ElementType;
}> = [
  { label: "Tên sản phẩm", key: "productName", Icon: Tag },
  { label: "Số seri", key: "serialNumber", Icon: Hash },
  { label: "Ngày hết hạn bảo hành", key: "expiryDate", Icon: CalendarClock },
  { label: "Tình trạng bảo hành", key: "warrantyStatus", Icon: ShieldCheck },
];

export default function WarrantyCheckingPage() {
  const { storeId, loading: loadingStoreId } = useStoreId();
  const { data: modelsData = [], isLoading: loadingModels } = useModelsQuery({
    storeId,
    searchTerm: "",
  });
  const models = React.useMemo(
    () => sortModelsForPicker(modelsData as ModelItem[]),
    [modelsData],
  );

  const [modelId, setModelId] = React.useState("");
  const [serialNumber, setSerialNumber] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<WarrantyParseResult | null>(null);

  const selectedModel = models.find((item) => item.id === modelId) ?? null;
  const warrantyState =
    result?.status === "success"
      ? getWarrantyState(result.data.warrantyStatus, result.data.expiryDate)
      : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedModel) {
      setError("Vui lòng chọn model.");
      return;
    }
    if (!serialNumber.trim()) {
      setError("Vui lòng nhập serial hoặc IMEI.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = new FormData();
      payload.append("categoryID", "17");
      payload.append("modelName", selectedModel.name);
      payload.append("serialNumber", serialNumber.trim());

      const response = await fetch("/api/warranty-check", {
        method: "POST",
        body: payload,
      });

      const html = await response.text();
      if (!html.trim()) {
        throw new Error("Không nhận được phản hồi từ dịch vụ bảo hành.");
      }

      const parsed = parseSonyWarrantyHtml(html);
      setResult(parsed);
      if (parsed.status === "not_found") {
        setError(null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Chưa thể kiểm tra bảo hành lúc này. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardPageLayout
      header={{
        title: "Warranty Checking",
        description: "Tra cứu bảo hành Sony",
        icon: GearIcon,
      }}
    >
      <div className="space-y-4">
        {!loadingStoreId && !storeId && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
            Tài khoản hiện chưa có store ID nên chưa thể tra cứu bảo hành.
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(22rem,0.9fr)_minmax(0,1.25fr)]">
          <Card className="rounded-lg">
            <CardHeader className="h-auto px-1 pb-0">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ClipboardCheck className="size-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base uppercase tracking-[0.12em]">
                    Tra cứu bảo hành
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Chọn model Sony và nhập serial/IMEI để kiểm tra trạng thái.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-2 p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    Model
                  </Label>
                  <ModelCombobox
                    value={modelId}
                    onChange={setModelId}
                    models={models}
                    loading={loadingModels}
                    className="h-11 bg-background"
                    listClassName="max-h-72"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    Serial / IMEI
                  </Label>
                  <div className="relative">
                    <Barcode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={serialNumber}
                      onChange={(event) =>
                        setSerialNumber(event.target.value.toUpperCase())
                      }
                      placeholder="VD: 1234567 hoặc IMEI"
                      className="h-11 border-border/70 bg-background pl-10 tabular-nums"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !storeId}
                  className="h-11 w-full bg-primary hover:bg-primary/90"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  {loading ? "Đang kiểm tra" : "Kiểm tra"}
                </Button>

                {error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}
              </form>

              <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Thông tin đang tra cứu
                </div>
                <div className="mt-3 flex items-center gap-3">
                  {selectedModel?.image ? (
                    <img
                      src={selectedModel.image}
                      alt={selectedModel.name}
                      className="size-14 shrink-0 rounded-md border border-border/60 object-cover"
                    />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-dashed border-border/80 text-muted-foreground">
                      <PackageSearch className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {selectedModel?.name ?? "Chưa chọn model"}
                    </div>
                    <div className="mt-1 truncate text-xs tabular-nums text-muted-foreground">
                      {serialNumber.trim() || "Chưa nhập serial/IMEI"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {result?.status === "success" && warrantyState ? (
            <Card className="rounded-lg">
              <CardHeader className="h-auto px-1 pb-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base uppercase tracking-[0.12em]">
                      Kết quả bảo hành
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Dữ liệu trả về từ hệ thống bảo hành Sony.
                    </p>
                  </div>
                  <Badge
                    variant={warrantyState.badgeVariant}
                    className="h-7 px-2.5"
                  >
                    <warrantyState.Icon className="size-3.5" />
                    {warrantyState.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="mt-2 space-y-4 p-4">
                <div
                  className={`rounded-lg border p-4 ${warrantyState.panelClassName}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-current/10">
                      <warrantyState.Icon className="size-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xl font-semibold leading-tight">
                        {warrantyState.label}
                      </div>
                      {warrantyState.subtitle && (
                        <div className="mt-1 text-sm opacity-80">
                          {warrantyState.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {FIELD_ITEMS.map((field) => (
                    <div
                      key={field.key}
                      className="min-h-24 rounded-lg border border-border/60 bg-muted/20 p-3"
                    >
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        <field.Icon className="size-3.5" />
                        {field.label}
                      </div>
                      <div className="mt-3 break-words text-sm font-semibold leading-snug tabular-nums">
                        {result.data[field.key]}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-lg">
              <CardContent className="flex min-h-[24rem] items-center justify-center p-6">
                <div className="mx-auto max-w-sm text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <PackageSearch className="size-6" />
                  </div>
                  <div className="mt-4 text-base font-semibold">
                    Chưa có kết quả tra cứu
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nhập đúng model và serial/IMEI, kết quả bảo hành sẽ hiển thị
                    tại đây.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {result?.status === "not_found" && !error && (
          <Card className="rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-warning">
                <ShieldAlert className="mt-0.5 size-5 shrink-0" />
                <div>
                  <div className="font-semibold">
                    Không tìm thấy thông tin bảo hành
                  </div>
                  <div className="mt-1 text-sm opacity-85">
                    Vui lòng kiểm tra lại model và serial/IMEI vừa nhập.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardPageLayout>
  );
}
