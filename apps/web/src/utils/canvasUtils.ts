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
  const minX = Math.min(box.startX, box.endX);
  const maxX = Math.max(box.startX, box.endX);
  const minY = Math.min(box.startY, box.endY);
  const maxY = Math.max(box.startY, box.endY);

  if (shape.type === "rect") {
    const shapeRight = shape.x + shape.w;
    const shapeBottom = shape.y + shape.h;
    return (
      shape.x >= minX &&
      shape.y >= minY &&
      shapeRight <= maxX &&
      shapeBottom <= maxY
    );
  } else if (shape.type === "circle") {
    const shapeRight = shape.x + shape.r * 2;
    const shapeBottom = shape.y + shape.r * 2;
    const shapeLeft = shape.x - shape.r * 2;
    const shapeTop = shape.y - shape.r * 2;
    return (
      shapeLeft >= minX &&
      shapeTop >= minY &&
      shapeRight <= maxX &&
      shapeBottom <= maxY
    );
  } else if (shape.type === "line" || shape.type === "pencil") {
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
  } else if (shape.type === "text" || shape.type === "image") {
    const shapeWidth = (shape as any).width || 100;
    const shapeHeight = (shape as any).height || 100;
    const shapeRight = shape.x + shapeWidth;
    const shapeBottom = shape.y + shapeHeight;
    return (
      shape.x >= minX &&
      shape.y >= minY &&
      shapeRight <= maxX &&
      shapeBottom <= maxY
    );
  }
  return false;
};

// Get distance between two touch points
export const getDistance = (p1: any, p2: any) => {
  const dx = p1.clientX - p2.clientX;
  const dy = p1.clientY - p2.clientY;
  return Math.hypot(dx, dy);
};
