"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import TVNoise from "@/components/ui/tv-noise";
import type { WidgetData } from "@/types/dashboard";
import { assetPath } from "@/lib/asset-path";

interface WidgetProps {
  widgetData: WidgetData;
}

export default function Widget({ widgetData }: WidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationText, setLocationText] = useState(widgetData.location);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    let ignore = false;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`,
          );

          if (!response.ok) throw new Error("Failed to reverse geocode");
          const data = (await response.json()) as {
            principalSubdivision?: string;
            countryName?: string;
          };

          const province = (data.principalSubdivision ?? "").trim();
          const country = (data.countryName ?? "").trim();
          const nextLocation = [province, country].filter(Boolean).join(", ");

          if (!ignore && nextLocation) {
            setLocationText(nextLocation);
          }
        } catch {
          if (!ignore) {
            setLocationText(widgetData.location);
          }
        } finally {
          if (!ignore) setIsLocating(false);
        }
      },
      () => {
        if (!ignore) {
          setLocationText(widgetData.location);
          setIsLocating(false);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 1000 * 60 * 10,
      },
    );

    return () => {
      ignore = true;
    };
  }, [widgetData.location]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    const dayOfWeek = date.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const restOfDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return { dayOfWeek, restOfDate };
  };

  const dateInfo = formatDate(currentTime);

  return (
    <Card className="w-full aspect-[1.5] relative overflow-hidden">
      <TVNoise opacity={0.3} intensity={0.2} speed={40} />
      <CardContent className="bg-accent/30 flex-1 flex flex-col justify-between text-sm font-medium uppercase relative z-20">
        <div className="flex justify-between items-center">
          <span className="opacity-50">{dateInfo.dayOfWeek}</span>
          <span>{dateInfo.restOfDate}</span>
        </div>
        <div className="text-center">
          <div
            className="text-5xl font-mono font-semibold"
            suppressHydrationWarning
          >
            {formatTime(currentTime)}
          </div>
        </div>

        <div className="flex justify-center items-center">
          <span>{isLocating ? "Locating..." : locationText}</span>
        </div>
      </CardContent>
    </Card>
  );
}
