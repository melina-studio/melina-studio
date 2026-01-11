"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ProcessingRequest } from "@/components/custom/Loader/ProcessingRequest";
import { BoardsHeader } from "@/components/custom/Boards/BoardsHeader";
import { BoardGrid } from "@/components/custom/Boards/BoardGrid";
import { CreationInput } from "@/components/custom/Boards/CreationInput";
import type { Board } from "@/components/custom/Boards/types";
import { useBoard } from "@/hooks/useBoard";
import { Ripple } from "@/components/ui/aceternity/Ripple";

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

  const [isCreating, setIsCreating] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Handle creating a new board
  async function handleCreateNewBoard() {
    const uuid = await createNewBoard();
    if (uuid) {
      router.push(`/playground/${uuid}`);
    }
  }

  // Handle creation from the centered input
  async function handleCreationSubmit(message: string) {
    setIsCreating(true);
    try {
      const uuid = await createNewBoard();
      if (uuid) {
        // Navigate to the new board with the initial message as a query param
        const encodedMessage = encodeURIComponent(message);
        router.push(`/playground/${uuid}?initialMessage=${encodedMessage}`);
      }
    } finally {
      setIsCreating(false);
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

  // Refetch boards when page becomes visible (user navigates back from a board)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        getAllBoards();
      }
    };

    // Also refetch on window focus (covers more navigation cases)
    const handleFocus = () => {
      getAllBoards();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [getAllBoards]);

  if (loading && boards.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ProcessingRequest />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Ripple Effect */}
      <Ripple className="z-0" />

      <div className="relative z-10 p-6 md:px-12 sm:p-8 md:p-4 max-w-7xl mx-auto">
        <BoardsHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOption={sortOption}
          onSortChange={setSortOption}
        />

        {/* Creation Input - centered launcher with spotlight effect */}
        <div
          className={`relative py-8 mb-8 border-b border-border/50 transition-all duration-300 ${
            isInputFocused ? "before:opacity-100" : "before:opacity-0"
          } before:absolute before:inset-0 before:-inset-x-12 before:-inset-y-8 before:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08)_0%,transparent_70%)] dark:before:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.04)_0%,transparent_70%)] before:pointer-events-none before:transition-opacity before:duration-300`}
        >
          <CreationInput
            onSubmit={handleCreationSubmit}
            isLoading={isCreating}
            onFocusChange={setIsInputFocused}
          />
        </div>

        {/* Content below - dims when input is focused */}
        <div
          className={`transition-all duration-300 ${
            isInputFocused ? "opacity-50 scale-[0.995]" : "opacity-100 scale-100"
          }`}
        >
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
      </div>
    </div>
  );
}

export default Playground;
