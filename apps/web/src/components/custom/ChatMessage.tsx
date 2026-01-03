import { Bot } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, useMemo } from "react";

type MessageProps = {
  role: "user" | "assistant";
  content: string;
};

function ChatMessage({ role, content }: MessageProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isHuman = role === "user";
  const prevContentLengthRef = useRef(content.length);

  // Split content into characters and track which ones are new
  const characters = useMemo(() => {
    const chars = content.split("");
    const prevLength = prevContentLengthRef.current;

    return chars.map((char, index) => ({
      char,
      isNew: index >= prevLength,
    }));
  }, [content]);

  useEffect(() => {
    prevContentLengthRef.current = content.length;
  }, [content]);

  return (
    <div
      className={`flex ${
        isHuman ? "justify-end" : "justify-start mb-4 mt-2"
      } mb-1 transition-all duration-200 ease-out`}
    >
      <div
        className={`flex items-end gap-2 max-w-[85%] ${
          isHuman ? "flex-row-reverse" : "flex-row"
        } transition-all duration-200 ease-out`}
      >
        {/* Avatar - only for AI */}
        {!isHuman && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
            <Bot className="w-4 h-4 text-gray-700 dark:text-gray-200" />
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`px-4 py-2 rounded-xl w-full transition-all duration-200 ease-out ${
            isHuman
              ? "text-white rounded-br-sm bg-gradient-to-br from-blue-300 via-indigo-500 to-purple-900"
              : isDark
              ? "bg-gray-700/80 text-white rounded-bl-sm"
              : "bg-gray-200/80 text-gray-900 rounded-bl-sm"
          }`}
          style={{
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <pre className="text-xs leading-relaxed whitespace-pre-wrap">
            {characters.map((item, index) => (
              <span
                key={index}
                className={item.isNew ? "streaming-char-fade-in" : ""}
                style={{ display: "inline" }}
              >
                {item.char}
              </span>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
