import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ACTIONS } from "@/lib/konavaTypes";
import { Shape } from "@/lib/konavaTypes";

// Helper to check if a shape has meaningful dimensions (is visible)
const isShapeValid = (shape: Shape): boolean => {
  if (shape.type === "rect") {
    return Math.abs(shape.w || 0) > 5 && Math.abs(shape.h || 0) > 5;
  }
  if (shape.type === "frame") {
    return Math.abs(shape.w || 0) > 5 && Math.abs(shape.h || 0) > 5;
  }
  if (shape.type === "circle") {
    return (shape.r || 0) > 5;
  }
  if (shape.type === "line" || shape.type === "pencil") {
    const points = shape.points || [];
    return points.length >= 4; // At least 2 points (4 values: x1,y1,x2,y2)
  }
  if (shape.type === "text") {
    // Text is valid only if it has content (non-empty text)
    return Boolean(shape.text && shape.text.trim().length > 0);
  }
  return true; // Other types (image, etc.) are always valid
};

export const useCanvasDrawing = (
  shapes: Shape[],
  setShapes: (shapes: Shape[] | ((prev: Shape[]) => Shape[])) => void,
  setShapesWithHistory: (shapes: Shape[], options?: any) => void,
  strokeColor: string,
  activeTool: string,
  selectedIds: string[],
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void,
  removeShapeById: (id: string) => void,
  setPendingTextEdit: (edit: { id: string; pos: { x: number; y: number } } | null) => void
) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [shapesBeforeDrawing, setShapesBeforeDrawing] = useState<Shape[]>([]);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  const startDrawing = (pos: { x: number; y: number }, stage: any) => {
    if (activeTool === ACTIONS.PENCIL) {
      const newId = uuidv4();
      setShapesBeforeDrawing([...shapes]);
      setIsDrawing(true);
      setLastCreatedId(newId);
      const pencilShape: Shape = {
        id: newId,
        type: "pencil",
        points: [pos.x, pos.y],
        stroke: strokeColor,
        strokeWidth: 2,
        // Perfect-freehand options for ink-like strokes
        size: 8,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: true,
      };
      setShapes([...shapes, pencilShape]);
      setShapesWithHistory([...shapes, pencilShape], { pushHistory: false });
    } else if (activeTool === ACTIONS.RECTANGLE) {
      const newId = uuidv4();
      setShapesBeforeDrawing([...shapes]);
      setIsDrawing(true);
      setLastCreatedId(newId);
      const rectangleShape: Shape = {
        id: newId,
        type: "rect",
        x: pos.x,
        y: pos.y,
        w: 0,
        h: 0,
        stroke: strokeColor,
        strokeWidth: 2,
      };
      setShapes([...shapes, rectangleShape]);
      setShapesWithHistory([...shapes, rectangleShape], { pushHistory: false });
    } else if (activeTool === ACTIONS.CIRCLE) {
      const newId = uuidv4();
      setShapesBeforeDrawing([...shapes]);
      setIsDrawing(true);
      setLastCreatedId(newId);
      const circleShape: Shape = {
        id: newId,
        type: "circle",
        x: pos.x,
        y: pos.y,
        r: 0,
        stroke: strokeColor,
        strokeWidth: 2,
      };
      setShapes([...shapes, circleShape]);
      setShapesWithHistory([...shapes, circleShape], { pushHistory: false });
    } else if (activeTool === ACTIONS.LINE) {
      const newId = uuidv4();
      setShapesBeforeDrawing([...shapes]);
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
      setShapesBeforeDrawing([...shapes]);
      setIsDrawing(true);
      setLastCreatedId(newId);
      const newShape: Shape = {
        id: newId,
        type: "text",
        text: "",
        x: pos.x,
        y: pos.y,
        fontSize: 18,
        fontFamily: "Arial",
        fill: strokeColor,
      };
      const updatedShapes = [...shapes, newShape];
      setShapes(updatedShapes);
      setShapesWithHistory(updatedShapes, { pushHistory: false });
      // Don't select text immediately - let text editor handle it after content is added
      setPendingTextEdit({ id: newId, pos });
    } else if (activeTool === ACTIONS.IMAGE) {
      const newId = uuidv4();
      setShapesBeforeDrawing([...shapes]);
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
      setShapesBeforeDrawing([...shapes]);
      setIsDrawing(true);
      const hit = stage.getIntersection(pos);
      if (hit && hit.id()) {
        removeShapeById(hit.id());
      }
    } else if (activeTool === ACTIONS.FRAME) {
      const newId = uuidv4();
      setShapesBeforeDrawing([...shapes]);
      setIsDrawing(true);
      setLastCreatedId(newId);
      const frameShape: Shape = {
        id: newId,
        type: "frame",
        x: pos.x,
        y: pos.y,
        w: 0,
        h: 0,
        fill: "#1e3a5f40",
        stroke: "#3b82f6",
        strokeWidth: 2,
        name: "",
      };
      setShapes([...shapes, frameShape]);
      setShapesWithHistory([...shapes, frameShape], { pushHistory: false });
    }
  };

  const updateDrawing = (pos: { x: number; y: number }, stage: any) => {
    if (activeTool === ACTIONS.ERASER && isDrawing) {
      // hit-test shapes under the pointer and remove them
      const hit = stage.getIntersection(pos);
      if (hit && hit.id()) {
        const hitId = hit.id();
        // Use functional updates to ensure we're working with the latest state
        // Only update local shapes state during erasing
        setShapes((arr) => {
          if (arr.some((s) => s.id === hitId)) {
            return arr.filter((s) => s.id !== hitId);
          }
          return arr;
        });
      }
      return;
    }

    setShapes((arr) => {
      const last = arr[arr.length - 1];
      if (!last) return arr;

      if (last.type === "pencil") {
        const newPoints = last.points.concat([pos.x, pos.y]);
        return [...arr.slice(0, -1), { ...last, points: newPoints }];
      }
      if (last.type === "rect") {
        return [...arr.slice(0, -1), { ...last, w: pos.x - last.x, h: pos.y - last.y }];
      }
      if (last.type === "frame") {
        return [...arr.slice(0, -1), { ...last, w: pos.x - last.x, h: pos.y - last.y }];
      }
      if (last.type === "circle") {
        const dx = pos.x - last.x;
        const dy = pos.y - last.y;
        const r = Math.hypot(dx, dy);
        return [...arr.slice(0, -1), { ...last, r }];
      }
      if (last.type === "line" || last.type === "arrow") {
        // For line/arrow, update to draw from start point to current point
        const startX = last.points[0];
        const startY = last.points[1];
        return [...arr.slice(0, -1), { ...last, points: [startX, startY, pos.x, pos.y] }];
      }
      return arr;
    });

    // Update current shapes *without* pushing a history snapshot (live update)
    setShapesWithHistory(
      ((prev) => {
        const arr = prev;
        const last = arr[arr.length - 1];
        if (!last) return arr;

        if (last.type === "pencil") {
          const newPoints = (last.points || []).concat([pos.x, pos.y]);
          return [...arr.slice(0, -1), { ...last, points: newPoints }];
        }
        if (last.type === "rect") {
          return [...arr.slice(0, -1), { ...last, w: pos.x - last.x, h: pos.y - last.y }];
        }
        if (last.type === "frame") {
          return [...arr.slice(0, -1), { ...last, w: pos.x - last.x, h: pos.y - last.y }];
        }
        if (last.type === "circle") {
          const dx = pos.x - last.x;
          const dy = pos.y - last.y;
          const r = Math.hypot(dx, dy);
          return [...arr.slice(0, -1), { ...last, r }];
        }
        if (last.type === "line" || last.type === "arrow") {
          // For line/arrow, update to draw from start point to current point (straight line)
          const startX = last.points[0];
          const startY = last.points[1];
          return [...arr.slice(0, -1), { ...last, points: [startX, startY, pos.x, pos.y] }];
        }
        if (last.type === "eraser") {
          const newPoints = (last.points || []).concat([pos.x, pos.y]);
          return [...arr.slice(0, -1), { ...last, points: newPoints }];
        }
        return arr;
      })(shapes),
      { pushHistory: false }
    );
  };

  const finishDrawing = (handleSave: (shapes?: Shape[]) => void) => {
    if (isDrawing) {
      if (lastCreatedId) {
        const createdShape = shapes.find((s) => s.id === lastCreatedId);

        if (createdShape && isShapeValid(createdShape)) {
          // Shape is valid - select it and push to history
          const shapesChanged =
            shapes.length !== shapesBeforeDrawing.length ||
            JSON.stringify(shapes) !== JSON.stringify(shapesBeforeDrawing);

          setShapesWithHistory(shapes, {
            pushHistory: true,
            stateToPush: shapesBeforeDrawing,
          });

          setSelectedIds([lastCreatedId]);

          // Only call save if shapes actually changed
          if (shapesChanged) {
            handleSave(shapes);
          }
        } else if (createdShape && !isShapeValid(createdShape)) {
          // Shape is invalid (click without drag) - remove it
          // Exception: text shapes are handled by text editor flow, don't remove here
          if (createdShape.type !== "text") {
            const filteredShapes = shapes.filter((s) => s.id !== lastCreatedId);
            setShapes(filteredShapes);
            setShapesWithHistory(filteredShapes, { pushHistory: false });
          }
        }

        setLastCreatedId(null);
      } else {
        // No lastCreatedId (e.g., eraser case handled elsewhere)
        const shapesChanged =
          shapes.length !== shapesBeforeDrawing.length ||
          JSON.stringify(shapes) !== JSON.stringify(shapesBeforeDrawing);

        setShapesWithHistory(shapes, {
          pushHistory: true,
          stateToPush: shapesBeforeDrawing,
        });

        if (shapesChanged) {
          handleSave(shapes);
        }
      }
    }

    setIsDrawing(false);
  };

  return {
    isDrawing,
    setIsDrawing,
    shapesBeforeDrawing,
    lastCreatedId,
    startDrawing,
    updateDrawing,
    finishDrawing,
  };
};
