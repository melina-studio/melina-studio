import React, { useState, useEffect, useMemo } from "react";
import {
  Rect,
  Circle,
  Line,
  Text,
  Ellipse,
  Path,
  Image as KonvaImage,
  Group,
} from "react-konva";
import { ACTIONS } from "@/lib/konavaTypes";
import { Shape } from "@/lib/konavaTypes";
import { getFreehandPath } from "@/utils/freehandUtils";
import {
  getArrowPathData,
  getArrowSvgPath,
  getArrowHeadPath,
  convertLegacyArrow,
  getBendPoint,
} from "@/utils/arrowUtils";

// Separate component for image shapes to avoid conditional hooks
const ImageShape: React.FC<{
  shape: any;
  activeTool: string;
  isDraggingShape: boolean;
  isDraggingStage: boolean;
  cursor: string;
  onShapeDragStart: (e: any, id: string) => void;
  onShapeDragEnd: (e: any, id: string) => void;
  onShapeDragMove: (e: any, id: string) => void;
  onImageTransform: (node: any, id: string) => void;
  handleClick: (e: any) => void;
  setStageCursor: (c: string) => void;
  setIsDraggingStage: (dragging: boolean) => void;
}> = ({
  shape,
  activeTool,
  isDraggingShape,
  isDraggingStage,
  cursor,
  onShapeDragStart,
  onShapeDragEnd,
  onShapeDragMove,
  onImageTransform,
  handleClick,
  setStageCursor,
  setIsDraggingStage,
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const imgElement = new window.Image();
    imgElement.crossOrigin = "anonymous";
    imgElement.onload = () => {
      setImage(imgElement);
    };
    imgElement.onerror = () => {
      console.error("Failed to load image:", shape.src);
    };
    imgElement.src = shape.src;
  }, [shape.src]);

  if (!image) {
    return null;
  }

  return (
    <KonvaImage
      key={shape.id}
      id={shape.id}
      x={shape.x}
      y={shape.y}
      image={image}
      width={shape.width || 150}
      height={shape.height || 150}
      draggable={activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT}
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
};

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
const getThemeAwareColor = (
  color: string | undefined,
  isDarkMode: boolean,
  fallbackColor: string
): string => {
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
  isSelected?: boolean;
  onShapeClick: (e: any, id: string) => void;
  onShapeDragStart: (e: any, id: string) => void;
  onShapeDragEnd: (e: any, id: string) => void;
  onShapeDragMove: (e: any, id: string) => void;
  onRectTransform: (node: any, id: string) => void;
  onEllipseTransform: (node: any, id: string) => void;
  onImageTransform: (node: any, id: string) => void;
  onTextDoubleClick: (id: string, pos: { x: number; y: number }) => void;
  onColorClick: (e: any, id: string) => void;
  onArrowControlPointDrag?: (
    pointType: "start" | "end" | "bend",
    newPos: { x: number; y: number }
  ) => void;
  onArrowControlPointDragEnd?: () => void;
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
  isSelected,
  onShapeClick,
  onShapeDragStart,
  onShapeDragEnd,
  onShapeDragMove,
  onRectTransform,
  onEllipseTransform,
  onImageTransform,
  onTextDoubleClick,
  onColorClick,
  onArrowControlPointDrag,
  onArrowControlPointDragEnd,
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

  // Pre-compute freehand path for pencil shapes (must be before early returns)
  const freehandPathData = useMemo(() => {
    if (shape.type !== "pencil") return null;
    const pencilShape = shape as Extract<Shape, { type: "pencil" }>;
    const points = pencilShape.points || [];
    if (points.length < 4) return null;

    return getFreehandPath(points, {
      size: pencilShape.size ?? (pencilShape.strokeWidth || 2) * 4,
      thinning: pencilShape.thinning ?? 0.5,
      smoothing: pencilShape.smoothing ?? 0.5,
      streamline: pencilShape.streamline ?? 0.5,
      simulatePressure: pencilShape.simulatePressure ?? true,
    });
  }, [shape]);

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
        draggable={activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT}
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
        draggable={activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT}
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
  }

  if (shape.type === "image") {
    return (
      <ImageShape
        shape={shape}
        activeTool={activeTool}
        isDraggingShape={isDraggingShape}
        isDraggingStage={isDraggingStage}
        cursor={cursor}
        onShapeDragStart={onShapeDragStart}
        onShapeDragEnd={onShapeDragEnd}
        onShapeDragMove={onShapeDragMove}
        onImageTransform={onImageTransform}
        handleClick={handleClick}
        setStageCursor={setStageCursor}
        setIsDraggingStage={setIsDraggingStage}
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
        draggable={activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT}
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

  if (shape.type === "frame") {
    const frameShape = shape as Extract<Shape, { type: "frame" }>;
    return (
      <Group
        key={shape.id}
        id={shape.id}
        x={frameShape.x}
        y={frameShape.y}
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
      >
        <Rect
          width={frameShape.w}
          height={frameShape.h}
          fill={frameShape.fill || "transparent"}
          stroke={frameShape.stroke || defaultStroke}
          strokeWidth={frameShape.strokeWidth || 2}
          cornerRadius={8}
        />
        {frameShape.name && (
          <Text
            text={frameShape.name}
            x={15}
            y={15}
            fontSize={14}
            fontFamily="Inter, sans-serif"
            fill={frameShape.stroke || defaultStroke}
            listening={false}
          />
        )}
      </Group>
    );
  }

  if (shape.type === "arrow") {
    const arrowShape = shape as Extract<Shape, { type: "arrow" }>;
    const arrowStroke = getThemeAwareColor(arrowShape.stroke, isDarkMode, defaultStroke);

    // Handle legacy arrow format (with points array) by converting to new format
    let start = arrowShape.start;
    let end = arrowShape.end;
    let bend = arrowShape.bend ?? 0;

    if (!start || !end) {
      const legacy = convertLegacyArrow(arrowShape);
      if (legacy) {
        start = legacy.start;
        end = legacy.end;
        bend = legacy.bend;
      } else {
        // Invalid arrow data, skip rendering
        return null;
      }
    }

    // Calculate arrow path data
    const arrowData = getArrowPathData(start, end, bend);
    const pathData = getArrowSvgPath(arrowData);
    const headPath = getArrowHeadPath(
      arrowData.ex,
      arrowData.ey,
      arrowData.endAngle,
      arrowShape.arrowHeadSize || 12
    );

    // Calculate bend point for control points
    const bendPoint = getBendPoint(start, end, bend);
    const handleRadius = 6;
    const handleFill = "#ffffff";
    const handleStroke = "#3b82f6";

    return (
      <Group
        key={shape.id}
        id={shape.id}
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
      >
        {/* Arrow curve */}
        <Path
          data={pathData}
          stroke={arrowStroke}
          strokeWidth={arrowShape.strokeWidth || 2}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
        {/* Arrow head */}
        <Path
          data={headPath}
          fill={arrowStroke}
          stroke={arrowStroke}
          strokeWidth={1}
          listening={false}
        />

        {/* Control points - only when selected */}
        {isSelected && onArrowControlPointDrag && onArrowControlPointDragEnd && (
          <>
            {/* Connection lines to show control structure */}
            <Line
              points={[start.x, start.y, bendPoint.x, bendPoint.y]}
              stroke="#3b82f6"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
            <Line
              points={[bendPoint.x, bendPoint.y, end.x, end.y]}
              stroke="#3b82f6"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />

            {/* Start control point */}
            <Circle
              x={start.x}
              y={start.y}
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
                onArrowControlPointDrag("start", { x: node.x(), y: node.y() });
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
                onArrowControlPointDragEnd();
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
                onArrowControlPointDrag("bend", { x: node.x(), y: node.y() });
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
                onArrowControlPointDragEnd();
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
              x={end.x}
              y={end.y}
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
                onArrowControlPointDrag("end", { x: node.x(), y: node.y() });
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
                onArrowControlPointDragEnd();
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
          </>
        )}
      </Group>
    );
  }

  // Default to Line for line, eraser
  const lineShape = shape as any;
  // Adjust stroke color for visibility in current theme
  const lineStroke = getThemeAwareColor(lineShape.stroke, isDarkMode, defaultStroke);

  // Render pencil shapes using freehand Path for beautiful variable-width strokes
  if (shape.type === "pencil" && freehandPathData) {
    return (
      <Path
        key={shape.id}
        id={shape.id}
        x={lineShape.x || 0}
        y={lineShape.y || 0}
        data={freehandPathData}
        fill={lineStroke}
        stroke={lineStroke}
        strokeWidth={0.5}
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
  }

  // Check if pencil shape is naturally closed (start and end points within 30px)
  // This is used as fallback during drawing when freehand path isn't ready yet
  const linePoints = lineShape.points || [];
  const isNaturallyClosed =
    shape.type === "pencil" &&
    linePoints.length >= 4 &&
    (() => {
      const startX = linePoints[0];
      const startY = linePoints[1];
      const endX = linePoints[linePoints.length - 2];
      const endY = linePoints[linePoints.length - 1];
      const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
      return distance < 30; // Within 30 pixels = considered closed
    })();

  // Only close the shape if it's naturally closed (don't close just because fill exists)
  // This prevents open pencil strokes from auto-closing when color is applied
  const shouldClose = isNaturallyClosed;

  // Use transparent fill for naturally closed shapes to enable interior click detection
  const fillColor = lineShape.fill || (isNaturallyClosed ? "transparent" : undefined);

  // Fallback to Line for line, eraser, and pencil with too few points
  return (
    <Line
      key={shape.id}
      id={shape.id}
      x={lineShape.x || 0}
      y={lineShape.y || 0}
      points={lineShape.points}
      stroke={lineStroke}
      fill={fillColor}
      fillRule="evenodd"
      closed={shouldClose}
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
