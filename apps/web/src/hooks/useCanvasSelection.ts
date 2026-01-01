import { useState, useCallback, useEffect, useRef } from "react";
import { ACTIONS, TOOL_CURSOR } from "@/lib/konavaTypes";
import { isShapeInSelectionBox } from "@/utils/canvasUtils";
import { Shape } from "@/lib/konavaTypes";

type SelectionBox = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export const useCanvasSelection = (
  canvasRef: any,
  shapes: Shape[],
  activeTool: string,
  cursor: string
) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [finalSelectionBox, setFinalSelectionBox] =
    useState<SelectionBox | null>(null);
  const trRef = useRef<any>(null);

  // transformer selection - supports multiple nodes
  const bindTransformer = useCallback((nodes: any[]) => {
    if (trRef.current && nodes.length > 0) {
      trRef.current.nodes(nodes);
      trRef.current.getLayer().batchDraw();
    }
  }, []);

  // Bind transformer to selected nodes
  useEffect(() => {
    if (selectedIds.length === 0 || !trRef.current) return;

    const stage = canvasRef?.current;
    if (!stage) return;

    const nodes = selectedIds
      .map((id) => stage.findOne(`#${id}`))
      .filter((node) => node !== undefined);

    if (nodes.length > 0) {
      bindTransformer(nodes);
    }
  }, [selectedIds, shapes, bindTransformer, canvasRef]);

  const handleShapeClick = (e: any, shapeId: string) => {
    if (e.evt.shiftKey) {
      setSelectedIds((prev) =>
        prev.includes(shapeId)
          ? prev.filter((id) => id !== shapeId)
          : [...prev, shapeId]
      );
    } else {
      setSelectedIds([shapeId]);
    }
  };

  const startMarqueeSelection = (pos: { x: number; y: number }) => {
    setSelectionBox({
      startX: pos.x,
      startY: pos.y,
      endX: pos.x,
      endY: pos.y,
    });
    setSelectedIds([]);
    setFinalSelectionBox(null);
  };

  const updateMarqueeSelection = (pos: { x: number; y: number }) => {
    if (selectionBox) {
      setSelectionBox({
        ...selectionBox,
        endX: pos.x,
        endY: pos.y,
      });
    }
  };

  const finishMarqueeSelection = () => {
    if (!selectionBox) return;

    const selectedShapeIds = shapes
      .filter((shape) => isShapeInSelectionBox(shape, selectionBox))
      .map((shape) => shape.id);
    setSelectedIds(selectedShapeIds);
    // Save final selection box for button positioning
    setFinalSelectionBox(selectionBox);
    setSelectionBox(null);
  };

  // Calculate button position (right side of selection box)
  const getButtonPosition = () => {
    // Use finalSelectionBox if available (after selection complete),
    // otherwise use selectionBox (during selection)
    const box = finalSelectionBox || selectionBox;
    if (!box) return null;

    const stage = canvasRef?.current;
    if (!stage) return null;

    // Get selection box coordinates
    const boxX = Math.min(box.startX, box.endX);
    const boxY = Math.min(box.startY, box.endY);
    const boxWidth = Math.abs(box.endX - box.startX);
    const boxHeight = Math.abs(box.endY - box.startY);

    // Convert stage coordinates to screen coordinates
    const stagePos = stage.position();
    const stageScale = stage.scaleX();

    // Right side of box + some padding
    const rightX = boxX + boxWidth + 10; // 10px padding
    const centerY = boxY + boxHeight / 2; // Center vertically

    // Convert to screen coordinates
    const screenX = rightX * stageScale + stagePos.x;
    const screenY = centerY * stageScale + stagePos.y;

    return { x: screenX, y: screenY };
  };

  const getSelectedShapes = () => {
    return shapes.filter((shape) => selectedIds.includes(shape.id));
  };

  return {
    selectedIds,
    setSelectedIds,
    selectionBox,
    finalSelectionBox,
    trRef,
    handleShapeClick,
    startMarqueeSelection,
    updateMarqueeSelection,
    finishMarqueeSelection,
    getButtonPosition,
    getSelectedShapes,
  };
};
