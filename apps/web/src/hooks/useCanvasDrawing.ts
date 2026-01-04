import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { ACTIONS } from "@/lib/konavaTypes";
import { Shape } from "@/lib/konavaTypes";
import { getRelativePointerPosition } from "@/utils/canvasUtils";

export const useCanvasDrawing = (
  shapes: Shape[],
  setShapes: (shapes: Shape[] | ((prev: Shape[]) => Shape[])) => void,
  setShapesWithHistory: (shapes: Shape[], options?: any) => void,
  strokeColor: string,
  activeTool: string,
  selectedIds: string[],
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void,
  removeShapeById: (id: string) => void,
  setPendingTextEdit: (
    edit: { id: string; pos: { x: number; y: number } } | null
  ) => void
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
      setSelectedIds([newId]);
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
        if (
          last.type === "line" ||
          last.type === "arrow" ||
          last.type === "eraser"
        ) {
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
      // Check if shapes actually changed
      const shapesChanged =
        shapes.length !== shapesBeforeDrawing.length ||
        JSON.stringify(shapes) !== JSON.stringify(shapesBeforeDrawing);

      setShapesWithHistory(shapes, {
        pushHistory: true,
        stateToPush: shapesBeforeDrawing,
      });

      if (lastCreatedId) {
        setSelectedIds([lastCreatedId]);
        setLastCreatedId(null);
      }

      // Only call save if shapes actually changed
      // Pass current shapes to avoid stale state
      if (shapesChanged) {
        handleSave(shapes);
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
