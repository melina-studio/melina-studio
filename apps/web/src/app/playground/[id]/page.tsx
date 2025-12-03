// app/playground/[id]/page.tsx
"use client";
import { useParams, useRouter } from "next/navigation";
import { Download, Loader, Menu, Redo, StepBack, Undo } from "lucide-react";
import { KonvaEventObject } from "konva/lib/Node";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { DotBackground } from "@/components/ui/aceternity/DotBackground";
import { ACTION_BUTTONS, ACTIONS, COLORS, Shape } from "@/lib/konavaTypes";
import KonvaCanvas from "@/components/custom/KonvaCanvas";
import { HISTORY_LIMIT } from "@/lib/constants";
import ToolControls from "@/components/custom/ToolControls";
import {
  saveBoardData,
  getBoardData,
  clearBoardData,
} from "@/service/boardService";
import { useDebouncedCallback } from "@/helpers/debounce";
import {
  buildShapes,
  exportCompositedImageWithBoth,
  getBoardStateSnapshot,
} from "@/helpers/helpers";
import AIController from "@/components/custom/AIController";
import { getChatHistory } from "@/service/chatService";
import Image from "next/image";

// types
type History = {
  past: Shape[][];
  present: Shape[]; // current shapes
  future: Shape[][];
};

type ChatMessage = {
  uuid: string;
  board_uuid: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  updated_at: string;
};

// helpers
const cloneShapes = (s: Shape[]): Shape[] => {
  if (!s || !Array.isArray(s)) {
    return [];
  }
  try {
    const stringified = JSON.stringify(s);
    if (!stringified) {
      return [];
    }
    return JSON.parse(stringified);
  } catch (error) {
    console.error("Error cloning shapes:", error);
    return [];
  }
};

export default function BoardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [open, setOpen] = useState(true);
  const id = params.id;
  const stageRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [activeTool, setActiveTool] = useState<string>(ACTIONS.SELECT);
  const { theme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [showAiController, setShowAiController] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

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

  const presentShapes = history.present;
  // undo / redo handlers
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // handle board sizings
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

  // Fetch board data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchBoardData = await getBoardData(id);
        const shapes = buildShapes(fetchBoardData.board);
        const chatHistory = await getChatHistory(id);

        // Initialize history with fetched shapes
        setHistory({
          past: [],
          present: shapes,
          future: [],
        });
        setChatHistory(chatHistory?.chats);
      } catch (error) {
        console.error("Failed fetching board data:", error);
      }
    };

    fetchData();
  }, [id]);

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

  const exportImage = async () => {
    const color = theme === "dark" ? "#111" : "#fff";
    const { dataURL } = await exportCompositedImageWithBoth(stageRef, color);
    if (dataURL) {
      const a = document.createElement("a");
      a.href = dataURL;
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

  const handleGetBoardState = () => {
    const boardState = JSON.stringify(presentShapes, null, 2);
    console.log(boardState);
    // download a json file
    const data = new Blob([boardState], { type: "application/json" });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "boardState.json";
    link.click();
  };

  // Core save function that performs the actual save
  // Accepts optional shapes parameter to avoid stale closure issues
  const performSave = useCallback(
    async (shapesOverride?: Shape[]) => {
      setSaving(true);

      try {
        const color = theme === "dark" ? "#111" : "#fff";
        const { blob } = await exportCompositedImageWithBoth(stageRef, color);

        // Use passed shapes or fall back to state
        const shapesToUse = shapesOverride || presentShapes;

        // Prepare FormData
        const fd = new FormData();
        // Filter out text shapes with empty text before saving
        const shapesToSave = shapesToUse.filter((shape) => {
          if (shape.type === "text") {
            return (shape as any).text && (shape as any).text.trim() !== "";
          }
          return true;
        });

        if (shapesToSave.length > 0) {
          fd.append("boardData", JSON.stringify(shapesToSave));
          fd.append("image", blob, `board-${id}.png`);

          await saveBoardData(id, fd);

          console.log("Board saved successfully");
        }
      } catch (error) {
        console.error("Save failed:", error);
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [presentShapes, id, theme]
  );

  // Create debounced save using the custom hook
  const debouncedSave = useDebouncedCallback(performSave, 2000, [performSave]);

  // Public handleSave function - accepts optional shapes to pass directly
  const handleSave = useCallback(
    (shapesOverride?: Shape[]) => {
      // If shapes are passed directly, save immediately (for text editing)
      // Otherwise use debounced save (for drawing operations)
      if (shapesOverride) {
        performSave(shapesOverride);
      } else {
        debouncedSave();
      }
    },
    [debouncedSave, performSave]
  );

  const handleClearBoard = async () => {
    try {
      await clearBoardData(id);
      setShapesWithHistory([]);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-4 relative bg-transparent">
      <div className="fixed inset-0 -z-10">
        <DotBackground />
      </div>
      <div className="flex items-center justify-between w-full px-4 py-2 bg-transparent">
        <div className="flex gap-4 items-center z-2">
          <div onClick={handleBack}>
            <StepBack className="w-4 h-4 cursor-pointer" />
          </div>
          <h4 className="font-semibold">Board ID: {id}</h4>
          {saving && (
            <div className="ml-4 flex gap-2 items-center">
              <Loader className="animate-spin" size={16} />
              <p className="text-md text-gray-500">Saving...</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div
            className="bg-gray-200 text-black rounded-md px-4 py-2 cursor-pointer"
            onClick={handleClearBoard}
          >
            Clear Board
          </div>
          <div
            className="bg-[#111] text-white rounded-md px-4 py-2  cursor-pointer"
            onClick={() => handleGetBoardState()}
          >
            Export json
          </div>
        </div>
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
        shapes={presentShapes}
        handleSave={handleSave}
      />

      {/* ai controller */}
      <div className="fixed top-[10vh] right-4 z-10 flex items-start gap-2 h-[85vh]">
        {/* ai controller toggle icon */}
        <div
          className="bg-gray-200 shadow-md border border-gray-200 text-black rounded-md p-3 cursor-pointer hover:bg-gray-300 transition-colors"
          onClick={() => setShowAiController((v) => !v)}
        >
          <Image
            src="/icons/ai_controller.png"
            alt="AIController"
            width={20}
            height={20}
          />
        </div>
        {/* ai controller */}
        {showAiController && (
          <div className="h-full">
            <AIController chatHistory={chatHistory} />
          </div>
        )}
      </div>
    </div>
  );
}
