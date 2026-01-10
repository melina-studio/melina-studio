"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { USER_ID } from "@/lib/constants";
import {
  createBoard,
  getBoards,
  getStarredBoards,
} from "@/service/boardService";
import { ProcessingRequest } from "@/components/custom/Loader/ProcessingRequest";
import { BoardsHeader } from "@/components/custom/Boards/BoardsHeader";
import { BoardGrid } from "@/components/custom/Boards/BoardGrid";
import type { Board, SortOption } from "@/components/custom/Boards/types";

// Main Component
function Playground() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("recent");
  const [starredBoards, setStarredBoards] = useState<Set<string>>(new Set());

  async function createNewBoard() {
    try {
      setLoading(true);
      const data = await createBoard(USER_ID, "Untitled");
      router.push(`/playground/${data.uuid}`);
    } catch (error: any) {
      setError(error.message);
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  async function getAllBoards() {
    setLoading(true);
    try {
      const data = await getBoards();
      setBoards(data.boards || []);
    } catch (error: any) {
      setError(error.message);
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStarredBoards() {
    try {
      const data = await getStarredBoards(USER_ID);
      setStarredBoards(new Set(data.starredBoards || []));
    } catch (error: any) {
      console.log(error);
    }
  }

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

  function handleOpenBoard(board: Board) {
    router.push(`/playground/${board.uuid}`);
  }

  function handleDuplicateBoard(board: Board) {
    // TODO: Implement duplicate functionality
    console.log("Duplicate board:", board.uuid);
  }

  function handleDeleteBoard(board: Board) {
    // TODO: Implement delete functionality
    console.log("Delete board:", board.uuid);
  }

  // Listen for sidebar events
  useEffect(() => {
    const handleCreateNewBoard = () => {
      createNewBoard();
    };

    const handleOpenMelinaChat = () => {
      // TODO: Implement Melina chat panel opening
      console.log("Open Melina chat panel");
    };

    window.addEventListener("createNewBoard", handleCreateNewBoard);
    window.addEventListener("openMelinaChat", handleOpenMelinaChat);

    return () => {
      window.removeEventListener("createNewBoard", handleCreateNewBoard);
      window.removeEventListener("openMelinaChat", handleOpenMelinaChat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set default settings and fetch boards
  useEffect(() => {
    async function fetchData() {
      // Fetch starred boards from API
      await fetchStarredBoards();

      // First check if settings are already set
      if (localStorage.getItem("settings")) {
        await getAllBoards();
        return;
      }

      // Then set default settings
      localStorage.setItem(
        "settings",
        JSON.stringify({
          activeModel: "groq",
          temperature: 0.5,
          maxTokens: 1000,
          theme: theme,
        })
      );
      await getAllBoards();
    }
    fetchData();
  }, [theme]);

  if (loading && boards.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ProcessingRequest />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-8 md:p-12 max-w-7xl mx-auto">
      <BoardsHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortOption={sortOption}
        onSortChange={(value) => setSortOption(value as SortOption)}
      />

      {error && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <BoardGrid
        boards={filteredAndSortedBoards}
        onCreateNew={createNewBoard}
        onOpenBoard={handleOpenBoard}
        onDuplicateBoard={handleDuplicateBoard}
        onDeleteBoard={handleDeleteBoard}
      />

      {filteredAndSortedBoards.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery
            ? "No boards found matching your search."
            : "No boards yet. Create your first board to get started."}
        </div>
      )}
    </div>
  );
}

export default Playground;
