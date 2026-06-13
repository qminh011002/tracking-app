import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { type SellableBuyTransactionItem } from "@/src/services/inventory-transactions";
import { type ProvinceItem } from "@/src/services/provinces";
import { ProvinceCombobox } from "@/src/components/inventory/province-combobox";
import { BuyTransactionCombobox } from "@/src/components/inventory/buy-transaction-combobox";
import { MoneyInput } from "@/src/components/inventory/money-input";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import {
  useCreateSellMutation,
  useProvincesQuery,
  useSellableBuyTransactionsQuery,
} from "@/src/queries/hooks";

type SellFormDialogProps = {
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

const isValidDateValue = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
};

const isNotFutureDate = (value: string) => {
  const input = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return input.getTime() <= today.getTime();
};

const sellFormSchema = z.object({
  buyTransactionId: z.string().min(1, "Kho hàng mua là bắt buộc"),
  sellType: z.enum(["SHIP", "DIRECT"]),
  buyerProvinceId: z.string().min(1, "Tỉnh/Thành là bắt buộc"),
  buyerName: z.string().min(1, "Tên người mua là bắt buộc"),
  buyerPhone: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{10}$/.test(value), {
      message: "Số điện thoại người mua phải có đúng 10 chữ số",
    }),
  sellPrice: z.string().refine((value) => /^\d+$/.test(value), {
    message: "Giá bán là bắt buộc",
  }),
  depositAmount: z
    .string()
    .optional()
    .refine((value) => !value || /^\d+$/.test(value), {
      message: "Số tiền đặt cọc không hợp lệ",
    }),
  shippingFee: z
    .string()
    .optional()
    .refine((value) => !value || /^\d+$/.test(value), {
      message: "Phí vận chuyển không hợp lệ",
    }),
  sellDate: z
    .string()
    .min(1, "Ngày bán là bắt buộc")
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Ngày bán phải theo định dạng YYYY-MM-DD",
    })
    .refine((value) => isValidDateValue(value), {
      message: "Ngày bán không hợp lệ",
    })
    .refine((value) => isNotFutureDate(value), {
      message: "Ngày bán không thể ở tương lai",
    }),
});

