import { Shape } from "@/lib/konavaTypes";

// Clamp helper
export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));

// Convert pointer to stage-local coords (works with stage translate/scale)
export const getRelativePointerPosition = (stage: any) => {
  const pos = stage.getPointerPosition();
  if (!pos) return null;
  // copy the absolute transform, invert it, and apply to point
  const transform = stage.getAbsoluteTransform().copy();
  transform.invert();
  return transform.point(pos);
};

// Helper to check if two rectangles intersect (overlap)
const rectsIntersect = (
  r1: { left: number; top: number; right: number; bottom: number },
  r2: { left: number; top: number; right: number; bottom: number }
): boolean => {
  return !(
    r1.right < r2.left ||
    r1.left > r2.right ||
    r1.bottom < r2.top ||
    r1.top > r2.bottom
  );
};

// Helper function to check if a shape intersects with selection box
export const isShapeInSelectionBox = (
  shape: Shape,
  box: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }
): boolean => {
  const selectionRect = {
    left: Math.min(box.startX, box.endX),
    right: Math.max(box.startX, box.endX),
    top: Math.min(box.startY, box.endY),
    bottom: Math.max(box.startY, box.endY),
  };

  if (shape.type === "rect") {
    const shapeRect = {
      left: shape.x,
      top: shape.y,
      right: shape.x + shape.w,
      bottom: shape.y + shape.h,
    };
    return rectsIntersect(shapeRect, selectionRect);
  } else if (shape.type === "circle") {
    // Use bounding box for circle
    const shapeRect = {
      left: shape.x - shape.r,
      top: shape.y - shape.r,
      right: shape.x + shape.r,
      bottom: shape.y + shape.r,
    };
    return rectsIntersect(shapeRect, selectionRect);
  } else if (shape.type === "ellipse") {
    const e = shape as any;
    const shapeRect = {
      left: shape.x - e.radiusX,
      top: shape.y - e.radiusY,
      right: shape.x + e.radiusX,
      bottom: shape.y + e.radiusY,
    };
    return rectsIntersect(shapeRect, selectionRect);
  } else if (shape.type === "path") {
    const p = shape as any;
    const pathX = p.x || 0;
    const pathY = p.y || 0;
    // Use a default bounding box size as a fallback
    const defaultSize = 100;
    const shapeRect = {
      left: pathX,
      top: pathY,
      right: pathX + defaultSize,
      bottom: pathY + defaultSize,
    };
    return rectsIntersect(shapeRect, selectionRect);
  } else if (shape.type === "line" || shape.type === "pencil" || shape.type === "arrow" || shape.type === "eraser") {
    // Check if any point is within the selection box
    const points = (shape as any).points || [];
    const offsetX = (shape as any).x || 0;
    const offsetY = (shape as any).y || 0;
    for (let i = 0; i < points.length; i += 2) {
      const px = points[i] + offsetX;
      const py = points[i + 1] + offsetY;
      if (
        px >= selectionRect.left &&
        px <= selectionRect.right &&
        py >= selectionRect.top &&
        py <= selectionRect.bottom
      ) {
        return true; // At least one point is inside
      }
    }
    return false;
  } else if (shape.type === "text") {
    // For text, use a generous bounding box based on fontSize
    const t = shape as any;
    const fontSize = t.fontSize || 16;
    const text = t.text || "";
    // Count lines in text (for multiline text)
    const lines = text.split("\n");
    const maxLineLength = Math.max(...lines.map((line: string) => line.length));
    // More generous estimates for width and height
    const estimatedWidth = Math.max(maxLineLength * fontSize * 0.7, 50);
    const estimatedHeight = lines.length * fontSize * 1.4;
    const shapeRect = {
      left: shape.x - 5, // Small padding
      top: shape.y - 5,
      right: shape.x + estimatedWidth + 10,
      bottom: shape.y + estimatedHeight + 10,
    };
    return rectsIntersect(shapeRect, selectionRect);
  } else if (shape.type === "image") {
    const img = shape as any;
    const shapeRect = {
      left: shape.x,
      top: shape.y,
      right: shape.x + (img.width || 150),
      bottom: shape.y + (img.height || 150),
    };
    return rectsIntersect(shapeRect, selectionRect);
  }
  return false;
};

// Get distance between two touch points
export const getDistance = (p1: any, p2: any) => {
  const dx = p1.clientX - p2.clientX;
  const dy = p1.clientY - p2.clientY;
  return Math.hypot(dx, dy);
};
