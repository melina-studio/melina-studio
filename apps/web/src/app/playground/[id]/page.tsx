// app/playground/[id]/page.tsx
"use client";
import { useParams, useRouter } from "next/navigation";
import {
  Eraser,
  Image,
  Menu,
  Minus,
  Square,
  StepBack,
  TypeOutline,
} from "lucide-react";
import { Layer, Stage } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import { useRef, useState, useEffect } from "react";
import {
  LockKeyholeOpen,
  Hand,
  PencilLine,
  Circle,
  MoveUpRight,
} from "lucide-react";
import DotGrid from "@/components/DotGrid";
import { DotBackground } from "@/components/ui/aceternity/DotBackground";
import { ACTION_BUTTONS, ACTIONS } from "@/lib/konavaTypes";

export default function BoardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [open, setOpen] = useState(true);
  const id = params.id;
  const stageRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [activeTool, setActiveTool] = useState<string>(ACTIONS.SELECT);

  const handleBack = () => router.back();

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

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    console.log("pointer down", e);
  };

  const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    console.log("pointer move");
  };

  const handlePointerUp = (e: KonvaEventObject<PointerEvent>) => {
    console.log("pointer up");
  };

  const resetActionClick = () => {
    setActiveTool(ACTIONS.SELECT);
  };

  const toolbarToggle = () => {
    setOpen((v) => !v);
    resetActionClick();
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
      <div className=" flex flex-col  bg-white fixed top-0 left-7 top-1/2 -translate-y-1/2 h-min p-1 rounded-md shadow-lg z-2 border border-gray-100">
        <div
          className={`
          cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear
          ${open ? "hover:bg-[#cce0ff]" : "bg-[#9AC2FEFF]"} 
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
            ${open ? "rotate-0" : "rotate-90"}
          `}
          />
        </div>
        <div
          className={`border-b border-gray-300  ${!open ? "opacity-0 " : "opacity-100 mt-2 mb-2 "}`}
        ></div>
        <div
          className={`
          grid gap-2 overflow-hidden transition-all duration-500 ease-in-out
          ${open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}
        `}
        >
          {ACTION_BUTTONS.map((button) => (
            <button
              key={button.value}
              className={`
              cursor-pointer p-2 rounded-md
              hover:bg-[#cce0ff] transition-colors
            ${activeTool === button.value ? "bg-[#9AC2FEFF]" : "bg-transparent"}
            `}
              aria-label={button.label}
              onClick={() => setActiveTool(button.value)}
            >
              <button.icon width={18} height={18} />
            </button>
          ))}
        </div>
      </div>
      {/* canvas */}
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <Layer></Layer>
      </Stage>
    </div>
  );
}
