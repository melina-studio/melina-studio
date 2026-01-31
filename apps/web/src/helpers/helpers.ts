import Konva from "konva";
import { Shape } from "@/lib/konavaTypes";

/**
 * Convert a single backend shape to frontend format.
 * Used for real-time WebSocket events where shapes arrive one at a time.
 */
export const convertBackendShape = (shape: any): Shape | null => {
  if (!shape || !shape.type) {
    return null;
  }

  // Get the ID - could be uuid (backend) or id (frontend/agent)
  const id = shape.uuid || shape.id;
  if (!id) {
    return null;
  }

  const baseShape = {
    id,
    type: shape.type,
    imageUrl: shape.image_url,
  };

  // Check if data is wrapped in .data field (backend format) or at top level (frontend format)
  const data = shape.data || shape;

  switch (shape.type) {
    case "rect":
      return {
        ...baseShape,
        x: data.x ?? 0,
        y: data.y ?? 0,
        w: data.w ?? 0,
        h: data.h ?? 0,
        fill: data.fill,
        stroke: data.stroke,
        strokeWidth: data.strokeWidth,
      };

    case "frame":
      return {
        ...baseShape,
        x: data.x ?? 0,
        y: data.y ?? 0,
        w: data.w ?? 0,
        h: data.h ?? 0,
        fill: data.fill,
        stroke: data.stroke,
        strokeWidth: data.strokeWidth,
        name: data.name,
      };

    case "circle":
      return {
        ...baseShape,
        x: data.x ?? 0,
        y: data.y ?? 0,
        r: data.r ?? 0,
        fill: data.fill,
        stroke: data.stroke,
        strokeWidth: data.strokeWidth,
      };

    case "ellipse":
      return {
        ...baseShape,
        x: data.x ?? 0,
        y: data.y ?? 0,
        radiusX: data.radiusX ?? 0,
        radiusY: data.radiusY ?? 0,
        fill: data.fill,
        stroke: data.stroke,
        strokeWidth: data.strokeWidth,
        rotation: data.rotation,
      };

    case "path":
      return {
        ...baseShape,
        data: data.data ?? "",
        x: data.x,
        y: data.y,
        fill: data.fill,
        stroke: data.stroke,
        strokeWidth: data.strokeWidth,
        lineCap: data.lineCap,
        lineJoin: data.lineJoin,
      };

    case "line":
      return {
        ...baseShape,
        x: data.x ?? 0,
        y: data.y ?? 0,
        points: data.points ?? [],
        stroke: data.stroke,
        strokeWidth: data.strokeWidth,
      };

    case "pencil":
      return {
        ...baseShape,
        x: data.x ?? 0,
        y: data.y ?? 0,
        points: data.points ?? [],
        fill: data.fill,
        stroke: data.stroke,
        strokeWidth: data.strokeWidth,
        tension: data.tension,
      };

    case "arrow":
      // Handle both new format (start, end, bend) and legacy format (points)
      if (data.start && data.end) {
        return {
          ...baseShape,
          start: data.start,
          end: data.end,
          bend: data.bend ?? 0,
          stroke: data.stroke,
          strokeWidth: data.strokeWidth,
          arrowHeadSize: data.arrowHeadSize,
        };
      } else {
        // Legacy format
        return {
          ...baseShape,
          start: { x: 0, y: 0 },
          end: { x: 0, y: 0 },
          bend: 0,
          x: data.x ?? 0,
          y: data.y ?? 0,
          points: data.points ?? [],
          stroke: data.stroke,
          strokeWidth: data.strokeWidth,
        };
      }

    case "eraser":
      return {
        ...baseShape,
        x: data.x ?? 0,
        y: data.y ?? 0,
        points: data.points ?? [],
        stroke: data.stroke,
        strokeWidth: data.strokeWidth,
      };

    case "text":
      return {
        ...baseShape,
        text: data.text ?? "",
        x: data.x ?? 0,
        y: data.y ?? 0,
        fontSize: data.fontSize,
        fontFamily: data.fontFamily,
        fill: data.fill,
      };

    case "image":
      return {
        ...baseShape,
        src: data.src ?? "",
        x: data.x ?? 0,
        y: data.y ?? 0,
        width: data.width,
        height: data.height,
      };

    default:
      console.warn(`convertBackendShape: Unknown shape type: ${shape.type}`);
      return null;
  }
};

