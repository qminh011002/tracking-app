import Odometer from "react-odometerjs";
import React from "react";
import "@/styles/odometer-theme.minimal.css";
import { cn } from "@/lib/utils";

interface DashboardOdometerProps {
  value: number;
  className?: string;
}

export default function DashboardOdometer({
  value,
  className,
}: DashboardOdometerProps) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    setDisplayValue(0);
    const timer = window.setTimeout(() => {
      setDisplayValue(safeValue);
    }, 40);

    return () => window.clearTimeout(timer);
  }, [safeValue]);

  return (
    <Odometer
      value={displayValue}
      format="(,ddd)"
      className={cn(
        "font-display text-4xl md:text-5xl leading-none tabular-nums",
        className,
      )}
    />
  );
}
