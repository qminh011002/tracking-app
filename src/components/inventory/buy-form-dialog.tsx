import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ModelItem } from "@/src/services/models";
import { type ProvinceItem } from "@/src/services/provinces";
import { ModelCombobox } from "@/src/components/inventory/model-combobox";
import { MoneyInput } from "@/src/components/inventory/money-input";
import { ProvinceCombobox } from "@/src/components/inventory/province-combobox";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  sortModelsForPicker,
  useCreateBuyMutation,
  useModelsQuery,
  useProvincesQuery,
} from "@/src/queries/hooks";

type BuyFormDialogProps = {
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

const buyFormSchema = z.object({
  modelId: z.string().min(1, "Vui lòng chọn model"),
  note: z.string().optional(),
  sellerName: z.string().optional(),
  sellerPhone: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{10}$/.test(value), {
      message: "Số điện thoại người bán phải có đúng 10 chữ số",
    }),
  sellerProvinceId: z.string().min(1, "Vui lòng chọn tỉnh/thành"),
  sellerAddress: z.string().optional(),
  buyDate: z
    .string()
    .min(1, "Vui lòng chọn ngày mua")
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Ngày mua phải có định dạng YYYY-MM-DD",
    })
    .refine((value) => isValidDateValue(value), {
      message: "Ngày mua không hợp lệ",
    })
    .refine((value) => isNotFutureDate(value), {
      message: "Ngày mua không thể là ngày trong tương lai",
    }),
  warrantyExpiryDate: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Ngày hết hạn bảo hành phải có định dạng YYYY-MM-DD",
    })
    .refine((value) => !value || isValidDateValue(value), {
      message: "Ngày hết hạn bảo hành không hợp lệ",
    }),
  buyPriceDigits: z.string().refine((value) => /^\d*$/.test(value), {
    message: "Giá mua không hợp lệ",
  }),
});

type BuyFormValues = z.infer<typeof buyFormSchema>;

const defaultValues: BuyFormValues = {
  modelId: "",
  note: "",
  sellerName: "",
  sellerPhone: "",
  sellerProvinceId: "",
  sellerAddress: "",
  buyDate: "",
  warrantyExpiryDate: "",
  buyPriceDigits: "",
};

