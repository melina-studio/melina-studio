"use client";

import { NewBoardCard } from "./NewBoardCard";
import { BoardCard } from "./BoardCard";
import type { Board } from "./types";

interface BoardGridProps {
  boards: Board[];
  onCreateNew: () => void;
  onOpenBoard: (board: Board) => void;
  onDuplicateBoard: (board: Board) => void;
  onDeleteBoard: (board: Board) => void;
}

export function BoardGrid({
  boards,
  onCreateNew,
  onOpenBoard,
  onDuplicateBoard,
  onDeleteBoard,
}: BoardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
      {/* Create New Board Card - Always first */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <NewBoardCard onClick={onCreateNew} />
      </div>

      {/* Board Cards */}
      {boards.map((board, index) => (
        <div
          key={board.uuid}
          className="animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
        >
          <BoardCard
            board={board}
            onOpen={() => onOpenBoard(board)}
            onDuplicate={() => onDuplicateBoard(board)}
            onDelete={() => onDeleteBoard(board)}
          />
        </div>
      ))}
    </div>
  );
}
