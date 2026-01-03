import { Bot, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import ChatMessage from "./ChatMessage";
import TypingLoader from "./TypingLoader";
import { v4 as uuidv4 } from "uuid";
import { useParams } from "next/navigation";
import { useWebsocket } from "@/hooks/useWebsocket";

type Message = {
  uuid: string;
  role: "user" | "assistant";
  content: string;
};

type AiMessageResponse = {
  ai_message_id: string;
  human_message_id: string;
  message: string;
};

type ChatResponse = {
  type: string;
  data: {
    board_id: string;
    message: string;
    human_message_id?: string;
    ai_message_id?: string;
    created_at?: string;
    updated_at?: string;
  };
};

function AIController({ chatHistory }: { chatHistory: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(chatHistory);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const params = useParams();
  const boardId = params?.id as string;

  const aiMessageIdRef = useRef<string | null>(null);
  const humanMessageIdRef = useRef<string | null>(null);

  const { sendMessage, subscribe } = useWebsocket();

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = textareaRef.current?.value.trim();
    if (!text) return;
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }

    // Add user message with temporary UUID
    const humanMessageId = uuidv4();
    humanMessageIdRef.current = humanMessageId;
    setMessages((msgs) => [
      ...msgs,
      { uuid: humanMessageId, role: "user", content: text },
    ]);
    // setIsMessageLoading(true);
    try {
      sendMessage({
        type: "chat_message",
        data: {
          board_id: boardId,
          message: text,
        },
      });
    } catch (error) {
      console.log(error);
      // setIsMessageLoading(false);
      humanMessageIdRef.current = null;
      return;
    }
  };

  useEffect(() => {
    const unsubscribeChatStart = subscribe("chat_starting", (data) => {
      setIsMessageLoading(true);
      // Create temporary AI message ID, but don't create the message yet
      // Wait for first chunk to arrive before creating the message bubble
      const aiId = crypto.randomUUID();
      aiMessageIdRef.current = aiId;
    });

    const unsubscribeChatCompleted = subscribe(
      "chat_completed",
      (data: ChatResponse) => {
        setIsMessageLoading(false);

        const { ai_message_id, human_message_id } = data.data;

        if (ai_message_id && human_message_id) {
          // Update both message UUIDs with the actual IDs from backend
          setMessages((msgs) =>
            msgs.map((msg) => {
              // Update human message UUID
              if (
                msg.uuid === humanMessageIdRef.current &&
                msg.role === "user"
              ) {
                humanMessageIdRef.current = null;
                return { ...msg, uuid: human_message_id };
              }
              // Update AI message UUID
              if (
                msg.uuid === aiMessageIdRef.current &&
                msg.role === "assistant"
              ) {
                aiMessageIdRef.current = null;
                return { ...msg, uuid: ai_message_id };
              }
              return msg;
            })
          );
        }

        aiMessageIdRef.current = null;
        humanMessageIdRef.current = null;
      }
    );

    const unsubscribeChatResponse = subscribe(
      "chat_response",
      (data: ChatResponse) => {
        const { message } = data.data;

        const currentAiId = aiMessageIdRef.current;
        if (!currentAiId) return;

        setMessages((msgs) => {
          // Check if the AI message already exists
          const existingMessage = msgs.find(
            (msg) => msg.uuid === currentAiId && msg.role === "assistant"
          );

          if (existingMessage) {
            // Message exists, append new chunk to existing content
            return msgs.map((msg) => {
              if (msg.uuid === currentAiId && msg.role === "assistant") {
                return { ...msg, content: msg.content + message };
              }
              return msg;
            });
          } else {
            // First chunk - create the message with this chunk
            return [
              ...msgs,
              {
                uuid: currentAiId,
                role: "assistant",
                content: message, // First chunk becomes the initial content
              },
            ];
          }
        });
      }
    );

    const unsubscribeChatError = subscribe("error", (data) => {
      setIsMessageLoading(false);

      // Remove the empty AI message if it exists
      if (aiMessageIdRef.current) {
        setMessages((msgs) =>
          msgs.filter((msg) => msg.uuid !== aiMessageIdRef.current)
        );
      }

      aiMessageIdRef.current = null;
      humanMessageIdRef.current = null;
    });

    return () => {
      unsubscribeChatStart();
      unsubscribeChatCompleted();
      unsubscribeChatResponse();
      unsubscribeChatError();
    };
  }, [subscribe]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      className="w-[450px] h-full rounded-xl shadow-2xl border flex flex-col backdrop-blur-xl"
      style={{
        background: isDark ? "rgba(50, 51, 50, 0.5)" : "rgba(220, 220, 220, 0)",
        backdropFilter: "saturate(180%) blur(12px)",
        WebkitBackdropFilter: "saturate(180%) blur(12px)",
        borderColor: isDark
          ? "rgba(107, 114, 128, 0.3)"
          : "rgba(209, 213, 219, 0.3)",
      }}
    >
      <h3
        className="text-lg p-4 text-center font-bold pb-2 border-b sticky top-0 z-10"
        style={{
          fontFamily: '"DM Serif Text", serif',
          background: isDark
            ? "rgba(50, 51, 50, 0.8)"
            : "rgba(255, 255, 255, 0.8)",
          backdropFilter: "saturate(180%) blur(12px)",
          WebkitBackdropFilter: "saturate(180%) blur(12px)",
        }}
      >
        Ask Melina
      </h3>
      <div className="flex-1 overflow-y-auto relative p-4">
        {/* Messages container */}
        <div className="flex flex-col">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm mt-2 ">
              Start a conversation with Melina
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.uuid}>
                <ChatMessage role={msg.role} content={msg.content} />
              </div>
            ))
          )}
          {/* 👇 Auto-scroll anchor */}
          <div ref={bottomRef} />
        </div>
        {/* bottom chat bubble loader */}
        {isMessageLoading && (
          <div className="flex justify-start gap-2 mb-4">
            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
              <Bot className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </div>
            <div className="inline-flex items-center px-3 py-2 rounded-xl bg-gray-200/80 text-gray-900 rounded-bl-sm dark:bg-gray-800">
              <div>
                <TypingLoader />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* text input */}
      <div
        className="sticky bottom-0 flex items-end border-t p-4 rounded-b-lg backdrop-blur-md gap-2 z-10"
        style={{
          background: isDark
            ? "rgba(50, 51, 50, 0.9)"
            : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "saturate(180%) blur(10px)",
          WebkitBackdropFilter: "saturate(180%) blur(10px)",
          borderColor: isDark
            ? "rgba(107, 114, 128, 0.5)"
            : "rgba(229, 231, 235, 0.5)",
        }}
      >
        <form onSubmit={handleSubmit} className="flex-1">
          <textarea
            ref={textareaRef}
            name="message"
            placeholder="Type your message here..."
            className="w-full outline-none text-sm resize-none overflow-hidden bg-transparent max-h-[150px]"
            rows={1}
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
          />
        </form>
        <div
          onClick={(e: React.MouseEvent<HTMLDivElement>) =>
            handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
          }
        >
          <SendHorizontal
            className="w-6 h-6 cursor-pointer shrink-0 mb-1"
            color="gray"
          />
        </div>
      </div>
    </div>
  );
}

export default AIController;
