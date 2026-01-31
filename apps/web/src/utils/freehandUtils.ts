import getStroke from "perfect-freehand";

export type FreehandOptions = {
  size?: number;
  thinning?: number;
  smoothing?: number;
  streamline?: number;
  simulatePressure?: boolean;
};

/**
 * Convert flat points array [x1, y1, x2, y2, ...] to format perfect-freehand expects [[x1, y1], [x2, y2], ...]
 */
export function flatPointsToInputPoints(flatPoints: number[]): number[][] {
  const points: number[][] = [];
  for (let i = 0; i < flatPoints.length; i += 2) {
    points.push([flatPoints[i], flatPoints[i + 1]]);
  }
  return points;
}

/**
 * Convert stroke outline points to SVG path data using quadratic bezier curves
 */
export function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return "";

  const d: string[] = [];

  const [first, ...rest] = stroke;

  d.push(`M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`);

  if (rest.length === 0) {
    return d.join(" ");
  }

  if (rest.length === 1) {
    d.push(`L ${rest[0][0].toFixed(2)} ${rest[0][1].toFixed(2)}`);
    return d.join(" ");
  }

  for (let i = 0; i < rest.length; i++) {
    const [x0, y0] = rest[i];
    const [x1, y1] = rest[(i + 1) % rest.length];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    d.push(`Q ${x0.toFixed(2)} ${y0.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`);
  }

  d.push("Z");
  return d.join(" ");
}

/**
 * Main function to convert flat points array to SVG path data for freehand stroke
 */
export function getFreehandPath(
  flatPoints: number[],
  options: FreehandOptions = {}
): string {
  const {
    size = 8,
    thinning = 0.5,
    smoothing = 0.5,
    streamline = 0.5,
    simulatePressure = true,
  } = options;

  const inputPoints = flatPointsToInputPoints(flatPoints);

  if (inputPoints.length < 2) {
    return "";
  }

  const strokePoints = getStroke(inputPoints, {
    size,
    thinning,
    smoothing,
    streamline,
    simulatePressure,
    last: true,
  });

  return getSvgPathFromStroke(strokePoints);
}
