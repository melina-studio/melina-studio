import { Copy, Check } from "lucide-react";
import { useEffect, useRef, useMemo, useState } from "react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";

type AIMessageProps = {
  content: string;
  isLatest?: boolean;
  isStreaming?: boolean;
};

function AIMessage({ content, isLatest = false, isStreaming = false }: AIMessageProps) {
  const prevContentLengthRef = useRef(content.length);
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    prevContentLengthRef.current = content.length;
  }, [content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

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
    let charIndex = 0;

    return {
      text: ({ children }) => {
        const text = String(children);
        const startIdx = charIndex;

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
      p: ({ children }) => (
        <p className="mb-3 last:mb-0 break-words leading-relaxed">{children}</p>
      ),
      h1: ({ children }) => (
        <h1 className="text-xl font-bold mb-3 break-words">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-lg font-bold mb-3 break-words">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-base font-bold mb-3 break-words">{children}</h3>
      ),
      ul: ({ children }) => (
        <ul className="list-disc ml-4 mb-3 space-y-2 break-words">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="list-decimal ml-4 mb-3 space-y-2 break-words">
          {children}
        </ol>
      ),
      li: ({ children }) => (
        <li className="break-words leading-relaxed">{children}</li>
      ),
      code: ({ children, className }) => {
        const isInline = !className;
        if (isInline) {
          return (
            <code className="bg-gray-200 dark:bg-gray-600/50 px-1.5 py-0.5 rounded text-sm break-words">
              {children}
            </code>
          );
        }
        return <code className={`${className} break-words`}>{children}</code>;
      },
      pre: ({ children }) => (
        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-sm overflow-x-auto mb-3 break-words whitespace-pre-wrap">
          {children}
        </pre>
      ),
      blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-gray-300 dark:border-gray-500 pl-4 italic mb-3 break-words text-gray-600 dark:text-gray-300">
          {children}
        </blockquote>
      ),
      a: ({ href, children }) => (
        <a
          href={href}
          className="text-blue-600 dark:text-blue-400 underline break-words hover:text-blue-500 dark:hover:text-blue-300"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>
      ),
      em: ({ children }) => <em className="italic">{children}</em>,
    };
  }, [content, charMap]);

  return (
    <div
      className="flex justify-start mb-4 mt-2 transition-all duration-200 ease-out"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3 w-full transition-all duration-200 ease-out">
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-600">
          <span className="text-white font-medium text-xs">M</span>
        </div>

        {/* Message container */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Name */}
          <span className="text-gray-500 dark:text-gray-400 text-sm mb-1 font-medium">
            Melina
          </span>

          {/* Message content */}
          <div
            className="text-sm leading-relaxed text-gray-700 dark:text-gray-200 prose prose-sm dark:prose-invert max-w-none break-words overflow-wrap-anywhere"
            style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
          >
            <Markdown components={markdownComponents}>{content}</Markdown>
          </div>

          {/* Copy button - hidden during streaming, visible for latest or on hover */}
          {!isStreaming && (
            <div className="mt-2">
              <button
                onClick={handleCopy}
                className={`p-2 rounded-lg bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300/50 dark:hover:bg-gray-600/50 transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer ${
                  isLatest || isHovered ? "opacity-100" : "opacity-0"
                }`}
                title={copied ? "Copied!" : "Copy message"}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIMessage;
