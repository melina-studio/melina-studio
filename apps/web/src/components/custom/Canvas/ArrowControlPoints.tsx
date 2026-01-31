import React from "react";
import { Circle, Group, Line } from "react-konva";
import { Shape } from "@/lib/konavaTypes";
import { getBendPoint, convertLegacyArrow } from "@/utils/arrowUtils";

type ArrowControlPointsProps = {
  arrow: Extract<Shape, { type: "arrow" }>;
  offset?: { x: number; y: number };
  onStartDrag: (newPos: { x: number; y: number }) => void;
  onEndDrag: (newPos: { x: number; y: number }) => void;
  onBendDrag: (newPos: { x: number; y: number }) => void;
  onDragEnd: () => void;
};

export const ArrowControlPoints: React.FC<ArrowControlPointsProps> = ({
  arrow,
  offset,
  onStartDrag,
  onEndDrag,
  onBendDrag,
  onDragEnd,
}) => {
  // Handle legacy arrow format
  let start = arrow.start;
  let end = arrow.end;
  let bend = arrow.bend ?? 0;

  if (!start || !end) {
    const legacy = convertLegacyArrow(arrow);
    if (legacy) {
      start = legacy.start;
      end = legacy.end;
      bend = legacy.bend;
    } else {
      return null;
    }
  }

  // Apply offset for real-time positioning during drag
  const offsetX = offset?.x || 0;
  const offsetY = offset?.y || 0;

  const adjustedStart = { x: start.x + offsetX, y: start.y + offsetY };
  const adjustedEnd = { x: end.x + offsetX, y: end.y + offsetY };

  const bendPoint = getBendPoint(adjustedStart, adjustedEnd, bend);
  const handleRadius = 6;
  const handleFill = "#ffffff";
  const handleStroke = "#3b82f6";

  return (
    <Group listening={true}>
      {/* Connection lines to show control structure */}
      <Line
        points={[adjustedStart.x, adjustedStart.y, bendPoint.x, bendPoint.y]}
        stroke="#3b82f6"
        strokeWidth={1}
        dash={[4, 4]}
        listening={false}
      />
      <Line
        points={[bendPoint.x, bendPoint.y, adjustedEnd.x, adjustedEnd.y]}
        stroke="#3b82f6"
        strokeWidth={1}
        dash={[4, 4]}
        listening={false}
      />

      {/* Start control point */}
      <Circle
        x={adjustedStart.x}
        y={adjustedStart.y}
        radius={handleRadius}
        fill={handleFill}
        stroke={handleStroke}
        strokeWidth={2}
        draggable
        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}
        onDragStart={(e) => {
          e.cancelBubble = true;
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          const node = e.target;
          onStartDrag({ x: node.x(), y: node.y() });
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          onDragEnd();
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "move";
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "default";
        }}
      />

      {/* Bend control point (middle) */}
      <Circle
        x={bendPoint.x}
        y={bendPoint.y}
        radius={handleRadius}
        fill="#fbbf24"
        stroke={handleStroke}
        strokeWidth={2}
        draggable
        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}
        onDragStart={(e) => {
          e.cancelBubble = true;
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          const node = e.target;
          onBendDrag({ x: node.x(), y: node.y() });
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          onDragEnd();
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "move";
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "default";
        }}
      />

      {/* End control point */}
      <Circle
        x={adjustedEnd.x}
        y={adjustedEnd.y}
        radius={handleRadius}
        fill={handleFill}
        stroke={handleStroke}
        strokeWidth={2}
        draggable
        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}
        onDragStart={(e) => {
          e.cancelBubble = true;
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          const node = e.target;
          onEndDrag({ x: node.x(), y: node.y() });
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          onDragEnd();
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "move";
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "default";
        }}
      />
    </Group>
  );
};
