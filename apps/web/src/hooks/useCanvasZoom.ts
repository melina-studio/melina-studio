import { useState, useEffect, useRef } from "react";
import {
  STAGE_MIN_SCALE,
  STAGE_MAX_SCALE,
  STAGE_DEFAULT_SCALE,
} from "@/lib/constants";
import { clamp, getDistance } from "@/utils/canvasUtils";

const ZOOM_STEP = 0.1; // 10% increment

// Zoom around pointer: stage = Konva.Stage instance, pointer = container coords
const zoomStage = (stage: any, pointer: any, scaleBy: number) => {
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

export const useCanvasZoom = (
  canvasRef: any,
  dimensions: { width: number; height: number }
) => {
  const [scale, setScale] = useState(STAGE_DEFAULT_SCALE);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const pinchRef = useRef({ lastDist: 0 });

  useEffect(() => {
    const stage = canvasRef?.current;
    if (!stage) return;
    // initialize scale and position from stage if available
    setScale(stage.scaleX() || STAGE_DEFAULT_SCALE);
    setPosition({ x: stage.x() || 0, y: stage.y() || 0 });
  }, [canvasRef]);

  const handleWheel = (e: any) => {
    const evt = e.evt;
    evt.preventDefault(); // Prevent default scroll behavior

    const stage = canvasRef.current;
    if (!stage) return;

    // Ctrl + scroll = zoom (pinch-to-zoom on trackpad)
    if (evt.ctrlKey) {
      const pointer = stage.getPointerPosition() || {
        x: evt.clientX,
        y: evt.clientY,
      };

      if (!pointer) return;

      const zoomIntensity = 1.05;
      const scaleBy = evt.deltaY > 0 ? 1 / zoomIntensity : zoomIntensity;

      zoomStage(stage, pointer, scaleBy);
      setScale(stage.scaleX());
      setPosition({ x: stage.x(), y: stage.y() });
    } else {
      // Regular scroll = pan the canvas
      const newX = stage.x() - evt.deltaX;
      const newY = stage.y() - evt.deltaY;

      stage.position({ x: newX, y: newY });
      stage.batchDraw();
      setPosition({ x: newX, y: newY });
    }
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
    zoomStage(stage, touchCenter, scaleBy);
    setScale(stage.scaleX()); // Update scale state after pinch zoom
    setPosition({ x: stage.x(), y: stage.y() }); // Update position after pinch zoom
    pinchRef.current.lastDist = dist;
  };

  const handleTouchEnd = () => {
    pinchRef.current.lastDist = 0;
  };

  const zoomIn = () => {
    const stage = canvasRef.current;
    if (!stage) return;

    const currentScale = stage.scaleX();
    const newScale = clamp(
      currentScale + ZOOM_STEP,
      STAGE_MIN_SCALE,
      STAGE_MAX_SCALE
    );

    const pointer = { x: dimensions.width / 2, y: dimensions.height / 2 };
    const scaleBy = newScale / currentScale;

    zoomStage(stage, pointer, scaleBy);
    setScale(newScale);
    setPosition({ x: stage.x(), y: stage.y() });
  };

  const zoomOut = () => {
    const stage = canvasRef.current;
    if (!stage) return;

    const currentScale = stage.scaleX();
    const newScale = clamp(
      currentScale - ZOOM_STEP,
      STAGE_MIN_SCALE,
      STAGE_MAX_SCALE
    );

    const pointer = { x: dimensions.width / 2, y: dimensions.height / 2 };
    const scaleBy = newScale / currentScale;

    zoomStage(stage, pointer, scaleBy);
    setScale(newScale);
    setPosition({ x: stage.x(), y: stage.y() });
  };

  // Handler for stage drag/pan - call this on stage's onDragMove or onDragEnd
  const handleStageDrag = () => {
    const stage = canvasRef.current;
    if (!stage) return;
    setPosition({ x: stage.x(), y: stage.y() });
  };

  return {
    scale,
    position,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    zoomIn,
    zoomOut,
    handleStageDrag,
  };
};
