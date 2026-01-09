import React, { useState } from "react";
import { Stage, Layer, Circle, Ellipse, Path, Line } from "react-konva";

export default function ElephantDrawing() {
  const [shapes] = useState([
    // Body
    {
      type: "ellipse",
      x: 300,
      y: 300,
      radiusX: 120,
      radiusY: 90,
      fill: "#A9A9A9",
      stroke: "#696969",
      strokeWidth: 2,
    },

    // Head
    {
      type: "ellipse",
      x: 200,
      y: 220,
      radiusX: 70,
      radiusY: 65,
      fill: "#A9A9A9",
      stroke: "#696969",
      strokeWidth: 2,
    },

    // Ears (left)
    {
      type: "ellipse",
      x: 160,
      y: 180,
      radiusX: 45,
      radiusY: 60,
      fill: "#909090",
      stroke: "#696969",
      strokeWidth: 2,
      rotation: -20,
    },

    // Ears (right)
    {
      type: "ellipse",
      x: 240,
      y: 180,
      radiusX: 45,
      radiusY: 60,
      fill: "#909090",
      stroke: "#696969",
      strokeWidth: 2,
      rotation: 20,
    },

    // Trunk
    {
      type: "path",
      data: "M 200 260 Q 150 300 140 360 Q 135 380 145 390 Q 155 385 160 370 Q 170 320 220 280",
      fill: "#A9A9A9",
      stroke: "#696969",
      strokeWidth: 2,
    },

    // Eyes (left)
    { type: "circle", x: 180, y: 210, radius: 8, fill: "#000000" },

    // Eyes (right)
    { type: "circle", x: 220, y: 210, radius: 8, fill: "#000000" },

    // Tusks (left)
    {
      type: "path",
      data: "M 180 250 Q 170 270 165 285",
      stroke: "#FFFFFF",
      strokeWidth: 6,
      lineCap: "round",
    },

    // Tusks (right)
    {
      type: "path",
      data: "M 220 250 Q 230 270 235 285",
      stroke: "#FFFFFF",
      strokeWidth: 6,
      lineCap: "round",
    },

    // Skirt - waistband
    {
      type: "ellipse",
      x: 300,
      y: 355,
      radiusX: 100,
      radiusY: 15,
      fill: "#FF69B4",
      stroke: "#FF1493",
      strokeWidth: 2,
    },

    // Skirt - main body (ruffled effect with multiple curves)
    {
      type: "path",
      data: "M 200 355 Q 190 380 200 405 Q 220 395 240 405 Q 260 395 280 405 Q 300 395 320 405 Q 340 395 360 405 Q 380 395 400 405 Q 410 380 400 355 Z",
      fill: "#FFB6C1",
      stroke: "#FF1493",
      strokeWidth: 2,
    },

    // Skirt - bottom ruffle
    {
      type: "path",
      data: "M 200 405 Q 220 415 240 405 Q 260 415 280 405 Q 300 415 320 405 Q 340 415 360 405 Q 380 415 400 405",
      stroke: "#FF1493",
      strokeWidth: 2,
      fill: "none",
    },

    // Legs (front-left)
    {
      type: "ellipse",
      x: 260,
      y: 400,
      radiusX: 20,
      radiusY: 50,
      fill: "#A9A9A9",
      stroke: "#696969",
      strokeWidth: 2,
    },

    // Legs (front-right)
    {
      type: "ellipse",
      x: 310,
      y: 400,
      radiusX: 20,
      radiusY: 50,
      fill: "#A9A9A9",
      stroke: "#696969",
      strokeWidth: 2,
    },

    // Legs (back-left)
    {
      type: "ellipse",
      x: 330,
      y: 400,
      radiusX: 20,
      radiusY: 50,
      fill: "#909090",
      stroke: "#696969",
      strokeWidth: 2,
    },

    // Legs (back-right)
    {
      type: "ellipse",
      x: 380,
      y: 400,
      radiusX: 20,
      radiusY: 50,
      fill: "#909090",
      stroke: "#696969",
      strokeWidth: 2,
    },

    // Shoes - front-left
    {
      type: "ellipse",
      x: 260,
      y: 455,
      radiusX: 28,
      radiusY: 12,
      fill: "#FF1493",
      stroke: "#C71585",
      strokeWidth: 2,
    },
    {
      type: "circle",
      x: 250,
      y: 455,
      radius: 4,
      fill: "#FFD700",
      stroke: "#FFA500",
      strokeWidth: 1,
    },

    // Shoes - front-right
    {
      type: "ellipse",
      x: 310,
      y: 455,
      radiusX: 28,
      radiusY: 12,
      fill: "#FF1493",
      stroke: "#C71585",
      strokeWidth: 2,
    },
    {
      type: "circle",
      x: 300,
      y: 455,
      radius: 4,
      fill: "#FFD700",
      stroke: "#FFA500",
      strokeWidth: 1,
    },

    // Shoes - back-left
    {
      type: "ellipse",
      x: 330,
      y: 455,
      radiusX: 28,
      radiusY: 12,
      fill: "#FF1493",
      stroke: "#C71585",
      strokeWidth: 2,
    },
    {
      type: "circle",
      x: 320,
      y: 455,
      radius: 4,
      fill: "#FFD700",
      stroke: "#FFA500",
      strokeWidth: 1,
    },

    // Shoes - back-right
    {
      type: "ellipse",
      x: 380,
      y: 455,
      radiusX: 28,
      radiusY: 12,
      fill: "#FF1493",
      stroke: "#C71585",
      strokeWidth: 2,
    },
    {
      type: "circle",
      x: 370,
      y: 455,
      radius: 4,
      fill: "#FFD700",
      stroke: "#FFA500",
      strokeWidth: 1,
    },

    // Tail
    {
      type: "line",
      points: [410, 300, 450, 320, 455, 340],
      stroke: "#696969",
      strokeWidth: 4,
      lineCap: "round",
      lineJoin: "round",
    },
  ]);

  const renderShape = (shape: any, index: number) => {
    switch (shape.type) {
      case "circle":
        return <Circle key={index} {...shape} />;
      case "ellipse":
        return <Ellipse key={index} {...shape} />;
      case "path":
        return <Path key={index} {...shape} />;
      case "line":
        return <Line key={index} {...shape} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-green-100 p-8">
      <h1 className="text-3xl font-bold mb-4 text-gray-800">
        React Konva Elephant
      </h1>
      <div className="bg-white rounded-lg shadow-2xl p-4">
        <Stage width={600} height={500}>
          <Layer>
            {shapes.map((shape, index) => renderShape(shape, index))}
          </Layer>
        </Stage>
      </div>
      <div className="mt-6 p-4 bg-white rounded-lg shadow-lg max-w-2xl">
        <h2 className="text-xl font-semibold mb-2">Shape State Format:</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
          {JSON.stringify(shapes.slice(0, 3), null, 2)}...
        </pre>
      </div>
    </div>
  );
}
