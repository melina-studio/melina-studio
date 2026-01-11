"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { SendHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreationInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  onFocusChange?: (focused: boolean) => void;
}

export function CreationInput({
  onSubmit,
  isLoading = false,
  onFocusChange,
}: CreationInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [value, setValue] = useState("");

  // Notify parent of focus changes
  useEffect(() => {
    onFocusChange?.(isFocused);
  }, [isFocused, onFocusChange]);

  const handleSubmit = useCallback(() => {
    const text = value.trim();
    if (!text || isLoading) return;

    onSubmit(text);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isLoading, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    setValue(el.value);
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-4">
      {/* Headline */}
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-medium text-foreground mb-2">
          What do you want to create?
        </h2>
        <p className="text-sm text-muted-foreground">
          Describe your idea. Melina will set it up.
        </p>
      </div>

      {/* Input bar */}
      <div
        className={cn(
          "w-full relative rounded-2xl border bg-background transition-all duration-300",
          isFocused
            ? "border-ring ring-4 ring-ring/30 shadow-lg shadow-ring/10"
            : "border-input shadow-sm hover:border-muted-foreground/30 hover:shadow-md"
        )}
      >
        <div className="flex items-center gap-2 p-3">
          <div className="flex-shrink-0">
            <Sparkles
              className={cn(
                "size-5 transition-colors duration-200",
                isFocused ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Design a system architecture diagram."
            className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground min-h-[24px] max-h-[150px] py-0.5"
            rows={1}
            disabled={isLoading}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSubmit}
                disabled={!value.trim() || isLoading}
                className={cn(
                  "flex-shrink-0 p-2 rounded-xl transition-all duration-200",
                  value.trim() && !isLoading
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 cursor-pointer"
                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                )}
              >
                {isLoading ? (
                  <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <SendHorizontal className="size-5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              {value.trim() ? "Create board" : "Enter a description"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Hint text */}
      <p className="mt-3 text-xs text-muted-foreground">
        Press{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">
          Enter
        </kbd>{" "}
        to create &bull;{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">
          Shift + Enter
        </kbd>{" "}
        for new line
      </p>

      {/* Subtle brand signature */}
      <p className="mt-4 text-[11px] text-muted-foreground/40 font-medium tracking-wide">
        <span className="text-primary/50 underline">Melina</span>
        <span> </span>
        <span className="text-muted-foreground/40">is ready</span>
      </p>
    </div>
  );
}
