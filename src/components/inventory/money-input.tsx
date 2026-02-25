import * as React from "react";

import { Input } from "@/components/ui/input";

type MoneyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  valueDigits: string;
  onValueDigitsChange: (nextDigits: string) => void;
};

function formatMoneyInput(digits: string) {
  if (!digits) return "";
  const value = Number(digits);
  if (Number.isNaN(value)) return "";
  return value.toLocaleString("vi-VN");
}

export function MoneyInput({
  valueDigits,
  onValueDigitsChange,
  ...props
}: MoneyInputProps) {
  return (
    <Input
      {...props}
      inputMode="numeric"
      value={formatMoneyInput(valueDigits)}
      onChange={(e) => onValueDigitsChange(e.target.value.replace(/\D/g, ""))}
    />
  );
}
