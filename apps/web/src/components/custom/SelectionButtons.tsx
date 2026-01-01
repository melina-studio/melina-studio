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
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 1000,
        backgroundColor: "white",
        padding: "8px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <button
        onClick={onAIClick}
        className="cursor-pointer mb-2"
        title="AI Actions"
      >
        <Image src="/icons/ai_icon.svg" alt="AI" width={16} height={16} />
      </button>
      <button
        onClick={onExportImage}
        className="cursor-pointer mb-2"
        title="Export as Image"
      >
        <Download width={16} height={16} color="black" />
      </button>
      <button
        onClick={onExportJSON}
        className="cursor-pointer mb-2"
        title="Export as JSON"
      >
        <FileDown width={16} height={16} color="black" />
      </button>
    </div>
  );
};
