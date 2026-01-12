import React, { useState, useEffect } from "react";
import {
  Rect,
  Circle,
  Line,
  Text,
  Ellipse,
  Path,
  Image as KonvaImage,
} from "react-konva";
import { ACTIONS } from "@/lib/konavaTypes";
import { Shape } from "@/lib/konavaTypes";

// Helper to get brightness of a color (0-255)
const getColorBrightness = (color: string): number => {
  if (!color) return 128;

  // Handle hex colors
  let hex = color.replace("#", "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;

  // Perceived brightness formula
  return (r * 299 + g * 587 + b * 114) / 1000;
};

// Adjust color for visibility based on theme
const getThemeAwareColor = (color: string | undefined, isDarkMode: boolean, fallbackColor: string): string => {
  if (!color) return fallbackColor;

  const brightness = getColorBrightness(color);

  // In dark mode, if color is too dark (< 50), make it light
  if (isDarkMode && brightness < 50) {
    return "#e5e5e5"; // Light gray
  }

  // In light mode, if color is too light (> 205), make it dark
  if (!isDarkMode && brightness > 205) {
    return "#1a1a1a"; // Dark gray
  }

  return color;
};

type ShapeRendererProps = {
  shape: Shape;
  activeTool: string;
  isDraggingShape: boolean;
  isDraggingStage: boolean;
  cursor: string;
  isDarkMode: boolean;
  onShapeClick: (e: any, id: string) => void;
  onShapeDragStart: (e: any, id: string) => void;
  onShapeDragEnd: (e: any, id: string) => void;
  onShapeDragMove: (e: any, id: string) => void;
  onRectTransform: (node: any, id: string) => void;
  onEllipseTransform: (node: any, id: string) => void;
  onImageTransform: (node: any, id: string) => void;
  onTextDoubleClick: (id: string, pos: { x: number; y: number }) => void;
  onColorClick: (e: any, id: string) => void;
  setStageCursor: (c: string) => void;
  setIsDraggingStage: (dragging: boolean) => void;
};

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shape,
  activeTool,
  isDraggingShape,
  isDraggingStage,
  cursor,
  isDarkMode,
  onShapeClick,
  onShapeDragStart,
  onShapeDragEnd,
  onShapeDragMove,
  onRectTransform,
  onEllipseTransform,
  onImageTransform,
  onTextDoubleClick,
  onColorClick,
  setStageCursor,
  setIsDraggingStage,
}) => {
  // Handle click based on active tool
  const handleClick = (e: any) => {
    if (activeTool === ACTIONS.COLOR) {
      onColorClick(e, shape.id);
    } else {
      onShapeClick(e, shape.id);
    }
  };
  // Default theme color for shapes without stored stroke
  const defaultStroke = isDarkMode ? "#fff" : "#111";

  if (shape.type === "rect") {
    // Use shape's own stroke if stored, otherwise fallback to theme default
    const rectStroke = shape.stroke || defaultStroke;
    return (
      <Rect
        key={shape.id}
        id={shape.id}
        x={shape.x}
        y={shape.y}
        width={shape.w}
        height={shape.h}
        fill={shape.fill}
        stroke={rectStroke}
        cornerRadius={8}
        draggable={
          activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT
        }
        onDragStart={(e) => onShapeDragStart(e, shape.id)}
        onDragMove={(e) => onShapeDragMove(e, shape.id)}
        onDragEnd={(e) => onShapeDragEnd(e, shape.id)}
        onClick={handleClick}
        onTransformEnd={(e) => onRectTransform(e.target, shape.id)}
        onMouseEnter={() => {
          if (
            (activeTool === ACTIONS.SELECT ||
              activeTool === ACTIONS.MARQUEE_SELECT ||
              activeTool === ACTIONS.COLOR) &&
            !isDraggingShape
          ) {
            setStageCursor(activeTool === ACTIONS.COLOR ? cursor : "grab");
            setIsDraggingStage(false);
          }
        }}
        onMouseLeave={() => {
          if (!isDraggingShape && !isDraggingStage) {
            setStageCursor(cursor);
          }
        }}
      />
    );
  }

  if (shape.type === "circle") {
    // Use shape's own stroke if stored, otherwise fallback to theme default
    const circleStroke = shape.stroke || defaultStroke;
    return (
      <Circle
        key={shape.id}
        id={shape.id}
        x={shape.x}
        y={shape.y}
        radius={shape.r}
        fill={shape.fill}
        stroke={circleStroke}
        draggable={
          activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT
        }
        onDragStart={(e) => onShapeDragStart(e, shape.id)}
        onDragMove={(e) => onShapeDragMove(e, shape.id)}
        onDragEnd={(e) => onShapeDragEnd(e, shape.id)}
        onClick={handleClick}
        onMouseEnter={() => {
          if (
            (activeTool === ACTIONS.SELECT ||
              activeTool === ACTIONS.MARQUEE_SELECT ||
              activeTool === ACTIONS.COLOR) &&
            !isDraggingShape
          )
            setStageCursor(activeTool === ACTIONS.COLOR ? cursor : "grab");
        }}
        onMouseLeave={() => {
          if (!isDraggingShape && !isDraggingStage) setStageCursor(cursor);
        }}
      />
    );
  }

  if (shape.type === "ellipse") {
    const e = shape as any;
    return (
      <Ellipse
        key={shape.id}
        id={shape.id}
        x={e.x}
        y={e.y}
        radiusX={e.radiusX}
        radiusY={e.radiusY}
        fill={e.fill}
        stroke={e.stroke || defaultStroke}
        strokeWidth={e.strokeWidth || 2}
        rotation={e.rotation || 0}
        draggable={
          activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT
        }
        onDragStart={(e) => onShapeDragStart(e, shape.id)}
        onDragMove={(e) => onShapeDragMove(e, shape.id)}
        onDragEnd={(e) => onShapeDragEnd(e, shape.id)}
        onClick={handleClick}
        onTransformEnd={(e) => {
          onEllipseTransform(e.target, shape.id);
        }}
        onMouseEnter={() => {
          if (
            (activeTool === ACTIONS.SELECT ||
              activeTool === ACTIONS.MARQUEE_SELECT ||
              activeTool === ACTIONS.COLOR) &&
            !isDraggingShape
          ) {
            setStageCursor(activeTool === ACTIONS.COLOR ? cursor : "grab");
            setIsDraggingStage(false);
          }
        }}
        onMouseLeave={() => {
          if (!isDraggingShape && !isDraggingStage) {
            setStageCursor(cursor);
          }
        }}
      />
    );
  }

  if (shape.type === "path") {
    const p = shape as any;
    return (
      <Path
        key={shape.id}
        id={shape.id}
        x={p.x || 0}
        y={p.y || 0}
        data={p.data}
        fill={p.fill}
        stroke={p.stroke || defaultStroke}
        strokeWidth={p.strokeWidth || 2}
        lineCap={p.lineCap || "round"}
        lineJoin={p.lineJoin || "round"}
        draggable={
          activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT
        }
        onDragStart={(e) => onShapeDragStart(e, shape.id)}
        onDragMove={(e) => onShapeDragMove(e, shape.id)}
        onDragEnd={(e) => onShapeDragEnd(e, shape.id)}
        onClick={handleClick}
        onMouseEnter={() => {
          if (
            (activeTool === ACTIONS.SELECT ||
              activeTool === ACTIONS.MARQUEE_SELECT ||
              activeTool === ACTIONS.COLOR) &&
            !isDraggingShape
          ) {
            setStageCursor(activeTool === ACTIONS.COLOR ? cursor : "grab");
            setIsDraggingStage(false);
          }
        }}
        onMouseLeave={() => {
          if (!isDraggingShape && !isDraggingStage) {
            setStageCursor(cursor);
          }
        }}
      />
    );
  }

  if (shape.type === "image") {
    const img = shape as any;
    const [image, setImage] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
      const imgElement = new window.Image();
      imgElement.crossOrigin = "anonymous";
      imgElement.onload = () => {
        setImage(imgElement);
      };
      imgElement.onerror = () => {
        console.error("Failed to load image:", img.src);
      };
      imgElement.src = img.src;
    }, [img.src]);

    if (!image) {
      return null; // Don't render until image is loaded
    }

    return (
      <KonvaImage
        key={shape.id}
        id={shape.id}
        x={img.x}
        y={img.y}
        image={image}
        width={img.width || 150}
        height={img.height || 150}
        draggable={
          activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT
        }
        onDragStart={(e) => onShapeDragStart(e, shape.id)}
        onDragMove={(e) => onShapeDragMove(e, shape.id)}
        onDragEnd={(e) => onShapeDragEnd(e, shape.id)}
        onClick={handleClick}
        onTransformEnd={(e) => {
          onImageTransform(e.target, shape.id);
        }}
        onMouseEnter={() => {
          if (
            (activeTool === ACTIONS.SELECT ||
              activeTool === ACTIONS.MARQUEE_SELECT ||
              activeTool === ACTIONS.COLOR) &&
            !isDraggingShape
          ) {
            setStageCursor(activeTool === ACTIONS.COLOR ? cursor : "grab");
            setIsDraggingStage(false);
          }
        }}
        onMouseLeave={() => {
          if (!isDraggingShape && !isDraggingStage) {
            setStageCursor(cursor);
          }
        }}
      />
    );
  }

  if (shape.type === "text") {
    const t = shape as any;
    // Adjust text color for visibility in current theme
    const textColor = getThemeAwareColor(t.fill, isDarkMode, defaultStroke);
    return (
      <Text
        key={shape.id}
        id={shape.id}
        x={t.x}
        y={t.y}
        text={t.text}
        fontSize={t.fontSize}
        fontFamily={t.fontFamily}
        fill={textColor}
        draggable={
          activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT
        }
        onDragStart={(e) => onShapeDragStart(e, shape.id)}
        onDragMove={(e) => onShapeDragMove(e, shape.id)}
        onDragEnd={(e) => onShapeDragEnd(e, shape.id)}
        onClick={handleClick}
        onDblClick={() => {
          onTextDoubleClick(shape.id, { x: t.x, y: t.y });
        }}
        onMouseEnter={() => {
          if (
            (activeTool === ACTIONS.SELECT ||
              activeTool === ACTIONS.MARQUEE_SELECT ||
              activeTool === ACTIONS.COLOR) &&
            !isDraggingShape
          ) {
            setStageCursor(activeTool === ACTIONS.COLOR ? cursor : "grab");
            setIsDraggingStage(false);
          }
        }}
        onMouseLeave={() => {
          if (!isDraggingShape && !isDraggingStage) {
            setStageCursor(cursor);
          }
        }}
      />
    );
  }

  // Default to Line for pencil, line, arrow, eraser
  const lineShape = shape as any;
  // Adjust stroke color for visibility in current theme
  const lineStroke = getThemeAwareColor(lineShape.stroke, isDarkMode, defaultStroke);
  return (
    <Line
      key={shape.id}
      id={shape.id}
      x={lineShape.x || 0}
      y={lineShape.y || 0}
      points={lineShape.points}
      stroke={lineStroke}
      strokeWidth={lineShape.strokeWidth || 2}
      tension={0}
      lineCap="round"
      lineJoin="round"
      draggable={activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT}
      onDragStart={(e) => onShapeDragStart(e, shape.id)}
      onDragMove={(e) => onShapeDragMove(e, shape.id)}
      onDragEnd={(e) => onShapeDragEnd(e, shape.id)}
      onClick={handleClick}
      onMouseEnter={() => {
        if (
          (activeTool === ACTIONS.SELECT ||
            activeTool === ACTIONS.MARQUEE_SELECT ||
            activeTool === ACTIONS.COLOR) &&
          !isDraggingShape
        ) {
          setStageCursor(activeTool === ACTIONS.COLOR ? cursor : "grab");
          setIsDraggingStage(false);
        }
      }}
      onMouseLeave={() => {
        if (!isDraggingShape && !isDraggingStage) {
          setStageCursor(cursor);
        }
      }}
    />
  );
};
