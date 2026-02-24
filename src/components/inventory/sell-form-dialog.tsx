import * as React from "react";
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
import { createSell } from "@/src/services/inventory-transactions";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";

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

const sellFormSchema = z
  .object({
    buyTransactionId: z.string().min(1, "Buy Transaction ID is required"),
    sellType: z.enum(["SHIP", "DIRECT"]),
    city: z.enum(["Da Nang", "Sai Gon", "Ha Noi", "Other", ""]).optional(),
    buyerName: z.string().min(1, "Buyer name is required"),
    buyerPhone: z
      .string()
      .optional()
      .refine((value) => !value || /^\d{10}$/.test(value), {
        message: "Buyer phone must be exactly 10 digits",
      }),
    sellPrice: z.string().refine((value) => /^\d+$/.test(value), {
      message: "Sell price is required",
    }),
    depositAmount: z.string().optional(),
    shippingFee: z.string().optional(),
    sellDate: z
      .string()
      .min(1, "Sell date is required")
      .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
        message: "Sell date must be in YYYY-MM-DD format",
      })
      .refine((value) => isValidDateValue(value), {
        message: "Sell date is invalid",
      })
      .refine((value) => isNotFutureDate(value), {
        message: "Sell date cannot be in the future",
      }),
  })
  .refine((data) => data.sellType !== "DIRECT" || Boolean(data.city), {
    message: "City is required for DIRECT sell type",
    path: ["city"],
  });

export function SellFormDialog({
  storeId,
  open,
  onOpenChange,
  onCreated,
}: SellFormDialogProps) {
  const [sellLoading, setSellLoading] = React.useState(false);
  const [sellError, setSellError] = React.useState<string | null>(null);

  const [buyTransactionId, setBuyTransactionId] = React.useState("");
  const [sellType, setSellType] = React.useState<"SHIP" | "DIRECT">("SHIP");
  const [city, setCity] = React.useState<
    "Da Nang" | "Sai Gon" | "Ha Noi" | "Other" | ""
  >("");
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

  const resetSell = () => {
    setBuyTransactionId("");
    setSellType("SHIP");
    setCity("");
    setBuyerName("");
    setBuyerPhone("");
    setBuyerAddress("");
    setSellPrice("");
    setDepositAmount("");
    setShippingFee("0");
    setShippingPaidBy("");
    setSellDate("");
    setSellImages([]);
    setSellError(null);
  };

  const handleCreateSell = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = sellFormSchema.safeParse({
      buyTransactionId,
      sellType,
      city,
      buyerName,
      buyerPhone,
      sellPrice,
      depositAmount,
      shippingFee,
      sellDate,
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid SELL form";
      setSellError(message);
      return;
    }

    setSellLoading(true);
    setSellError(null);

    const result = await createSell({
      storeId,
      buy_transaction_id: buyTransactionId,
      sell_type: sellType,
      city:
        sellType === "DIRECT"
          ? (city as "Da Nang" | "Sai Gon" | "Ha Noi" | "Other")
          : undefined,
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

    setSellLoading(false);

    if (!result.ok) {
      setSellError(result.error ?? "Failed to create SELL");
      toast({
        variant: "destructive",
        title: "Create SELL failed",
        description: result.error ?? "Failed to create SELL",
      });
      return;
    }

    onOpenChange(false);
    resetSell();
    onCreated();
    toast({
      title: "SELL created",
      description: "Sell transaction has been created successfully.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create SELL</DialogTitle>
          <DialogDescription>
            Add sell transaction linked to an existing BUY.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          onSubmit={handleCreateSell}
        >
          <div className="space-y-2 md:col-span-2">
            <Label>Buy Transaction ID</Label>
            <Input
              required
              value={buyTransactionId}
              onChange={(e) => setBuyTransactionId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Sell Type</Label>
            <Select
              value={sellType}
              onValueChange={(v) => setSellType(v as "SHIP" | "DIRECT")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHIP">SHIP</SelectItem>
                <SelectItem value="DIRECT">DIRECT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Select value={city} onValueChange={(v) => setCity(v as typeof city)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Da Nang">Da Nang</SelectItem>
                <SelectItem value="Sai Gon">Sai Gon</SelectItem>
                <SelectItem value="Ha Noi">Ha Noi</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Buyer Name</Label>
            <Input
              required
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Buyer Phone</Label>
            <Input
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Buyer Address</Label>
            <Textarea
              value={buyerAddress}
              onChange={(e) => setBuyerAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Sell Price</Label>
            <Input
              type="number"
              min={0}
              required
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Deposit Amount</Label>
            <Input
              type="number"
              min={0}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Shipping Fee</Label>
            <Input
              type="number"
              min={0}
              value={shippingFee}
              onChange={(e) => setShippingFee(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Shipping Paid By</Label>
            <Select
              value={shippingPaidBy}
              onValueChange={(v) => setShippingPaidBy(v as "seller" | "buyer" | "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seller">seller</SelectItem>
                <SelectItem value="buyer">buyer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sell Date</Label>
            <Input
              type="date"
              required
              value={sellDate}
              onChange={(e) => setSellDate(e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Images</Label>
            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setSellImages(Array.from(e.target.files ?? []))}
            />
          </div>
          {sellError && (
            <p className="text-sm text-destructive md:col-span-2">{sellError}</p>
          )}
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-500"
              disabled={sellLoading}
            >
              {sellLoading ? "Creating..." : "Create SELL"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
