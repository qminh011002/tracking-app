import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { SellableBuyTransactionItem } from "@/src/services/inventory-transactions";

type BuyTransactionComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  items: SellableBuyTransactionItem[];
  loading?: boolean;
};

export function BuyTransactionCombobox({
  value,
  onChange,
  items,
  loading = false,
}: BuyTransactionComboboxProps) {
  const selected =
    items.find((item) => item.buy_transaction_id === value) ?? null;

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(item: SellableBuyTransactionItem | null) =>
        onChange(item ? item.buy_transaction_id : "")
      }
      itemToStringLabel={(item: SellableBuyTransactionItem) =>
        `${item.model_name} - ${item.serial_or_imei || "N/A"}`
      }
      itemToStringValue={(item: SellableBuyTransactionItem) =>
        item.buy_transaction_id
      }
    >
      <ComboboxInput
        placeholder={loading ? "Đang tải kho hàng..." : "Chọn hàng đã mua"}
        disabled={loading}
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxEmpty>Không tìm thấy hàng trong kho.</ComboboxEmpty>
        <ComboboxList>
          {(item: SellableBuyTransactionItem) => (
            <ComboboxItem key={item.buy_transaction_id} value={item}>
              <div className="flex min-w-0 items-center gap-2">
                {item.model_image ? (
                  <img
                    src={item.model_image}
                    alt={item.model_name}
                    loading="lazy"
                    decoding="async"
                    className="size-9 shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <div className="size-9 shrink-0 rounded-sm bg-muted/40" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">
                    {item.model_name}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {item.serial_or_imei || "N/A"}
                  </p>
                </div>
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
