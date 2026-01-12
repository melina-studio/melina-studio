// app/playground/[id]/page.tsx
"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  Loader,
  Menu,
  Redo,
  Settings2,
  StepBack,
  Undo,
} from "lucide-react";
import { KonvaEventObject } from "konva/lib/Node";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { DotBackground } from "@/components/ui/aceternity/DotBackground";
import { ACTION_BUTTONS, ACTIONS, COLORS, Shape } from "@/lib/konavaTypes";
import KonvaCanvas from "@/components/custom/Canvas/KonvaCanvas";
import { HISTORY_LIMIT } from "@/lib/constants";
import ToolControls from "@/components/custom/Canvas/ToolControls";
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
import AIController from "@/components/custom/Chat/AIController";
import { getChatHistory } from "@/service/chatService";
import Image from "next/image";
import ElephantDrawing from "@/components/custom/General/Elephant";
import { useWebsocket } from "@/hooks/useWebsocket";
import { SettingsModal } from "@/components/custom/Canvas/SettingsModal";
import CanvasHeader from "@/components/custom/General/CanvasHeader";
import { useBoard } from "@/hooks/useBoard";
import type { Board } from "@/components/custom/Boards/types";

// types
type History = {
  past: Shape[][];
  present: Shape[]; // current shapes
  future: Shape[][];
};

// Simplified message type that matches AIController's internal type
type ChatMessage = {
  uuid: string;
  role: "user" | "assistant";
  content: string;
};

type ShapeCreatedEvent = {
  type: "shape_created";
  data: {
    board_id: string;
    shape: Shape;
  };
};

type ShapeUpdatedEvent = {
  type: "shape_updated";
  data: {
    board_id: string;
    shape: Shape;
  };
};

