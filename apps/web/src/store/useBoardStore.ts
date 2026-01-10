import { create } from "zustand";
import type { Board } from "@/components/custom/Boards/types";

interface BoardStoreState {
  currentBoard: Board | null;
  setCurrentBoard: (board: Board | null) => void;
  clearCurrentBoard: () => void;
}

export const useBoardStore = create<BoardStoreState>((set) => ({
  currentBoard: null,
  setCurrentBoard: (board: Board | null) => set({ currentBoard: board }),
  clearCurrentBoard: () => set({ currentBoard: null }),
}));
