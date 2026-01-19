import AIMessage from "./AIMessage";
import HumanMessage from "./HumanMessage";

type MessageProps = {
  role: "user" | "assistant";
  content: string;
  isLatest?: boolean;
  isStreaming?: boolean;
};

function ChatMessage({ role, content, isLatest = false, isStreaming = false }: MessageProps) {
  if (role === "user") {
    return <HumanMessage content={content} />;
  }

  return <AIMessage content={content} isLatest={isLatest} isStreaming={isStreaming} />;
}

export default ChatMessage;
