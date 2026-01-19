import React from "react";

interface MarqueeAIIconProps {
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Custom marquee icon with AI sparkle indicator
 * Combines a dotted selection rectangle with a purple 4-point sparkle
 */
const MarqueeAIIcon: React.FC<MarqueeAIIconProps> = ({
  width = 18,
  height = 18,
  className,
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Marquee corners - similar to Scan icon */}
      {/* Top-left corner */}
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      {/* Top-right corner */}
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      {/* Bottom-left corner */}
      <path d="M3 17v2a2 2 0 0 0 2 2h2" />
      {/* Bottom-right corner - shortened for sparkle space */}
      <path d="M21 11v-4" />

      {/* AI Sparkle at bottom-right - with pulse animation */}
      <g fill="#7e57c2" stroke="#7e57c2" strokeWidth="0.8">
        <path d="M18 22l-0.5-1.2c-0.6-1.4-1.8-2.6-3.2-3.2L13 17l1.3-0.6c1.4-0.6 2.6-1.8 3.2-3.2L18 12l0.5 1.2c0.6 1.4 1.8 2.6 3.2 3.2L23 17l-1.3 0.6c-1.4 0.6-2.6 1.8-3.2 3.2L18 22z">
          <animate
            attributeName="opacity"
            values="1;0.4;1"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>
      </g>
    </svg>
  );
};

export default MarqueeAIIcon;
