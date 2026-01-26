import { Board, SortOption } from "@/lib/types";
import {
  createBoard,
  getBoards,
  getStarredBoards,
  deleteBoard,
  updateBoard,
  duplicateBoard,
} from "@/service/boardService";
import { useState, useMemo, useCallback } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { UpdateBoardPayload } from "@/lib/types";

export const useBoard = () => {
  const [board, setBoard] = useState<Board | null>(null);
  const pathname = usePathname();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starredBoards, setStarredBoards] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("recent");
  const searchParams = useSearchParams();

  //   Get all boards
  const getAllBoards = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getBoards();
      setBoards(response.boards || []);
      setLoading(false);
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, []);

  //   Create a new board
  const createNewBoard = async (title: string = "Untitled") => {
    try {
      setLoading(true);
      const response = await createBoard(title);
      return response.uuid;
    } catch (error: any) {
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  //   Fetch starred boards (computed from boards list)
  const fetchStarredBoards = useCallback(async () => {
    // Starred boards are now derived from the boards list
    // This function exists for backwards compatibility
  }, []);

  //   Toggle star status for a board
  const toggleStarBoard = async (boardId: string) => {
    try {
      // Find the board and toggle its starred status
      const boardToUpdate = boards.find((b) => b.uuid === boardId);
      if (!boardToUpdate) return;

      const newStarredStatus = !boardToUpdate.starred;
      await updateBoard(boardId, { starred: newStarredStatus });

      // Update local state
      setBoards((prevBoards) =>
        prevBoards.map((b) =>
          b.uuid === boardId ? { ...b, starred: newStarredStatus } : b
        )
      );

      // Update starredBoards set
      setStarredBoards((prev) => {
        const newSet = new Set(prev);
        if (newStarredStatus) {
          newSet.add(boardId);
        } else {
          newSet.delete(boardId);
        }
        return newSet;
      });
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Get filter from URL params
  const filter = searchParams.get("filter") || "all";

  // Filter and sort boards
  const filteredAndSortedBoards = useMemo(() => {
    let filtered = boards;

    // Apply sidebar filter
    if (filter === "starred") {
      filtered = filtered.filter((board) => board.starred);
    } else if (filter === "recent") {
      // Show boards updated in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter((board) => {
        const updatedAt = new Date(board.updated_at);
        return updatedAt >= sevenDaysAgo;
      });
    }
    // "all" or no filter shows all boards

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (board) =>
          board.title?.toLowerCase().includes(query) || board.uuid?.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a: Board, b: Board) => {
      const aTime = a.updated_at || "";
      const bTime = b.updated_at || "";

      switch (sortOption) {
        case "recent":
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        case "az":
          return (a.title || "").localeCompare(b.title || "");
        case "lastEdited":
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [boards, searchQuery, sortOption, filter, starredBoards]);

  //   delete board
  const deleteBoardById = async (boardId: string, currentRoute: string) => {
    try {
      setLoading(true);
      await deleteBoard(boardId);
      console.log(currentRoute, "currentRoute");
      if (currentRoute === "/playground/all?filter=starred") {
        await fetchStarredBoards();
      } else {
        await getAllBoards();
      }
      setLoading(false);
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  //   duplicate board
  const duplicateBoardById = async (boardId: string) => {
    try {
      setLoading(true);
      const response = await duplicateBoard(boardId);
      await getAllBoards();
      return response.uuid;
    } catch (error: any) {
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Determine active item based on pathname and query params
  const getActiveHref = useCallback(() => {
    if (pathname === "/playground/all") {
      if (filter === "starred") return "/playground/all?filter=starred";
      if (filter === "recent") return "/playground/all?filter=recent";
      return "/playground/all";
    }
    return pathname || "/playground/all";
  }, [pathname, filter]);

  //   update board
  const updateBoardById = async (boardId: string, payload: UpdateBoardPayload) => {
    try {
      setLoading(true);
      await updateBoard(boardId, payload);
      setLoading(false);
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    board,
    boards,
    loading,
    error,
    starredBoards,
    searchQuery,
    sortOption,
    setSearchQuery,
    setSortOption,
    getAllBoards,
    createNewBoard,
    fetchStarredBoards,
    filteredAndSortedBoards,
    deleteBoardById,
    duplicateBoardById,
    toggleStarBoard,
    getActiveHref,
    updateBoardById,
  };
};