export function BuyFormDialog({
  storeId,
  open,
  onOpenChange,
  onCreated,
}: BuyFormDialogProps) {
  const [buyError, setBuyError] = React.useState<string | null>(null);
  const [buyImages, setBuyImages] = React.useState<File[]>([]);
  const [buyImageInputKey, setBuyImageInputKey] = React.useState(0);
  const createBuyMutation = useCreateBuyMutation();

  const buyLoading = createBuyMutation.isPending;
  const { data: modelsData = [], isLoading: modelsLoading } = useModelsQuery({
    storeId,
    searchTerm: "",
  });
  const { data: provincesData = [], isLoading: provincesLoading } =
    useProvincesQuery(open);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<BuyFormValues>({
    resolver: zodResolver(buyFormSchema),
    defaultValues,
  });

  const buyImagePreviews = React.useMemo(
    () => buyImages.map((file) => URL.createObjectURL(file)),
    [buyImages],
  );

  React.useEffect(() => {
    return () => {
      buyImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [buyImagePreviews]);

  const orderedModels = React.useMemo(
    () => sortModelsForPicker(modelsData as ModelItem[]),
    [modelsData],
  );
  const provinces = provincesData as ProvinceItem[];

  const resetBuy = () => {
    reset(defaultValues);
    setBuyImages([]);
    setBuyImageInputKey((prev) => prev + 1);
    setBuyError(null);
  };

  const closeDialogSafely = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    requestAnimationFrame(() => onOpenChange(false));
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetBuy();
    }
  };

  const handleAddBuyImages = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files);
    setBuyImages((prev) => [...prev, ...next]);
    setBuyImageInputKey((prev) => prev + 1);
  };

  const removeBuyImage = (index: number) => {
    setBuyImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleCreateBuy = async (values: BuyFormValues) => {
    setBuyError(null);

    const result = await createBuyMutation.mutateAsync({
      storeId,
      model_id: values.modelId,
      serial_or_imei: values.note || undefined,
      seller_name: values.sellerName || undefined,
      seller_phone: values.sellerPhone || undefined,
      seller_province_id: Number(values.sellerProvinceId),
      seller_address: values.sellerAddress || undefined,
      buy_price: Number(values.buyPriceDigits || 0),
      buy_date: values.buyDate,
      warranty_expiry_date: values.warrantyExpiryDate || undefined,
      images: buyImages,
    });

    if (!result.ok) {
      setBuyError(result.error ?? "Tạo phiếu MUA thất bại");
      toast({
        variant: "destructive",
        title: "Tạo phiếu MUA thất bại",
        description: result.error ?? "Tạo phiếu MUA thất bại",
      });
      return;
    }

    closeDialogSafely();
    onCreated();
    toast({
      title: "Đã tạo phiếu MUA",
      description: "Đã thêm vào kho hàng thành công.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-2xl border-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo phiếu MUA</DialogTitle>
          <DialogDescription>
            Thêm giao dịch mua và đưa thiết bị vào trạng thái còn hàng.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-7"
          onSubmit={handleSubmit(handleCreateBuy)}
        >
          <div className="space-y-2 md:col-span-2">
            <Label>Model</Label>
            <ModelCombobox
              value={watch("modelId")}
              onChange={(next) =>
                setValue("modelId", next, { shouldValidate: true })
              }
              models={orderedModels}
              loading={modelsLoading}
            />
            {errors.modelId && (
              <p className="text-xs text-destructive">
                {errors.modelId.message}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Ghi chú (Tùy chọn)</Label>
            <Input
              placeholder="VD: IMEI / serial / ghi chú ngắn"
              {...register("note")}
            />
          </div>
          <div className="space-y-2">
            <Label>Tên người bán (Tùy chọn)</Label>
            <Input
              placeholder="VD: Nguyễn Văn A"
              {...register("sellerName")}
            />
          </div>
          <div className="space-y-2">
            <Label>Số điện thoại người bán (Tùy chọn)</Label>
            <Input
              inputMode="numeric"
              maxLength={10}
              placeholder="Tùy chọn - 10 chữ số, VD: 0987654321"
              {...register("sellerPhone")}
              onChange={(e) =>
                setValue(
                  "sellerPhone",
                  e.target.value.replace(/\D/g, "").slice(0, 10),
                )
              }
            />
            {errors.sellerPhone && (
              <p className="text-xs text-destructive">
                {errors.sellerPhone.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Tỉnh/Thành người bán *</Label>
            <ProvinceCombobox
              value={watch("sellerProvinceId")}
              onChange={(next) =>
                setValue("sellerProvinceId", next, { shouldValidate: true })
              }
              provinces={provinces}
              loading={provincesLoading}
            />
            {errors.sellerProvinceId && (
              <p className="text-xs text-destructive">
                {errors.sellerProvinceId.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Địa chỉ chi tiết người bán (Tùy chọn)</Label>
            <Input
              placeholder="VD: 123 Nguyễn Trãi, Quận 1"
              {...register("sellerAddress")}
            />
          </div>
          <div className="space-y-2">
            <Label>Giá mua</Label>
            <MoneyInput
              placeholder="VD: 2.000.000"
              valueDigits={watch("buyPriceDigits")}
              onValueDigitsChange={(next) => setValue("buyPriceDigits", next)}
            />
            {errors.buyPriceDigits && (
              <p className="text-xs text-destructive">
                {errors.buyPriceDigits.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Ngày mua *</Label>
            <DatePicker
              value={watch("buyDate")}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(value) =>
                setValue("buyDate", value, { shouldValidate: true })
              }
            />
            {errors.buyDate && (
              <p className="text-xs text-destructive">
                {errors.buyDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Hết hạn bảo hành (Tùy chọn)</Label>
              {watch("warrantyExpiryDate") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() =>
                    setValue("warrantyExpiryDate", "", {
                      shouldValidate: true,
                    })
                  }
                >
                  Xóa
                </Button>
              )}
            </div>
            <DatePicker
              value={watch("warrantyExpiryDate")}
              min={new Date().toISOString().slice(0, 10)}
              max="2030-12-31"
              placeholder="Chọn ngày hết hạn bảo hành"
              onChange={(value) =>
                setValue("warrantyExpiryDate", value, {
                  shouldValidate: true,
                })
              }
            />
            {errors.warrantyExpiryDate && (
              <p className="text-xs text-destructive">
                {errors.warrantyExpiryDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Hình ảnh</Label>
            <input
              key={buyImageInputKey}
              id="buy-images-input"
              type="file"
              multiple
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleAddBuyImages(e.target.files)}
            />
            <div className="flex flex-wrap items-start gap-3 pt-1">
              {buyImages.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  className="relative size-24 shrink-0"
                >
                  <img
                    src={buyImagePreviews[index]}
                    alt={`Ảnh xem trước ${index + 1}`}
                    className="size-full rounded-md object-cover border border-border/60"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 size-6 rounded-full"
                    onClick={() => removeBuyImage(index)}
                  >
                    <X className="size-3" />
                    <span className="sr-only">Xóa hình ảnh</span>
                  </Button>
                </div>
              ))}

              <label
                htmlFor="buy-images-input"
                className="group size-24 justify-self-start rounded-xl border border-dashed border-border bg-card/60 hover:bg-card/90 hover:border-foreground/40 transition-colors grid place-items-center cursor-pointer"
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

          {buyError && (
            <p className="text-sm text-destructive md:col-span-2">{buyError}</p>
          )}
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={closeDialogSafely}>
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={buyLoading}
            >
              {buyLoading ? "Đang tạo..." : "Tạo phiếu MUA"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
