"use client";

import { useState } from "react";
import { MoreVertical, Copy, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Board } from "./types";
import { formatRelativeTime, getBoardInitials } from "./utils";

interface BoardCardProps {
  board: Board;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function BoardCard({
  board,
  onOpen,
  onDuplicate,
  onDelete,
}: BoardCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const thumbnailUrl = board.thumbnail?.trim() || "";
  const updatedAt = board.updated_at;
  const title = board.title || "Untitled";
  const hasThumbnail = thumbnailUrl && !imageError;

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMenuOpen(false);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onOpen}
      className="group relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-card border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="absolute inset-0">
        {hasThumbnail ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
            <img
              src={thumbnailUrl}
              alt={title}
              className={cn(
                "w-full h-full object-cover rounded-lg transition-all duration-300",
                imageLoading && "blur-sm scale-105"
              )}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 rounded-lg" />
          </>
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center rounded-lg">
            {/* Only show initials when no thumbnail */}
            <div className="text-4xl font-semibold text-muted-foreground/40">
              {getBoardInitials(title)}
            </div>
          </div>
        )}
      </div>

      {/* Title overlay - refined hierarchy: thumbnail dominates, title smaller/lighter, timestamp muted */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/85 via-black/70 to-transparent rounded-b-lg z-10">
        <div className="text-sm font-medium text-white/95 truncate mb-0.5">
          {title}
        </div>
        <div className="text-xs text-white/70">
          {formatRelativeTime(updatedAt)}
        </div>
      </div>

      {/* Quick actions - only show on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-20">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(true);
            }}
            className="p-1.5 rounded-md bg-background/90 backdrop-blur-sm border border-border hover:bg-background transition-colors cursor-pointer"
          >
            <MoreVertical className="size-4 text-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
                setMenuOpen(false);
              }}
            >
              <Copy className="size-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setMenuOpen(false);
              }}
            >
              <Trash2 className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
