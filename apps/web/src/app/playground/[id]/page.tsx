// app/playground/[id]/page.tsx
"use client";
import { useParams, useRouter } from "next/navigation";
import { Download, Menu, Redo, StepBack, Undo } from "lucide-react";
import { KonvaEventObject } from "konva/lib/Node";
import { useRef, useState, useEffect, act } from "react";
import { useTheme } from "next-themes";
import { DotBackground } from "@/components/ui/aceternity/DotBackground";
import { ACTION_BUTTONS, ACTIONS, COLORS, Shape } from "@/lib/konavaTypes";
import KonvaCanvas from "@/components/custom/KonvaCanvas";
import { HISTORY_LIMIT } from "@/lib/constants";
import ToolControls from "@/components/custom/ToolControls";

// types
type History = {
  past: Shape[][];
  present: Shape[]; // current shapes
  future: Shape[][];
};

// helpers
const cloneShapes = (s: Shape[]) => JSON.parse(JSON.stringify(s)); // simple deep copy

export default function BoardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [open, setOpen] = useState(true);
  const id = params.id;
  const stageRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [activeTool, setActiveTool] = useState<string>(ACTIONS.SELECT);
  const { theme } = useTheme();

  // stroke color
  const currentColor = theme === "dark" ? "#fff" : "#111";
  const [activeColor, setActiveColor] = useState<string>(currentColor);

  // replace your shapes state with history state
  const [history, setHistory] = useState<History>({
    past: [],
    present: [],
    future: [],
  });

  const handleBack = () => router.back();
  const present_shapes = history.present;
  // undo / redo handlers
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const resetActionClick = () => {
    setActiveTool(ACTIONS.SELECT);
  };

  function handleActiveTool(toolName: string) {
    if (toolName in ACTIONS) {
      setActiveTool(toolName);
    }
  }

  function handleActiveColor(colorName: string) {
    setActiveColor(colorName);
  }

  const toolbarToggle = () => {
    setOpen((v) => !v);
    resetActionClick();
  };

  const exportImage = () => {
    const image = (stageRef.current as any).toDataURL();
    if (image) {
      const a = document.createElement("a");
      a.href = image;
      a.download = "image.png";
      a.click();
    }
  };

  const setShapesWithHistory = (
    newShapes: Shape[],
    opts?: { pushHistory?: boolean; stateToPush?: Shape[] }
  ) => {
    // default: pushHistory false (for live updates)
    const pushHistory = opts?.pushHistory ?? false;
    const stateToPush = opts?.stateToPush;

    setHistory((cur) => {
      if (!pushHistory) {
        // update present only (no history change)
        return { ...cur, present: newShapes };
      }
      // push snapshot to past, clear future
      // Use provided stateToPush, or fall back to current present
      const stateToPushToHistory =
        stateToPush !== undefined
          ? cloneShapes(stateToPush)
          : cur.past.length === 0 && cur.present.length === 0
            ? []
            : cloneShapes(cur.present);

      const nextPast = [...cur.past, stateToPushToHistory].slice(
        -HISTORY_LIMIT
      );
      return {
        past: nextPast,
        present: cloneShapes(newShapes),
        future: [],
      };
    });
  };

  const undo = () => {
    setHistory((cur) => {
      if (cur.past.length === 0) return cur;
      const previous = cur.past[cur.past.length - 1];
      const newPast = cur.past.slice(0, -1);
      const newFuture = [cloneShapes(cur.present), ...cur.future].slice(
        0,
        HISTORY_LIMIT
      );
      return {
        past: newPast,
        present: cloneShapes(previous),
        future: newFuture,
      };
    });
  };

  const redo = () => {
    setHistory((cur) => {
      if (cur.future.length === 0) return cur;
      const nextState = cur.future[0];
      const newFuture = cur.future.slice(1);
      const newPast = [...cur.past, cloneShapes(cur.present)].slice(
        -HISTORY_LIMIT
      );
      return {
        past: newPast,
        present: cloneShapes(nextState),
        future: newFuture,
      };
    });
  };

  return (
    <div className="p-4 relative">
      <div className="fixed inset-0 -z-10">
        <DotBackground />
      </div>
      <div className="flex gap-4 items-center z-2 fixed top-5 left-5">
        <div onClick={handleBack}>
          <StepBack className="w-4 h-4 cursor-pointer" />
        </div>
        <h4 className=" font-semibold">Board ID: {id}</h4>
      </div>
      {/* controls */}

      <ToolControls
        toolbarToggle={toolbarToggle}
        activeTool={activeTool}
        canUndo={canUndo}
        canRedo={canRedo}
        open={open}
        handleActiveTool={handleActiveTool}
        handleActiveColor={handleActiveColor}
        handleUndo={undo}
        handleRedo={redo}
        handleImageExport={exportImage}
      />

      {/* konva canvas */}
      <KonvaCanvas
        canvasRef={stageRef}
        activeTool={activeTool}
        setShapesWithHistory={setShapesWithHistory}
        strokeColor={activeColor}
        shapes={present_shapes}
      />
    </div>
  );
}
