import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";

type ThinkingDropdownProps = {
  content: string;
  isThinking: boolean; // Currently streaming thinking
  duration: number | null; // Duration in seconds after completion
  isFromHistory?: boolean; // If loaded from DB (already complete)
};

function ThinkingDropdown({
  content,
  isThinking,
  duration,
  isFromHistory = false,
}: ThinkingDropdownProps) {
  // Auto-expand while thinking (for live streaming), collapsed for history
  const [isExpanded, setIsExpanded] = useState(isThinking && !isFromHistory);

  // Auto-collapse when thinking completes (not for history)
  useEffect(() => {
    if (!isThinking && !isFromHistory && content.length > 0) {
      // Small delay before collapsing to let user see the final state
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isThinking, isFromHistory, content.length]);

  // Auto-expand when thinking starts
  useEffect(() => {
    if (isThinking && !isFromHistory) {
      setIsExpanded(true);
    }
  }, [isThinking, isFromHistory]);

  // Don't render if no content and not thinking
  if (!content && !isThinking) return null;

  const getHeaderText = () => {
    if (isThinking) {
      return "Thinking...";
    }
    if (duration !== null) {
      return `Thought for ${duration} second${duration !== 1 ? "s" : ""}`;
    }
    // For history items where we don't know the duration
    return "Thought process";
  };

  return (
    <div className="mb-3 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
        )}
        <Brain className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{getHeaderText()}</span>
        {isThinking && (
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words">
          {content || "Thinking..."}
        </div>
      )}
    </div>
  );
}

export default ThinkingDropdown;
