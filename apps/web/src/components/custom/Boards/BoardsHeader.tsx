"use client";

import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortOption } from "./types";

interface BoardsHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortOption: SortOption;
  onSortChange: (value: SortOption) => void;
}

export function BoardsHeader({
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
}: BoardsHeaderProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Title and subtitle */}
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Boards
          </h1>
          <p className="text-sm text-muted-foreground">
            Create, explore, and manage your canvases
          </p>
        </div>

        {/* Right: Search and Sort */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-48 h-9"
            />
          </div>

          {/* Sort */}
          <Select value={sortOption} onValueChange={onSortChange}>
            <SelectTrigger className="w-[140px] h-9">
              <ArrowUpDown className="size-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="az">A–Z</SelectItem>
              <SelectItem value="lastEdited">Last edited</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
