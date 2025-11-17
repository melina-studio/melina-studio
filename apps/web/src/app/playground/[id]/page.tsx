// app/playground/[id]/page.tsx
'use client';
import { useParams, useRouter } from 'next/navigation';
import { Download, Loader, Menu, Redo, StepBack, Undo } from 'lucide-react';
import { KonvaEventObject } from 'konva/lib/Node';
import { useRef, useState, useEffect, act } from 'react';
import { useTheme } from 'next-themes';
import { DotBackground } from '@/components/ui/aceternity/DotBackground';
import { ACTION_BUTTONS, ACTIONS, COLORS, Shape } from '@/lib/konavaTypes';
import KonvaCanvas from '@/components/custom/KonvaCanvas';
import { HISTORY_LIMIT } from '@/lib/constants';
import ToolControls from '@/components/custom/ToolControls';
import { saveBoardData, getBoardData } from '@/service/boardService';
import { debounce } from '@/helpers/debounce';
import { buildShapes } from '@/helpers/helpers';

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
  const [saving, setSaving] = useState(false);

  // stroke color
  const currentColor = theme === 'dark' ? '#fff' : '#111';
  const [activeColor, setActiveColor] = useState<string>(currentColor);

  // replace your shapes state with history state
  const [history, setHistory] = useState<History>({
    past: [],
    present: [],
    future: [],
  });

  const handleBack = () => router.back();
  const [presentShapes, setPresentShapes] = useState<Shape[]>(history.present);
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
    window.addEventListener('resize', handleResize);

    // get board data on mount
    const fetchData = async () => {
      try {
        const fetchBoardData = await getBoardData(id);
        const shapes = buildShapes(fetchBoardData.board);
        setPresentShapes(shapes);
      } catch (error) {
        console.error('Failed fetching board data:', error);
      }
    };

    fetchData();

    return () => window.removeEventListener('resize', handleResize);
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
    setOpen(v => !v);
    resetActionClick();
  };

  const exportImage = () => {
    const image = (stageRef.current as any).toDataURL();
    if (image) {
      const a = document.createElement('a');
      a.href = image;
      a.download = 'image.png';
      a.click();
    }
  };

  const setShapesWithHistory = (newShapes: Shape[], opts?: { pushHistory?: boolean; stateToPush?: Shape[] }) => {
    // default: pushHistory false (for live updates)
    const pushHistory = opts?.pushHistory ?? false;
    const stateToPush = opts?.stateToPush;

    setHistory(cur => {
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

      const nextPast = [...cur.past, stateToPushToHistory].slice(-HISTORY_LIMIT);
      return {
        past: nextPast,
        present: cloneShapes(newShapes),
        future: [],
      };
    });
  };

  const undo = () => {
    setHistory(cur => {
      if (cur.past.length === 0) return cur;
      const previous = cur.past[cur.past.length - 1];
      const newPast = cur.past.slice(0, -1);
      const newFuture = [cloneShapes(cur.present), ...cur.future].slice(0, HISTORY_LIMIT);
      return {
        past: newPast,
        present: cloneShapes(previous),
        future: newFuture,
      };
    });
  };

  const redo = () => {
    setHistory(cur => {
      if (cur.future.length === 0) return cur;
      const nextState = cur.future[0];
      const newFuture = cur.future.slice(1);
      const newPast = [...cur.past, cloneShapes(cur.present)].slice(-HISTORY_LIMIT);
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
    const data = new Blob([boardState], { type: 'application/json' });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'boardState.json';
    link.click();
  };

  const handleSave = () => {
    setSaving(true);
    try {
      // saveBoardData(id, present_shapes);
      debounce(saveBoardData, 2000)(id, { data: presentShapes });
    } catch (error) {
      console.log(error);
    } finally {
      setTimeout(() => {
        setSaving(false);
      }, 2000);
    }
  };

  return (
    <div className="p-4 relative">
      <div className="fixed inset-0 -z-10">
        <DotBackground />
      </div>
      <div className="flex items-center justify-between w-full px-4 py-2">
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
        <div className="bg-[#111] text-white rounded-md px-4 py-2  cursor-pointer">
          <div onClick={() => handleGetBoardState()}>Export json</div>
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
    </div>
  );
}
