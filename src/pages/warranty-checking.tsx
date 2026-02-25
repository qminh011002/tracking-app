import * as React from "react";
import DashboardPageLayout from "@/components/dashboard/layout";
import GearIcon from "@/components/icons/gear";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
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

function getWarrantyBadgeStyle(warrantyStatus: string, expiryDate: string) {
  const normalizedStatus = normalizeText(warrantyStatus);
  const activated = normalizedStatus.includes("da kich hoat");
  const notActivated = normalizedStatus.includes("chua kich hoat");

  if (notActivated) {
    return {
      label: "Chua kich hoat",
      variant: "outline" as const,
      className: "border-blue-500 bg-blue-500/10 text-blue-400",
    };
  }

  if (activated) {
    const expiry = parseDdMmYyyy(expiryDate);
    if (!expiry) {
      return {
        label: "Da kich hoat",
        variant: "outline-warning" as const,
        className: "",
      };
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const expired = expiry.getTime() < now.getTime();
    return expired
      ? {
        label: "Da kich hoat - Het bao hanh",
        variant: "outline-destructive" as const,
        className: "",
      }
      : {
        label: "Da kich hoat - Con bao hanh",
        variant: "outline-success" as const,
        className: "",
      };
  }

  return {
    label: warrantyStatus,
    variant: "secondary" as const,
    className: "",
  };
}

const FIELD_ITEMS: Array<{ label: string; key: keyof WarrantyInfo }> = [
  { label: "Ten san pham", key: "productName" },
  { label: "So seri", key: "serialNumber" },
  { label: "Ngay het han bao hanh", key: "expiryDate" },
  { label: "Tinh trang bao hanh", key: "warrantyStatus" },
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
  const warrantyBadge =
    result?.status === "success"
      ? getWarrantyBadgeStyle(
        result.data.warrantyStatus,
        result.data.expiryDate,
      )
      : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedModel) {
      setError("Please select a model.");
      return;
    }
    if (!serialNumber.trim()) {
      setError("Please enter serial/IMEI.");
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
        throw new Error("No response from warranty service.");
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
          : "Unable to check warranty right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardPageLayout
      header={{
        title: "Warranty Checking",
        description: "Sony warranty lookup",
        icon: GearIcon,
      }}
    >
      <div className="space-y-4">
        {!loadingStoreId && !storeId && (
          <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-muted-foreground uppercase">
            Missing store ID in your account.
          </div>
        )}

        <Card className="rounded-xl">
          <CardHeader className="h-auto">
            <CardTitle className="text-base uppercase tracking-[0.12em]">
              Check Warranty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]"
            >
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger className="w-full bg-card border-border/60">
                    <SelectValue
                      placeholder={loadingModels ? "Loading models..." : "Select model"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Serial / IMEI</Label>
                <Input
                  value={serialNumber}
                  onChange={(event) => setSerialNumber(event.target.value)}
                  placeholder="Enter serial or IMEI"
                  className="bg-card border-border/60"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={loading || !storeId}
                  className="h-10 w-full bg-primary hover:bg-primary/90"
                >
                  <Search className="size-4" />
                  {loading ? "Checking..." : "Check"}
                </Button>
              </div>
            </form>

            {error && (
              <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {result?.status === "success" && (
          <Card className="rounded-xl">
            <CardHeader className="h-auto">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base uppercase tracking-[0.12em]">
                  Warranty Result
                </CardTitle>
                {warrantyBadge && (
                  <Badge variant={warrantyBadge.variant} className={warrantyBadge.className}>
                    {warrantyBadge.label}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {FIELD_ITEMS.map((field) => (
                  <div
                    key={field.key}
                    className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3"
                  >
                    <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      {field.label}
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {result.data[field.key]}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {result?.status === "not_found" && !error && (
          <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-muted-foreground uppercase">
            Warranty information not found for this model/serial.
          </div>
        )}
      </div>
    </DashboardPageLayout>
  );
}
