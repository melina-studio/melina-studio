import React, { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Line, Transformer } from "react-konva";
import { ACTIONS } from "@/lib/konavaTypes";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "next-themes";

type Shape =
  | {
      id: string;
      type: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
    }
  | {
      id: string;
      type: "circle";
      x: number;
      y: number;
      r: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      cornerRadius?: number;
    }
  | {
      id: string;
      type: "pencil";
      points: number[];
      stroke?: string;
      strokeWidth?: number;
      tension?: number;
    }
  | {
      id: string;
      type: "arrow";
      points: number[];
      stroke?: string;
      strokeWidth?: number;
    }
  | {
      id: string;
      type: "line";
      points: number[];
      stroke?: string;
      strokeWidth?: number;
    }
  | {
      id: string;
      type: "text";
      text: string;
      x: number;
      y: number;
      fontSize?: number;
      fontFamily?: string;
      fill?: string;
    }
  | {
      id: string;
      type: "image";
      src: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
    }
  | {
      id: string;
      type: "eraser";
      points: number[];
      stroke?: string;
      strokeWidth?: number;
    };

type ShapeType = Shape["type"];

function KonvaCanvas({
  activeTool,
  canvasRef,
}: {
  activeTool: any;
  canvasRef: any;
}) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDraggingStage, setIsDraggingStage] = useState(false);
  const [isDraggingShape, setIsDraggingShape] = useState(false);

  const trRef = useRef<any>(null);
  const { theme } = useTheme();

  const TOOL_CURSOR = {
    [ACTIONS.PENCIL]: "crosshair",
    [ACTIONS.SELECT]: "grab", // use 'grab' (or 'grabbing' while dragging)
    [ACTIONS.CIRCLE]: "crosshair", // there's no 'circle' cursor — use crosshair or custom
    [ACTIONS.RECTANGLE]: "crosshair",
    [ACTIONS.ARROW]: "pointer", // clickable/select
    [ACTIONS.LINE]: "crosshair",
    [ACTIONS.ERASER]: "url(/cursors/eraser.png), auto", // custom image, fallback `auto`
    default: "default",
  };

  const cursor = TOOL_CURSOR[activeTool] ?? TOOL_CURSOR.default;
  const strokeColor = theme === "dark" ? "#fff" : "#111";

  useEffect(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  // transformer selection
  const bindTransformer = useCallback((node: any) => {
    if (trRef.current && node) {
      trRef.current.nodes([node]);
      trRef.current.getLayer().batchDraw();
    }
  }, []);

  // Convert the pointer to stage-local coords (works with stage translate/scale)
  const getRelativePointerPosition = (stage: any) => {
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    // copy the absolute transform, invert it, and apply to point
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point(pos);
  };

  const handlePointerDown = (e: any) => {
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);
    if (!pos) return;

    // If user clicked on the stage background (not on a shape)
    const clickedOnEmpty = e.target === stage;

    if (activeTool == ACTIONS.SELECT && clickedOnEmpty) {
      setIsDraggingStage(true);
      setStageCursor("grabbing");
      stage.draggable(true);
    } else if (activeTool === ACTIONS.PENCIL) {
      setIsDrawing(true);
      setShapes([
        ...shapes,
        {
          id: uuidv4(),
          type: "pencil",
          points: [pos.x, pos.y],
          stroke: strokeColor,
          strokeWidth: 2,
        },
      ]);
    } else if (activeTool === ACTIONS.RECTANGLE) {
      setIsDrawing(true);
      setShapes([
        ...shapes,
        {
          id: uuidv4(),
          type: "rect",
          x: pos.x,
          y: pos.y,
          w: 0,
          h: 0,
          stroke: strokeColor,
          strokeWidth: 2,
        },
      ]);
    } else if (activeTool === ACTIONS.CIRCLE) {
      setIsDrawing(true);
      setShapes([
        ...shapes,
        {
          id: uuidv4(),
          type: "circle",
          x: pos.x,
          y: pos.y,
          r: 0,
          stroke: strokeColor,
          strokeWidth: 2,
        },
      ]);
    } else if (activeTool === ACTIONS.ARROW) {
      setIsDrawing(true);
    } else if (activeTool === ACTIONS.LINE) {
      setIsDrawing(true);
      setShapes([
        ...shapes,
        {
          id: uuidv4(),
          type: "line",
          points: [pos.x, pos.y],
          stroke: strokeColor,
          strokeWidth: 2,
        },
      ]);
    } else if (activeTool === ACTIONS.TEXT) {
      setIsDrawing(true);
      setShapes([
        ...shapes,
        {
          id: uuidv4(),
          type: "text",
          text: "Hello",
          x: pos.x,
          y: pos.y,
          fontSize: 16,
          fontFamily: "Arial",
          fill: strokeColor,
        },
      ]);
    } else if (activeTool === ACTIONS.IMAGE) {
      setIsDrawing(true);
      setShapes([
        ...shapes,
        {
          id: uuidv4(),
          type: "image",
          src: "https://via.placeholder.com/150",
          x: pos.x,
          y: pos.y,
          width: 150,
          height: 150,
        },
      ]);
    } else if (activeTool === ACTIONS.ERASER) {
      setIsDrawing(true);
      setShapes([
        ...shapes,
        {
          id: uuidv4(),
          type: "eraser",
          points: [pos.x, pos.y],
          stroke: strokeColor,
          strokeWidth: 2,
        },
      ]);
    }
  };

  const handlePointerMove = (e: any) => {
    // if stage is dragging we don't want to draw; let Konva move the stage
    if (isDraggingStage) return;

    if (!isDrawing) return;
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);
    if (!pos) return;

    setShapes((arr) => {
      const last = arr[arr.length - 1];
      if (!last) return arr;

      if (last.type === "pencil") {
        const newPoints = last.points.concat([pos.x, pos.y]);
        return [...arr.slice(0, -1), { ...last, points: newPoints }];
      }
      if (last.type === "rect") {
        return [
          ...arr.slice(0, -1),
          { ...last, w: pos.x - last.x, h: pos.y - last.y },
        ];
      }
      if (last.type === "circle") {
        const dx = pos.x - last.x;
        const dy = pos.y - last.y;
        const r = Math.hypot(dx, dy);
        return [...arr.slice(0, -1), { ...last, r }];
      }
      return arr;
    });
  };

  const handlePointerUp = (e: any) => {
    const stage = e.target.getStage();
    if (isDraggingStage) {
      setIsDraggingStage(false);
      stage.draggable(false);
      if (activeTool === ACTIONS.SELECT) setStageCursor("grab");
      else setStageCursor(cursor);
    }
    console.log("pointer up");
    setIsDrawing(false);
  };

  // move/resize handlers for Rect/Circle
  const onDragMove = (id: string, x: number, y: number) => {
    setShapes((arr) => arr.map((s) => (s.id === id ? { ...s, x, y } : s)));
  };

  const onRectTransform = (node: any, id: string) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    setShapes((arr) =>
      arr.map((s) =>
        s.id === id
          ? {
              ...s,
              x: node.x(),
              y: node.y(),
              w: Math.max(5, (s as any).w! * scaleX),
              h: Math.max(5, (s as any).h! * scaleY),
            }
          : s
      )
    );
  };

  // helper function to edit cursor
  const setStageCursor = (c: any) => {
    const stage = canvasRef?.current;
    if (!stage) return;
    const container = stage.container();
    container.style.cursor = c;
  };

  // keep updating the cursor
  useEffect(() => {
    setStageCursor(cursor);
    return () => {
      const stage = canvasRef?.current;
      if (stage) stage.container().style.cursor = "";
    };
  }, [cursor, canvasRef]);

  // shape drag handler
  const onShapeDragStart = (e: any, id: any) => {
    setIsDraggingShape(true);
    setStageCursor("grabbing");
    setSelectedId(id);
  };

  // shape drag eng
  const onShapeDragEnd = (e: any, id: any) => {
    setIsDraggingShape(false);
    // update shape position
    const node = e.target;
    onDragMove(id, node.x(), node.y());
    // restore stage cursor to grab if SELECT tool and not panning
    if (activeTool === ACTIONS.SELECT && !isDraggingStage)
      setStageCursor("grab");
    else setStageCursor(cursor);
  };

  return (
    <div>
      {/* canvas */}
      <Stage
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <Layer>
          {shapes.map((s) => {
            if (s.type === "rect")
              return (
                <Rect
                  key={s.id}
                  id={s.id}
                  x={s.x}
                  y={s.y}
                  width={s.w}
                  height={s.h}
                  fill={s.fill}
                  stroke={strokeColor}
                  cornerRadius={8}
                  draggable={activeTool === ACTIONS.SELECT}
                  onDragStart={(e) => onShapeDragStart(e, s.id)}
                  onDragEnd={(e) => onShapeDragEnd(e, s.id)}
                  // onClick={() => setSelectedId(s.id)}
                  onTransformEnd={(e) => onRectTransform(e.target, s.id)}
                  ref={selectedId === s.id ? bindTransformer : undefined}
                  onMouseEnter={() => {
                    // hover over shapes: pointer or grab
                    if (activeTool === ACTIONS.SELECT && !isDraggingShape) {
                      setStageCursor("grab");
                      setIsDraggingStage(false);
                    } else setStageCursor("pointer");
                  }}
                  onMouseLeave={() => {
                    if (!isDraggingShape && !isDraggingStage) {
                      setStageCursor(cursor);
                    }
                  }}
                />
              );
            if (s.type === "circle")
              return (
                <Circle
                  key={s.id}
                  id={s.id}
                  x={s.x}
                  y={s.y}
                  radius={s.r}
                  fill={s.fill}
                  stroke={strokeColor}
                  draggable={activeTool === ACTIONS.SELECT}
                  onDragStart={(e) => onShapeDragStart(e, s.id)}
                  onDragEnd={(e) => onShapeDragEnd(e, s.id)}
                  onClick={() => setSelectedId(s.id)}
                  ref={selectedId === s.id ? bindTransformer : undefined}
                  onMouseEnter={() => {
                    // hover over shapes: pointer or grab
                    if (activeTool === ACTIONS.SELECT && !isDraggingShape)
                      setStageCursor("grab");
                    else setStageCursor("pointer");
                  }}
                  onMouseLeave={() => {
                    if (!isDraggingShape && !isDraggingStage)
                      setStageCursor(cursor);
                  }}
                />
              );
            return (
              <Line
                key={s.id}
                id={s.id}
                points={(s as any).points}
                stroke={(s as any).stroke || strokeColor}
                strokeWidth={(s as any).strokeWidth || 2}
                tension={0}
                lineCap="round"
                lineJoin="round"
                draggable={activeTool === ACTIONS.SELECT}
                onDragStart={(e) => onShapeDragStart(e, s.id)}
                onDragEnd={(e) => onShapeDragEnd(e, s.id)}
                onClick={() => setSelectedId(s.id)}
                ref={selectedId === s.id ? bindTransformer : undefined}
                onMouseEnter={() => {
                  // hover over shapes: pointer or grab
                  if (activeTool === ACTIONS.SELECT && !isDraggingShape)
                    setStageCursor("grab");
                  else setStageCursor("pointer");
                }}
                onMouseLeave={() => {
                  if (!isDraggingShape && !isDraggingStage)
                    setStageCursor(cursor);
                }}
              />
            );
          })}

          {/* show transformer only for selected rect/circle */}
          {selectedId && (
            <Transformer
              ref={trRef}
              rotateEnabled={true}
              enabledAnchors={[
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right",
              ]}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}

export default KonvaCanvas;
