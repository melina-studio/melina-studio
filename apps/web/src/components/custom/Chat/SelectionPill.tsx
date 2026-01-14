import React from "react";
import { ShapeSelection } from "@/lib/types";
import { X } from "lucide-react";

const SelectionPill = ({
  selection,
  isDark,
  clearSelectionById,
}: {
  selection: ShapeSelection;
  isDark: boolean;
  clearSelectionById: (id: string) => void;
}) => {
  return (
    <div
      className="flex items-center gap-1.5 px-1 py-1 rounded-md shrink-0 text-xs"
      style={{
        background: isDark
          ? "rgba(80, 80, 80, 0.8)"
          : "rgba(229, 231, 235, 0.8)",
      }}
    >
      <img
        src={selection.image.dataURL}
        alt="selection"
        className="w-5 h-5 rounded-sm object-cover border border-gray-400 dark:border-gray-600 bg-gray-700 dark:bg-gray-700"
      />
      <span className="text-gray-600 dark:text-gray-300">
        {selection.shapes.length} shape
        {selection.shapes.length > 1 ? "s" : ""}
      </span>
      <button
        onClick={() => clearSelectionById(selection.id)}
        className="p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      >
        <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  );
};

export default SelectionPill;
