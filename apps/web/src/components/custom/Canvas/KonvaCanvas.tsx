import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Transformer } from "react-konva";
import { ACTIONS, Shape, TOOL_CURSOR } from "@/lib/konavaTypes";
import { getRelativePointerPosition } from "@/utils/canvasUtils";
import { useCanvasZoom, NavigateOptions } from "@/hooks/useCanvasZoom";
import { useCanvasSelection } from "@/hooks/useCanvasSelection";
import { useCanvasDrawing } from "@/hooks/useCanvasDrawing";
import { useTextEditor } from "@/hooks/useTextEditor";
import { useCanvasExport } from "@/hooks/useCanvasExport";
import { ShapeRenderer } from "./ShapeRenderer";
import { getBendFromPoint } from "@/utils/arrowUtils";
import { ZoomControls } from "./ZoomControls";
import { SelectionButtons } from "./SelectionButtons";
import { addSelectionAction } from "@/store/useSelection";

function KonvaCanvas({
  activeTool,
  canvasRef,
  setShapesWithHistory,
  strokeColor,
  activeColor,
  shapes: externalShapes,
  handleSave,
  onCanvasTransform,
  onNavigateToRef,
  isDarkMode = false,
}: {
  activeTool: any;
  canvasRef: any;
  setShapesWithHistory: any;
  strokeColor: string;
  activeColor: string;
  shapes: Shape[];
  handleSave: any;
  onCanvasTransform?: (transform: { position: { x: number; y: number }; scale: number }) => void;
  onNavigateToRef?: (navigateTo: (options: NavigateOptions) => void) => void;
  isDarkMode?: boolean;
}) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [shapes, setShapes] = useState<Shape[]>(externalShapes);
  const [isDraggingStage, setIsDraggingStage] = useState(false);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const [isEraserFinalizing, setIsEraserFinalizing] = useState(false);

  // Ref to track if we're updating shapes locally (to skip external sync)
  const isLocalUpdateRef = useRef(false);


  const cursor = TOOL_CURSOR[activeTool] ?? TOOL_CURSOR.default;

  // Initialize dimensions
  useEffect(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  // Zoom functionality
  const {
    scale,
    position,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    zoomIn,
    zoomOut,
    handleStageDrag,
    navigateTo,
  } = useCanvasZoom(canvasRef, dimensions);

  // Expose navigateTo function to parent
  useEffect(() => {
    onNavigateToRef?.(navigateTo);
  }, [navigateTo, onNavigateToRef]);

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
  // Only sync when NOT drawing, NOT finalizing eraser, and NOT in local update to avoid interrupting active operations
  // EXCEPTION: Always sync when externalShapes is empty (clear board) - this should always take effect
  useEffect(() => {
    const shouldForceSync = externalShapes.length === 0;
    if (shouldForceSync || (!isDrawing && !isEraserFinalizing && !isLocalUpdateRef.current)) {
      setShapes(externalShapes);
      // Also clear selection when board is cleared
      if (shouldForceSync && selectedIds.length > 0) {
        setSelectedIds([]);
      }
    }
    // Reset the flag after checking
    isLocalUpdateRef.current = false;
  }, [externalShapes, isDrawing, isEraserFinalizing, selectedIds.length, setSelectedIds]);

  // Notify parent of canvas transform changes (for background parallax effect)
  // Using a ref to track previous values and avoid infinite loops
  const prevTransformRef = useRef({ position: { x: 0, y: 0 }, scale: 1 });

  useEffect(() => {
    const prev = prevTransformRef.current;
    // Only call if values actually changed
    if (prev.position.x !== position.x || prev.position.y !== position.y || prev.scale !== scale) {
      prevTransformRef.current = { position, scale };
      onCanvasTransform?.({ position, scale });
    }
  }, [position, scale, onCanvasTransform]);

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
  const { exportSelectedShapesJSON, exportSelectedShapesImage, captureSelectedShapesSnapshot } =
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

  // Delete selected shapes with Delete/Backspace key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we have selected shapes and user pressed delete keys
      if (
        selectedIds.length > 0 &&
        (e.key === "Delete" || e.key === "Backspace" || (e.metaKey && e.key === "Backspace"))
      ) {
        // Don't delete if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        e.preventDefault();

        // Mark local update to prevent sync issues
        isLocalUpdateRef.current = true;

        // Remove selected shapes
        const newShapes = shapes.filter((s) => !selectedIds.includes(s.id));
        setShapes(newShapes);
        setSelectedIds([]);

        // Push to history and save
        queueMicrotask(() => {
          setShapesWithHistory(newShapes, { pushHistory: true });
          handleSave(newShapes);
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, shapes, setShapesWithHistory, handleSave, setSelectedIds]);

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
      clickedOnEmpty &&
      (activeTool === ACTIONS.PENCIL ||
        activeTool === ACTIONS.RECTANGLE ||
        activeTool === ACTIONS.CIRCLE ||
        activeTool === ACTIONS.LINE ||
        activeTool === ACTIONS.ARROW ||
        activeTool === ACTIONS.TEXT ||
        activeTool === ACTIONS.IMAGE ||
        activeTool === ACTIONS.FRAME)
    ) {
      // Only start drawing on empty canvas
      startDrawing(pos, stage);
    } else if (activeTool === ACTIONS.ERASER) {
      // Eraser can work on shapes too
      startDrawing(pos, stage);
    }
  };

  const handlePointerMove = (e: any) => {
    // if stage is dragging we don't want to draw; let Konva move the stage
    if (isDraggingStage) {
      handleStageDrag(); // Update position for real-time background parallax
      return;
    }

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
      handleStageDrag(); // Update position for background parallax
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

  const onRectTransform = (node: any, id: string) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    let updatedShapes: Shape[] | null = null;

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
      updatedShapes = updated;
      return updated;
    });

    // Defer setShapesWithHistory to avoid calling setState during render
    queueMicrotask(() => {
      if (updatedShapes) {
        setShapesWithHistory(updatedShapes, { pushHistory: true });
      }
      // Trigger save after transform (shapes were modified)
      handleSave();
    });
  };

  const onEllipseTransform = (node: any, id: string) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    let updatedShapes: Shape[] | null = null;

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
      updatedShapes = updated;
      return updated;
    });

    // Defer setShapesWithHistory to avoid calling setState during render
    queueMicrotask(() => {
      if (updatedShapes) {
        setShapesWithHistory(updatedShapes, { pushHistory: true });
      }
      // Trigger save after transform (shapes were modified)
      handleSave();
    });
  };

  const onImageTransform = (node: any, id: string) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    let updatedShapes: Shape[] | null = null;

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
      updatedShapes = updated;
      return updated;
    });

    // Defer setShapesWithHistory to avoid calling setState during render
    queueMicrotask(() => {
      if (updatedShapes) {
        setShapesWithHistory(updatedShapes, { pushHistory: true });
      }
      // Trigger save after transform (shapes were modified)
      handleSave();
    });
  };

  // Shape drag handler
  const onShapeDragStart = (_e: any, id: string) => {
    setIsDraggingShape(true);
    setStageCursor("grabbing");
    if (!selectedIds.includes(id)) {
      setSelectedIds([id]);
    }
  };

  // Shape drag move - no-op, let Konva handle visual movement
  const onShapeDragMove = (_e: any, _id: string) => {
    // No-op - Konva handles visual movement
    // Control points are inside the Group so they move automatically
  };

  // Shape drag end
  const onShapeDragEnd = (e: any, id: string) => {
    setIsDraggingShape(false);
    const node = e.target;
    const finalX = node.x();
    const finalY = node.y();

    // Mark that we're doing a local update to skip external sync
    isLocalUpdateRef.current = true;

    const shape = shapes.find((s) => s.id === id);

    // For arrows, apply the final offset to start/end coordinates
    if (shape?.type === "arrow") {
      if (finalX !== 0 || finalY !== 0) {
        node.x(0);
        node.y(0);
        setShapes((currentShapes) => {
          const updatedShapes = currentShapes.map((s) => {
            if (s.id !== id || s.type !== "arrow") return s;
            const a = s as Extract<Shape, { type: "arrow" }>;
            return {
              ...a,
              start: { x: a.start.x + finalX, y: a.start.y + finalY },
              end: { x: a.end.x + finalX, y: a.end.y + finalY },
            };
          });
          queueMicrotask(() => {
            setShapesWithHistory(updatedShapes, { pushHistory: true });
            handleSave();
          });
          return updatedShapes;
        });
      } else {
        // No movement, just push current state to history
        queueMicrotask(() => {
          setShapesWithHistory(shapes, { pushHistory: true });
          handleSave();
        });
      }
    } else {
      // Update the dragged shape's position using callback to get latest state
      setShapes((currentShapes) => {
        const updatedShapes = currentShapes.map((s) =>
          s.id === id ? { ...s, x: finalX, y: finalY } : s
        );

        // Push to history after state update
        queueMicrotask(() => {
          setShapesWithHistory(updatedShapes, { pushHistory: true });
          handleSave();
        });

        return updatedShapes;
      });
    }

    // restore stage cursor to grab if SELECT tool and not panning
    if (
      (activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT) &&
      !isDraggingStage
    )
      setStageCursor("grab");
    else setStageCursor(cursor);
  };

  // Arrow control point drag handler
  const handleArrowControlPointDrag = (
    arrowId: string,
    pointType: "start" | "end" | "bend",
    newPos: { x: number; y: number }
  ) => {
    setShapes((currentShapes) => {
      return currentShapes.map((s) => {
        if (s.id !== arrowId || s.type !== "arrow") return s;

        const arrow = s as Extract<Shape, { type: "arrow" }>;

        // Handle legacy format
        const start = arrow.start;
        const end = arrow.end;

        if (!start || !end) {
          // Legacy arrow, skip control point updates
          return s;
        }

        if (pointType === "start") {
          return { ...arrow, start: newPos };
        } else if (pointType === "end") {
          return { ...arrow, end: newPos };
        } else {
          // Calculate new bend value from the dragged position
          const newBend = getBendFromPoint(start, end, newPos);
          return { ...arrow, bend: newBend };
        }
      });
    });
  };

  const handleArrowControlPointDragEnd = () => {
    isLocalUpdateRef.current = true;
    setShapesWithHistory(shapes, { pushHistory: true });
    handleSave(shapes);
  };

  // AI button handler
  const handleAIClick = async () => {
    const selection = await captureSelectedShapesSnapshot();
    addSelectionAction(selection);
  };

  // Helper to check if pencil shape is naturally closed (start/end points within 30px)
  const isPencilNaturallyClosed = (shape: Shape): boolean => {
    if (shape.type !== "pencil") return false;
    const points = (shape as any).points || [];
    if (points.length < 4) return false;
    const startX = points[0];
    const startY = points[1];
    const endX = points[points.length - 2];
    const endY = points[points.length - 1];
    const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    return distance < 30;
  };

  // Color tool handler - fill for closed shapes, stroke for lines
  const handleColorClick = (e: any, shapeId: string) => {
    if (activeTool !== ACTIONS.COLOR) return;

    const isAltClick = e.evt?.altKey || e.evt?.metaKey;
    const shape = shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    // Mark that we're doing a local update
    isLocalUpdateRef.current = true;

    setShapes((currentShapes) => {
      const updatedShapes = currentShapes.map((s) => {
        if (s.id !== shapeId) return s;

        // Closed shapes: rect, circle, ellipse, path, frame
        // Pencil is only closed if it's naturally closed (start/end points close together)
        const isClosedShape =
          ["rect", "circle", "ellipse", "path", "frame"].includes(s.type) ||
          (s.type === "pencil" && isPencilNaturallyClosed(s));

        if (isClosedShape) {
          // Alt/Meta click changes stroke, normal click changes fill
          if (isAltClick) {
            return { ...s, stroke: activeColor };
          } else {
            return { ...s, fill: activeColor };
          }
        } else {
          // Lines, arrows, open pencil shapes - change stroke color
          return { ...s, stroke: activeColor };
        }
      });

      // Defer history update and save
      queueMicrotask(() => {
        setShapesWithHistory(updatedShapes, { pushHistory: true });
        handleSave(updatedShapes);
      });

      return updatedShapes;
    });
  };

  return (
    <div className="relative" style={{ touchAction: "none" }}>
      {/* canvas */}
      <Stage
        ref={canvasRef}
        onWheel={handleWheel}
        width={dimensions.width}
        height={dimensions.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDragMove={handleStageDrag}
      >
        <Layer>
          {/* Sort shapes so text is always rendered on top (last in array = highest z-index) */}
          {[...shapes]
            .sort((a, b) => {
              // Text shapes should be rendered last (on top)
              if (a.type === "text" && b.type !== "text") return 1;
              if (a.type !== "text" && b.type === "text") return -1;
              return 0; // Preserve relative order for same types
            })
            .map((s) => (
              <ShapeRenderer
                key={s.id}
                shape={s}
                activeTool={activeTool}
                isDraggingShape={isDraggingShape}
                isDraggingStage={isDraggingStage}
                cursor={cursor}
                isDarkMode={isDarkMode}
                isSelected={selectedIds.includes(s.id)}
                onShapeClick={handleShapeClick}
                onShapeDragStart={onShapeDragStart}
                onShapeDragEnd={onShapeDragEnd}
                onShapeDragMove={onShapeDragMove}
                onRectTransform={onRectTransform}
                onEllipseTransform={onEllipseTransform}
                onImageTransform={onImageTransform}
                onTextDoubleClick={(id, pos) => openTextEditor(id, pos)}
                onColorClick={handleColorClick}
                onArrowControlPointDrag={
                  s.type === "arrow"
                    ? (pointType, pos) => handleArrowControlPointDrag(s.id, pointType, pos)
                    : undefined
                }
                onArrowControlPointDragEnd={
                  s.type === "arrow" ? handleArrowControlPointDragEnd : undefined
                }
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
              enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
            />
          )}
        </Layer>
      </Stage>

      {/* Selection buttons overlay */}
      {selectedIds.length > 0 && activeTool === ACTIONS.MARQUEE_SELECT && getButtonPosition() && (
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
