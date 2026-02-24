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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createBuy } from "@/src/services/inventory-transactions";
import { getModels, type ModelItem } from "@/src/services/models";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
  modelId: z.string().min(1, "Model is required"),
  note: z.string().optional(),
  sellerName: z.string().optional(),
  sellerPhone: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{10}$/.test(value), {
      message: "Seller phone must be exactly 10 digits",
    }),
  sellerAddress: z.string().optional(),
  buyDate: z
    .string()
    .min(1, "Buy date is required")
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Buy date must be in YYYY-MM-DD format",
    })
    .refine((value) => isValidDateValue(value), {
      message: "Buy date is invalid",
    })
    .refine((value) => isNotFutureDate(value), {
      message: "Buy date cannot be in the future",
    }),
  buyPriceDigits: z.string().refine((value) => /^\d*$/.test(value), {
    message: "Buy price is invalid",
  }),
});

type BuyFormValues = z.infer<typeof buyFormSchema>;

const defaultValues: BuyFormValues = {
  modelId: "",
  note: "",
  sellerName: "",
  sellerPhone: "",
  sellerAddress: "",
  buyDate: "",
  buyPriceDigits: "",
};

export function BuyFormDialog({
  storeId,
  open,
  onOpenChange,
  onCreated,
}: BuyFormDialogProps) {
  const [buyLoading, setBuyLoading] = React.useState(false);
  const [buyError, setBuyError] = React.useState<string | null>(null);
  const [models, setModels] = React.useState<ModelItem[]>([]);
  const [modelsLoading, setModelsLoading] = React.useState(false);
  const [buyImages, setBuyImages] = React.useState<File[]>([]);
  const [buyImageInputKey, setBuyImageInputKey] = React.useState(0);
  const {
    control,
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

  const orderedModels = React.useMemo(() => {
    const getPriority = (name: string) => {
      const upper = name.trim().toUpperCase();
      if (upper.startsWith("WF")) return 0;
      if (upper.startsWith("WH")) return 1;
      return 2;
    };

    return [...models].sort((a, b) => {
      const pa = getPriority(a.name);
      const pb = getPriority(b.name);
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
    });
  }, [models]);

  React.useEffect(() => {
    if (!open || !storeId) return;
    let active = true;
    setModelsLoading(true);
    void getModels({ storeId, searchTerm: "" })
      .then((list) => {
        if (!active) return;
        setModels(list);
      })
      .catch(() => {
        if (!active) return;
        setModels([]);
      })
      .finally(() => {
        if (!active) return;
        setModelsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, storeId]);

  const formatMoneyInput = (digits: string) => {
    if (!digits) return "";
    const value = Number(digits);
    if (Number.isNaN(value)) return "";
    return value.toLocaleString("vi-VN");
  };

  const resetBuy = () => {
    reset(defaultValues);
    setBuyImages([]);
    setBuyImageInputKey((prev) => prev + 1);
    setBuyError(null);
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
    setBuyLoading(true);
    setBuyError(null);

    const result = await createBuy({
      storeId,
      model_id: values.modelId,
      serial_or_imei: values.note || undefined,
      seller_name: values.sellerName || undefined,
      seller_phone: values.sellerPhone || undefined,
      seller_address: values.sellerAddress || undefined,
      buy_price: Number(values.buyPriceDigits || 0),
      buy_date: values.buyDate,
      images: buyImages,
    });

    setBuyLoading(false);

    if (!result.ok) {
      setBuyError(result.error ?? "Failed to create BUY");
      toast({
        variant: "destructive",
        title: "Create BUY failed",
        description: result.error ?? "Failed to create BUY",
      });
      return;
    }

    onOpenChange(false);
    resetBuy();
    onCreated();
    toast({
      title: "BUY created",
      description: "Inventory has been added successfully.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl border-none">
        <DialogHeader>
          <DialogTitle>Create BUY</DialogTitle>
          <DialogDescription>
            Add buy transaction and set device to in stock.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          onSubmit={handleSubmit(handleCreateBuy)}
        >
          <div className="space-y-2 md:col-span-2">
            <Label>Model</Label>
            <Controller
              control={control}
              name="modelId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full h-10! pl-3">
                    <SelectValue
                      placeholder={
                        modelsLoading ? "Loading models..." : "Select model"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-96 overflow-y-auto">
                    {orderedModels.map((model) => (
                      <SelectItem
                        key={model.id}
                        value={model.id}
                        className="hover:bg-accent/80 focus:bg-accent/80"
                      >
                        <div className="flex items-center gap-2">
                          {model.image ? (
                            <img
                              src={model.image}
                              alt={model.name}
                              loading="lazy"
                              decoding="async"
                              className="size-10 rounded-sm object-cover"
                            />
                          ) : (
                            <div className="size-9 rounded-sm bg-muted/40" />
                          )}
                          <span className="text-[15px] font-medium">
                            {model.name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.modelId && (
              <p className="text-xs text-destructive">
                {errors.modelId.message}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Note (Optional)</Label>
            <Input
              placeholder="e.g. IMEI / serial / short note"
              {...register("note")}
            />
          </div>
          <div className="space-y-2">
            <Label>Seller Name (Optional)</Label>
            <Input
              placeholder="e.g. Nguyen Van A"
              {...register("sellerName")}
            />
          </div>
          <div className="space-y-2">
            <Label>Seller Phone (Optional)</Label>
            <Input
              inputMode="numeric"
              maxLength={10}
              placeholder="10 digits, e.g. 0987654321"
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
          <div className="space-y-2 md:col-span-2">
            <Label>Seller Address (Optional)</Label>
            <Textarea
              placeholder="e.g. 123 Nguyen Trai, District 1"
              {...register("sellerAddress")}
            />
          </div>
          <div className="space-y-2">
            <Label>Buy Price</Label>
            <Input
              inputMode="numeric"
              placeholder="e.g. 2.000.000"
              value={formatMoneyInput(watch("buyPriceDigits"))}
              onChange={(e) =>
                setValue("buyPriceDigits", e.target.value.replace(/\D/g, ""))
              }
            />
            {errors.buyPriceDigits && (
              <p className="text-xs text-destructive">
                {errors.buyPriceDigits.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Buy Date *</Label>
            <Input type="date" {...register("buyDate")} />
            {errors.buyDate && (
              <p className="text-xs text-destructive">
                {errors.buyDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Images</Label>
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
                    alt={`Buy preview ${index + 1}`}
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
                    <span className="sr-only">Remove image</span>
                  </Button>
                </div>
              ))}

              <label
                htmlFor="buy-images-input"
                className="group size-24 justify-self-start rounded-xl border border-dashed border-border/70 bg-card/60 hover:bg-card/90 hover:border-foreground/40 transition-colors grid place-items-center cursor-pointer"
              >
                <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
                  <Plus className="size-5" />
                  <span className="text-xs uppercase tracking-[0.12em]">
                    Image
                  </span>
                </div>
              </label>
            </div>
          </div>

          {buyError && (
            <p className="text-sm text-destructive md:col-span-2">{buyError}</p>
          )}
          <DialogFooter className="md:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-yellow-400 text-black hover:bg-yellow-300"
              disabled={buyLoading}
            >
              {buyLoading ? "Creating..." : "Create BUY"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
