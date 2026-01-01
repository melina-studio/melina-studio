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
  const pinchRef = useRef({ lastDist: 0 });

  useEffect(() => {
    const stage = canvasRef?.current;
    if (!stage) return;
    // initialize scale from stage if available
    setScale(stage.scaleX() || STAGE_DEFAULT_SCALE);
  }, [canvasRef]);

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
  };

  return {
    scale,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    zoomIn,
    zoomOut,
  };
};
