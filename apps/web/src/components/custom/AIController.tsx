import { Bot, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import ChatMessage from "./ChatMessage";
import TypingLoader from "./TypingLoader";
import { sendMessage } from "@/service/chatService";
import { v4 as uuidv4 } from "uuid";
import { useParams } from "next/navigation";

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

function AIController({ chatHistory }: { chatHistory: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(chatHistory);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const params = useParams();
  const boardId = params?.id as string;

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

    // Add user message
    const humanMessageId = uuidv4();
    setMessages((msgs) => [
      ...msgs,
      { uuid: humanMessageId, role: "user", content: text },
    ]);
    setIsMessageLoading(true);
    try {
      const response: AiMessageResponse = await sendMessage(boardId, text);
      // update the human message with the new human message id
      setMessages((msgs) =>
        msgs.map((msg) =>
          msg.uuid === humanMessageId
            ? { ...msg, uuid: response.human_message_id }
            : msg
        )
      );
      // add the new ai message to the messages array
      setMessages((msgs) => [
        ...msgs,
        {
          uuid: response.ai_message_id,
          role: "assistant",
          content: response.message,
        },
      ]);
    } catch (error) {
      console.log(error);
      setIsMessageLoading(false);
      return;
    }
    setIsMessageLoading(false);
  };

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
            messages.map((msg, i) => (
              <div key={i}>
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