export const buildShapes = (data: any): Shape[] => {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data
    .map((shape: any): Shape | null => {
      if (!shape || !shape.uuid || !shape.type) {
        return null;
      }

      const baseShape = {
        id: shape.uuid,
        type: shape.type,
        imageUrl: shape.image_url, // Map from backend snake_case to frontend camelCase
      };

      if (shape.type === "rect") {
        return {
          ...baseShape,
          x: shape.data?.x ?? 0,
          y: shape.data?.y ?? 0,
          w: shape.data?.w ?? 0,
          h: shape.data?.h ?? 0,
          fill: shape.data?.fill,
          stroke: shape.data?.stroke,
          strokeWidth: shape.data?.strokeWidth,
        };
      }
      if (shape.type === "frame") {
        return {
          ...baseShape,
          x: shape.data?.x ?? 0,
          y: shape.data?.y ?? 0,
          w: shape.data?.w ?? 0,
          h: shape.data?.h ?? 0,
          fill: shape.data?.fill,
          stroke: shape.data?.stroke,
          strokeWidth: shape.data?.strokeWidth,
          name: shape.data?.name,
        };
      }
      if (shape.type === "circle") {
        return {
          ...baseShape,
          x: shape.data?.x ?? 0,
          y: shape.data?.y ?? 0,
          r: shape.data?.r ?? 0,
          fill: shape.data?.fill,
          stroke: shape.data?.stroke,
          strokeWidth: shape.data?.strokeWidth,
        };
      }
      if (shape.type === "ellipse") {
        return {
          ...baseShape,
          x: shape.data?.x ?? 0,
          y: shape.data?.y ?? 0,
          radiusX: shape.data?.radiusX ?? 0,
          radiusY: shape.data?.radiusY ?? 0,
          fill: shape.data?.fill,
          stroke: shape.data?.stroke,
          strokeWidth: shape.data?.strokeWidth,
          rotation: shape.data?.rotation,
        };
      }
      if (shape.type === "path") {
        return {
          ...baseShape,
          data: shape.data?.data ?? "",
          x: shape.data?.x,
          y: shape.data?.y,
          fill: shape.data?.fill,
          stroke: shape.data?.stroke,
          strokeWidth: shape.data?.strokeWidth,
          lineCap: shape.data?.lineCap,
          lineJoin: shape.data?.lineJoin,
        };
      }
      if (shape.type === "line") {
        return {
          ...baseShape,
          x: shape.data?.x ?? 0,
          y: shape.data?.y ?? 0,
          points: shape.data?.points ?? [],
          stroke: shape.data?.stroke,
          strokeWidth: shape.data?.strokeWidth,
        };
      }
      if (shape.type === "pencil") {
        return {
          ...baseShape,
          x: shape.data?.x ?? 0,
          y: shape.data?.y ?? 0,
          points: shape.data?.points ?? [],
          fill: shape.data?.fill,
          stroke: shape.data?.stroke,
          strokeWidth: shape.data?.strokeWidth,
          tension: shape.data?.tension,
        };
      }
      if (shape.type === "arrow") {
        // Handle both new format (start, end, bend) and legacy format (points)
        if (shape.data?.start && shape.data?.end) {
          // New format
          return {
            ...baseShape,
            start: shape.data.start,
            end: shape.data.end,
            bend: shape.data.bend ?? 0,
            stroke: shape.data?.stroke,
            strokeWidth: shape.data?.strokeWidth,
            arrowHeadSize: shape.data?.arrowHeadSize,
          };
        } else {
          // Legacy format - include legacy fields for conversion at render time
          return {
            ...baseShape,
            start: { x: 0, y: 0 }, // Will be converted from points
            end: { x: 0, y: 0 },
            bend: 0,
            x: shape.data?.x ?? 0,
            y: shape.data?.y ?? 0,
            points: shape.data?.points ?? [],
            stroke: shape.data?.stroke,
            strokeWidth: shape.data?.strokeWidth,
          };
        }
      }
      if (shape.type === "eraser") {
        return {
          ...baseShape,
          x: shape.data?.x ?? 0,
          y: shape.data?.y ?? 0,
          points: shape.data?.points ?? [],
          stroke: shape.data?.stroke,
          strokeWidth: shape.data?.strokeWidth,
        };
      }
      if (shape.type === "text") {
        return {
          ...baseShape,
          text: shape.data?.text ?? "",
          x: shape.data?.x ?? 0,
          y: shape.data?.y ?? 0,
          fontSize: shape.data?.fontSize,
          fontFamily: shape.data?.fontFamily,
          fill: shape.data?.fill,
        };
      }
      if (shape.type === "image") {
        return {
          ...baseShape,
          src: shape.data?.src ?? "",
          x: shape.data?.x ?? 0,
          y: shape.data?.y ?? 0,
          width: shape.data?.width,
          height: shape.data?.height,
        };
      }

      // Return null for unknown shape types instead of undefined
      console.warn(`Unknown shape type: ${shape.type}`);
      return null;
    })
    .filter((shape): shape is Shape => shape !== null && shape !== undefined);
};

