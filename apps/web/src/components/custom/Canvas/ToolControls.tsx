import { ACTION_BUTTONS, ACTIONS, COLORS } from "@/lib/konavaTypes";
import { Download, Menu, Redo, Undo } from "lucide-react";
import React, { useState } from "react";

function ToolControls({
  toolbarToggle,
  activeTool,
  activeColor,
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
  activeColor: string;
  canUndo: any;
  canRedo: any;
  open: any;
  handleActiveTool: any;
  handleActiveColor: any;
  handleUndo: any;
  handleRedo: any;
  handleImageExport: any;
}) {
  const [isColorPanelOpen, setIsColorPanelOpen] = useState(false);

  // Handle tool button click - toggle color panel if clicking on color tool
  const handleToolClick = (toolValue: string) => {
    if (toolValue === ACTIONS.COLOR) {
      if (activeTool === ACTIONS.COLOR) {
        // Already on color tool - toggle the panel
        setIsColorPanelOpen(!isColorPanelOpen);
      } else {
        // Switching to color tool - open the panel
        setIsColorPanelOpen(true);
        handleActiveTool(toolValue);
      }
    } else {
      // Switching to a different tool - close color panel
      setIsColorPanelOpen(false);
      handleActiveTool(toolValue);
    }
  };

  // Handle color selection - close panel after selecting
  const handleColorSelect = (color: string) => {
    handleActiveColor(color);
    setIsColorPanelOpen(false);
  };

  return (
    <>
      {/* Mobile toolbar - bottom center, horizontal scrollable, positioned to avoid zoom controls */}
      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100vw-120px)]">
        <div className="flex items-center gap-1 bg-transparent dark:bg-[#323332]/50 backdrop-blur-sm p-1 rounded-md shadow-lg shadow-gray-400 dark:shadow-[#565656FF] border border-gray-100 dark:border-gray-700">
          {/* Menu toggle */}
          <button
            className={`shrink-0 p-2 rounded-md transition-colors duration-200 ease-linear ${
              !open ? "bg-[#9AC2FEFF] dark:bg-[#000000]" : "hover:bg-[#cce0ff] dark:hover:bg-[#000000]"
            }`}
            onClick={toolbarToggle}
            aria-expanded={open}
            aria-label="Toggle toolbar"
          >
            <Menu width={16} height={16} />
          </button>

          {/* Tools - scrollable */}
          {open && (
            <>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {ACTION_BUTTONS.map((button) => (
                  <button
                    key={button.value}
                    className={`shrink-0 p-2 rounded-md transition-colors duration-200 ease-linear ${
                      activeTool === button.value
                        ? "bg-[#9AC2FEFF] dark:bg-[#000000]"
                        : "hover:bg-[#cce0ff] dark:hover:bg-[#000000]"
                    }`}
                    aria-label={button.label}
                    onClick={() => handleToolClick(button.value)}
                  >
                    <button.icon width={16} height={16} />
                  </button>
                ))}
              </div>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
              {/* Undo/Redo */}
              <button
                disabled={!canUndo}
                onClick={handleUndo}
                className={`shrink-0 p-2 rounded-md transition-colors duration-200 ease-linear ${
                  !canUndo ? "opacity-20 cursor-not-allowed" : "hover:bg-[#cce0ff] dark:hover:bg-[#000000]"
                }`}
              >
                <Undo width={16} height={16} />
              </button>
              <button
                disabled={!canRedo}
                onClick={handleRedo}
                className={`shrink-0 p-2 rounded-md transition-colors duration-200 ease-linear ${
                  !canRedo ? "opacity-20 cursor-not-allowed" : "hover:bg-[#cce0ff] dark:hover:bg-[#000000]"
                }`}
              >
                <Redo width={16} height={16} />
              </button>
            </>
          )}
        </div>

        {/* Color panel for mobile */}
        {activeTool === ACTIONS.COLOR && isColorPanelOpen && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-[#323332] p-3 rounded-md shadow-lg shadow-gray-400 dark:shadow-[#565656FF] border border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-6 gap-2">
              {COLORS.map((color: any) => (
                <div
                  key={color.color}
                  style={{ backgroundColor: color.color }}
                  className={`w-7 h-7 rounded cursor-pointer hover:scale-110 transition-transform ${
                    color.color === "#ffffff" ? "border border-gray-300 dark:border-gray-600" : ""
                  } ${activeColor === color.color ? "ring-2 ring-offset-2 ring-blue-500" : ""}`}
                  onClick={() => handleColorSelect(color.color)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop toolbar - left side, vertical */}
      <div className="hidden md:block">
        <div className="fixed left-7 top-1/2 -translate-y-1/2 flex gap-4 z-2 max-h-[80vh]">
          <div className="flex flex-col bg-transparent dark:bg-[#323332]/50 backdrop-blur-sm h-min p-1 rounded-md shadow-lg shadow-gray-400 dark:shadow-[#565656FF] border border-gray-100 dark:border-gray-700 max-h-full overflow-y-auto">
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
                className={`transition-transform duration-300 ease-in-out ${open ? "rotate-0" : "rotate-90"}`}
              />
            </div>
            <div
              className={`border-b border-gray-300 dark:border-gray-700 ${
                !open ? "opacity-0" : "opacity-100 mt-2 mb-2"
              }`}
            />
            <div
              className={`grid gap-2 overflow-hidden transition-all duration-500 ease-in-out ${
                open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {ACTION_BUTTONS.map((button) => (
                <button
                  key={button.value}
                  className={`
                    cursor-pointer p-2 rounded-md transition-colors
                    hover:bg-[#cce0ff] dark:hover:bg-[#000000]
                    ${activeTool === button.value ? "bg-[#9AC2FEFF] dark:bg-[#000000]" : "bg-transparent"}
                  `}
                  aria-label={button.label}
                  onClick={() => handleToolClick(button.value)}
                >
                  <button.icon width={18} height={18} />
                </button>
              ))}
            </div>
            <div
              className={`border-b border-gray-300 dark:border-gray-700 ${
                !open ? "opacity-0" : "opacity-100 mt-2 mb-2"
              }`}
            />
            {/* undo button */}
            <button
              disabled={!canUndo}
              onClick={handleUndo}
              className={`
                cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear
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
                cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear
                ${open ? "hover:bg-[#cce0ff] dark:hover:bg-[#000000]" : "hidden"}
                ${!canRedo ? "opacity-20 cursor-not-allowed" : "opacity-100"}
              `}
            >
              <Redo width={16} height={16} />
            </button>
            <div
              className={`
                cursor-pointer p-2 rounded-md transition-colors duration-200 ease-linear
                ${open ? "hover:bg-[#cce0ff] dark:hover:bg-[#000000]" : "hidden"}
              `}
              onClick={handleImageExport}
            >
              <Download width={16} height={16} />
            </div>
          </div>
          {/* color fills list */}
          {activeTool === ACTIONS.COLOR && isColorPanelOpen && (
            <div className="flex flex-col bg-white dark:bg-[#323332] h-min p-4 rounded-md shadow-lg shadow-gray-400 dark:shadow-[#565656FF] border border-gray-100 dark:border-gray-700 max-h-full overflow-y-auto">
              <p className="text-sm font-semibold mb-3">Colors</p>
              <div className="grid grid-cols-3 gap-2">
                {COLORS.map((color: any) => (
                  <div
                    key={color.color}
                    style={{ backgroundColor: color.color }}
                    className={`w-8 h-8 rounded cursor-pointer hover:scale-110 transition-transform ${
                      color.color === "#ffffff" ? "border border-gray-300 dark:border-gray-600" : ""
                    } ${activeColor === color.color ? "ring-2 ring-offset-2 ring-blue-500" : ""}`}
                    title={color.color}
                    onClick={() => handleColorSelect(color.color)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ToolControls;
