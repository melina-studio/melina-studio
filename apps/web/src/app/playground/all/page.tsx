"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ProcessingRequest } from "@/components/custom/Loader/ProcessingRequest";
import { BoardsHeader } from "@/components/custom/Boards/BoardsHeader";
import { BoardGrid } from "@/components/custom/Boards/BoardGrid";
import type { Board } from "@/components/custom/Boards/types";
import { useBoard } from "@/hooks/useBoard";

// Main Component
function Playground() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    boards,
    loading,
    error,
    searchQuery,
    sortOption,
    setSearchQuery,
    setSortOption,
    filteredAndSortedBoards,
    createNewBoard,
    fetchStarredBoards,
    getAllBoards,
    deleteBoardById,
    getActiveHref,
  } = useBoard();

  // Handle creating a new board
  async function handleCreateNewBoard() {
    const uuid = await createNewBoard();
    if (uuid) {
      router.push(`/playground/${uuid}`);
    }
  }

  function handleOpenBoard(board: Board) {
    router.push(`/playground/${board.uuid}`);
  }

  function handleDuplicateBoard(board: Board) {
    // TODO: Implement duplicate functionality
    console.log("Duplicate board:", board.uuid);
  }

  async function handleDeleteBoard(board: Board) {
    const activeHref = getActiveHref();
    await deleteBoardById(board.uuid, activeHref);
  }

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
        onSortChange={setSortOption}
      />

      {error && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <BoardGrid
        boards={filteredAndSortedBoards}
        onCreateNew={handleCreateNewBoard}
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
