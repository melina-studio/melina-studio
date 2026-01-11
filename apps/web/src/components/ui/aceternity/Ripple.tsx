"use client";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const Ripple = ({
  rows = 8,
  cols = 27,
  cellSize = 56,
  className,
  forwardClicks = false,
}: {
  rows?: number;
  cols?: number;
  cellSize?: number;
  className?: string;
  forwardClicks?: boolean;
}) => {
  const [clickedCell, setClickedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [rippleKey, setRippleKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const handleCellClick = useCallback(
    (row: number, col: number, event: React.MouseEvent) => {
      // Trigger the ripple animation
      setClickedCell({ row, col });
      setRippleKey((k) => k + 1);

      // If forwardClicks is enabled, find and click the element underneath
      if (forwardClicks) {
        const { clientX, clientY } = event;
        // Temporarily hide the ripple to find elements underneath
        if (ref.current) {
          ref.current.style.pointerEvents = "none";
          const elementBelow = document.elementFromPoint(clientX, clientY);
          ref.current.style.pointerEvents = "";

          if (elementBelow && elementBelow !== event.target) {
            // Dispatch a click event to the element underneath
            elementBelow.dispatchEvent(
              new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                clientX,
                clientY,
                view: window,
              })
            );
          }
        }
      }
    },
    [forwardClicks]
  );

  return (
    <div
      ref={ref}
      className={cn(
        "absolute inset-0 h-full w-full",
        "[--cell-border-color:theme(colors.neutral.300)] [--cell-fill-color:theme(colors.neutral.100)] [--cell-shadow-color:theme(colors.neutral.500)]",
        "dark:[--cell-border-color:theme(colors.neutral.700)] dark:[--cell-fill-color:theme(colors.neutral.900)] dark:[--cell-shadow-color:theme(colors.neutral.800)]",
        className
      )}
    >
      <div className="relative h-auto w-auto overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-hidden" />
        <DivGrid
          key={`base-${rippleKey}`}
          className="[mask-image:radial-gradient(ellipse_at_top,white_30%,transparent_80%)] opacity-80"
          rows={rows}
          cols={cols}
          cellSize={cellSize}
          borderColor="var(--cell-border-color)"
          fillColor="var(--cell-fill-color)"
          clickedCell={clickedCell}
          onCellClick={handleCellClick}
          interactive
        />
      </div>
    </div>
  );
};

type DivGridProps = {
  className?: string;
  rows: number;
  cols: number;
  cellSize: number;
  borderColor: string;
  fillColor: string;
  clickedCell: { row: number; col: number } | null;
  onCellClick?: (row: number, col: number, event: React.MouseEvent) => void;
  interactive?: boolean;
};

type CellStyle = React.CSSProperties & {
  ["--delay"]?: string;
  ["--duration"]?: string;
};

const DivGrid = ({
  className,
  rows = 7,
  cols = 30,
  cellSize = 56,
  borderColor = "#3f3f46",
  fillColor = "rgba(14,165,233,0.3)",
  clickedCell = null,
  onCellClick = () => {},
  interactive = true,
}: DivGridProps) => {
  const cells = useMemo(
    () => Array.from({ length: rows * cols }, (_, idx) => idx),
    [rows, cols]
  );

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
    width: cols * cellSize,
    height: rows * cellSize,
    marginInline: "auto",
  };

  return (
    <div className={cn("relative z-[3]", className)} style={gridStyle}>
      {cells.map((idx) => {
        const rowIdx = Math.floor(idx / cols);
        const colIdx = idx % cols;
        const distance = clickedCell
          ? Math.hypot(clickedCell.row - rowIdx, clickedCell.col - colIdx)
          : 0;
        const delay = clickedCell ? Math.max(0, distance * 55) : 0;
        const duration = 200 + distance * 80;

        const style: CellStyle = clickedCell
          ? {
              "--delay": `${delay}ms`,
              "--duration": `${duration}ms`,
            }
          : {};

        return (
          <div
            key={idx}
            className={cn(
              "cell relative border-[0.5px] opacity-60 transition-opacity duration-150 will-change-transform hover:opacity-90 dark:shadow-[0px_0px_40px_1px_var(--cell-shadow-color)_inset]",
              clickedCell && "animate-cell-ripple",
              !interactive && "pointer-events-none"
            )}
            style={{
              backgroundColor: fillColor,
              borderColor: borderColor,
              ...style,
            }}
            onClick={
              interactive
                ? (e) => onCellClick?.(rowIdx, colIdx, e)
                : undefined
            }
          />
        );
      })}
    </div>
  );
};

export default Ripple;
