"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface TVNoiseProps {
  className?: string;
  opacity?: number;
  intensity?: number;
  speed?: number;
  /** Size of each noise particle in CSS pixels. Higher = chunkier grain. */
  grain?: number;
  /** Draw horizontal CRT scanlines over the noise. */
  scanlines?: boolean;
  /** Sweep a bright "rolling" sync band down the screen like an old TV. */
  roll?: boolean;
}

export default function TVNoise({
  className,
  opacity = 0.03,
  intensity = 0.1,
  speed = 60,
  grain = 1,
  scanlines = false,
  roll = false,
}: TVNoiseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const rollRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frameDelay = 1000 / speed;
    const grainSize = Math.max(1, grain);

    // Offscreen buffer holds the low-res noise; it gets scaled up onto the
    // visible canvas with smoothing disabled so each cell becomes a block.
    const buffer = document.createElement("canvas");
    const bufferCtx = buffer.getContext("2d");
    if (!bufferCtx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width * window.devicePixelRatio;
      const height = rect.height * window.devicePixelRatio;

      // Only update canvas if we have valid dimensions
      if (
        width > 0 &&
        height > 0 &&
        Number.isFinite(width) &&
        Number.isFinite(height)
      ) {
        canvas.width = width;
        canvas.height = height;
        buffer.width = Math.max(1, Math.floor(rect.width / grainSize));
        buffer.height = Math.max(1, Math.floor(rect.height / grainSize));
      }
    };

    const animate = () => {
      const { width, height } = canvas;

      // Skip animation if canvas has invalid dimensions
      if (
        width <= 0 ||
        height <= 0 ||
        !Number.isFinite(width) ||
        !Number.isFinite(height)
      ) {
        setTimeout(() => {
          if (animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(animate);
          }
        }, frameDelay);
        return;
      }

      const imageData = bufferCtx.createImageData(buffer.width, buffer.height);
      const data = imageData.data;

      // Generate random noise
      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random();

        if (noise < intensity) {
          const value = Math.floor(Math.random() * 255);
          data[i] = value; // Red
          data[i + 1] = value; // Green
          data[i + 2] = value; // Blue
          data[i + 3] = Math.floor(Math.random() * 100 + 50); // Alpha (transparency)
        } else {
          data[i + 3] = 0; // Fully transparent
        }
      }

      bufferCtx.putImageData(imageData, 0, 0);

      // Scale the low-res noise up into chunky blocks.
      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buffer, 0, 0, buffer.width, buffer.height, 0, 0, width, height);

      const dpr = window.devicePixelRatio;

      // CRT scanlines: thin dark horizontal lines across the whole screen.
      if (scanlines) {
        const lineGap = Math.max(2, Math.round(3 * dpr));
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        for (let y = 0; y < height; y += lineGap) {
          ctx.fillRect(0, y, width, Math.max(1, Math.floor(lineGap / 2)));
        }
      }

      // Rolling sync band: a soft bright stripe that sweeps downward, plus a
      // few random horizontal "xẹt" streaks for the glitchy old-TV feel.
      if (roll) {
        rollRef.current = (rollRef.current + 1.5 * dpr) % (height + 1);
        const bandHeight = Math.max(8, height * 0.12);
        const bandY = rollRef.current - bandHeight;
        const gradient = ctx.createLinearGradient(0, bandY, 0, bandY + bandHeight);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.18)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, bandY, width, bandHeight);

        // Occasional torn streak lines.
        const streaks = 3;
        for (let s = 0; s < streaks; s++) {
          if (Math.random() < 0.4) {
            const sy = Math.random() * height;
            const sh = Math.max(1, Math.random() * 3 * dpr);
            ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + Math.random() * 0.25})`;
            ctx.fillRect(0, sy, width, sh);
          }
        }
      }

      // Schedule next frame
      setTimeout(() => {
        if (animationFrameRef.current) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      }, frameDelay);
    };

    // Initialize
    resizeCanvas();
    animationFrameRef.current = requestAnimationFrame(animate);

    // Handle resize
    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [intensity, speed, grain, scanlines, roll]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "pointer-events-none absolute inset-0 w-full h-full z-10",
        className
      )}
      style={{
        opacity,
        mixBlendMode: "overlay",
      }}
    />
  );
}
