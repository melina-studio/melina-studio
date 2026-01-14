import Konva from "konva";
import { Shape } from "@/lib/konavaTypes";

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
          points: shape.data?.points ?? [],
          stroke: shape.data?.stroke,
          strokeWidth: shape.data?.strokeWidth,
        };
      }
      if (shape.type === "pencil") {
        return {
          ...baseShape,
          points: shape.data?.points ?? [],
          stroke: shape.data?.stroke,
          strokeWidth: shape.data?.strokeWidth,
          tension: shape.data?.tension,
        };
      }
      if (shape.type === "arrow") {
        return {
          ...baseShape,
          points: shape.data?.points ?? [],
          stroke: shape.data?.stroke,
          strokeWidth: shape.data?.strokeWidth,
        };
      }
      if (shape.type === "eraser") {
        return {
          ...baseShape,
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

export const getBoardStateSnapshot = async (
  stageRef: any,
  bgColor = "#000000",
  pixelRatio = 2
) => {
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
  const finalBlob = await new Promise<Blob>((res) =>
    off.toBlob((b) => res(b!), "image/png")
  );

  return {
    dataURL: finalDataURL,
    blob: finalBlob,
  };
};
