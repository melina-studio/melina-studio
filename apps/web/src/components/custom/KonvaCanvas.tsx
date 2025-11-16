import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Line, Transformer } from 'react-konva';
import { ACTIONS, Shape, TOOL_CURSOR } from '@/lib/konavaTypes';
import { v4 as uuidv4 } from 'uuid';
import { STAGE_MAX_SCALE, STAGE_MIN_SCALE, STAGE_DEFAULT_SCALE } from '@/lib/constants';
import { useTheme } from 'next-themes';
import { Download, FileDown, Plus, Minus } from 'lucide-react';

type ShapeType = Shape['type'];
const ZOOM_STEP = 0.1; // 10% increment

// clamp helper
const clamp = (v: any, a: any, b: any) => Math.max(a, Math.min(b, v));

function KonvaCanvas({
  activeTool,
  canvasRef,
  setShapesWithHistory,
  strokeColor,
  shapes: externalShapes,
}: {
  activeTool: any;
  canvasRef: any;
  setShapesWithHistory: any;
  strokeColor: string;
  shapes: Shape[];
}) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [shapes, setShapes] = useState<Shape[]>(externalShapes);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [shapesBeforeDrawing, setShapesBeforeDrawing] = useState<Shape[]>([]);
  const [isDraggingStage, setIsDraggingStage] = useState(false);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [scale, setScale] = useState(STAGE_DEFAULT_SCALE);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [finalSelectionBox, setFinalSelectionBox] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  const trRef = useRef<any>(null);
  const { theme } = useTheme();
  const pinchRef = useRef({ lastDist: 0 });

  const cursor = TOOL_CURSOR[activeTool] ?? TOOL_CURSOR.default;

  useEffect(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  // Sync local shapes state with external shapes (from history)
  // Only sync when NOT drawing to avoid interrupting active drawing
  useEffect(() => {
    if (!isDrawing) {
      setShapes(externalShapes);
    }
  }, [externalShapes, isDrawing]);

  useEffect(() => {
    const stage = canvasRef?.current;
    if (!stage) return;
    // initialize scale from stage if available
    setScale(stage.scaleX() || STAGE_DEFAULT_SCALE);
  }, [canvasRef]);

  // transformer selection - supports multiple nodes
  const bindTransformer = useCallback((nodes: any[]) => {
    if (trRef.current && nodes.length > 0) {
      trRef.current.nodes(nodes);
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
      setStageCursor('grabbing');
      stage.draggable(true);
    } else if (activeTool === ACTIONS.MARQUEE_SELECT && clickedOnEmpty) {
      setIsDrawing(true);
      setSelectionBox({
        startX: pos.x,
        startY: pos.y,
        endX: pos.x,
        endY: pos.y,
      });
      setSelectedIds([]);
      setFinalSelectionBox(null);
    } else if (activeTool === ACTIONS.PENCIL) {
      const newId = uuidv4();
      setShapesBeforeDrawing([...shapes]); // Save state before drawing
      setIsDrawing(true);
      setLastCreatedId(newId);
      const pencilShape: Shape = {
        id: newId,
        type: 'pencil',
        points: [pos.x, pos.y],
        stroke: strokeColor,
        strokeWidth: 2,
      };
      setShapes([...shapes, pencilShape]);
      setShapesWithHistory([...shapes, pencilShape], { pushHistory: false });
    } else if (activeTool === ACTIONS.RECTANGLE) {
      const newId = uuidv4();
      setShapesBeforeDrawing([...shapes]); // Save state before drawing
      setIsDrawing(true);
      setLastCreatedId(newId);
      const rectangleShape: Shape = {
        id: newId,
        type: 'rect',
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
      setShapesBeforeDrawing([...shapes]); // Save state before drawing
      setIsDrawing(true);
      setLastCreatedId(newId);
      const circleShape: Shape = {
        id: newId,
        type: 'circle',
        x: pos.x,
        y: pos.y,
        r: 0,
        stroke: strokeColor,
        strokeWidth: 2,
      };
      setShapes([...shapes, circleShape]);
      setShapesWithHistory([...shapes, circleShape], { pushHistory: false });
    } else if (activeTool === ACTIONS.ARROW) {
      const newId = uuidv4();
      setShapesBeforeDrawing([...shapes]); // Save state before drawing
      setIsDrawing(true);
      setLastCreatedId(newId);
    } else if (activeTool === ACTIONS.LINE) {
      const newId = uuidv4();
      setShapesBeforeDrawing([...shapes]); // Save state before drawing
      setIsDrawing(true);
      setLastCreatedId(newId);
      setShapes([
        ...shapes,
        {
          id: newId,
          type: 'line',
          points: [pos.x, pos.y],
          stroke: strokeColor,
          strokeWidth: 2,
        },
      ]);
    } else if (activeTool === ACTIONS.TEXT) {
      const newId = uuidv4();
      setShapesBeforeDrawing([...shapes]); // Save state before drawing
      setIsDrawing(true);
      setLastCreatedId(newId);
      setShapes([
        ...shapes,
        {
          id: newId,
          type: 'text',
          text: 'Hello',
          x: pos.x,
          y: pos.y,
          fontSize: 16,
          fontFamily: 'Arial',
          fill: strokeColor,
        },
      ]);
    } else if (activeTool === ACTIONS.IMAGE) {
      const newId = uuidv4();
      setShapesBeforeDrawing([...shapes]); // Save state before drawing
      setIsDrawing(true);
      setLastCreatedId(newId);
      setShapes([
        ...shapes,
        {
          id: newId,
          type: 'image',
          src: 'https://via.placeholder.com/150',
          x: pos.x,
          y: pos.y,
          width: 150,
          height: 150,
        },
      ]);
    } else if (activeTool === ACTIONS.ERASER) {
      setShapesBeforeDrawing([...shapes]); // Save state before drawing
      setIsDrawing(true);

      // immediate hit-test & remove if pointer starts on a shape
      const hit = stage.getIntersection(pos);
      if (hit && hit.id()) {
        // remove the underlying shape (guard: don't remove transformer or UI)
        removeShapeById(hit.id());
      }
      return;
    }
  };

  const handlePointerMove = (e: any) => {
    // if stage is dragging we don't want to draw; let Konva move the stage
    if (isDraggingStage) return;

    if (!isDrawing) return;
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);
    if (!pos) return;

    // Handle marquee selection box
    if (activeTool === ACTIONS.MARQUEE_SELECT && selectionBox) {
      setSelectionBox({
        ...selectionBox,
        endX: pos.x,
        endY: pos.y,
      });
      return;
    }

    if (activeTool === ACTIONS.ERASER && isDrawing) {
      // append the eraser visual stroke to the last shape (optional)
      setShapes(arr => {
        const last = arr[arr.length - 1];
        if (!last || last.type !== 'eraser') return arr;
        const newPoints = last.points.concat([pos.x, pos.y]);
        return [...arr.slice(0, -1), { ...last, points: newPoints }];
      });

      // hit-test shapes under the pointer and remove them
      const hit = stage.getIntersection(pos);
      if (hit && hit.id()) {
        // avoid removing transformer nodes or helper nodes - ensure hit.id is from your shape model
        const hitId = hit.id();
        // optional: filter out the eraser stroke's own id if it's on stage
        if (hitId && shapes.some(s => s.id === hitId)) {
          // remove shape without pushing history for each tiny hit
          setShapes(arr => arr.filter(s => s.id !== hitId));
          // you can choose to push a single history snapshot on pointerUp
        }
      }
      return; // done for eraser
    }

    setShapes(arr => {
      const last = arr[arr.length - 1];
      if (!last) return arr;

      if (last.type === 'pencil') {
        const newPoints = last.points.concat([pos.x, pos.y]);
        return [...arr.slice(0, -1), { ...last, points: newPoints }];
      }
      if (last.type === 'rect') {
        return [...arr.slice(0, -1), { ...last, w: pos.x - last.x, h: pos.y - last.y }];
      }
      if (last.type === 'circle') {
        const dx = pos.x - last.x;
        const dy = pos.y - last.y;
        const r = Math.hypot(dx, dy);
        return [...arr.slice(0, -1), { ...last, r }];
      }
      return arr;
    });

    // Update current shapes *without* pushing a history snapshot (live update)
    setShapesWithHistory(
      (prev => {
        const arr = prev; // prev is the current shapes array when using closure style
        const last = arr[arr.length - 1];
        if (!last) return arr;

        if (last.type === 'pencil') {
          const newPoints = (last.points || []).concat([pos.x, pos.y]);
          return [...arr.slice(0, -1), { ...last, points: newPoints }];
        }
        if (last.type === 'rect') {
          return [...arr.slice(0, -1), { ...last, w: pos.x - last.x, h: pos.y - last.y }];
        }
        if (last.type === 'circle') {
          const dx = pos.x - last.x;
          const dy = pos.y - last.y;
          const r = Math.hypot(dx, dy);
          return [...arr.slice(0, -1), { ...last, r }];
        }
        if (last.type === 'line' || last.type === 'arrow' || last.type === 'eraser') {
          const newPoints = (last.points || []).concat([pos.x, pos.y]);
          return [...arr.slice(0, -1), { ...last, points: newPoints }];
        }
        return arr;
      })(shapes),
      { pushHistory: false },
    );
  };

  // Helper function to check if a shape intersects with selection box
  const isShapeInSelectionBox = (
    shape: Shape,
    box: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    },
  ): boolean => {
    const minX = Math.min(box.startX, box.endX);
    const maxX = Math.max(box.startX, box.endX);
    const minY = Math.min(box.startY, box.endY);
    const maxY = Math.max(box.startY, box.endY);

    if (shape.type === 'rect') {
      const shapeRight = shape.x + shape.w;
      const shapeBottom = shape.y + shape.h;
      return shape.x >= minX && shape.y >= minY && shapeRight <= maxX && shapeBottom <= maxY;
    } else if (shape.type === 'circle') {
      const shapeRight = shape.x + shape.r * 2;
      const shapeBottom = shape.y + shape.r * 2;
      const shapeLeft = shape.x - shape.r * 2;
      const shapeTop = shape.y - shape.r * 2;
      return shapeLeft >= minX && shapeTop >= minY && shapeRight <= maxX && shapeBottom <= maxY;
    } else if (shape.type === 'line' || shape.type === 'pencil') {
      // Check if all points are within the selection box
      const points = (shape as any).points || [];
      for (let i = 0; i < points.length; i += 2) {
        const px = points[i];
        const py = points[i + 1];
        if (px < minX || px > maxX || py < minY || py > maxY) {
          return false;
        }
      }
      return points.length > 0;
    } else if (shape.type === 'text' || shape.type === 'image') {
      const shapeWidth = (shape as any).width || 100;
      const shapeHeight = (shape as any).height || 100;
      const shapeRight = shape.x + shapeWidth;
      const shapeBottom = shape.y + shapeHeight;
      return shape.x >= minX && shape.y >= minY && shapeRight <= maxX && shapeBottom <= maxY;
    }
    return false;
  };

  const handlePointerUp = (e: any) => {
    const stage = e.target.getStage();
    if (isDraggingStage) {
      setIsDraggingStage(false);
      stage.draggable(false);
      if (activeTool === ACTIONS.SELECT) setStageCursor('grab');
      else setStageCursor(cursor);
    }

    // Handle marquee selection completion
    if (activeTool === ACTIONS.MARQUEE_SELECT && selectionBox) {
      const selectedShapeIds = shapes
        .filter(shape => isShapeInSelectionBox(shape, selectionBox))
        .map(shape => shape.id);
      setSelectedIds(selectedShapeIds);
      // Save final selection box for button positioning
      setFinalSelectionBox(selectionBox);
      setSelectionBox(null);
      setIsDrawing(false);
      return;
    }

    if (activeTool === ACTIONS.ERASER) {
      // finalize and push history once (if you removed shapes by updating present without history)
      setShapesWithHistory(shapes, { pushHistory: true });
      setIsDrawing(false);
      return;
    }

    console.log('pointer up');
    // If we were drawing something, finalize it and PUSH a history snapshot
    if (isDrawing) {
      // Push the state BEFORE drawing started to history, and set present to current shapes
      // This ensures undo goes back to the state before we started drawing
      setShapesWithHistory(shapes, {
        pushHistory: true,
        stateToPush: shapesBeforeDrawing,
      });

      // if you track the id of the shape you just created (lastCreatedId), select it
      if (lastCreatedId) {
        setSelectedIds([lastCreatedId]);
        setLastCreatedId(null);
      }
    }

    setIsDrawing(false);
  };

  // move/resize handlers for Rect/Circle
  const onDragMove = (id: string, x: number, y: number) => {
    setShapes(arr => {
      const shape = arr.find(s => s.id === id);
      if (!shape) return arr;

      // Only shapes with x and y properties can be dragged
      if (!('x' in shape) || !('y' in shape)) return arr;

      const shapeX = (shape as any).x;
      const shapeY = (shape as any).y;

      // Calculate the offset if this is part of a multi-select drag
      const dx = x - shapeX;
      const dy = y - shapeY;

      let updated;
      // If multiple shapes are selected, move all of them
      if (selectedIds.length > 1 && selectedIds.includes(id)) {
        updated = arr.map(s => {
          if (selectedIds.includes(s.id) && 'x' in s && 'y' in s) {
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
        updated = arr.map(s => (s.id === id ? { ...s, x, y } : s));
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
    setShapes(arr => {
      const updated = arr.map(s =>
        s.id === id
          ? {
              ...s,
              x: node.x(),
              y: node.y(),
              w: Math.max(5, (s as any).w! * scaleX),
              h: Math.max(5, (s as any).h! * scaleY),
            }
          : s,
      );
      setShapesWithHistory(updated, { pushHistory: true });
      return updated;
    });
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
      if (stage) stage.container().style.cursor = '';
    };
  }, [cursor, canvasRef]);

  // Bind transformer to selected nodes
  useEffect(() => {
    if (selectedIds.length === 0 || !trRef.current) return;

    const stage = canvasRef?.current;
    if (!stage) return;

    const nodes = selectedIds.map(id => stage.findOne(`#${id}`)).filter(node => node !== undefined);

    if (nodes.length > 0) {
      bindTransformer(nodes);
    }
  }, [selectedIds, shapes, bindTransformer, canvasRef]);

  // shape drag handler
  const onShapeDragStart = (e: any, id: any) => {
    console.log('shape drag started');
    setIsDraggingShape(true);
    setStageCursor('grabbing');
    if (!selectedIds.includes(id)) {
      setSelectedIds([id]);
    }
  };

  // shape drag eng
  const onShapeDragEnd = (e: any, id: any) => {
    setIsDraggingShape(false);
    // update shape position
    const node = e.target;
    onDragMove(id, node.x(), node.y());
    // restore stage cursor to grab if SELECT tool and not panning
    if ((activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT) && !isDraggingStage)
      setStageCursor('grab');
    else setStageCursor(cursor);
    console.log('Shape drag ended');
  };

  // zoom around pointer: stage = Konva.Stage instance, pointer = container coords
  const zoomStage = (stage: any, pointer: any, scaleBy: any) => {
    const oldScale = stage.scaleX();
    let newScale = oldScale * scaleBy;

    // clamp between MIN & MAX
    newScale = clamp(newScale, STAGE_MIN_SCALE, STAGE_MAX_SCALE);

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
    setScale(stage.scaleX()); // Update scale state after zoom
  };

  const getDistance = (p1: any, p2: any) => {
    const dx = p1.clientX - p2.clientX;
    const dy = p1.clientY - p2.clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: any) => {
    if (e.evt.touches && e.evt.touches.length === 2) {
      pinchRef.current.lastDist = getDistance(e.evt.touches[0], e.evt.touches[1]);
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
    setScale(stage.scaleX()); // Update scale state after pinch zoom
    pinchRef.current.lastDist = dist;
  };

  const handleTouchEnd = () => {
    pinchRef.current.lastDist = 0;
  };

  // Helper function to get selected shapes data
  const getSelectedShapes = () => {
    return shapes.filter(shape => selectedIds.includes(shape.id));
  };

  // export selected shapes as json
  const exportSelectedShapesJSON = () => {
    const selectedShapes = getSelectedShapes();
    const jsonString = JSON.stringify(selectedShapes, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected-shapes.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // export selected shapes as image
  const exportSelectedShapesImage = async () => {
    if (!canvasRef.current) return;

    const stage = canvasRef.current;
    const selectedShapes = getSelectedShapes();

    if (selectedShapes.length === 0) {
      alert('No shapes selected!');
      return;
    }

    // Find bounding box of all selected shapes
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    let hasValidShape = false;

    selectedShapes.forEach(shape => {
      // Handle shapes with x, y, width, height (rect, circle, text, image)
      if ('x' in shape && 'y' in shape) {
        const x = (shape as any).x;
        const y = (shape as any).y;

        let width = 0;
        let height = 0;

        if (shape.type === 'rect') {
          width = (shape as any).w || 0;
          height = (shape as any).h || 0;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + width);
          maxY = Math.max(maxY, y + height);
          hasValidShape = true;
        } else if (shape.type === 'circle') {
          const radius = (shape as any).r || 0;
          minX = Math.min(minX, x - radius);
          minY = Math.min(minY, y - radius);
          maxX = Math.max(maxX, x + radius);
          maxY = Math.max(maxY, y + radius);
          hasValidShape = true;
        } else if (shape.type === 'text' || shape.type === 'image') {
          width = (shape as any).width || 100;
          height = (shape as any).height || 100;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + width);
          maxY = Math.max(maxY, y + height);
          hasValidShape = true;
        }
      }
      // Handle line/pencil shapes (they have points array)
      else if (shape.type === 'line' || shape.type === 'pencil' || shape.type === 'eraser') {
        const points = (shape as any).points || [];
        if (points.length >= 2) {
          for (let i = 0; i < points.length; i += 2) {
            const px = points[i];
            const py = points[i + 1];
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px);
            maxY = Math.max(maxY, py);
          }
          hasValidShape = true;
        }
      }
    });

    // Validate bounding box
    if (!hasValidShape || minX === Infinity || minY === Infinity) {
      alert('Could not calculate bounding box for selected shapes!');
      return;
    }

    const width = maxX - minX;
    const height = maxY - minY;

    // Ensure minimum size
    if (width <= 0 || height <= 0) {
      alert('Selected shapes have invalid dimensions!');
      return;
    }

    // Add padding
    const padding = 20;
    const finalWidth = width + padding * 2;
    const finalHeight = height + padding * 2;

    try {
      // Import Konva dynamically
      const Konva = (await import('konva')).default;

      // Create a temporary stage (off-screen)
      const tempStage = new Konva.Stage({
        container: document.createElement('div'),
        width: finalWidth,
        height: finalHeight,
      });

      const tempLayer = new Konva.Layer();
      tempStage.add(tempLayer);

      // Get stroke color from theme
      const strokeColor = theme === 'dark' ? '#fff' : '#111';

      // Render each selected shape on the temporary stage
      selectedShapes.forEach(shape => {
        // Calculate offset (move shapes so they start from padding, padding)
        const offsetX = -minX + padding;
        const offsetY = -minY + padding;

        if (shape.type === 'rect') {
          const rect = new Konva.Rect({
            x: (shape as any).x + offsetX,
            y: (shape as any).y + offsetY,
            width: (shape as any).w,
            height: (shape as any).h,
            fill: (shape as any).fill,
            stroke: (shape as any).stroke || strokeColor,
            strokeWidth: (shape as any).strokeWidth || 2,
            cornerRadius: 8,
          });
          tempLayer.add(rect);
        } else if (shape.type === 'circle') {
          const circle = new Konva.Circle({
            x: (shape as any).x + offsetX,
            y: (shape as any).y + offsetY,
            radius: (shape as any).r,
            fill: (shape as any).fill,
            stroke: (shape as any).stroke || strokeColor,
            strokeWidth: (shape as any).strokeWidth || 2,
          });
          tempLayer.add(circle);
        } else if (shape.type === 'line' || shape.type === 'pencil' || shape.type === 'eraser') {
          const points = (shape as any).points || [];
          // Offset all points
          const offsetPoints = [];
          for (let i = 0; i < points.length; i += 2) {
            offsetPoints.push(points[i] + offsetX);
            offsetPoints.push(points[i + 1] + offsetY);
          }
          const line = new Konva.Line({
            points: offsetPoints,
            stroke: (shape as any).stroke || strokeColor,
            strokeWidth: (shape as any).strokeWidth || 2,
            tension: 0,
            lineCap: 'round',
            lineJoin: 'round',
          });
          tempLayer.add(line);
        } else if (shape.type === 'text') {
          const text = new Konva.Text({
            x: (shape as any).x + offsetX,
            y: (shape as any).y + offsetY,
            text: (shape as any).text,
            fontSize: (shape as any).fontSize || 16,
            fontFamily: (shape as any).fontFamily || 'Arial',
            fill: (shape as any).fill || strokeColor,
          });
          tempLayer.add(text);
        } else if (shape.type === 'image') {
          // For images, we need to load them first
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const konvaImage = new Konva.Image({
              x: (shape as any).x + offsetX,
              y: (shape as any).y + offsetY,
              image: img,
              width: (shape as any).width || 150,
              height: (shape as any).height || 150,
            });
            tempLayer.add(konvaImage);
            tempLayer.draw();
          };
          img.src = (shape as any).src;
        }
      });

      // Draw the layer
      tempLayer.draw();

      // Wait a bit for images to load (if any)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Export the temporary stage
      const dataURL = tempStage.toDataURL({
        pixelRatio: 2, // Higher quality
      });

      // Clean up
      tempStage.destroy();

      if (!dataURL || dataURL === 'data:,') {
        throw new Error('Failed to generate image data');
      }

      const a = document.createElement('a');
      a.href = dataURL;
      a.download = 'selected-shapes.png';
      a.click();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export image. Please try again.');
    }
  };

  // AI button handler (you can customize this)
  const handleAIClick = () => {
    const selectedShapes = getSelectedShapes();
    console.log('AI button clicked with shapes:', selectedShapes);
    // Add your AI logic here
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
    const stageTransform = stage.getAbsoluteTransform();
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

  // helper: remove a shape by id
  const removeShapeById = (id: string) => {
    setShapesWithHistory(
      shapes.filter(s => s.id !== id),
      { pushHistory: true },
    );
  };

  // zoom in/out
  const zoomIn = () => {
    const stage = canvasRef.current;
    if (!stage) return;

    const currentScale = stage.scaleX();
    const newScale = clamp(currentScale + ZOOM_STEP, STAGE_MIN_SCALE, STAGE_MAX_SCALE);

    const pointer = { x: dimensions.width / 2, y: dimensions.height / 2 };
    const scaleBy = newScale / currentScale;

    zoomStage(stage, pointer, scaleBy);
    setScale(newScale);
  };

  const zoomOut = () => {
    const stage = canvasRef.current;
    if (!stage) return;

    const currentScale = stage.scaleX();
    const newScale = clamp(currentScale - ZOOM_STEP, STAGE_MIN_SCALE, STAGE_MAX_SCALE);

    const pointer = { x: dimensions.width / 2, y: dimensions.height / 2 };
    const scaleBy = newScale / currentScale;

    zoomStage(stage, pointer, scaleBy);
    setScale(newScale);
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
          {shapes.map(s => {
            if (s.type === 'rect')
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
                  draggable={activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT}
                  onDragStart={e => onShapeDragStart(e, s.id)}
                  onDragEnd={e => onShapeDragEnd(e, s.id)}
                  onClick={e => {
                    if (e.evt.shiftKey) {
                      setSelectedIds(prev => (prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]));
                    } else {
                      setSelectedIds([s.id]);
                    }
                  }}
                  onTransformEnd={e => onRectTransform(e.target, s.id)}
                  onMouseEnter={() => {
                    // hover over shapes: pointer or grab
                    if ((activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT) && !isDraggingShape) {
                      setStageCursor('grab');
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
            if (s.type === 'circle')
              return (
                <Circle
                  key={s.id}
                  id={s.id}
                  x={s.x}
                  y={s.y}
                  radius={s.r}
                  fill={s.fill}
                  stroke={strokeColor}
                  draggable={activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT}
                  onDragStart={e => onShapeDragStart(e, s.id)}
                  onDragEnd={e => onShapeDragEnd(e, s.id)}
                  onClick={e => {
                    if (e.evt.shiftKey) {
                      setSelectedIds(prev => (prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]));
                    } else {
                      setSelectedIds([s.id]);
                    }
                  }}
                  onMouseEnter={() => {
                    // hover over shapes: pointer or grab
                    if ((activeTool === ACTIONS.SELECT || activeTool === ACTIONS.MARQUEE_SELECT) && !isDraggingShape)
                      setStageCursor('grab');
                  }}
                  onMouseLeave={() => {
                    if (!isDraggingShape && !isDraggingStage) setStageCursor(cursor);
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
                onDragStart={e => onShapeDragStart(e, s.id)}
                onDragEnd={e => onShapeDragEnd(e, s.id)}
                onClick={e => {
                  if (e.evt.shiftKey) {
                    setSelectedIds(prev => (prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]));
                  } else {
                    setSelectedIds([s.id]);
                  }
                }}
                onMouseEnter={() => {
                  // hover over shapes: pointer or grab
                  if (activeTool === ACTIONS.SELECT && !isDraggingShape) setStageCursor('grab');
                }}
                onMouseLeave={() => {
                  if (!isDraggingShape && !isDraggingStage) setStageCursor(cursor);
                }}
              />
            );
          })}

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
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            />
          )}
        </Layer>
      </Stage>

      {/* button overlays - appears only when selection box */}
      {selectedIds.length > 0 && activeTool === ACTIONS.MARQUEE_SELECT && getButtonPosition() && (
        <div
          style={{
            position: 'absolute',
            left: `${getButtonPosition()!.x}px`,
            top: `${getButtonPosition()!.y}px`,
            transform: 'translateY(-50%)', // Center vertically
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 1000,
            backgroundColor: 'white',
            padding: '8px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {/* ai button */}
          <button onClick={handleAIClick} className="cursor-pointer mb-2" title="AI Actions">
            <img src="/icons/ai_icon.svg" alt="AI" width={16} height={16} />
          </button>
          {/* export image */}
          <button onClick={exportSelectedShapesImage} className="cursor-pointer mb-2" title="Export as Image">
            <Download width={16} height={16} color="black" />
          </button>
          {/* export json */}
          <button onClick={exportSelectedShapesJSON} className="cursor-pointer mb-2" title="Export as JSON">
            <FileDown width={16} height={16} color="black" />
          </button>
        </div>
      )}

      {/* zoom controls */}
      <div className="fixed bottom-5 left-5 z-10 flex bg-gray-100 dark:bg-[#323332] rounded-md p-2 items-center">
        <button
          onClick={zoomIn}
          disabled={scale >= STAGE_MAX_SCALE - 0.001}
          className="cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear flex flex-col gap-4"
        >
          <Plus width={16} height={16} color={theme === 'dark' ? '#fff' : '#111'} />
        </button>
        <div className="text-sm dark:text-white" style={{ minWidth: 32, textAlign: 'center', fontWeight: 600 }}>
          {Math.round(scale * 100)}%
        </div>
        <button
          onClick={zoomOut}
          disabled={scale <= STAGE_MIN_SCALE + 0.001}
          className="cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear flex flex-col gap-4"
        >
          <Minus width={16} height={16} color={theme === 'dark' ? '#fff' : '#111'} />
        </button>
      </div>
    </div>
  );
}

export default KonvaCanvas;
