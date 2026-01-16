"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { SendHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FlipWords } from "@/components/ui/flip-words";

// Placeholder suggestions that cycle through
const PLACEHOLDER_SUGGESTIONS = [
  "Design a system architecture diagram",
  "Create a user flow for checkout process",
  "Sketch a mobile app wireframe",
  "Map out a database schema",
  "Draw a component hierarchy tree",
  "Plan a microservices architecture",
  "Illustrate a CI/CD pipeline",
  "Design a landing page layout",
];

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

  // Animated placeholder state
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  const words = ["create", "make", "visualize", "plan"];

  // Notify parent of focus changes
  useEffect(() => {
    onFocusChange?.(isFocused);
  }, [isFocused, onFocusChange]);

  // Typewriter animation effect
  useEffect(() => {
    // Don't animate if there's user input
    if (value) return;

    const currentText = PLACEHOLDER_SUGGESTIONS[currentPlaceholderIndex];
    let charIndex = 0;
    let timeoutId: NodeJS.Timeout;

    if (isTyping) {
      // Typing phase
      const typeNextChar = () => {
        if (charIndex <= currentText.length) {
          setDisplayedPlaceholder(currentText.slice(0, charIndex));
          charIndex++;
          timeoutId = setTimeout(typeNextChar, 50 + Math.random() * 30); // Variable typing speed
        } else {
          // Pause at the end before erasing
          timeoutId = setTimeout(() => setIsTyping(false), 2000);
        }
      };
      typeNextChar();
    } else {
      // Erasing phase
      let eraseIndex = currentText.length;
      const eraseNextChar = () => {
        if (eraseIndex >= 0) {
          setDisplayedPlaceholder(currentText.slice(0, eraseIndex));
          eraseIndex--;
          timeoutId = setTimeout(eraseNextChar, 25); // Faster erasing
        } else {
          // Move to next placeholder
          setCurrentPlaceholderIndex(
            (prev) => (prev + 1) % PLACEHOLDER_SUGGESTIONS.length
          );
          setIsTyping(true);
        }
      };
      eraseNextChar();
    }

    return () => clearTimeout(timeoutId);
  }, [currentPlaceholderIndex, isTyping, value]);

  // Get the full current placeholder for Tab completion
  const currentFullPlaceholder =
    PLACEHOLDER_SUGGESTIONS[currentPlaceholderIndex];

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
    // Tab to fill in the current placeholder
    if (e.key === "Tab" && !value) {
      e.preventDefault();
      setValue(currentFullPlaceholder);
      // Adjust textarea height for the new content
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = `${Math.min(
              textareaRef.current.scrollHeight,
              150
            )}px`;
          }
        }, 0);
      }
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
          What do you want to
          <FlipWords words={words} />?
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
          <div className="flex-1 relative flex items-center">
            {/* Animated placeholder overlay */}
            {!value && (
              <div className="absolute inset-0 flex items-center pointer-events-none text-sm text-muted-foreground">
                <span>{displayedPlaceholder}</span>
                <span
                  className={cn(
                    "inline-block w-[2px] h-[1.1em] bg-muted-foreground/60 ml-[1px]",
                    "animate-pulse"
                  )}
                  style={{
                    animation: "blink 1s step-end infinite",
                  }}
                />
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full bg-transparent text-sm resize-none outline-none min-h-[24px] max-h-[150px]"
              rows={1}
              disabled={isLoading}
            />
          </div>
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
          Tab
        </kbd>{" "}
        to use suggestion &bull;{" "}
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
