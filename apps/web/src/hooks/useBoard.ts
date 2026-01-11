import { Board, SortOption } from "@/components/custom/Boards/types";
import { USER_ID } from "@/lib/constants";
import {
  createBoard,
  getBoards,
  getStarredBoards,
  deleteBoard,
  updateBoard,
} from "@/service/boardService";
import { useState, useMemo, useCallback } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { UpdateBoardPayload } from "@/components/custom/Boards/types";

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
      const response = await createBoard(USER_ID, title);
      return response.uuid;
    } catch (error: any) {
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  //   Fetch starred boards
  const fetchStarredBoards = useCallback(async () => {
    try {
      const data = await getStarredBoards(USER_ID);
      setStarredBoards(new Set(data.starredBoards || []));
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get filter from URL params
  const filter = searchParams.get("filter") || "all";

  // Filter and sort boards
  const filteredAndSortedBoards = useMemo(() => {
    let filtered = boards;

    // Apply sidebar filter
    if (filter === "starred") {
      filtered = filtered.filter((board) => starredBoards.has(board.uuid));
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
          board.title?.toLowerCase().includes(query) ||
          board.uuid?.toLowerCase().includes(query)
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

  // Determine active item based on pathname and query params
  const getActiveHref = () => {
    if (typeof window !== "undefined" && pathname === "/playground/all") {
      const params = new URLSearchParams(window.location.search);
      const filter = params.get("filter");
      if (filter === "starred") return "/playground/all?filter=starred";
      if (filter === "recent") return "/playground/all?filter=recent";
      return "/playground/all";
    }
    return pathname || "/playground/all";
  };

  //   update board
  const updateBoardById = async (
    boardId: string,
    payload: UpdateBoardPayload
  ) => {
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
    getActiveHref,
    updateBoardById,
  };
};
