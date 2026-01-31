import { Shape } from "@/lib/konavaTypes";
import { getBendPoint, convertLegacyArrow } from "@/utils/arrowUtils";

// Clamp helper
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

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
  return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
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

  if (shape.type === "rect" || shape.type === "frame") {
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
  } else if (shape.type === "arrow") {
    // Handle new arrow format with start, end, bend
    const arrowShape = shape as Extract<Shape, { type: "arrow" }>;
    let start = arrowShape.start;
    let end = arrowShape.end;
    let bend = arrowShape.bend ?? 0;

    // Handle legacy format
    if (!start || !end) {
      const legacy = convertLegacyArrow(arrowShape);
      if (legacy) {
        start = legacy.start;
        end = legacy.end;
        bend = legacy.bend;
      } else {
        return false;
      }
    }

    const bendPoint = getBendPoint(start, end, bend);
    const points = [start, end, bendPoint];

    for (const point of points) {
      if (
        point.x >= selectionRect.left &&
        point.x <= selectionRect.right &&
        point.y >= selectionRect.top &&
        point.y <= selectionRect.bottom
      ) {
        return true;
      }
    }
    return false;
  } else if (shape.type === "line" || shape.type === "pencil" || shape.type === "eraser") {
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

// Bounds type for shape bounding boxes
export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

// Get the bounding box of a shape
export const getShapeBounds = (shape: Shape): Bounds => {
  if (shape.type === "rect" || shape.type === "frame") {
    return {
      minX: shape.x,
      minY: shape.y,
      maxX: shape.x + shape.w,
      maxY: shape.y + shape.h,
    };
  } else if (shape.type === "circle") {
    return {
      minX: shape.x - shape.r,
      minY: shape.y - shape.r,
      maxX: shape.x + shape.r,
      maxY: shape.y + shape.r,
    };
  } else if (shape.type === "ellipse") {
    const e = shape as any;
    return {
      minX: shape.x - e.radiusX,
      minY: shape.y - e.radiusY,
      maxX: shape.x + e.radiusX,
      maxY: shape.y + e.radiusY,
    };
  } else if (shape.type === "path") {
    const p = shape as any;
    const pathX = p.x || 0;
    const pathY = p.y || 0;
    const defaultSize = 100;
    return {
      minX: pathX,
      minY: pathY,
      maxX: pathX + defaultSize,
      maxY: pathY + defaultSize,
    };
  } else if (shape.type === "arrow") {
    // Handle new arrow format with start, end, bend
    const arrowShape = shape as Extract<Shape, { type: "arrow" }>;
    let start = arrowShape.start;
    let end = arrowShape.end;
    let bend = arrowShape.bend ?? 0;

    // Handle legacy format
    if (!start || !end) {
      const legacy = convertLegacyArrow(arrowShape);
      if (legacy) {
        start = legacy.start;
        end = legacy.end;
        bend = legacy.bend;
      } else {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      }
    }

    const bendPoint = getBendPoint(start, end, bend);
    return {
      minX: Math.min(start.x, end.x, bendPoint.x),
      minY: Math.min(start.y, end.y, bendPoint.y),
      maxX: Math.max(start.x, end.x, bendPoint.x),
      maxY: Math.max(start.y, end.y, bendPoint.y),
    };
  } else if (shape.type === "line" || shape.type === "pencil" || shape.type === "eraser") {
    const points = (shape as any).points || [];
    const offsetX = (shape as any).x || 0;
    const offsetY = (shape as any).y || 0;

    if (points.length < 2) {
      return { minX: offsetX, minY: offsetY, maxX: offsetX, maxY: offsetY };
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (let i = 0; i < points.length; i += 2) {
      const px = points[i] + offsetX;
      const py = points[i + 1] + offsetY;
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    return { minX, minY, maxX, maxY };
  } else if (shape.type === "text") {
    const t = shape as any;
    const fontSize = t.fontSize || 16;
    const text = t.text || "";
    const lines = text.split("\n");
    const maxLineLength = Math.max(...lines.map((line: string) => line.length));
    const estimatedWidth = Math.max(maxLineLength * fontSize * 0.7, 50);
    const estimatedHeight = lines.length * fontSize * 1.4;
    return {
      minX: shape.x,
      minY: shape.y,
      maxX: shape.x + estimatedWidth,
      maxY: shape.y + estimatedHeight,
    };
  } else if (shape.type === "image") {
    const img = shape as any;
    return {
      minX: shape.x,
      minY: shape.y,
      maxX: shape.x + (img.width || 150),
      maxY: shape.y + (img.height || 150),
    };
  }

  // Fallback for unknown types
  const s = shape as any;
  return { minX: s.x || 0, minY: s.y || 0, maxX: (s.x || 0) + 100, maxY: (s.y || 0) + 100 };
};

// Merge multiple bounds into one encompassing bounding box
export const mergeBounds = (bounds: Bounds[]): Bounds => {
  if (bounds.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return {
    minX: Math.min(...bounds.map((b) => b.minX)),
    minY: Math.min(...bounds.map((b) => b.minY)),
    maxX: Math.max(...bounds.map((b) => b.maxX)),
    maxY: Math.max(...bounds.map((b) => b.maxY)),
  };
};
