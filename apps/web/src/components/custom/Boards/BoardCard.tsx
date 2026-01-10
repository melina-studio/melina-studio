"use client";

import { useEffect, useMemo, useState } from "react";
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

  // Browser/CDN can cache the same URL even if the file behind it changes.
  // Bust cache using a stable version key (updated_at) so the newest thumbnail renders.
  // Additionally, include a per-mount cache-buster so going back to the board list
  // always refetches the image (even if the board list data is stale).
  const mountCacheBuster = useMemo(() => Date.now().toString(), []);

  const versionedThumbnailUrl = useMemo(() => {
    if (!thumbnailUrl) return "";
    const joiner = thumbnailUrl.includes("?") ? "&" : "?";
    const parts: string[] = [];
    if (updatedAt) parts.push(`v=${encodeURIComponent(updatedAt)}`);
    parts.push(`cb=${encodeURIComponent(mountCacheBuster)}`);
    return `${thumbnailUrl}${joiner}${parts.join("&")}`;
  }, [thumbnailUrl, updatedAt, mountCacheBuster]);

  // If thumbnail changes, reset loading/error so the new image can load.
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [versionedThumbnailUrl]);

  const hasThumbnail = versionedThumbnailUrl && !imageError;

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // Don't set hover to false if menu is open - keeps menu visible
    if (!menuOpen) {
      setIsHovered(false);
    }
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
              src={versionedThumbnailUrl}
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

      {/* Quick actions - show on hover or when menu is open */}
      <div
        className={cn(
          "absolute top-2 right-2 flex gap-1 transition-opacity duration-200 z-20",
          isHovered || menuOpen ? "opacity-100" : "opacity-0"
        )}
        onMouseEnter={(e) => {
          e.stopPropagation();
          setIsHovered(true);
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          // Don't set hover to false if menu is open
          if (!menuOpen) {
            setIsHovered(false);
          }
        }}
      >
        <DropdownMenu
          open={menuOpen}
          onOpenChange={(open) => {
            setMenuOpen(open);
            // When menu closes, reset hover state if mouse is not over the card
            if (!open && !isHovered) {
              setIsHovered(false);
            }
          }}
        >
          <DropdownMenuTrigger
            onClick={(e) => {
              e.stopPropagation();
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
