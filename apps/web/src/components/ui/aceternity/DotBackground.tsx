import { cn } from "@/lib/utils";
import React from "react";

interface DotBackgroundProps {
  /** Canvas X offset (from panning) */
  offsetX?: number;
  /** Canvas Y offset (from panning) */
  offsetY?: number;
  /** Canvas scale/zoom level */
  scale?: number;
}

export function DotBackground({
  offsetX = 0,
  offsetY = 0,
  scale = 1,
}: DotBackgroundProps) {
  // Base dot spacing - increases when zoomed out (more dots), decreases when zoomed in (fewer dots)
  const baseDotSpacing = 20;
  const dotSpacing = baseDotSpacing * scale;

  // Clamp dot spacing to reasonable bounds for visual appeal
  const clampedSpacing = Math.max(10, Math.min(60, dotSpacing));

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-white dark:bg-black">
      <div
        className={cn(
          "absolute inset-0",
          "[background-image:radial-gradient(#d4d4d4_1px,transparent_1px)]",
          "dark:[background-image:radial-gradient(#404040_1px,transparent_1px)]"
        )}
        style={{
          backgroundSize: `${clampedSpacing}px ${clampedSpacing}px`,
          // CSS backgrounds tile infinitely, so direct offset works seamlessly
          backgroundPosition: `${offsetX}px ${offsetY}px`,
        }}
      />
      {/* Radial gradient for the container to give a faded look */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-black"></div>
    </div>
  );
}
