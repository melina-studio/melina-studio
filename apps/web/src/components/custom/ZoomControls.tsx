import React, { useEffect, useState } from "react";
import { Plus, Minus } from "lucide-react";
import { useTheme } from "next-themes";
import { STAGE_MAX_SCALE, STAGE_MIN_SCALE } from "@/lib/constants";

type ZoomControlsProps = {
  scale: number;
  zoomIn: () => void;
  zoomOut: () => void;
};

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  scale,
  zoomIn,
  zoomOut,
}) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only using theme after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use a default color that matches the server render
  const iconColor = mounted && theme === "dark" ? "#fff" : "#111";

  return (
    <div className="fixed bottom-5 left-5 z-10 flex bg-gray-100 dark:bg-[#323332] rounded-md p-2 items-center">
      <button
        onClick={zoomIn}
        disabled={scale >= STAGE_MAX_SCALE - 0.001}
        className="cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear flex flex-col gap-4"
      >
        <Plus width={16} height={16} color={iconColor} />
      </button>
      <div
        className="text-sm dark:text-white"
        style={{ minWidth: 32, textAlign: "center", fontWeight: 600 }}
      >
        {Math.round(scale * 100)}%
      </div>
      <button
        onClick={zoomOut}
        disabled={scale <= STAGE_MIN_SCALE + 0.001}
        className="cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear flex flex-col gap-4"
      >
        <Minus width={16} height={16} color={iconColor} />
      </button>
    </div>
  );
};
