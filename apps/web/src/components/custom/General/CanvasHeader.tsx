import {
  StepBack,
  Loader,
  Settings2,
  MoreVertical,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useBoard } from "@/hooks/useBoard";
import { Board } from "../../../lib/types";

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
  chatWidth = 0,
  hasChatResized = false,
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
  chatWidth?: number;
  hasChatResized?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [boardName, setBoardName] = useState(board?.title || "Untitled");
  const [isHovering, setIsHovering] = useState(false);
  const [originalName, setOriginalName] = useState(board?.title || "Untitled");
  const inputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const router = useRouter();
  const { updateBoardById } = useBoard();
  const initialChatWidthRef = useRef<number>(chatWidth || 500);

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

  // Track initial chat width - capture it when chat first opens and hasn't been resized yet
  useEffect(() => {
    if (chatWidth > 0 && !hasChatResized) {
      // Chat is open and hasn't been resized - this is the initial width
      if (initialChatWidthRef.current === 0 || initialChatWidthRef.current === 500) {
        initialChatWidthRef.current = chatWidth;
      }
    }
    // Reset when chat is closed
    if (chatWidth === 0) {
      initialChatWidthRef.current = 0;
    }
  }, [chatWidth, hasChatResized]);

  // Calculate offset to move header based on resize
  // On first render (hasChatResized = false): center in full viewport (offset = 0)
  // After resize (hasChatResized = true): move left proportionally to the change in chat width
  // If header would overlap with chat window, stick it to the chat window's left edge
  const initialWidth = initialChatWidthRef.current || 500; // Default to 500 if not set
  const widthChange = hasChatResized ? chatWidth - initialWidth : 0;
  
  // Calculate header position and check for overlap
  const [headerOffset, setHeaderOffset] = useState(0);
  const [headerWidth, setHeaderWidth] = useState(0);
  
  // Measure header width using ResizeObserver for accurate measurements
  useEffect(() => {
    if (!headerRef.current) return;
    
    const updateWidth = () => {
      if (headerRef.current) {
        setHeaderWidth(headerRef.current.offsetWidth);
      }
    };
    
    // Initial measurement
    updateWidth();
    
    // Use ResizeObserver to track width changes
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(headerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [boardName, saving, melinaStatus]);
  
  // Calculate offset based on chat width and overlap detection
  useEffect(() => {
    const calculateOffset = () => {
      if (!hasChatResized || chatWidth === 0) {
        setHeaderOffset(0);
        return;
      }
      
      const viewportWidth = window.innerWidth;
      const chatAreaWidth = chatWidth + 68; // 68px = 16 (right-4) + 44 (toggle) + 8 (gap)
      const chatLeftEdge = viewportWidth - chatAreaWidth;
      
      // Calculate header position when centered with proportional offset
      const proportionalOffset = -(widthChange / 2);
      const headerCenter = viewportWidth / 2 + proportionalOffset;
      const headerRightEdge = headerCenter + headerWidth / 2;
      
      // Check if header would overlap with chat window (with 8px gap for visual spacing)
      const gap = 8;
      if (headerRightEdge > chatLeftEdge - gap) {
        // Stick header to chat window's left edge with gap
        // Position header so its right edge is at chat's left edge minus gap
        const stickOffset = (chatLeftEdge - gap) - (viewportWidth / 2) - (headerWidth / 2);
        setHeaderOffset(stickOffset);
      } else {
        // Use proportional offset
        setHeaderOffset(proportionalOffset);
      }
    };
    
    calculateOffset();
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateOffset);
    return () => window.removeEventListener('resize', calculateOffset);
  }, [chatWidth, hasChatResized, widthChange, headerWidth]);

  return (
    <div 
      ref={headerRef}
      className="fixed top-4 left-1/2 z-50 transition-transform duration-200 ease-out"
      style={{
        transform: `translate(calc(-50% + ${headerOffset}px), 0)`,
      }}
    >
      {/* Floating control bar with blur */}
      <div className="flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-sm bg-transparent dark:bg-[#323332]/50 border border-gray-200/50 dark:border-[#565656FF] shadow-lg">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#565656FF] rounded-full transition-colors cursor-pointer"
        >
          <StepBack className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Melina status indicator */}
        <div className="relative">
          <div
            className={`w-2 h-2 rounded-full ${getMelinaStatusColor(melinaStatus)}`}
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
              className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-400 px-1 transition-colors cursor-text max-w-[150px] truncate"
              title="Double-click to rename"
            >
              <span className="block truncate max-w-[150px]">{boardName.trim() || "Untitled"}</span>
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
            <DropdownMenuItem onClick={handleNewBoard} className="cursor-pointer">
              <Plus className="w-4 h-4 mr-2" />
              New board
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicateBoard} className="cursor-pointer">
              <Copy className="w-4 h-4 mr-2" />
              Duplicate board
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowSettings(true)} className="cursor-pointer">
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
