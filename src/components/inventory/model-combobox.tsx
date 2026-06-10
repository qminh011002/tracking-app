import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxEmpty>No model found.</ComboboxEmpty>
        <ComboboxList>
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