export const getBoardStateSnapshot = async (stageRef: any, bgColor = "#000000", pixelRatio = 2) => {
  const stage = stageRef.current as any;
  if (!stage) throw new Error("stageRef missing");

  // create a temporary background rect on a new layer (so we don't disturb UI)
  const bgLayer = new Konva.Layer();
  const w = stage.width();
  const h = stage.height();

  const bgRect = new Konva.Rect({
    x: 0,
    y: 0,
    width: w,
    height: h,
    fill: bgColor,
  });

  bgLayer.add(bgRect);
  // insert below other layers by adding it and moving to bottom — ensure it's the lowest z
  stage.add(bgLayer);
  bgLayer.moveToBottom();
  bgLayer.batchDraw();

  // export (you can use toBlob for memory-friendly, toDataURL for simple)
  const dataURL = stage.toDataURL({ pixelRatio, mimeType: "image/png" });
  // cleanup: remove the bg layer so app returns to normal
  bgLayer.destroy();
  stage.batchDraw();

  // optional: convert to Blob
  const blob = await (await fetch(dataURL)).blob();
  return { dataURL, blob };
};

export const exportCompositedImageWithBoth = async (
  stageRef: any,
  bgColor = "#000000",
  pixelRatio = 2
): Promise<{ dataURL: string; blob: Blob }> => {
  const stage = stageRef.current as any;
  if (!stage) throw new Error("stageRef missing");

  // Step 1: render stage to PNG
  const stageDataUrl = stage.toDataURL({
    pixelRatio,
    mimeType: "image/png",
  });

  // Wait for stage image to load in memory
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = stageDataUrl; // load exported stage PNG
  });

  // Step 2: create an offscreen canvas to composite
  const exportW = stage.width() * pixelRatio;
  const exportH = stage.height() * pixelRatio;

  const off = document.createElement("canvas");
  off.width = exportW;
  off.height = exportH;

  const ctx = off.getContext("2d")!;
  if (!ctx) throw new Error("Canvas context missing");

  // Step 3: fill with background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, exportW, exportH);

  // Step 4: draw stage image on top
  ctx.drawImage(img, 0, 0, exportW, exportH);

  // Step 5: convert final canvas → dataURL
  const finalDataURL = off.toDataURL("image/png");

  // Step 6: convert final canvas → Blob
  const finalBlob = await new Promise<Blob>((res) => off.toBlob((b) => res(b!), "image/png"));

  return {
    dataURL: finalDataURL,
    blob: finalBlob,
  };
};
