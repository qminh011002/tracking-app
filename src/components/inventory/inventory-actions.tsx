import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuyFormDialog } from "@/src/components/inventory/buy-form-dialog";
import { SellFormDialog } from "@/src/components/inventory/sell-form-dialog";

type InventoryActionsProps = {
  storeId: string;
  onCreated: () => void;
};

export function InventoryActions({
  storeId,
  onCreated,
}: InventoryActionsProps) {
  const [buyOpen, setBuyOpen] = React.useState(false);
  const [sellOpen, setSellOpen] = React.useState(false);

  return (
    <>
      <div className="flex justify-end items-center">
        {/* BUY */}
        <Button
          size={"lg"}
          onClick={() => setBuyOpen(true)}
          disabled={!storeId}
          className="pl-7 pr-12 bg-warning hover:bg-warning/90 text-black font-mono py-3 text-xl font-black rounded-none rounded-l-md! z-10"
          style={{
            clipPath: "polygon(0 0, 100% 0, calc(100% - 22px) 100%, 0 100%)",
          }}
        >
          Buy
        </Button>

        {/* SELL */}
        <Button
          size={"lg"}
          onClick={() => setSellOpen(true)}
          disabled={!storeId}
          className="-ml-[24px] pl-12 pr-7 bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-xl font-black font-mono rounded-none rounded-r-md! z-20"
          style={{
            clipPath: "polygon(22px 0, 100% 0, 100% 100%, 0 100%)",
          }}
        >
          Sell
        </Button>
      </div>
      <BuyFormDialog
        storeId={storeId}
        open={buyOpen}
        onOpenChange={setBuyOpen}
        onCreated={onCreated}
      />

      <SellFormDialog
        storeId={storeId}
        open={sellOpen}
        onOpenChange={setSellOpen}
        onCreated={onCreated}
      />
    </>
  );
}
