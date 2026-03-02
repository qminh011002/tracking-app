import React from "react";
import NumberFlow from "@number-flow/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bullet } from "@/components/ui/bullet";
import { cn } from "@/lib/utils";
import DashboardOdometer from "@/components/dashboard/odometer";

interface DashboardStatProps {
  label: string;
  value: string;
  odometerValue?: number;
  odometerFormat?: string;
  description?: string;
  unitLabel?: string;
  tag?: string;
  icon: React.ElementType;
  intent?: "positive" | "negative" | "neutral";
  direction?: "up" | "down";
}

export default function DashboardStat({
  label,
  value,
  odometerValue,
  odometerFormat,
  description,
  unitLabel,
  icon,
  tag,
  intent,
  direction,
}: DashboardStatProps) {
  const Icon = icon;

  const parseValue = (val: string) => {
    const match = val.match(/^([^\d.-]*)([+-]?\d*\.?\d+)([^\d]*)$/);

    if (match) {
      const [, prefix, numStr, suffix] = match;
      return {
        prefix: prefix || "",
        numericValue: parseFloat(numStr),
        suffix: suffix || "",
        isNumeric: !isNaN(parseFloat(numStr)),
      };
    }

    return {
      prefix: "",
      numericValue: 0,
      suffix: val,
      isNumeric: false,
    };
  };

  const getIntentClassName = () => {
    if (intent === "positive") return "text-success";
    if (intent === "negative") return "text-destructive";
    return "text-muted-foreground";
  };

  const { prefix, numericValue, suffix, isNumeric } = parseValue(value);
  const hasExplicitPlus = value.trim().startsWith("+");
  const normalizedPrefix = prefix.replace(/\+/g, "");
  const showStandalonePlus = hasExplicitPlus && Number(odometerValue) > 0;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2.5">
          <Bullet />
          {label}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>

      <CardContent className="bg-accent relative flex-1 overflow-clip pt-2 md:pt-6">
        <div className="flex items-center">
          <div>
            {Number.isFinite(odometerValue) ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  {showStandalonePlus ? (
                    <span className="font-display text-4xl md:text-5xl leading-none">
                      +
                    </span>
                  ) : null}
                  {normalizedPrefix ? (
                    <span className="font-display text-4xl md:text-5xl leading-none">
                      {normalizedPrefix}
                    </span>
                  ) : null}
                  <DashboardOdometer
                    value={Number(odometerValue)}
                    format={odometerFormat}
                  />
                  {suffix ? (
                    <span className="font-display text-3xl md:text-4xl leading-none">
                      {suffix}
                    </span>
                  ) : null}
                </div>
                {unitLabel ? <span className="text-sm">{unitLabel}</span> : null}
              </div>
            ) : (
              <span className="text-4xl font-display md:text-5xl">
                {isNumeric ? (
                  <div className="flex flex-col">
                    <NumberFlow
                      value={numericValue}
                      prefix={prefix}
                      suffix={suffix}
                    />
                    {unitLabel ? <span className="text-sm">{unitLabel}</span> : null}
                  </div>
                ) : (
                  value
                )}
              </span>
            )}
          </div>
          {tag && (
            <Badge variant="default" className="ml-3 uppercase">
              {tag}
            </Badge>
          )}
        </div>

        {description && (
          <div className="justify-between">
            <p className="text-xs font-medium tracking-wide text-muted-foreground md:text-sm">
              {description}
            </p>
          </div>
        )}

        {direction && (
          <div>
            <div className="group pointer-events-none absolute right-0 top-0 h-full w-14 overflow-hidden">
              <div
                className={cn(
                  "flex flex-col transition-all duration-500",
                  "group-hover:scale-105 group-hover:brightness-110",
                  getIntentClassName(),
                  direction === "up"
                    ? "animate-marquee-up"
                    : "animate-marquee-down",
                )}
              >
                <div
                  className={cn(
                    "flex",
                    direction === "up" ? "flex-col-reverse" : "flex-col",
                  )}
                >
                  {Array.from({ length: 6 }, (_, i) => (
                    <Arrow key={i} direction={direction} index={i} />
                  ))}
                </div>
                <div
                  className={cn(
                    "flex",
                    direction === "up" ? "flex-col-reverse" : "flex-col",
                  )}
                >
                  {Array.from({ length: 8 }, (_, i) => (
                    <Arrow key={i} direction={direction} index={i} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ArrowProps {
  direction: "up" | "down";
  index: number;
}

const Arrow = ({ direction, index }: ArrowProps) => {
  const staggerDelay = index * 0.15;
  const phaseDelay = (index % 3) * 0.8;

  return (
    <span
      style={{
        animationDelay: `${staggerDelay + phaseDelay}s`,
        animationDuration: "3s",
        animationTimingFunction: "cubic-bezier(0.4, 0.0, 0.2, 1)",
      }}
      className={cn(
        "block size-16 text-center font-display text-5xl leading-none",
        "animate-marquee-pulse transition-all duration-700 ease-out",
        "will-change-transform",
      )}
    >
      {direction === "up" ? "↑" : "↓"}
    </span>
  );
};
