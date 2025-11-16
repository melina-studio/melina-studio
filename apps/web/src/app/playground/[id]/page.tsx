// app/playground/[id]/page.tsx
'use client';
import { useParams, useRouter } from 'next/navigation';
import { Download, Menu, Redo, StepBack, Undo } from 'lucide-react';
import { KonvaEventObject } from 'konva/lib/Node';
import { useRef, useState, useEffect } from 'react';

import { DotBackground } from '@/components/ui/aceternity/DotBackground';
import { ACTION_BUTTONS, ACTIONS, Shape } from '@/lib/konavaTypes';
import KonvaCanvas from '@/components/custom/KonvaCanvas';
import { HISTORY_LIMIT } from '@/lib/constants';

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
    window.addEventListener('resize', handleResize);

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
      <div className="flex flex-col bg-white dark:bg-[#323332] fixed top-0 left-7 top-1/2 -translate-y-1/2 h-min p-1 rounded-md shadow-lg shadow-gray-400 dark:shadow-[#565656FF] z-2 border border-gray-100 dark:border-gray-700">
        <div
          className={`
          cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear
          ${open ? 'hover:bg-[#cce0ff] dark:hover:bg-[#000000]' : 'bg-[#9AC2FEFF] dark:bg-[#000000]'} 
        `}
          onClick={toolbarToggle}
          aria-expanded={open}
          aria-label="Toggle toolbar"
        >
          <Menu
            width={16}
            height={16}
            className={`
            transition-transform duration-300 ease-in-out
            ${open ? 'rotate-0' : 'rotate-90'}
          `}
          />
        </div>
        <div
          className={`border-b border-gray-300 dark:border-gray-700  ${!open ? 'opacity-0 ' : 'opacity-100 mt-2 mb-2 '}`}
        ></div>
        <div
          className={`
          grid gap-2 overflow-hidden transition-all duration-500 ease-in-out
          ${open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}
        `}
        >
          {ACTION_BUTTONS.map(button => (
            <button
              key={button.value}
              className={`
              cursor-pointer p-2 rounded-md
              hover:bg-[#cce0ff] dark:hover:bg-[#000000] transition-colors
            ${activeTool === button.value ? 'bg-[#9AC2FEFF] dark:bg-[#000000]' : 'bg-transparent '}
            `}
              aria-label={button.label}
              onClick={() => setActiveTool(button.value)}
            >
              <button.icon width={18} height={18} />
            </button>
          ))}
        </div>
        <div
          className={`border-b border-gray-300 dark:border-gray-700  ${!open ? 'opacity-0 ' : 'opacity-100 mt-2 mb-2 '}`}
        ></div>
        {/* undo button */}
        <button
          disabled={!canUndo}
          onClick={undo}
          className={`
          cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear flex flex-col gap-4
          ${!canUndo ? 'opacity-20 cursor-not-allowed' : 'opacity-100'}
          ${open ? 'hover:bg-[#cce0ff] dark:hover:bg-[#000000]' : 'hidden'} 
        `}
        >
          <Undo width={16} height={16} />
        </button>
        {/* redo button */}
        <button
          disabled={!canRedo}
          onClick={redo}
          className={`
          cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear flex flex-col gap-4
          ${open ? 'hover:bg-[#cce0ff] dark:hover:bg-[#000000]' : 'hidden'} 
          ${!canRedo ? 'opacity-20 cursor-not-allowed' : 'opacity-100'}
        `}
        >
          <Redo width={16} height={16} />
        </button>
        <div
          className={`
          cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear flex flex-col gap-4
          ${open ? 'hover:bg-[#cce0ff] dark:hover:bg-[#000000]' : 'hidden'} 
          
        `}
          onClick={exportImage}
        >
          {/* download button */}
          <Download width={16} height={16} />
        </div>
      </div>
      {/* konva canvas */}
      <KonvaCanvas
        canvasRef={stageRef}
        activeTool={activeTool}
        handleActiveTool={handleActiveTool}
        setShapesWithHistory={setShapesWithHistory}
        shapes={present_shapes}
      />
    </div>
  );
}
