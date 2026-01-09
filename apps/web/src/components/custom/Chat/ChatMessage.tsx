import { Bot } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useMemo } from "react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";

type MessageProps = {
  role: "user" | "assistant";
  content: string;
};

function ChatMessage({ role, content }: MessageProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isHuman = role === "user";
  const prevContentLengthRef = useRef(content.length);

  useEffect(() => {
    prevContentLengthRef.current = content.length;
  }, [content]);

  // Create a map of character positions to their "isNew" status
  const charMap = useMemo(() => {
    const map = new Map<number, boolean>();
    const prevLength = prevContentLengthRef.current;

    content.split("").forEach((_, index) => {
      map.set(index, index >= prevLength);
    });

    return map;
  }, [content]);

  // Custom components for react-markdown that preserve streaming animation
  const markdownComponents: Components = useMemo(() => {
    // Use a closure to track character position as we render
    let charIndex = 0;

    return {
      // Render text nodes with streaming animation
      text: ({ children }) => {
        const text = String(children);
        const startIdx = charIndex;

        // Split text into characters and check each one
        const animatedChars = text.split("").map((char, localIdx) => {
          const globalIdx = startIdx + localIdx;
          const isNew = charMap.get(globalIdx) ?? false;

          return (
            <span
              key={localIdx}
              className={isNew ? "streaming-char-fade-in" : ""}
              style={{ display: "inline", wordBreak: "break-word" }}
            >
              {char}
            </span>
          );
        });

        charIndex += text.length;

        return <>{animatedChars}</>;
      },
      // Preserve other markdown elements
      p: ({ children }) => (
        <p className="mb-2 last:mb-0 break-words">{children}</p>
      ),
      h1: ({ children }) => (
        <h1 className="text-xl font-bold mb-2 break-words">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-lg font-bold mb-2 break-words">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-base font-bold mb-2 break-words">{children}</h3>
      ),
      ul: ({ children }) => (
        <ul className="list-disc list-inside mb-2 space-y-1 break-words">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="list-decimal list-inside mb-2 space-y-1 break-words">
          {children}
        </ol>
      ),
      li: ({ children }) => <li className="break-words">{children}</li>,
      code: ({ children, className }) => {
        const isInline = !className;
        if (isInline) {
          return (
            <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded text-xs break-words">
              {children}
            </code>
          );
        }
        return <code className={`${className} break-words`}>{children}</code>;
      },
      pre: ({ children }) => (
        <pre className="bg-gray-200 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto mb-2 break-words whitespace-pre-wrap">
          {children}
        </pre>
      ),
      blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic mb-2 break-words">
          {children}
        </blockquote>
      ),
      a: ({ href, children }) => (
        <a
          href={href}
          className="text-blue-500 dark:text-blue-400 underline break-words"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),
      strong: ({ children }) => (
        <strong className="font-bold">{children}</strong>
      ),
      em: ({ children }) => <em className="italic">{children}</em>,
    };
  }, [content, charMap]);

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
          className={`px-4 py-2 rounded-xl w-full transition-all duration-200 ease-out overflow-hidden ${
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
          <div
            className="text-xs leading-relaxed prose prose-sm dark:prose-invert max-w-none break-words overflow-wrap-anywhere"
            style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
          >
            <Markdown components={markdownComponents}>{content}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
