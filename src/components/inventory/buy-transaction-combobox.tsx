import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
  const [open, setOpen] = React.useState(false);

  const selected = items.find((item) => item.buy_transaction_id === value);

  return (
    <Popover modal={true} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-h-10 h-auto pl-3 py-2 font-normal"
        >
          {selected ? (
            <span className="truncate text-left">
              {selected.model_name} - {selected.serial_or_imei || "N/A"}
            </span>
          ) : (
            <span className="truncate text-left text-muted-foreground">
              {loading ? "Loading inventory..." : "Select buy inventory"}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search title or serial/imei..." />
          <CommandList>
            <CommandEmpty>No inventory found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  className="flex justify-between items-center"
                  key={item.buy_transaction_id}
                  value={`${item.model_name} ${item.serial_or_imei}`}
                  onSelect={() => {
                    onChange(item.buy_transaction_id);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center space-x-2">
                    {item.model_image ? (
                      <img
                        src={item.model_image}
                        alt={item.model_name}
                        loading="lazy"
                        decoding="async"
                        className="size-9 rounded-sm object-cover"
                      />
                    ) : (
                      <div className="size-8 rounded-sm bg-muted/40" />
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
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.buy_transaction_id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
