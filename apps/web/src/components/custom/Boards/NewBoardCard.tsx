"use client";

import { PlusIcon } from "lucide-react";

interface NewBoardCardProps {
  onClick: () => void;
}

export function NewBoardCard({ onClick }: NewBoardCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative w-full aspect-[16/9] rounded-lg border-2 border-dashed border-primary/40 bg-card/50 hover:bg-card hover:border-solid hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-3 hover:-translate-y-1"
    >
      <PlusIcon className="size-8 text-muted-foreground group-hover:text-primary transition-colors" />
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          New board
        </span>
        {/* <span className="text-xs text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors duration-200">
          Start from scratch
        </span> */}
      </div>
    </div>
  );
}
