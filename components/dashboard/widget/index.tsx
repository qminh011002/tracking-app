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
            city?: string;
            locality?: string;
            localityInfo?: {
              administrative?: Array<{ name?: string; order?: number }>;
            };
            principalSubdivision?: string;
            countryName?: string;
          };

          const locality = (data.locality ?? "").trim();
          const cityFromApi = (data.city ?? "").trim();
          const cityFromAdmin = (
            data.localityInfo?.administrative
              ?.find((x) => (x.order ?? 0) >= 6)
              ?.name ?? ""
          ).trim();
          const city =
            locality ||
            cityFromApi ||
            (
              cityFromAdmin
            ).trim();
          const province = (data.principalSubdivision ?? "").trim();
          const country = (data.countryName ?? "").trim();
          const normalizeText = (value: string) =>
            value
              .toLowerCase()
              .replace(/\b(city|province|state|tinh|thanh pho)\b/g, "")
              .replace(/[.,-]/g, " ")
              .replace(/\s+/g, " ")
              .trim();

          const cityNorm = normalizeText(city);
          const provinceNorm = normalizeText(province);
          const isDuplicateCityProvince =
            cityNorm && provinceNorm && cityNorm === provinceNorm;
          const cityPart = isDuplicateCityProvince ? "" : city;

          const nextLocation = [cityPart, province, country]
            .filter(Boolean)
            .join(", ");

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
      <video
        className="pointer-events-none absolute inset-0 z-0 h-full w-full scale-110 object-cover"
        src={assetPath(
          "/videos/YTDown_YouTube_Tom-and-Jerry-Mega-Compilation-Vol-12-Wa_Media_pEl3-0GHyoQ_005_240p.mp4",
        )}
        autoPlay
        loop
        muted
        playsInline
      />
      <TVNoise
        className="z-10"
        opacity={0.6}
        intensity={0.5}
        speed={40}
        grain={1.5}
        scanlines
        roll

      />
      <CardContent className="bg-transparent p-3 py-2 flex-1 flex flex-col justify-between text-sm font-medium uppercase relative z-20 [text-shadow:_0_1px_6px_rgba(0,0,0,0.85)]">
        <div className="flex justify-between items-center text-white">
          <span>{dateInfo.dayOfWeek}</span>
          <span>{dateInfo.restOfDate}</span>
        </div>
        <div className="text-center">
          <div
            className="text-4xl font-semibold tabular-nums"
            suppressHydrationWarning
          >
            {formatTime(currentTime)}
          </div>
        </div>

        <div className="flex justify-center items-center">
          <span>{isLocating ? "Đang định vị..." : locationText}</span>
        </div>
      </CardContent>
    </Card>
  );
}