export type Settings = {
  activeModel: string;
  temperature: number;
  maxTokens: number;
  theme: string;
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
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);
  const id = params.id;

  // Get initial message from URL params (from creation input)
  const initialMessage = searchParams.get("initialMessage");
  const [initialMessageConsumed, setInitialMessageConsumed] = useState(false);
  const stageRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [activeTool, setActiveTool] = useState<string>(ACTIONS.SELECT);
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAiController, setShowAiController] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Canvas transform state for background parallax effect
  const [canvasTransform, setCanvasTransform] = useState({
    position: { x: 0, y: 0 },
    scale: 1,
  });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [melinaStatus, setMelinaStatus] = useState<
    "idle" | "thinking" | "editing"
  >("idle");
  const [boardInfo, setBoardInfo] = useState<Board | null>(null);
  const { updateBoardById } = useBoard();
  const boardIdRef = useRef(id);
  // Ref to prevent duplicate thumbnail saves
  const thumbnailSaveCalledRef = useRef(false);
  // Ref to track if page is being unloaded (refresh/close)
  const isPageUnloadingRef = useRef(false);
  // Ref to store updateBoardById to avoid dependency issues
  const updateBoardByIdRef = useRef(updateBoardById);
  // Ref to handle cleanup timeout for React Strict Mode
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref to store latest save function to avoid stale closures
  const saveShapesRef = useRef<((shapes: Shape[]) => Promise<void>) | null>(
    null
  );
  // Ref to track pending save and prevent duplicate API calls
  const pendingSaveRef = useRef<{
    timeoutId: NodeJS.Timeout | null;
    isSaving: boolean;
    lastShapes: Shape[] | null;
  }>({ timeoutId: null, isSaving: false, lastShapes: null });

  const { subscribe } = useWebsocket();

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

    // get settings from localStorage
    const settings = localStorage.getItem("settings");
    if (settings) {
      setSettings(JSON.parse(settings));
    }

    setMounted(true);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Keep updateBoardByIdRef in sync
  useEffect(() => {
    updateBoardByIdRef.current = updateBoardById;
  }, [updateBoardById]);

  // Handle thumbnail save only when navigating away (not on refresh/close)
  useEffect(() => {
    // Cancel any pending cleanup timeout from React Strict Mode remounting
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    // Reset flags on mount
    thumbnailSaveCalledRef.current = false;
    isPageUnloadingRef.current = false;

    // Detect when page is being unloaded (refresh/close)
    const handleBeforeUnload = () => {
      isPageUnloadingRef.current = true;
      // Also clear any pending save timeout
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Don't save if page is being unloaded (refresh/close)
      if (isPageUnloadingRef.current) {
        return;
      }

      // Use a small delay to handle React Strict Mode double-mounting
      // If component remounts quickly, the timeout will be cancelled on next mount
      const currentId = id;
      cleanupTimeoutRef.current = setTimeout(() => {
        if (!thumbnailSaveCalledRef.current) {
          thumbnailSaveCalledRef.current = true;
          updateBoardByIdRef.current(currentId, { saveThumbnail: true }).catch(console.error);
        }
      }, 100);
    };
  }, [id]); // Only depend on id, use ref for updateBoardById

  // Fetch board data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchBoardData = await getBoardData(id);
        const shapes = buildShapes(fetchBoardData.board);
        const chatHistory = await getChatHistory(id);

        // Set board info from API response
        if (fetchBoardData.boardInfo) {
          setBoardInfo(fetchBoardData.boardInfo);
        }

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

  // Track Melina status via websocket
  useEffect(() => {
    const unsubscribeChatStart = subscribe("chat_starting", () => {
      setMelinaStatus("thinking");
    });

    const unsubscribeChatCompleted = subscribe("chat_completed", () => {
      setMelinaStatus("editing");
      // Reset to idle after a delay
      setTimeout(() => setMelinaStatus("idle"), 2000);
    });

    const unsubscribeBoardRename = subscribe(
      "board_renamed",
      (data: { data: { board_id: string; new_name: string } }) => {
        setBoardInfo((prev: Board | null) =>
          prev && prev.uuid === data.data.board_id
            ? { ...prev, title: data.data.new_name }
            : prev
        );
      }
    );

    return () => {
      unsubscribeChatStart();
      unsubscribeChatCompleted();
      unsubscribeBoardRename();
    };
  }, [subscribe]);

  // Ensure AI controller is visible when there's an initial message
  useEffect(() => {
    if (initialMessage && !initialMessageConsumed) {
      setShowAiController(true);
    }
  }, [initialMessage, initialMessageConsumed]);

  // Clear URL params after initial message is sent
  const handleInitialMessageSent = () => {
    setInitialMessageConsumed(true);
    // Remove the initialMessage param from URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.delete("initialMessage");
    window.history.replaceState({}, "", url.pathname);
  };

  // Keyboard shortcut for Command+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Command+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowAiController((prev) => !prev);
      }
      // Close on Escape
      if (e.key === "Escape" && showAiController) {
        setShowAiController(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAiController]);

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

  // Direct save function - always uses passed shapes, no fallback to state
  // This avoids stale closure issues when called from websocket handlers
  const saveShapesDirectly = useCallback(
    async (shapesToSave: Shape[]) => {
      // Prevent duplicate saves - if already saving, queue this for later
      if (pendingSaveRef.current.isSaving) {
        console.log("Save already in progress, queuing shapes for later");
        pendingSaveRef.current.lastShapes = shapesToSave;
        return;
      }

      pendingSaveRef.current.isSaving = true;
      pendingSaveRef.current.lastShapes = null;
      setSaving(true);

      try {
        const color = theme === "dark" ? "#111" : "#fff";
        const { blob } = await exportCompositedImageWithBoth(stageRef, color);

        // Filter out text shapes with empty text before saving
        const filteredShapes = shapesToSave.filter((shape) => {
          if (shape.type === "text") {
            return (shape as any).text && (shape as any).text.trim() !== "";
          }
          return true;
        });

        // Prepare FormData
        const fd = new FormData();
        fd.append("boardData", JSON.stringify(filteredShapes));
        fd.append("image", blob, `board-${id}.png`);

        await saveBoardData(id, fd);
        console.log(
          "Board saved successfully with",
          filteredShapes.length,
          "shapes"
        );
      } catch (error) {
        console.error("Save failed:", error);
        throw error;
      } finally {
        pendingSaveRef.current.isSaving = false;
        setSaving(false);

        // If shapes were queued while we were saving, save them now
        if (pendingSaveRef.current.lastShapes) {
          const queuedShapes = pendingSaveRef.current.lastShapes;
          pendingSaveRef.current.lastShapes = null;
          console.log("Processing queued save...");
          // Use setTimeout to avoid stack overflow with recursive calls
          setTimeout(() => saveShapesDirectly(queuedShapes), 100);
        }
      }
    },
    [id, theme]
  );

  // Keep ref updated with latest save function
  useEffect(() => {
    saveShapesRef.current = saveShapesDirectly;
  }, [saveShapesDirectly]);

  // Core save function that performs the actual save
  // Accepts optional shapes parameter to avoid stale closure issues
  const performSave = useCallback(
    async (shapesOverride?: Shape[]) => {
      // Use passed shapes or fall back to state
      const shapesToUse = shapesOverride || presentShapes;
      await saveShapesDirectly(shapesToUse);
    },
    [presentShapes, saveShapesDirectly]
  );

  // Create debounced save using the custom hook
  const debouncedSave = useDebouncedCallback(performSave, 2000, [performSave]);

  // Public handleSave function - accepts optional shapes to pass directly
  const handleSave = useCallback(
    (shapesOverride?: Shape[]) => {
      // If shapes are passed directly, save immediately (for text editing and eraser)
      // Otherwise use debounced save (for drawing operations)
      if (shapesOverride !== undefined) {
        performSave(shapesOverride);
      } else {
        debouncedSave();
      }
    },
    [debouncedSave, performSave]
  );

  // listen for board updates event
  useEffect(() => {
    // listen for new shape created event
    const unsubscribeBoardUpdates = subscribe(
      "shape_created",
      (data: ShapeCreatedEvent) => {
        console.log("Shape created:", data);
        const { shape } = data.data;

        // Update Melina status
        setMelinaStatus("editing");
        setTimeout(() => setMelinaStatus("idle"), 1000);

        // Use functional update to get the current state and append the new shape
        setHistory((cur) => {
          const currentShapes = cloneShapes(cur.present);
          const newShapes = [...currentShapes, shape];

          // Debounce the save - cancel any pending save and schedule a new one
          // This batches rapid successive shape_created events into a single save
          if (pendingSaveRef.current.timeoutId) {
            clearTimeout(pendingSaveRef.current.timeoutId);
          }

          pendingSaveRef.current.timeoutId = setTimeout(() => {
            pendingSaveRef.current.timeoutId = null;
            if (saveShapesRef.current) {
              saveShapesRef.current(newShapes);
            }
          }, 300); // 300ms debounce to batch rapid events

          // Push current state to history before adding new shape
          const stateToPushToHistory =
            cur.past.length === 0 && cur.present.length === 0
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
      }
    );

    // listen for shape updated event
    const unsubscribeShapeUpdated = subscribe(
      "shape_updated",
      (data: ShapeUpdatedEvent) => {
        console.log("Shape updated:", data);
        const { shape } = data.data;
        setHistory((cur) => {
          const currentShapes = cloneShapes(cur.present);
          const newShapes = currentShapes.map((s) =>
            s.id === shape.id ? shape : s
          );
          return {
            past: cur.past,
            present: cloneShapes(newShapes),
            future: cur.future,
          };
        });
      }
    );

    return () => {
      unsubscribeBoardUpdates();
      unsubscribeShapeUpdated();
      // Clean up any pending save timeout on unmount
      if (pendingSaveRef.current.timeoutId) {
        clearTimeout(pendingSaveRef.current.timeoutId);
      }
    };
  }, [subscribe]);

  const handleClearBoard = async () => {
    try {
      await clearBoardData(id);
      setShapesWithHistory([]);
    } catch (error) {
      console.error(error);
    }
  };

  // Add canvas-page class to body for scrollbar hiding
  useEffect(() => {
    document.body.classList.add("canvas-page");
    return () => {
      document.body.classList.remove("canvas-page");
    };
  }, []);

  return (
    <div className="relative bg-transparent">
      <div className="fixed inset-0 -z-10">
        <DotBackground
          offsetX={canvasTransform.position.x}
          offsetY={canvasTransform.position.y}
          scale={canvasTransform.scale}
        />
      </div>
      {/* header */}

      <CanvasHeader
        handleBack={handleBack}
        id={id}
        board={boardInfo}
        saving={saving}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        settings={settings}
        setSettings={setSettings}
        handleClearBoard={handleClearBoard}
        handleGetBoardState={handleGetBoardState}
        melinaStatus={melinaStatus}
      />

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
        onCanvasTransform={setCanvasTransform}
        isDarkMode={resolvedTheme === "dark"}
      />

      {/* Empty canvas state - grid and hint text */}
      {presentShapes.length === 0 && (
        <div className="fixed inset-0 pointer-events-none z-[1]">
          {/* Faint grid pattern */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
              opacity: 0.3,
            }}
          />
          {/* Hint text */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-base text-gray-400 dark:text-gray-500 font-normal">
              Draw or ask Melina
            </p>
          </div>
        </div>
      )}
      {/* <ElephantDrawing /> */}

      {/* ai controller */}
      <div className="fixed top-4 right-4 z-5 flex items-start gap-2 h-[97%]">
        {/* ai controller toggle icon */}
        <div
          className={`${
            showAiController ? "bg-gray-200" : "bg-white"
          } shadow-md border border-gray-200 text-black rounded-md p-3 cursor-pointer hover:bg-gray-300 transition-colors`}
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
        <div
          className={`h-full transition-all duration-300 ease-out ${
            showAiController
              ? "opacity-100 translate-x-0 scale-100"
              : "opacity-0 translate-x-4 scale-95 pointer-events-none"
          }`}
        >
          {showAiController && (
            <AIController
              chatHistory={chatHistory}
              onMessagesChange={setChatHistory}
              initialMessage={
                initialMessageConsumed ? undefined : initialMessage || undefined
              }
              onInitialMessageSent={handleInitialMessageSent}
            />
          )}
        </div>
      </div>
    </div>
  );
}
