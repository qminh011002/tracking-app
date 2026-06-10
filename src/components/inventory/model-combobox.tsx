import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import type { ModelItem } from "@/src/services/models";

type ModelComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  models: ModelItem[];
  loading?: boolean;
  className?: string;
  contentClassName?: string;
  listClassName?: string;
};

export function ModelCombobox({
  value,
  onChange,
  models,
  loading = false,
  className,
  contentClassName,
  listClassName,
}: ModelComboboxProps) {
  const selectedModel = models.find((model) => model.id === value) ?? null;

  return (
    <Combobox
      items={models}
      value={selectedModel}
      onValueChange={(item: ModelItem | null) => onChange(item ? item.id : "")}
      itemToStringLabel={(item: ModelItem) => item.name}
      itemToStringValue={(item: ModelItem) => item.id}
    >
      <ComboboxInput
        placeholder={loading ? "Loading models..." : "Select model"}
        disabled={loading}
        className={cn("w-full", className)}
      />
      <ComboboxContent className={contentClassName}>
        <ComboboxEmpty>No model found.</ComboboxEmpty>
        <ComboboxList className={listClassName}>
          {(item: ModelItem) => (
            <ComboboxItem key={item.id} value={item}>
              <div className="flex min-w-0 items-center gap-2">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="size-9 shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <div className="size-9 shrink-0 rounded-sm bg-muted/40" />
                )}
                <span className="truncate">{item.name}</span>
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