export function SellFormDialog({
  storeId,
  open,
  onOpenChange,
  onCreated,
}: SellFormDialogProps) {
  const [sellError, setSellError] = React.useState<string | null>(null);
  const createSellMutation = useCreateSellMutation();
  const sellLoading = createSellMutation.isPending;
  const { data: provincesData = [], isLoading: provincesLoading } =
    useProvincesQuery(open);
  const { data: sellableBuysData = [], isLoading: sellableBuysLoading } =
    useSellableBuyTransactionsQuery({
      storeId,
    });

  const [buyTransactionId, setBuyTransactionId] = React.useState("");
  const [sellType, setSellType] = React.useState<"SHIP" | "DIRECT">("DIRECT");
  const [buyerProvinceId, setBuyerProvinceId] = React.useState("");
  const [buyerName, setBuyerName] = React.useState("");
  const [buyerPhone, setBuyerPhone] = React.useState("");
  const [buyerAddress, setBuyerAddress] = React.useState("");
  const [sellPrice, setSellPrice] = React.useState("");
  const [depositAmount, setDepositAmount] = React.useState("");
  const [shippingFee, setShippingFee] = React.useState("0");
  const [shippingPaidBy, setShippingPaidBy] = React.useState<
    "seller" | "buyer" | ""
  >("");
  const [sellDate, setSellDate] = React.useState("");
  const [sellImages, setSellImages] = React.useState<File[]>([]);
  const [sellImageInputKey, setSellImageInputKey] = React.useState(0);
  const provinces = provincesData as ProvinceItem[];
  const sellableBuys = sellableBuysData as SellableBuyTransactionItem[];

  const sellImagePreviews = React.useMemo(
    () => sellImages.map((file) => URL.createObjectURL(file)),
    [sellImages],
  );

  React.useEffect(() => {
    return () => {
      sellImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [sellImagePreviews]);

  const resetSell = () => {
    setBuyTransactionId("");
    setSellType("SHIP");
    setBuyerProvinceId("");
    setBuyerName("");
    setBuyerPhone("");
    setBuyerAddress("");
    setSellPrice("");
    setDepositAmount("");
    setShippingFee("0");
    setShippingPaidBy("");
    setSellDate("");
    setSellImages([]);
    setSellImageInputKey((prev) => prev + 1);
    setSellError(null);
  };

  const handleAddSellImages = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files);
    setSellImages((prev) => [...prev, ...next]);
    setSellImageInputKey((prev) => prev + 1);
  };

  const removeSellImage = (index: number) => {
    setSellImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const closeDialogSafely = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    requestAnimationFrame(() => onOpenChange(false));
  };

  const handleCreateSell = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = sellFormSchema.safeParse({
      buyTransactionId,
      sellType,
      buyerProvinceId,
      buyerName,
      buyerPhone,
      sellPrice,
      depositAmount,
      shippingFee,
      sellDate,
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Biểu mẫu BÁN không hợp lệ";
      setSellError(message);
      return;
    }

    setSellError(null);

    const result = await createSellMutation.mutateAsync({
      storeId,
      buy_transaction_id: buyTransactionId,
      sell_type: sellType,
      buyer_province_id: Number(buyerProvinceId),
      buyer_name: buyerName,
      buyer_phone: buyerPhone || undefined,
      buyer_address: buyerAddress || undefined,
      sell_price: Number(sellPrice || 0),
      deposit_amount: depositAmount ? Number(depositAmount) : null,
      shipping_fee: Number(shippingFee || 0),
      shipping_paid_by: shippingPaidBy,
      sell_date: sellDate,
      images: sellImages,
    });

    if (!result.ok) {
      setSellError(result.error ?? "Tạo BÁN thất bại");
      toast({
        variant: "destructive",
        title: "Tạo BÁN thất bại",
        description: result.error ?? "Tạo BÁN thất bại",
      });
      return;
    }

    closeDialogSafely();
    resetSell();
    onCreated();
    toast({
      title: "Đã tạo BÁN",
      description: "Giao dịch bán đã được tạo thành công.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo BÁN</DialogTitle>
          <DialogDescription>
            Thêm giao dịch bán liên kết với một giao dịch MUA hiện có.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3"
          onSubmit={handleCreateSell}
        >
          <div className="space-y-2 md:col-span-2">
            <Label>Kho hàng mua *</Label>
            <BuyTransactionCombobox
              value={buyTransactionId}
              onChange={setBuyTransactionId}
              items={sellableBuys}
              loading={sellableBuysLoading}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Loại bán</Label>
            <Select
              value={sellType}
              onValueChange={(v) => {
                const next = v as "SHIP" | "DIRECT";
                setSellType(next);
                if (next === "DIRECT") {
                  setShippingFee("0");
                  setShippingPaidBy("");
                }
              }}
            >
              <SelectTrigger
                className={cn(
                  "w-full",
                  sellType === "SHIP"
                    ? "bg-warning/15 text-warning border-warning/40 hover:bg-warning/20"
                    : "bg-primary/15 text-primary border-primary/40 hover:bg-primary/20",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="SHIP"
                  className="text-warning data-highlighted:bg-warning/20 data-highlighted:text-warning"
                >
                  SHIP
                </SelectItem>
                <SelectItem
                  value="DIRECT"
                  className="text-primary data-highlighted:bg-primary/20 data-highlighted:text-primary"
                >
                  DIRECT
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {sellType === "SHIP" && (
            <>
              <div className="space-y-2">
                <Label>Phí vận chuyển</Label>
                <MoneyInput
                  placeholder="vd. 50.000"
                  valueDigits={shippingFee}
                  onValueDigitsChange={setShippingFee}
                />
              </div>
              <div className="space-y-2">
                <Label>Người trả phí vận chuyển</Label>
                <Select
                  value={shippingPaidBy}
                  onValueChange={(v) =>
                    setShippingPaidBy(v as "seller" | "buyer" | "")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn người trả phí" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seller">Người bán</SelectItem>
                    <SelectItem value="buyer">Người mua</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>Tỉnh/Thành người mua *</Label>
            <ProvinceCombobox
              value={buyerProvinceId}
              onChange={setBuyerProvinceId}
              provinces={provinces}
              loading={provincesLoading}
            />
          </div>
          <div className="space-y-2">
            <Label>Địa chỉ chi tiết người mua</Label>
            <Input
              value={buyerAddress}
              onChange={(e) => setBuyerAddress(e.target.value)}
              placeholder="vd. 123 Nguyễn Trãi, Quận 1"
            />
          </div>
          <div className="space-y-2">
            <Label>Tên người mua</Label>
            <Input
              placeholder="vd. Nguyễn Văn B"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Số điện thoại người mua (Tùy chọn)</Label>
            <Input
              placeholder="Tùy chọn - 10 chữ số, vd. 0987654321"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Giá bán</Label>
            <MoneyInput
              placeholder="vd. 2.500.000"
              valueDigits={sellPrice}
              onValueDigitsChange={setSellPrice}
            />
          </div>
          <div className="space-y-2">
            <Label>Số tiền đặt cọc</Label>
            <MoneyInput
              placeholder="vd. 500.000"
              valueDigits={depositAmount}
              onValueDigitsChange={setDepositAmount}
            />
          </div>
          <div className="space-y-2">
            <Label>Ngày bán</Label>
            <DatePicker
              value={sellDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={setSellDate}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Hình ảnh</Label>
            <input
              key={sellImageInputKey}
              id="sell-images-input"
              type="file"
              multiple
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleAddSellImages(e.target.files)}
            />
            <div className="flex flex-wrap items-start gap-3 pt-1">
              {sellImages.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  className="relative size-24 shrink-0"
                >
                  <img
                    src={sellImagePreviews[index]}
                    alt={`Xem trước ảnh bán ${index + 1}`}
                    className="size-full rounded-md object-cover border border-border/60"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 size-6 rounded-full"
                    onClick={() => removeSellImage(index)}
                  >
                    <X className="size-3" />
                    <span className="sr-only">Xóa hình ảnh</span>
                  </Button>
                </div>
              ))}

              <label
                htmlFor="sell-images-input"
                className="group size-24 justify-self-start rounded-xl border border-dashed border-border/70 bg-card/60 hover:bg-card/90 hover:border-foreground/40 transition-colors grid place-items-center cursor-pointer"
              >
                <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
                  <Plus className="size-5" />
                  <span className="text-xs uppercase tracking-[0.12em]">
                    Hình ảnh
                  </span>
                </div>
              </label>
            </div>
          </div>
          {sellError && (
            <p className="text-sm text-destructive md:col-span-2">
              {sellError}
            </p>
          )}
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={closeDialogSafely}>
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={sellLoading}
            >
              {sellLoading ? "Đang tạo..." : "Tạo BÁN"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
