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
import type { ModelItem } from "@/src/services/models";

type ModelComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  models: ModelItem[];
  loading?: boolean;
};

export function ModelCombobox({
  value,
  onChange,
  models,
  loading = false,
}: ModelComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selectedModel = models.find((model) => model.id === value);

  return (
    <Popover modal={true} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10! pl-3 font-normal"
        >
          <span className="truncate text-left">
            {selectedModel?.name ??
              (loading ? "Loading models..." : "Select model")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search model..." />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            <CommandGroup>
              {models.map((model) => (
                <CommandItem
                  key={model.id}
                  className="flex justify-between"
                  value={model.name}
                  onSelect={() => {
                    onChange(model.id);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center space-x-2">
                    {model.image ? (
                      <img
                        src={model.image}
                        alt={model.name}
                        loading="lazy"
                        decoding="async"
                        className="size-10 rounded-sm object-cover"
                      />
                    ) : (
                      <div className="size-6 rounded-sm bg-muted/40" />
                    )}
                    <span className="truncate">{model.name}</span>
                  </div>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === model.id ? "opacity-100" : "opacity-0",
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
