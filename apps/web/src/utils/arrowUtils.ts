import { getArrow } from "perfect-arrows";

export type ArrowPoints = {
  sx: number; // Start X
  sy: number; // Start Y
  cx: number; // Control point X (for quadratic bezier)
  cy: number; // Control point Y
  ex: number; // End X
  ey: number; // End Y
  endAngle: number; // Angle at end point (for arrow head rotation)
};

/**
 * Calculate the bend point position from start, end, and bend value.
 * The bend value is the perpendicular distance from the midpoint.
 */
export function getBendPoint(
  start: { x: number; y: number },
  end: { x: number; y: number },
  bend: number
): { x: number; y: number } {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  // Calculate perpendicular vector
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return { x: midX, y: midY };

  // Perpendicular unit vector (rotate 90 degrees counterclockwise)
  const perpX = -dy / length;
  const perpY = dx / length;

  // Scale by bend value
  return {
    x: midX + perpX * bend,
    y: midY + perpY * bend,
  };
}

/**
 * Calculate bend value from a dragged bend point position.
 * Projects the bend point onto the perpendicular of the line.
 */
export function getBendFromPoint(
  start: { x: number; y: number },
  end: { x: number; y: number },
  bendPoint: { x: number; y: number }
): number {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return 0;

  // Perpendicular unit vector
  const perpX = -dy / length;
  const perpY = dx / length;

  // Project the bend point offset onto the perpendicular
  const offsetX = bendPoint.x - midX;
  const offsetY = bendPoint.y - midY;

  return offsetX * perpX + offsetY * perpY;
}

/**
 * Get arrow path data for rendering.
 * Uses perfect-arrows library for curve calculations.
 */
export function getArrowPathData(
  start: { x: number; y: number },
  end: { x: number; y: number },
  bend: number
): ArrowPoints {
  // Calculate the bow parameter for perfect-arrows based on bend
  // perfect-arrows expects bow as a normalized value
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Normalize bend to a bow value (bend is in pixels, bow is typically 0-1)
  const bow = distance > 0 ? (bend / distance) * 2 : 0;

  const [sx, sy, cx, cy, ex, ey, endAngle] = getArrow(
    start.x,
    start.y,
    end.x,
    end.y,
    {
      bow: bow,
      stretch: 0,
      stretchMin: 0,
      stretchMax: 0,
      padStart: 0,
      padEnd: 0,
      flip: false,
      straights: true,
    }
  );

  return { sx, sy, cx, cy, ex, ey, endAngle };
}

/**
 * Generate SVG path data for the arrow curve (quadratic bezier).
 */
export function getArrowSvgPath(arrow: ArrowPoints): string {
  const { sx, sy, cx, cy, ex, ey } = arrow;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

/**
 * Generate SVG path data for the arrow head (filled triangle).
 */
export function getArrowHeadPath(
  ex: number,
  ey: number,
  angle: number,
  size: number = 12
): string {
  // Arrow head points (triangle pointing in the direction of the angle)
  const angle1 = angle + Math.PI * 0.8; // ~144 degrees from arrow direction
  const angle2 = angle - Math.PI * 0.8; // ~-144 degrees

  const x1 = ex + Math.cos(angle1) * size;
  const y1 = ey + Math.sin(angle1) * size;
  const x2 = ex + Math.cos(angle2) * size;
  const y2 = ey + Math.sin(angle2) * size;

  return `M ${ex.toFixed(2)} ${ey.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

/**
 * Check if an arrow has the old format (points array) and convert to new format.
 * Used for backward compatibility with existing arrows in the database.
 */
export function convertLegacyArrow(arrow: any): {
  start: { x: number; y: number };
  end: { x: number; y: number };
  bend: number;
} | null {
  // Check if this is the old format with points array
  if (arrow.points && Array.isArray(arrow.points) && arrow.points.length >= 4) {
    const offsetX = arrow.x || 0;
    const offsetY = arrow.y || 0;
    return {
      start: { x: arrow.points[0] + offsetX, y: arrow.points[1] + offsetY },
      end: { x: arrow.points[2] + offsetX, y: arrow.points[3] + offsetY },
      bend: 0,
    };
  }
  return null;
}
