import {
  StepBack,
  Loader,
  Settings2,
  MoreVertical,
  Download,
  Trash2,
  Pencil,
  Plus,
  Copy,
} from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { SettingsModal } from "../Canvas/SettingsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useBoard } from "@/hooks/useBoard";
import { Board } from "../Boards/types";

type MelinaStatus = "idle" | "thinking" | "editing";

const CanvasHeader = ({
  handleBack,
  id,
  board,
  saving,
  showSettings,
  setShowSettings,
  settings,
  setSettings,
  handleClearBoard,
  handleGetBoardState,
  melinaStatus = "idle",
}: {
  handleBack: () => void;
  id: string;
  board: Board | null;
  saving: boolean;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  settings: any;
  setSettings: (settings: any) => void;
  handleClearBoard: () => void;
  handleGetBoardState: () => void;
  melinaStatus?: MelinaStatus;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [boardName, setBoardName] = useState(board?.title || "Untitled");
  const [isHovering, setIsHovering] = useState(false);
  const [originalName, setOriginalName] = useState(board?.title || "Untitled");
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const router = useRouter();
  const { updateBoardById } = useBoard();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Update board name when board prop changes
  useEffect(() => {
    if (board?.title) {
      setBoardName(board.title);
      setOriginalName(board.title);
    }
  }, [board?.title]);

  const saveName = async () => {
    // If name is empty or just whitespace, default to "Untitled"
    const trimmedName = boardName.trim();
    if (!trimmedName) {
      setBoardName("Untitled");
    } else {
      setBoardName(trimmedName);
    }
    await updateBoardById(id, { title: trimmedName });
    setIsEditing(false);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveName();
  };

  const handleNameBlur = () => {
    saveName();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveName();
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Restore original name on cancel
      setBoardName(originalName);
      setIsEditing(false);
    }
  };

  const handleDoubleClick = () => {
    setOriginalName(boardName.trim() || "Untitled");
    setIsEditing(true);
  };

  const handleNewBoard = () => {
    const newId = uuidv4();
    router.push(`/playground/${newId}`);
  };

  const handleDuplicateBoard = () => {
    // Get current board state and create a new board with the same data
    const newId = uuidv4();
    // TODO: Duplicate board data to new board
    router.push(`/playground/${newId}`);
  };

  const getMelinaStatusColor = (status: MelinaStatus) => {
    switch (status) {
      case "thinking":
        return "bg-blue-500 animate-pulse";
      case "editing":
        return "bg-purple-500 animate-pulse";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      {/* Floating control bar with blur */}
      <div className="flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-md bg-white/80 dark:bg-[#323332] border border-gray-200/50 dark:border-[#565656FF] shadow-lg">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#565656FF] rounded-full transition-colors"
        >
          <StepBack className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Melina status indicator */}
        <div className="relative">
          <div
            className={`w-2 h-2 rounded-full ${getMelinaStatusColor(
              melinaStatus
            )}`}
            title={`Melina is ${melinaStatus}`}
          />
        </div>

        {/* Editable board name */}
        {isEditing ? (
          <form onSubmit={handleNameSubmit} className="flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleKeyDown}
              className="bg-transparent border-none outline-none text-sm font-semibold px-1 min-w-[100px] max-w-[200px] text-gray-900 dark:text-gray-100"
              onClick={(e) => e.stopPropagation()}
            />
          </form>
        ) : (
          <div
            className="relative flex items-center gap-1.5 group"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <button
              onDoubleClick={handleDoubleClick}
              className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-400 px-1 transition-colors cursor-text"
              title="Double-click to rename"
            >
              {boardName.trim() || "Untitled"}
            </button>
            {/* Pencil icon that fades in on hover */}
            <Pencil
              className={`w-3 h-3 text-gray-400 dark:text-gray-500 transition-opacity duration-100 ${
                isHovering ? "opacity-30" : "opacity-0"
              }`}
            />
          </div>
        )}

        {/* Saving indicator */}
        {saving && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Loader className="animate-spin w-3 h-3" />
            <span>Saving...</span>
          </div>
        )}

        {/* Board settings dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#565656FF] rounded-full transition-colors">
              <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 dark:bg-[#323332]">
            <DropdownMenuItem
              onClick={handleNewBoard}
              className="cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              New board
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDuplicateBoard}
              className="cursor-pointer"
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicate board
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowSettings(true)}
              className="cursor-pointer"
            >
              <Settings2 className="w-4 h-4 mr-2" />
              Board settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleClearBoard}
              className="cursor-pointer text-red-600 dark:text-red-400"
              variant="destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear board
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings Modal (kept for compatibility) */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          activeSettings={settings}
          setActiveSettings={setSettings}
        />
      </div>
    </div>
  );
};

export default CanvasHeader;
