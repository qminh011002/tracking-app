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
          className="pl-6 pr-11 bg-yellow-400 rounded-l-sm! hover:bg-yellow-500 text-black font-mono py-3 text-xl font-semibold rounded-none z-10"
          style={{
            clipPath: "polygon(0 0, 88% 0, 75% 100%, 0% 100%)",
          }}
        >
          Buy
        </Button>

        {/* SELL */}
        <Button
          size={"lg"}
          onClick={() => setSellOpen(true)}
          disabled={!storeId}
          className="-ml-10 pl-11 pr-5 text-xl font-semibold font-mono rounded-r-sm! rounded-none z-20"
          style={{
            clipPath: "polygon(25% 0, 100% 0, 100% 100%, 12% 100%)",
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
