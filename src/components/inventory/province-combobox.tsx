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
import type { ProvinceItem } from "@/src/services/provinces";

function toSearchable(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

type ProvinceComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  provinces: ProvinceItem[];
  loading?: boolean;
  placeholder?: string;
  emptyLabel?: string;
};

export function ProvinceCombobox({
  value,
  onChange,
  provinces,
  loading = false,
  placeholder = "Select province",
  emptyLabel = "No province found.",
}: ProvinceComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedProvince = provinces.find(
    (province) => String(province.id) === value,
  );
  const triggerLabel =
    selectedProvince?.name ?? (loading ? "Loading provinces..." : placeholder);

  return (
    <Popover modal={true} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10! pl-3 font-normal normal-case"
        >
          <span className="truncate text-left normal-case">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command>
          <CommandInput placeholder="Search province..." />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {provinces.map((province) => {
                const provinceValue = String(province.id);
                return (
                  <CommandItem
                    key={province.id}
                    value={`${province.name} ${toSearchable(province.name)}`}
                    onSelect={() => {
                      onChange(provinceValue);
                      setOpen(false);
                    }}
                    className="flex justify-between items-center"
                  >
                    {province.name}
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === provinceValue ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
