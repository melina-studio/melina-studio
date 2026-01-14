import { useTheme } from "next-themes";
import { Shape } from "@/lib/konavaTypes";

export const useCanvasExport = (getSelectedShapes: () => Shape[]) => {
  const { theme } = useTheme();

  const exportSelectedShapesJSON = () => {
    const selectedShapes = getSelectedShapes();
    const jsonString = JSON.stringify(selectedShapes, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "selected-shapes.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSelectedShapesImage = async () => {
    const selectedShapes = getSelectedShapes();

    if (selectedShapes.length === 0) {
      alert("No shapes selected!");
      return;
    }

    // Find bounding box of all selected shapes
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    let hasValidShape = false;

    selectedShapes.forEach((shape) => {
      // Handle shapes with x, y, width, height (rect, circle, text, image)
      if ("x" in shape && "y" in shape) {
        const x = (shape as any).x;
        const y = (shape as any).y;

        let width = 0;
        let height = 0;

        if (shape.type === "rect") {
          width = (shape as any).w || 0;
          height = (shape as any).h || 0;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + width);
          maxY = Math.max(maxY, y + height);
          hasValidShape = true;
        } else if (shape.type === "circle") {
          const radius = (shape as any).r || 0;
          minX = Math.min(minX, x - radius);
          minY = Math.min(minY, y - radius);
          maxX = Math.max(maxX, x + radius);
          maxY = Math.max(maxY, y + radius);
          hasValidShape = true;
        } else if (shape.type === "text" || shape.type === "image") {
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
      else if (
        shape.type === "line" ||
        shape.type === "pencil" ||
        shape.type === "eraser"
      ) {
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
      alert("Could not calculate bounding box for selected shapes!");
      return;
    }

    const width = maxX - minX;
    const height = maxY - minY;

    // Ensure minimum size
    if (width <= 0 || height <= 0) {
      alert("Selected shapes have invalid dimensions!");
      return;
    }

    // Add padding
    const padding = 20;
    const finalWidth = width + padding * 2;
    const finalHeight = height + padding * 2;

    try {
      // Import Konva dynamically
      const Konva = (await import("konva")).default;

      // Create a temporary stage (off-screen)
      const tempStage = new Konva.Stage({
        container: document.createElement("div"),
        width: finalWidth,
        height: finalHeight,
      });

      const tempLayer = new Konva.Layer();
      tempStage.add(tempLayer);

      // Get stroke color from theme
      const strokeColor = theme === "dark" ? "#fff" : "#111";

      // Render each selected shape on the temporary stage
      selectedShapes.forEach((shape) => {
        // Calculate offset (move shapes so they start from padding, padding)
        const offsetX = -minX + padding;
        const offsetY = -minY + padding;

        if (shape.type === "rect") {
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
        } else if (shape.type === "circle") {
          const circle = new Konva.Circle({
            x: (shape as any).x + offsetX,
            y: (shape as any).y + offsetY,
            radius: (shape as any).r,
            fill: (shape as any).fill,
            stroke: (shape as any).stroke || strokeColor,
            strokeWidth: (shape as any).strokeWidth || 2,
          });
          tempLayer.add(circle);
        } else if (shape.type === "ellipse") {
          const ellipse = new Konva.Ellipse({
            x: (shape as any).x + offsetX,
            y: (shape as any).y + offsetY,
            radiusX: (shape as any).radiusX,
            radiusY: (shape as any).radiusY,
            fill: (shape as any).fill,
            stroke: (shape as any).stroke || strokeColor,
            strokeWidth: (shape as any).strokeWidth || 2,
            rotation: (shape as any).rotation || 0,
          });
          tempLayer.add(ellipse);
        } else if (shape.type === "path") {
          const path = new Konva.Path({
            data: (shape as any).data,
            fill: (shape as any).fill,
            stroke: (shape as any).stroke || strokeColor,
            strokeWidth: (shape as any).strokeWidth || 2,
            lineCap: (shape as any).lineCap || "round",
            lineJoin: (shape as any).lineJoin || "round",
          });
          tempLayer.add(path);
        } else if (
          shape.type === "line" ||
          shape.type === "pencil" ||
          shape.type === "eraser"
        ) {
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
            lineCap: "round",
            lineJoin: "round",
          });
          tempLayer.add(line);
        } else if (shape.type === "text") {
          const text = new Konva.Text({
            x: (shape as any).x + offsetX,
            y: (shape as any).y + offsetY,
            text: (shape as any).text,
            fontSize: (shape as any).fontSize || 16,
            fontFamily: (shape as any).fontFamily || "Arial",
            fill: (shape as any).fill || strokeColor,
          });
          tempLayer.add(text);
        } else if (shape.type === "image") {
          // For images, we need to load them first
          const img = new Image();
          img.crossOrigin = "anonymous";
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
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Export the temporary stage
      const dataURL = tempStage.toDataURL({
        pixelRatio: 2, // Higher quality
      });

      // Clean up
      tempStage.destroy();

      if (!dataURL || dataURL === "data:,") {
        throw new Error("Failed to generate image data");
      }

      const a = document.createElement("a");
      a.href = dataURL;
      a.download = "selected-shapes.png";
      a.click();
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export image. Please try again.");
    }
  };

  const captureSelectedShapesSnapshot = async () => {
    const selectedShapes = getSelectedShapes();

    if (!selectedShapes || selectedShapes.length === 0) {
      throw new Error("No shapes selected");
    }

    // --------------------------------------------------
    // 1. Compute bounding box of selected shapes
    // --------------------------------------------------
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    let hasValidShape = false;

    selectedShapes.forEach((shape) => {
      // Shapes with x/y
      if ("x" in shape && "y" in shape) {
        const x = (shape as any).x;
        const y = (shape as any).y;

        if (shape.type === "rect") {
          const w = (shape as any).w || 0;
          const h = (shape as any).h || 0;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + w);
          maxY = Math.max(maxY, y + h);
          hasValidShape = true;
        } else if (shape.type === "circle") {
          const r = (shape as any).r || 0;
          minX = Math.min(minX, x - r);
          minY = Math.min(minY, y - r);
          maxX = Math.max(maxX, x + r);
          maxY = Math.max(maxY, y + r);
          hasValidShape = true;
        } else if (shape.type === "text" || shape.type === "image") {
          const w = (shape as any).width || 120;
          const h = (shape as any).height || 40;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + w);
          maxY = Math.max(maxY, y + h);
          hasValidShape = true;
        }
      }

      // Line / Pencil / Eraser (points[])
      else if (
        shape.type === "line" ||
        shape.type === "pencil" ||
        shape.type === "eraser"
      ) {
        const points = (shape as any).points || [];
        for (let i = 0; i < points.length; i += 2) {
          minX = Math.min(minX, points[i]);
          minY = Math.min(minY, points[i + 1]);
          maxX = Math.max(maxX, points[i]);
          maxY = Math.max(maxY, points[i + 1]);
        }
        hasValidShape = true;
      }
    });

    if (!hasValidShape || minX === Infinity || minY === Infinity) {
      throw new Error("Failed to calculate bounds for selection");
    }

    // --------------------------------------------------
    // 2. Add padding & final dimensions
    // --------------------------------------------------
    const padding = 20;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    if (contentWidth <= 0 || contentHeight <= 0) {
      throw new Error("Invalid selection dimensions");
    }

    const finalWidth = contentWidth + padding * 2;
    const finalHeight = contentHeight + padding * 2;

    // --------------------------------------------------
    // 3. Create off-screen Konva stage
    // --------------------------------------------------
    const Konva = (await import("konva")).default;

    const tempStage = new Konva.Stage({
      container: document.createElement("div"),
      width: finalWidth,
      height: finalHeight,
    });

    const tempLayer = new Konva.Layer();
    tempStage.add(tempLayer);

    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    const strokeColor = theme === "dark" ? "#ffffff" : "#111111";

    // --------------------------------------------------
    // 4. Re-render selected shapes onto temp stage
    // --------------------------------------------------
    for (const shape of selectedShapes) {
      if (shape.type === "rect") {
        tempLayer.add(
          new Konva.Rect({
            x: (shape as any).x + offsetX,
            y: (shape as any).y + offsetY,
            width: (shape as any).w,
            height: (shape as any).h,
            fill: (shape as any).fill,
            stroke: (shape as any).stroke || strokeColor,
            strokeWidth: (shape as any).strokeWidth || 2,
            cornerRadius: 8,
          })
        );
      } else if (shape.type === "circle") {
        tempLayer.add(
          new Konva.Circle({
            x: (shape as any).x + offsetX,
            y: (shape as any).y + offsetY,
            radius: (shape as any).r,
            fill: (shape as any).fill,
            stroke: (shape as any).stroke || strokeColor,
            strokeWidth: (shape as any).strokeWidth || 2,
          })
        );
      } else if (
        shape.type === "line" ||
        shape.type === "pencil" ||
        shape.type === "eraser"
      ) {
        const pts = (shape as any).points || [];
        const offsetPts: number[] = [];
        for (let i = 0; i < pts.length; i += 2) {
          offsetPts.push(pts[i] + offsetX, pts[i + 1] + offsetY);
        }

        tempLayer.add(
          new Konva.Line({
            points: offsetPts,
            stroke: (shape as any).stroke || strokeColor,
            strokeWidth: (shape as any).strokeWidth || 2,
            lineCap: "round",
            lineJoin: "round",
          })
        );
      } else if (shape.type === "text") {
        tempLayer.add(
          new Konva.Text({
            x: (shape as any).x + offsetX,
            y: (shape as any).y + offsetY,
            text: (shape as any).text,
            fontSize: (shape as any).fontSize || 16,
            fontFamily: (shape as any).fontFamily || "Arial",
            fill: (shape as any).fill || strokeColor,
          })
        );
      } else if (shape.type === "image") {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            tempLayer.add(
              new Konva.Image({
                x: (shape as any).x + offsetX,
                y: (shape as any).y + offsetY,
                image: img,
                width: (shape as any).width || 150,
                height: (shape as any).height || 150,
              })
            );
            resolve();
          };
          img.src = (shape as any).src;
        });
      }
    }

    tempLayer.draw();

    // --------------------------------------------------
    // 5. Export snapshot (image only, no download)
    // --------------------------------------------------
    const dataURL = tempStage.toDataURL({ pixelRatio: 2 });
    const blob = await (await fetch(dataURL)).blob();

    tempStage.destroy();

    // --------------------------------------------------
    // 6. Return AI-ready payload
    // --------------------------------------------------
    return {
      shapes: selectedShapes, // structured JSON for Melina
      image: {
        blob, // for upload
        dataURL, // optional preview
        mimeType: "image/png",
      },
      bounds: {
        minX,
        minY,
        maxX,
        maxY,
        width: finalWidth,
        height: finalHeight,
        padding,
      },
    };
  };

  return {
    exportSelectedShapesJSON,
    exportSelectedShapesImage,
    captureSelectedShapesSnapshot,
  };
};
