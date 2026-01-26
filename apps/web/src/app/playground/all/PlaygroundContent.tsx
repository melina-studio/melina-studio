"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ProcessingRequest } from "@/components/custom/Loader/ProcessingRequest";
import { BoardNavigationLoader } from "@/components/custom/Loader/BoardNavigationLoader";
import { BoardsHeader } from "@/components/custom/Boards/BoardsHeader";
import { BoardGrid } from "@/components/custom/Boards/BoardGrid";
import { CreationInput } from "@/components/custom/Boards/CreationInput";
import type { Board } from "@/lib/types";
import { useBoard } from "@/hooks/useBoard";
import { Ripple } from "@/components/ui/aceternity/Ripple";

export default function PlaygroundContent() {
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
    duplicateBoardById,
    toggleStarBoard,
    getActiveHref,
  } = useBoard();

  const [isCreating, setIsCreating] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingBoardTitle, setNavigatingBoardTitle] = useState<string | undefined>();

  // Minimum time to show the loader before navigating (in ms)
  const NAVIGATION_DELAY = 1500;

  // Helper to delay navigation for smooth loader experience
  const navigateWithDelay = (url: string, startTime: number) => {
    const elapsed = Date.now() - startTime;
    const remainingDelay = Math.max(0, NAVIGATION_DELAY - elapsed);

    setTimeout(() => {
      router.push(url);
    }, remainingDelay);
  };

  // Handle creating a new board
  async function handleCreateNewBoard() {
    const startTime = Date.now();
    setNavigatingBoardTitle("Creating new board...");
    setIsNavigating(true);
    const uuid = await createNewBoard();
    if (uuid) {
      navigateWithDelay(`/playground/${uuid}`, startTime);
    } else {
      setIsNavigating(false);
    }
  }

  // Handle creation from the centered input
  async function handleCreationSubmit(message: string) {
    const startTime = Date.now();
    setIsCreating(true);
    setNavigatingBoardTitle("Creating new board...");
    setIsNavigating(true);
    try {
      const uuid = await createNewBoard();
      if (uuid) {
        // Navigate to the new board with the initial message as a query param
        const encodedMessage = encodeURIComponent(message);
        navigateWithDelay(`/playground/${uuid}?initialMessage=${encodedMessage}`, startTime);
      } else {
        setIsNavigating(false);
      }
    } finally {
      setIsCreating(false);
    }
  }

  function handleOpenBoard(board: Board) {
    const startTime = Date.now();
    setNavigatingBoardTitle(board.title || "Initializing...");
    setIsNavigating(true);
    navigateWithDelay(`/playground/${board.uuid}`, startTime);
  }

  async function handleDuplicateBoard(board: Board) {
    const startTime = Date.now();
    setNavigatingBoardTitle(`Duplicating "${board.title || "Untitled"}"...`);
    setIsNavigating(true);
    const newUuid = await duplicateBoardById(board.uuid);
    if (newUuid) {
      navigateWithDelay(`/playground/${newUuid}`, startTime);
    } else {
      setIsNavigating(false);
    }
  }

  async function handleDeleteBoard(board: Board) {
    const activeHref = getActiveHref();
    await deleteBoardById(board.uuid, activeHref);
  }

  function handleToggleStar(board: Board) {
    toggleStarBoard(board.uuid);
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
          activeModel: "anthropic",
          temperature: 0.5,
          maxTokens: 1000,
          theme: theme,
        })
      );
      await getAllBoards();
    }
    fetchData();
  }, [theme, fetchStarredBoards, getAllBoards]);

  if (loading && boards.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ProcessingRequest />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Navigation Loader */}
      <BoardNavigationLoader isVisible={isNavigating} boardTitle={navigatingBoardTitle} />

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
          className={`relative py-8 mb-8 border-b border-border/50 transition-all duration-300 ${isInputFocused ? "before:opacity-100" : "before:opacity-0"
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
          className={`transition-all duration-300 ${isInputFocused ? "opacity-50 scale-[0.995]" : "opacity-100 scale-100"
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
            onToggleStar={handleToggleStar}
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
