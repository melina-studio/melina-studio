"use client";

import { cn } from "@/lib/utils";

interface HalftoneImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function HalftoneImage({ src, alt, className }: HalftoneImageProps) {
  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* SVG Filter Definition */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="halftone" x="0" y="0" width="100%" height="100%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur" />
            <feColorMatrix
              type="saturate"
              values="0"
              in="blur"
              result="gray"
            />
            <feComponentTransfer in="gray" result="contrast">
              <feFuncR type="linear" slope="1.5" intercept="-0.25" />
              <feFuncG type="linear" slope="1.5" intercept="-0.25" />
              <feFuncB type="linear" slope="1.5" intercept="-0.25" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      {/* Base Image with halftone effect */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${src})`,
          filter: "url(#halftone)",
        }}
        role="img"
        aria-label={alt}
      />

      {/* Halftone dot pattern overlay */}
      <div
        className="absolute inset-0 mix-blend-multiply opacity-90"
        style={{
          backgroundImage: `
            radial-gradient(circle at center, #000 0.8px, transparent 0.8px)
          `,
          backgroundSize: "4px 4px",
        }}
      />

      {/* Additional noise texture */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
