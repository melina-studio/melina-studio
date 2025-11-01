import React, { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Line, Transformer } from "react-konva";
import { ACTIONS } from "@/lib/konavaTypes";
import { v4 as uuidv4 } from "uuid";

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
  const trRef = useRef<any>(null);

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

  const handlePointerDown = (e: any) => {
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;

    if (activeTool === ACTIONS.PENCIL) {
      setIsDrawing(true);
      setShapes([
        ...shapes,
        {
          id: uuidv4(),
          type: "pencil",
          points: [pos.x, pos.y],
          stroke: "#111",
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
          stroke: "#111",
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
          fill: "black",
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
          stroke: "black",
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
          fill: "black",
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
          stroke: "black",
          strokeWidth: 2,
        },
      ]);
    }
  };

  const handlePointerMove = (e: any) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
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

  return (
    <div>
      {/* canvas */}
      <Stage
        ref={canvasRef}
        style={{
          cursor:
            activeTool === ACTIONS.PENCIL
              ? "crosshair"
              : activeTool === ACTIONS.SELECT
                ? "default"
                : activeTool === ACTIONS.CIRCLE
                  ? "circle"
                  : activeTool === ACTIONS.RECTANGLE
                    ? "rectangle"
                    : activeTool === ACTIONS.ARROW
                      ? "arrow"
                      : activeTool === ACTIONS.LINE
                        ? "line"
                        : activeTool === ACTIONS.ERASER
                          ? "eraser"
                          : "default",
        }}
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
                  stroke="#111"
                  cornerRadius={8}
                  draggable
                  onDragEnd={(e) =>
                    onDragMove(s.id, e.target.x(), e.target.y())
                  }
                  onClick={() => setSelectedId(s.id)}
                  onTransformEnd={(e) => onRectTransform(e.target, s.id)}
                  ref={selectedId === s.id ? bindTransformer : undefined}
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
                  stroke="#111"
                  draggable
                  onDragEnd={(e) =>
                    onDragMove(s.id, e.target.x(), e.target.y())
                  }
                  onClick={() => setSelectedId(s.id)}
                  ref={selectedId === s.id ? bindTransformer : undefined}
                />
              );
            return (
              <Line
                key={s.id}
                id={s.id}
                points={(s as any).points}
                stroke={(s as any).stroke || "#111"}
                strokeWidth={(s as any).strokeWidth || 2}
                tension={0}
                lineCap="round"
                lineJoin="round"
                onClick={() => setSelectedId(s.id)}
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
