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

type ShapeRendererProps = {
  shape: Shape;
  strokeColor: string;
  activeTool: string;
  isDraggingShape: boolean;
  isDraggingStage: boolean;
  cursor: string;
  onShapeClick: (e: any, id: string) => void;
  onShapeDragStart: (e: any, id: string) => void;
  onShapeDragEnd: (e: any, id: string) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onRectTransform: (node: any, id: string) => void;
  onEllipseTransform: (node: any, id: string) => void;
  onImageTransform: (node: any, id: string) => void;
  onTextDoubleClick: (id: string, pos: { x: number; y: number }) => void;
  setStageCursor: (c: string) => void;
  setIsDraggingStage: (dragging: boolean) => void;
};

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shape,
  strokeColor,
  activeTool,
  isDraggingShape,
  isDraggingStage,
  cursor,
  onShapeClick,
  onShapeDragStart,
  onShapeDragEnd,
  onDragMove,
  onRectTransform,
  onEllipseTransform,
  onImageTransform,
  onTextDoubleClick,
  setStageCursor,
  setIsDraggingStage,
}) => {
  if (shape.type === "rect") {
    return (
      <Rect
        key={shape.id}
        id={shape.id}
        x={shape.x}
        y={shape.y}
        width={shape.w}
        height={shape.h}
        fill={shape.fill}
        stroke={strokeColor}
        cornerRadius={8}
        draggable={
          activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT
        }
        onDragStart={(e) => onShapeDragStart(e, shape.id)}
        onDragEnd={(e) => onShapeDragEnd(e, shape.id)}
        onClick={(e) => onShapeClick(e, shape.id)}
        onTransformEnd={(e) => onRectTransform(e.target, shape.id)}
        onMouseEnter={() => {
          if (
            (activeTool === ACTIONS.SELECT ||
              activeTool === ACTIONS.MARQUEE_SELECT) &&
            !isDraggingShape
          ) {
            setStageCursor("grab");
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
    return (
      <Circle
        key={shape.id}
        id={shape.id}
        x={shape.x}
        y={shape.y}
        radius={shape.r}
        fill={shape.fill}
        stroke={strokeColor}
        draggable={
          activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT
        }
        onDragStart={(e) => onShapeDragStart(e, shape.id)}
        onDragEnd={(e) => onShapeDragEnd(e, shape.id)}
        onClick={(e) => onShapeClick(e, shape.id)}
        onMouseEnter={() => {
          if (
            (activeTool === ACTIONS.SELECT ||
              activeTool === ACTIONS.MARQUEE_SELECT) &&
            !isDraggingShape
          )
            setStageCursor("grab");
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
        stroke={e.stroke || strokeColor}
        strokeWidth={e.strokeWidth || 2}
        rotation={e.rotation || 0}
        draggable={
          activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT
        }
        onDragStart={(e) => onShapeDragStart(e, shape.id)}
        onDragEnd={(e) => onShapeDragEnd(e, shape.id)}
        onClick={(e) => onShapeClick(e, shape.id)}
        onTransformEnd={(e) => {
          onEllipseTransform(e.target, shape.id);
        }}
        onMouseEnter={() => {
          if (
            (activeTool === ACTIONS.SELECT ||
              activeTool === ACTIONS.MARQUEE_SELECT) &&
            !isDraggingShape
          ) {
            setStageCursor("grab");
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
        stroke={p.stroke || strokeColor}
        strokeWidth={p.strokeWidth || 2}
        lineCap={p.lineCap || "round"}
        lineJoin={p.lineJoin || "round"}
        draggable={
          activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT
        }
        onDragStart={(e) => onShapeDragStart(e, shape.id)}
        onDragEnd={(e) => onShapeDragEnd(e, shape.id)}
        onClick={(e) => onShapeClick(e, shape.id)}
        onMouseEnter={() => {
          if (
            (activeTool === ACTIONS.SELECT ||
              activeTool === ACTIONS.MARQUEE_SELECT) &&
            !isDraggingShape
          ) {
            setStageCursor("grab");
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
        onDragEnd={(e) => onShapeDragEnd(e, shape.id)}
        onClick={(e) => onShapeClick(e, shape.id)}
        onTransformEnd={(e) => {
          onImageTransform(e.target, shape.id);
        }}
        onMouseEnter={() => {
          if (
            (activeTool === ACTIONS.SELECT ||
              activeTool === ACTIONS.MARQUEE_SELECT) &&
            !isDraggingShape
          ) {
            setStageCursor("grab");
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
    return (
      <Text
        key={shape.id}
        id={shape.id}
        x={t.x}
        y={t.y}
        text={t.text}
        fontSize={t.fontSize}
        fontFamily={t.fontFamily}
        fill={t.fill}
        draggable={activeTool === ACTIONS.SELECT}
        onDragEnd={(e) => {
          onDragMove(shape.id, e.target.x(), e.target.y());
        }}
        onDblClick={(e) => {
          onTextDoubleClick(shape.id, { x: t.x, y: t.y });
        }}
      />
    );
  }

  // Default to Line for pencil, line, arrow, eraser
  return (
    <Line
      key={shape.id}
      id={shape.id}
      points={(shape as any).points}
      stroke={(shape as any).stroke || strokeColor}
      strokeWidth={(shape as any).strokeWidth || 2}
      tension={0}
      lineCap="round"
      lineJoin="round"
      draggable={activeTool === ACTIONS.SELECT}
      onDragStart={(e) => onShapeDragStart(e, shape.id)}
      onDragEnd={(e) => onShapeDragEnd(e, shape.id)}
      onClick={(e) => onShapeClick(e, shape.id)}
      onMouseEnter={() => {
        if (activeTool === ACTIONS.SELECT && !isDraggingShape)
          setStageCursor("grab");
      }}
      onMouseLeave={() => {
        if (!isDraggingShape && !isDraggingStage) setStageCursor(cursor);
      }}
    />
  );
};
