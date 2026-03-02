import Odometer from "react-odometerjs";
import React from "react";
import "@/styles/odometer-theme.minimal.css";
import { cn } from "@/lib/utils";

interface DashboardOdometerProps {
  value: number;
  className?: string;
  format?: string;
}

export default function DashboardOdometer({
  value,
  className,
  format = "(,ddd)",
}: DashboardOdometerProps) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    setDisplayValue(0);
    let frame2 = 0;

    // Trigger value update on the next paint frame(s) to keep
    // the 0 -> value animation smooth without visible timeout lag.
    const frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => {
        setDisplayValue(safeValue);
      });
    });

    return () => {
      window.cancelAnimationFrame(frame1);
      if (frame2) window.cancelAnimationFrame(frame2);
    };
  }, [safeValue]);

  return (
    <Odometer
      value={displayValue}
      format={format}
      className={cn(
        "font-display text-4xl md:text-5xl leading-none tabular-nums",
        className,
      )}
    />
  );
}
