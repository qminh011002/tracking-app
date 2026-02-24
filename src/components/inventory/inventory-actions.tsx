import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuyFormDialog } from "@/src/components/inventory/buy-form-dialog";
import { SellFormDialog } from "@/src/components/inventory/sell-form-dialog";

type InventoryActionsProps = {
  storeId: string;
  onCreated: () => void;
};

export function InventoryActions({ storeId, onCreated }: InventoryActionsProps) {
  const [buyOpen, setBuyOpen] = React.useState(false);
  const [sellOpen, setSellOpen] = React.useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="lg"
          className="hover:cursor-pointer bg-yellow-400 text-lg rounded-sm text-black hover:bg-yellow-300"
          onClick={() => setBuyOpen(true)}
          disabled={!storeId}
        >
          <Plus className="size-6" />
          Buy
        </Button>
        <Button
          type="button"
          size="lg"
          className="hover:cursor-pointer bg-blue-600 text-lg text-white rounded-sm hover:bg-blue-500"
          onClick={() => setSellOpen(true)}
          disabled={!storeId}
        >
          <Minus className="size-6" />
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
