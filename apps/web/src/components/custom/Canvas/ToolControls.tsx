import { ACTION_BUTTONS, ACTIONS, COLORS } from "@/lib/konavaTypes";
import { Download, Menu, Redo, Undo } from "lucide-react";
import React, { useState } from "react";

function ToolControls({
  toolbarToggle,
  activeTool,
  canUndo,
  canRedo,
  open,
  handleActiveTool,
  handleActiveColor,
  handleUndo,
  handleRedo,
  handleImageExport,
}: {
  toolbarToggle: any;
  activeTool: any;
  canUndo: any;
  canRedo: any;
  open: any;
  handleActiveTool: any;
  handleActiveColor: any;
  handleUndo: any;
  handleRedo: any;
  handleImageExport: any;
}) {
  return (
    <div>
      <div className="fixed left-7 top-1/2 -translate-y-1/2 flex gap-4 z-2 max-h-[80vh]">
        <div className="flex flex-col bg-white dark:bg-[#323332] h-min p-1 rounded-md shadow-lg shadow-gray-400 dark:shadow-[#565656FF] border border-gray-100 dark:border-gray-700 max-h-full overflow-y-auto">
          <div
            className={`
          cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear
          ${open ? "hover:bg-[#cce0ff] dark:hover:bg-[#000000]" : "bg-[#9AC2FEFF] dark:bg-[#000000]"} 
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
            className={`border-b border-gray-300 dark:border-gray-700  ${!open ? "opacity-0 " : "opacity-100 mt-2 mb-2 "}`}
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
              hover:bg-[#cce0ff] dark:hover:bg-[#000000] transition-colors
            ${activeTool === button.value ? "bg-[#9AC2FEFF] dark:bg-[#000000]" : "bg-transparent "}
            `}
                aria-label={button.label}
                onClick={() => handleActiveTool(button.value)}
              >
                <button.icon width={18} height={18} />
              </button>
            ))}
          </div>
          <div
            className={`border-b border-gray-300 dark:border-gray-700  ${!open ? "opacity-0 " : "opacity-100 mt-2 mb-2 "}`}
          ></div>
          {/* undo button */}
          <button
            disabled={!canUndo}
            onClick={handleUndo}
            className={`
          cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear flex flex-col gap-4
          ${!canUndo ? "opacity-20 cursor-not-allowed" : "opacity-100"}
          ${open ? "hover:bg-[#cce0ff] dark:hover:bg-[#000000]" : "hidden"} 
        `}
          >
            <Undo width={16} height={16} />
          </button>
          {/* redo button */}
          <button
            disabled={!canRedo}
            onClick={handleRedo}
            className={`
          cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear flex flex-col gap-4
          ${open ? "hover:bg-[#cce0ff] dark:hover:bg-[#000000]" : "hidden"} 
          ${!canRedo ? "opacity-20 cursor-not-allowed" : "opacity-100"}
        `}
          >
            <Redo width={16} height={16} />
          </button>
          <div
            className={`
          cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear flex flex-col gap-4
          ${open ? "hover:bg-[#cce0ff] dark:hover:bg-[#000000]" : "hidden"} 
          
        `}
            onClick={handleImageExport}
          >
            {/* download button */}
            <Download width={16} height={16} />
          </div>
        </div>
        {/* color fills list */}
        {activeTool === ACTIONS.COLOR && (
          <div className="flex flex-col bg-white dark:bg-[#323332] h-min p-4 rounded-md shadow-lg shadow-gray-400 dark:shadow-[#565656FF] border border-gray-100 dark:border-gray-700 max-h-full overflow-y-auto">
            <p className="text-sm font-semibold mb-3">Colors</p>
            <div className="grid grid-cols-3 gap-2">
              {COLORS.map((color: any) => (
                <div
                  key={color.color}
                  style={{ backgroundColor: color.color }}
                  className={`w-8 h-8 rounded cursor-pointer hover:scale-110 transition-transform ${color.color === "#ffffff" ? "border border-gray-300 dark:border-gray-600" : ""}`}
                  title={color.color}
                  onClick={() => {
                    handleActiveColor(color.color);
                    handleActiveTool(ACTIONS.PENCIL);
                  }}
                ></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ToolControls;
