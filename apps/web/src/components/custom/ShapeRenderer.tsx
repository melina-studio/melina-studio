import React from "react";
import { Rect, Circle, Line, Text } from "react-konva";
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
