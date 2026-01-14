import { Bot, Loader2, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import ChatMessage from "./ChatMessage";
import TypingLoader from "./TypingLoader";
import { v4 as uuidv4 } from "uuid";
import { useParams } from "next/navigation";
import { useWebsocket } from "@/hooks/useWebsocket";
import { selectSelections, useSelectionStore } from "@/store/useSelection";
import SelectionPill from "./SelectionPill";
import { uploadSelectionImageToBackend } from "@/service/boardService";
import { Spinner } from "@/components/ui/spinner";

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

interface AIControllerProps {
  chatHistory: Message[];
  onMessagesChange?: (messages: Message[]) => void;
  initialMessage?: string;
  onInitialMessageSent?: () => void;
  onShapeImageUrlUpdate?: (shapeId: string, imageUrl: string) => void;
}

function AIController({
  chatHistory,
  onMessagesChange,
  initialMessage,
  onInitialMessageSent,
  onShapeImageUrlUpdate,
}: AIControllerProps) {
  const [messages, setMessages] = useState<Message[]>(chatHistory);
  const [loading, setLoading] = useState(false);

  // Sync chatHistory from parent to local state when it changes
  // This handles the case where API fetches messages after component mounts
  useEffect(() => {
    if (chatHistory.length > 0 && messages.length === 0) {
      setMessages(chatHistory);
    }
  }, [chatHistory]);

  // Sync messages back to parent whenever they change
  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const params = useParams();
  const boardId = params?.id as string;
  const initialMessageSentRef = useRef(false);

  const aiMessageIdRef = useRef<string | null>(null);
  const humanMessageIdRef = useRef<string | null>(null);

  const { sendMessage, subscribe } = useWebsocket();

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const selections = useSelectionStore(selectSelections);
  const clearSelectionById = useSelectionStore(
    (state) => state.clearSelectionById
  );
  const selectionsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest selection
  useEffect(() => {
    if (selectionsContainerRef.current && selections.length > 0) {
      selectionsContainerRef.current.scrollLeft =
        selectionsContainerRef.current.scrollWidth;
    }
  }, [selections]);

  // Avoid hydration mismatch by only using theme after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && theme === "dark";

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
    const settings = localStorage.getItem("settings");
    if (!settings) return;
    const settingsObj = JSON.parse(settings);
    const { activeModel, temperature, maxTokens, theme } = settingsObj;

    // Upload images for each shape in selections that don't already have an imageUrl
    // Backend will annotate images and fetch full shape data from DB
    type ShapeImageData = {
      shapeId: string;
      url: string;
      bounds: {
        minX: number;
        minY: number;
        width: number;
        height: number;
        padding: number;
      };
    };
    let shapeImageUrls: ShapeImageData[] = [];

    if (selections.length > 0) {
      setLoading(true);
      try {
        // Flatten all shapes from all selections and upload for each
        const uploadPromises = selections.flatMap((selection) =>
          selection.shapes.map(
            async (shape): Promise<ShapeImageData | null> => {
              let url = shape.imageUrl;

              // Upload if shape doesn't already have an imageUrl
              if (!url) {
                const response = await uploadSelectionImageToBackend(
                  boardId,
                  shape.id,
                  selection.image.dataURL
                );
                url = response.url;
              }

              if (!url) return null; // Skip if still no URL

              // Update local shape state with the new imageUrl (only if we just uploaded)
              if (!shape.imageUrl) {
                onShapeImageUrlUpdate?.(shape.id, url);
              }

              // Include selection bounds for image annotation on backend
              return {
                shapeId: shape.id,
                url,
                bounds: {
                  minX: selection.bounds.minX,
                  minY: selection.bounds.minY,
                  width: selection.bounds.width,
                  height: selection.bounds.height,
                  padding: selection.bounds.padding,
                },
              };
            }
          )
        );

        const results = await Promise.all(uploadPromises);
        shapeImageUrls = results.filter((r): r is ShapeImageData => r !== null);
      } catch (error) {
        console.log("Error uploading selection images:", error);
      } finally {
        setLoading(false);
      }
    }

    try {
      sendMessage({
        type: "chat_message",
        data: {
          board_id: boardId,
          message: text,
          active_model: activeModel,
          temperature: temperature,
          max_tokens: maxTokens,
          active_theme: theme,
          ...(shapeImageUrls.length > 0 && {
            metadata: { shape_image_urls: shapeImageUrls },
          }),
        },
      });
    } catch (error) {
      console.log(error);
      // setIsMessageLoading(false);
      humanMessageIdRef.current = null;
      return;
    }
  };

  // Function to send a message programmatically (for initial message)
  const sendMessageProgrammatically = async (text: string) => {
    if (!text.trim()) return;

    // Add user message with temporary UUID
    const humanMessageId = uuidv4();
    humanMessageIdRef.current = humanMessageId;
    setMessages((msgs) => [
      ...msgs,
      { uuid: humanMessageId, role: "user", content: text },
    ]);

    const settings = localStorage.getItem("settings");
    if (!settings) return;
    const settingsObj = JSON.parse(settings);
    const { activeModel, temperature, maxTokens, theme } = settingsObj;

    // Upload images for each shape in selections that don't already have an imageUrl
    // Backend will annotate images and fetch full shape data from DB
    type ShapeImageData = {
      shapeId: string;
      url: string;
      bounds: {
        minX: number;
        minY: number;
        width: number;
        height: number;
        padding: number;
      };
    };
    let shapeImageUrls: ShapeImageData[] = [];

    if (selections.length > 0) {
      setLoading(true);
      try {
        const uploadPromises = selections.flatMap((selection) =>
          selection.shapes.map(
            async (shape): Promise<ShapeImageData | null> => {
              let url = shape.imageUrl;

              // Upload if shape doesn't already have an imageUrl
              if (!url) {
                const response = await uploadSelectionImageToBackend(
                  boardId,
                  shape.id,
                  selection.image.dataURL
                );
                url = response.url;
              }

              if (!url) return null; // Skip if still no URL

              // Update local shape state with the new imageUrl (only if we just uploaded)
              if (!shape.imageUrl) {
                onShapeImageUrlUpdate?.(shape.id, url);
              }

              // Include selection bounds for image annotation on backend
              return {
                shapeId: shape.id,
                url,
                bounds: {
                  minX: selection.bounds.minX,
                  minY: selection.bounds.minY,
                  width: selection.bounds.width,
                  height: selection.bounds.height,
                  padding: selection.bounds.padding,
                },
              };
            }
          )
        );

        const results = await Promise.all(uploadPromises);
        shapeImageUrls = results.filter((r): r is ShapeImageData => r !== null);
      } catch (error) {
        console.log("Error uploading selection images:", error);
      } finally {
        setLoading(false);
      }
    }

    try {
      sendMessage({
        type: "chat_message",
        data: {
          board_id: boardId,
          message: text,
          active_model: activeModel,
          temperature: temperature,
          max_tokens: maxTokens,
          active_theme: theme,
          ...(shapeImageUrls.length > 0 && {
            metadata: { shape_image_urls: shapeImageUrls },
          }),
        },
      });
    } catch (error) {
      console.log(error);
      humanMessageIdRef.current = null;
    }
  };

  // Auto-send initial message if provided
  useEffect(() => {
    if (initialMessage && !initialMessageSentRef.current && boardId) {
      // Small delay to ensure websocket is connected
      const timer = setTimeout(() => {
        sendMessageProgrammatically(initialMessage);
        initialMessageSentRef.current = true;
        onInitialMessageSent?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [initialMessage, boardId]);

  useEffect(() => {
    const unsubscribeChatStart = subscribe("chat_starting", () => {
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

    const unsubscribeChatError = subscribe("error", () => {
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
      className="w-[500px] h-full rounded-md shadow-2xl border flex flex-col backdrop-blur-xl ease-in-out duration-300"
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
        className="text-lg p-3 text-center font-bold pb-2 border-b sticky top-0 z-10 rounded-t-md"
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
      <div className="sticky bottom-0 p-3 z-10">
        <div
          className="flex flex-col rounded-md border"
          style={{
            background: isDark
              ? "rgba(40, 40, 40, 0.9)"
              : "rgba(255, 255, 255, 0.9)",
            borderColor: isDark
              ? "rgba(107, 114, 128, 0.4)"
              : "rgba(209, 213, 219, 0.6)",
          }}
        >
          {/* Selection pills */}
          {selections.length > 0 && (
            <div
              ref={selectionsContainerRef}
              className="flex gap-2 px-2 pt-2 overflow-x-auto scrollbar-hide"
            >
              {selections.map((selection) => (
                <SelectionPill
                  key={selection.id}
                  selection={selection}
                  isDark={isDark}
                  clearSelectionById={clearSelectionById}
                />
              ))}
            </div>
          )}
          {/* Input area */}
          <div className="flex items-end px-4 py-3 gap-2">
            <form onSubmit={handleSubmit} className="flex-1">
              <textarea
                ref={textareaRef}
                name="message"
                placeholder="Plan, @ for context, / for commands"
                className="w-full outline-none text-sm resize-none overflow-hidden bg-transparent max-h-[150px] placeholder:text-gray-500"
                rows={1}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(
                      e as unknown as React.FormEvent<HTMLFormElement>
                    );
                  }
                }}
              />
            </form>
            <div
              onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
              }
              className="bg-gray-200/80 dark:bg-gray-500/20 rounded-md p-2 flex items-center justify-center"
            >
              {loading ? (
                <Spinner
                  className="w-5 h-5 cursor-pointer shrink-0 mb-0.5 hover:text-blue-500 transition-colors"
                  color="gray"
                />
              ) : (
                <SendHorizontal
                  className="w-5 h-5 cursor-pointer shrink-0 mb-0.5 hover:text-blue-500 transition-colors"
                  color="gray"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIController;
