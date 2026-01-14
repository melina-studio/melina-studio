import React from "react";
import { Download, FileDown } from "lucide-react";
import Image from "next/image";

type SelectionButtonsProps = {
  buttonPosition: { x: number; y: number } | null;
  onAIClick: () => void;
  onExportImage: () => void;
  onExportJSON: () => void;
};

export const SelectionButtons: React.FC<SelectionButtonsProps> = ({
  buttonPosition,
  onAIClick,
  onExportImage,
  onExportJSON,
}) => {
  if (!buttonPosition) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: `${buttonPosition.x}px`,
        top: `${buttonPosition.y}px`,
        transform: "translateY(-50%)",
        zIndex: 5,
      }}
      className="
        flex flex-col items-center gap-0.5
        rounded-md
        p-1

        /* Premium glass surface */
        bg-white/95
        dark:bg-zinc-900/95
        backdrop-blur-xl

        /* Refined shadow stack for depth */
        shadow-sm
        shadow-black/5
        ring-1 ring-black/[0.04]
        dark:ring-white/[0.08]

        /* Subtle animation on appear */
        animate-in fade-in-0 zoom-in-95 duration-150
      "
    >
      {/* AI */}
      <button
        onClick={onAIClick}
        title="Ask Melina"
        className="
          h-8 w-8
          flex items-center justify-center
          rounded
          text-zinc-600 dark:text-zinc-400
          hover:bg-zinc-100 dark:hover:bg-zinc-800
          hover:text-zinc-900 dark:hover:text-zinc-100
          active:scale-95
          transition-all duration-150
        "
      >
        <Image src="/icons/ai_icon.svg" alt="AI" width={16} height={16} />
      </button>

      {/* Divider */}
      <div className="w-5 h-px bg-zinc-200 dark:bg-zinc-700 my-0.5" />

      {/* Export image */}
      <button
        onClick={onExportImage}
        title="Export image"
        className="
          h-8 w-8
          flex items-center justify-center
          rounded
          text-zinc-600 dark:text-zinc-400
          hover:bg-zinc-100 dark:hover:bg-zinc-800
          hover:text-zinc-900 dark:hover:text-zinc-100
          active:scale-95
          transition-all duration-150
        "
      >
        <Download size={16} strokeWidth={1.5} />
      </button>

      {/* Export JSON */}
      <button
        onClick={onExportJSON}
        title="Export JSON"
        className="
          h-8 w-8
          flex items-center justify-center
          rounded
          text-zinc-600 dark:text-zinc-400
          hover:bg-zinc-100 dark:hover:bg-zinc-800
          hover:text-zinc-900 dark:hover:text-zinc-100
          active:scale-95
          transition-all duration-150
        "
      >
        <FileDown size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
};
