import AIMessage from "./AIMessage";
import HumanMessage from "./HumanMessage";

// Type for streaming thinking state
type StreamingThinking = {
  content: string;
  isActive: boolean;
  startTime: number | null;
  duration: number | null;
};

type MessageProps = {
  role: "user" | "assistant";
  content: string;
  isLatest?: boolean;
  isStreaming?: boolean;
  thought?: string; // From database (history) - only for assistant messages
  streamingThinking?: StreamingThinking; // Live streaming thinking for current message
  loaderText?: string | null; // Dynamic loader text from backend
};

function ChatMessage({
  role,
  content,
  isLatest = false,
  isStreaming = false,
  thought,
  streamingThinking,
  loaderText,
}: MessageProps) {
  if (role === "user") {
    return <HumanMessage content={content} />;
  }

  return (
    <AIMessage
      content={content}
      isLatest={isLatest}
      isStreaming={isStreaming}
      thought={thought}
      streamingThinking={streamingThinking}
      loaderText={loaderText}
    />
  );
}

export default ChatMessage;
