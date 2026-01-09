import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Transformer } from "react-konva";
import { ACTIONS, Shape, TOOL_CURSOR } from "@/lib/konavaTypes";
import { getRelativePointerPosition } from "@/utils/canvasUtils";
import { useCanvasZoom } from "@/hooks/useCanvasZoom";
import { useCanvasSelection } from "@/hooks/useCanvasSelection";
import { useCanvasDrawing } from "@/hooks/useCanvasDrawing";
import { useTextEditor } from "@/hooks/useTextEditor";
import { useCanvasExport } from "@/hooks/useCanvasExport";
import { ShapeRenderer } from "./ShapeRenderer";
import { ZoomControls } from "./ZoomControls";
import { SelectionButtons } from "./SelectionButtons";

function KonvaCanvas({
  activeTool,
  canvasRef,
  setShapesWithHistory,
  strokeColor,
  shapes: externalShapes,
  handleSave,
}: {
  activeTool: any;
  canvasRef: any;
  setShapesWithHistory: any;
  strokeColor: string;
  shapes: Shape[];
  handleSave: any;
}) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [shapes, setShapes] = useState<Shape[]>(externalShapes);
  const [isDraggingStage, setIsDraggingStage] = useState(false);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const [isEraserFinalizing, setIsEraserFinalizing] = useState(false);

  const cursor = TOOL_CURSOR[activeTool] ?? TOOL_CURSOR.default;

  // Initialize dimensions
  useEffect(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  // Zoom functionality
  const {
    scale,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    zoomIn,
    zoomOut,
  } = useCanvasZoom(canvasRef, dimensions);

  // Selection functionality
  const {
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
  } = useCanvasSelection(canvasRef, shapes, activeTool, cursor);

  // Text editor functionality
  const { pendingTextEdit, setPendingTextEdit, openTextEditor } = useTextEditor(
    canvasRef,
    shapes,
    setShapes,
    setShapesWithHistory,
    handleSave
  );

  // Drawing functionality
  const removeShapeById = (id: string) => {
    setShapesWithHistory(
      shapes.filter((s) => s.id !== id),
      { pushHistory: true }
    );
  };

  const {
    isDrawing,
    setIsDrawing,
    shapesBeforeDrawing,
    startDrawing,
    updateDrawing,
    finishDrawing,
  } = useCanvasDrawing(
    shapes,
    setShapes,
    setShapesWithHistory,
    strokeColor,
    activeTool,
    selectedIds,
    setSelectedIds,
    removeShapeById,
    setPendingTextEdit
  );

  // Sync local shapes state with external shapes (from history)
  // Only sync when NOT drawing and NOT finalizing eraser to avoid interrupting active operations
  useEffect(() => {
    if (!isDrawing && !isEraserFinalizing) {
      setShapes(externalShapes);
    }
  }, [externalShapes, isDrawing, isEraserFinalizing]);

  // Open text editor when pending text edit is set
  useEffect(() => {
    if (pendingTextEdit) {
      const shape = shapes.find((s) => s.id === pendingTextEdit.id);
      if (shape) {
        openTextEditor(pendingTextEdit.id, pendingTextEdit.pos);
        setPendingTextEdit(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTextEdit, shapes]);

  // Export functionality
  const { exportSelectedShapesJSON, exportSelectedShapesImage } =
    useCanvasExport(getSelectedShapes);

  // Helper function to edit cursor
  const setStageCursor = (c: string) => {
    const stage = canvasRef?.current;
    if (!stage) return;
    const container = stage.container();
    container.style.cursor = c;
  };

  // Keep updating the cursor
  useEffect(() => {
    setStageCursor(cursor);
    return () => {
      const stage = canvasRef?.current;
      if (stage) stage.container().style.cursor = "";
    };
  }, [cursor, canvasRef]);

  const handlePointerDown = (e: any) => {
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);
    if (!pos) return;

    // If user clicked on the stage background (not on a shape)
    const clickedOnEmpty = e.target === stage;

    if (activeTool === ACTIONS.SELECT && clickedOnEmpty) {
      setIsDraggingStage(true);
      setStageCursor("grabbing");
      stage.draggable(true);
    } else if (activeTool === ACTIONS.MARQUEE_SELECT && clickedOnEmpty) {
      startMarqueeSelection(pos);
    } else if (
      activeTool === ACTIONS.PENCIL ||
      activeTool === ACTIONS.RECTANGLE ||
      activeTool === ACTIONS.CIRCLE ||
      activeTool === ACTIONS.LINE ||
      activeTool === ACTIONS.TEXT ||
      activeTool === ACTIONS.IMAGE ||
      activeTool === ACTIONS.ERASER
    ) {
      startDrawing(pos, stage);
    }
  };

  const handlePointerMove = (e: any) => {
    // if stage is dragging we don't want to draw; let Konva move the stage
    if (isDraggingStage) return;

    if (!isDrawing) {
      // Handle marquee selection box update
      if (activeTool === ACTIONS.MARQUEE_SELECT && selectionBox) {
        const stage = e.target.getStage();
        const pos = getRelativePointerPosition(stage);
        if (pos) {
          updateMarqueeSelection(pos);
        }
      }
      return;
    }

    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);
    if (!pos) return;

    // Handle marquee selection box
    if (activeTool === ACTIONS.MARQUEE_SELECT && selectionBox) {
      updateMarqueeSelection(pos);
      return;
    }

    updateDrawing(pos, stage);
  };

  const handlePointerUp = (e: any) => {
    const stage = e.target.getStage();
    if (isDraggingStage) {
      setIsDraggingStage(false);
      stage.draggable(false);
      if (activeTool === ACTIONS.SELECT) setStageCursor("grab");
      else setStageCursor(cursor);
    }

    // Handle marquee selection completion
    if (activeTool === ACTIONS.MARQUEE_SELECT && selectionBox) {
      finishMarqueeSelection();
      return;
    }

    if (activeTool === ACTIONS.ERASER) {
      // Capture the current erased shapes BEFORE any state changes
      const erasedShapes = [...shapes];
      const beforeDrawing = [...shapesBeforeDrawing];

      // Check if shapes actually changed (something was erased)
      const shapesChanged =
        erasedShapes.length !== beforeDrawing.length ||
        JSON.stringify(erasedShapes) !== JSON.stringify(beforeDrawing);

      // Set flags to prevent sync from restoring old shapes
      setIsEraserFinalizing(true);
      setIsDrawing(false);

      // Use queueMicrotask to defer the history update to after the current render
      // This avoids the "Cannot update component while rendering" error
      queueMicrotask(() => {
        setShapesWithHistory(erasedShapes, {
          pushHistory: true,
          stateToPush: beforeDrawing,
        });

        // Only call save if shapes actually changed
        // Pass erasedShapes directly to avoid using stale state
        if (shapesChanged) {
          handleSave(erasedShapes);
        }

        // Reset the flag after history is updated
        setIsEraserFinalizing(false);
      });
      return;
    }

    finishDrawing(handleSave);
  };

  // Move/resize handlers for Rect/Circle
  const onDragMove = (id: string, x: number, y: number) => {
    setShapes((arr) => {
      const shape = arr.find((s) => s.id === id);
      if (!shape) return arr;

      // Only shapes with x and y properties can be dragged
      if (!("x" in shape) || !("y" in shape)) return arr;

      const shapeX = (shape as any).x;
      const shapeY = (shape as any).y;

      // Calculate the offset if this is part of a multi-select drag
      const dx = x - shapeX;
      const dy = y - shapeY;

      let updated;
      // If multiple shapes are selected, move all of them
      if (selectedIds.length > 1 && selectedIds.includes(id)) {
        updated = arr.map((s) => {
          if (selectedIds.includes(s.id) && "x" in s && "y" in s) {
            // For the dragged shape, use the new position directly
            if (s.id === id) {
              return { ...s, x, y };
            }
            // For other selected shapes, apply the offset
            return { ...s, x: (s as any).x + dx, y: (s as any).y + dy };
          }
          return s;
        });
      } else {
        // Single shape drag
        updated = arr.map((s) => (s.id === id ? { ...s, x, y } : s));
      }

      setShapesWithHistory(updated, { pushHistory: true });
      return updated;
    });
  };

  const onRectTransform = (node: any, id: string) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    setShapes((arr) => {
      const updated = arr.map((s) =>
        s.id === id
          ? {
              ...s,
              x: node.x(),
              y: node.y(),
              w: Math.max(5, (s as any).w! * scaleX),
              h: Math.max(5, (s as any).h! * scaleY),
            }
          : s
      );
      setShapesWithHistory(updated, { pushHistory: true });
      return updated;
    });
    // Trigger save after transform (shapes were modified)
    handleSave();
  };

  const onEllipseTransform = (node: any, id: string) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    setShapes((arr) => {
      const updated = arr.map((s) =>
        s.id === id
          ? {
              ...s,
              x: node.x(),
              y: node.y(),
              radiusX: Math.max(5, (s as any).radiusX! * scaleX),
              radiusY: Math.max(5, (s as any).radiusY! * scaleY),
            }
          : s
      );
      setShapesWithHistory(updated, { pushHistory: true });
      return updated;
    });
    // Trigger save after transform (shapes were modified)
    handleSave();
  };

  const onImageTransform = (node: any, id: string) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    setShapes((arr) => {
      const updated = arr.map((s) =>
        s.id === id
          ? {
              ...s,
              x: node.x(),
              y: node.y(),
              width: Math.max(5, (s as any).width! * scaleX),
              height: Math.max(5, (s as any).height! * scaleY),
            }
          : s
      );
      setShapesWithHistory(updated, { pushHistory: true });
      return updated;
    });
    // Trigger save after transform (shapes were modified)
    handleSave();
  };

  // Shape drag handler
  const onShapeDragStart = (e: any, id: string) => {
    setIsDraggingShape(true);
    setStageCursor("grabbing");
    if (!selectedIds.includes(id)) {
      setSelectedIds([id]);
    }
  };

  // Shape drag end
  const onShapeDragEnd = (e: any, id: string) => {
    setIsDraggingShape(false);
    // update shape position
    const node = e.target;
    onDragMove(id, node.x(), node.y());
    // restore stage cursor to grab if SELECT tool and not panning
    if (
      (activeTool === ACTIONS.SELECT ||
        activeTool === ACTIONS.MARQUEE_SELECT) &&
      !isDraggingStage
    )
      setStageCursor("grab");
    else setStageCursor(cursor);

    // Trigger save after drag ends (shapes were modified)
    handleSave();
  };

  // AI button handler
  const handleAIClick = () => {
    const selectedShapes = getSelectedShapes();
    console.log("AI button clicked with shapes:", selectedShapes);
    // Add your AI logic here
  };

  return (
    <div className="relative">
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
          {shapes.map((s) => (
            <ShapeRenderer
              key={s.id}
              shape={s}
              strokeColor={strokeColor}
              activeTool={activeTool}
              isDraggingShape={isDraggingShape}
              isDraggingStage={isDraggingStage}
              cursor={cursor}
              onShapeClick={handleShapeClick}
              onShapeDragStart={onShapeDragStart}
              onShapeDragEnd={onShapeDragEnd}
              onDragMove={onDragMove}
              onRectTransform={onRectTransform}
              onEllipseTransform={onEllipseTransform}
              onImageTransform={onImageTransform}
              onTextDoubleClick={(id, pos) => openTextEditor(id, pos)}
              setStageCursor={setStageCursor}
              setIsDraggingStage={setIsDraggingStage}
            />
          ))}

          {/* Selection box for marquee selection */}
          {selectionBox && (
            <Rect
              x={Math.min(selectionBox.startX, selectionBox.endX)}
              y={Math.min(selectionBox.startY, selectionBox.endY)}
              width={Math.abs(selectionBox.endX - selectionBox.startX)}
              height={Math.abs(selectionBox.endY - selectionBox.startY)}
              fill="rgba(100, 150, 255, 0.1)"
              stroke="rgba(100, 150, 255, 0.5)"
              strokeWidth={1}
              dash={[5, 5]}
              listening={false}
            />
          )}

          {/* show transformer for selected shapes */}
          {selectedIds.length > 0 && (
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

      {/* Selection buttons overlay */}
      {selectedIds.length > 0 &&
        activeTool === ACTIONS.MARQUEE_SELECT &&
        getButtonPosition() && (
          <SelectionButtons
            buttonPosition={getButtonPosition()}
            onAIClick={handleAIClick}
            onExportImage={exportSelectedShapesImage}
            onExportJSON={exportSelectedShapesJSON}
          />
        )}

      {/* Zoom controls */}
      <ZoomControls scale={scale} zoomIn={zoomIn} zoomOut={zoomOut} />
    </div>
  );
}

export default KonvaCanvas;
