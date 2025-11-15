import React, { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Line, Transformer } from "react-konva";
import { ACTIONS, Shape, TOOL_CURSOR } from "@/lib/konavaTypes";
import { v4 as uuidv4 } from "uuid";
import {
  STAGE_MAX_SCALE,
  STAGE_MIN_SCALE,
  STAGE_DEFAULT_SCALE,
} from "@/lib/constants";
import { useTheme } from "next-themes";

type ShapeType = Shape["type"];

function KonvaCanvas({
  activeTool,
  canvasRef,
  handleActiveTool,
}: {
  activeTool: any;
  canvasRef: any;
  handleActiveTool: any;
}) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDraggingStage, setIsDraggingStage] = useState(false);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  const trRef = useRef<any>(null);
  const { theme } = useTheme();

  const cursor = TOOL_CURSOR[activeTool] ?? TOOL_CURSOR.default;
  const strokeColor = theme === "dark" ? "#fff" : "#111";
  // clamp helper
  const clamp = (v: any, a: any, b: any) => Math.max(a, Math.min(b, v));

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
      const newId = uuidv4();
      setIsDrawing(true);
      setLastCreatedId(newId);
      setShapes([
        ...shapes,
        {
          id: newId,
          type: "pencil",
          points: [pos.x, pos.y],
          stroke: strokeColor,
          strokeWidth: 2,
        },
      ]);
    } else if (activeTool === ACTIONS.RECTANGLE) {
      const newId = uuidv4();
      setIsDrawing(true);
      setLastCreatedId(newId);
      setShapes([
        ...shapes,
        {
          id: newId,
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
      const newId = uuidv4();
      setIsDrawing(true);
      setLastCreatedId(newId);
      setShapes([
        ...shapes,
        {
          id: newId,
          type: "circle",
          x: pos.x,
          y: pos.y,
          r: 0,
          stroke: strokeColor,
          strokeWidth: 2,
        },
      ]);
    } else if (activeTool === ACTIONS.ARROW) {
      const newId = uuidv4();
      setIsDrawing(true);
      setLastCreatedId(newId);
    } else if (activeTool === ACTIONS.LINE) {
      const newId = uuidv4();
      setIsDrawing(true);
      setLastCreatedId(newId);
      setShapes([
        ...shapes,
        {
          id: newId,
          type: "line",
          points: [pos.x, pos.y],
          stroke: strokeColor,
          strokeWidth: 2,
        },
      ]);
    } else if (activeTool === ACTIONS.TEXT) {
      const newId = uuidv4();
      setIsDrawing(true);
      setLastCreatedId(newId);
      setShapes([
        ...shapes,
        {
          id: newId,
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
      const newId = uuidv4();
      setIsDrawing(true);
      setLastCreatedId(newId);
      setShapes([
        ...shapes,
        {
          id: newId,
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
    if (lastCreatedId) setSelectedId(lastCreatedId);
    setLastCreatedId(null);
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
    console.log("shape drag started");
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
    console.log("Shape drag ended");
  };

  // zoom around pointer: stage = Konva.Stage instance, pointer = container coords
  const zoomStage = (stage: any, pointer: any, scaleBy: any) => {
    const oldScale = stage.scaleX();
    const newScale = clamp(
      oldScale * scaleBy,
      STAGE_MIN_SCALE,
      STAGE_MAX_SCALE
    );

    // mouse position relative to the stage container (pixels)
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // set new scale
    stage.scale({ x: newScale, y: newScale });

    // adjust stage position so the pointer remains pointing to same stage point
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    stage.batchDraw();
  };

  const handleWheel = (e: any) => {
    const evt = e.evt;

    // IMPORTANT: Only treat wheel as pinch when ctrlKey is true (common for touchpad pinch)
    // This prevents two-finger horizontal/vertical scrolling from zooming.
    if (!evt.ctrlKey) {
      // allow page or stage scroll/pan to continue
      return;
    }

    evt.preventDefault(); // when pinch detected, prevent page zoom/scroll

    const stage = canvasRef.current;
    // pointer position in container coords (fallback to client coords)
    const pointer = stage.getPointerPosition() || {
      x: evt.clientX,
      y: evt.clientY,
    };

    if (!pointer) return;
    // how fast to zoom
    const zoomIntensity = 1.05;
    const scaleBy = e.evt.deltaY > 0 ? 1 / zoomIntensity : zoomIntensity;

    zoomStage(stage, pointer, scaleBy);
  };

  const pinchRef = useRef({ lastDist: 0 });

  const getDistance = (p1: any, p2: any) => {
    const dx = p1.clientX - p2.clientX;
    const dy = p1.clientY - p2.clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: any) => {
    if (e.evt.touches && e.evt.touches.length === 2) {
      pinchRef.current.lastDist = getDistance(
        e.evt.touches[0],
        e.evt.touches[1]
      );
    }
  };

  const handleTouchMove = (e: any) => {
    if (!e.evt.touches || e.evt.touches.length !== 2) return;
    const dist = getDistance(e.evt.touches[0], e.evt.touches[1]);
    const stage = canvasRef.current;
    if (!stage) return;
    if (!pinchRef.current.lastDist) {
      pinchRef.current.lastDist = dist;
      return;
    }
    const scaleBy = dist / pinchRef.current.lastDist;
    // compute center point between two touches for zoom center
    const touchCenter = {
      x: (e.evt.touches[0].clientX + e.evt.touches[1].clientX) / 2,
      y: (e.evt.touches[0].clientY + e.evt.touches[1].clientY) / 2,
    };
    // Convert screen coords to stage container coords: if stage is in top-left (0,0) this is fine.
    // If your stage container isn't at (0,0) you may want to transform touchCenter by container offset.
    // But using stage.getPointerPosition() isn't possible here; we use client coords as pointer.
    zoomStage(stage, touchCenter, scaleBy);
    pinchRef.current.lastDist = dist;
  };

  const handleTouchEnd = () => {
    pinchRef.current.lastDist = 0;
  };

  return (
    <div>
      {/* canvas */}
      <Stage
        ref={canvasRef}
        onWheel={handleWheel}
        width={dimensions.width}
        height={dimensions.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
