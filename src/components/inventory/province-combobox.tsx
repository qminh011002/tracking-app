import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { ProvinceItem } from "@/src/services/provinces";

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
  const selectedProvince =
    provinces.find((province) => String(province.id) === value) ?? null;

  return (
    <Combobox
      items={provinces}
      value={selectedProvince}
      onValueChange={(item: ProvinceItem | null) =>
        onChange(item ? String(item.id) : "")
      }
      itemToStringLabel={(item: ProvinceItem) => item.name}
      itemToStringValue={(item: ProvinceItem) => String(item.id)}
    >
      <ComboboxInput
        placeholder={loading ? "Loading provinces..." : placeholder}
        disabled={loading}
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
        <ComboboxList>
          {(item: ProvinceItem) => (
            <ComboboxItem key={item.id} value={item}>
              {item.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
