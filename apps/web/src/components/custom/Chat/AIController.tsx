import { SendHorizontal, Paperclip } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import ChatMessage from "./ChatMessage";
import TypingLoader from "./TypingLoader";
import ModelSelector from "./ModelSelector";
import MentionCommandPopup from "./MentionCommandPopup";
import { v4 as uuidv4 } from "uuid";
import { useParams } from "next/navigation";
import { useWebsocket } from "@/hooks/useWebsocket";
import { clearSelectionsAction, selectSelections, useSelectionStore } from "@/store/useSelection";
import SelectionPill from "./SelectionPill";
import ImageAttachmentPill from "./ImageAttachmentPill";
import { uploadSelectionImageToBackend } from "@/service/boardService";
import { uploadChatImage } from "@/service/chatService";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useMentionCommand } from "@/hooks/useMentionCommand";
import { useImageAttachments } from "@/hooks/useImageAttachments";
import { TokenBlockedPayload, TokenWarningPayload } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";
import WarningBlock from "./WarningBlock";

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
  onBatchShapeImageUrlUpdate?: (updates: { shapeId: string; imageUrl: string }[]) => void;
  onExportCanvas?: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

function AIController({
  chatHistory,
  onMessagesChange,
  initialMessage,
  onInitialMessageSent,
  onBatchShapeImageUrlUpdate,
  onExportCanvas,
  width: controlledWidth = 500,
  onWidthChange,
}: AIControllerProps) {
  const [messages, setMessages] = useState<Message[]>(chatHistory);
  const [loading, setLoading] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<{
    type: "warning" | "blocked" | null;
    consumed: number;
    limit: number;
    remaining: number;
  } | null>(null);
  const { user } = useAuth();

  // Check token status on mount based on user data
  useEffect(() => {
    if (user && user.token_limit > 0) {
      const consumed = user.tokens_consumed || 0;
      const limit = user.token_limit;
      const percentage = (consumed / limit) * 100;
      const remaining = Math.max(0, limit - consumed);

      if (percentage >= 100) {
        setTokenStatus({
          type: "blocked",
          consumed,
          limit,
          remaining: 0,
        });
      } else if (percentage >= 80) {
        setTokenStatus({
          type: "warning",
          consumed,
          limit,
          remaining,
        });
      }
    }
  }, [user]);

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const params = useParams();
  const boardId = params?.id as string;
  const initialMessageSentRef = useRef(false);
  
  // Resize functionality
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const aiMessageIdRef = useRef<string | null>(null);
  const humanMessageIdRef = useRef<string | null>(null);

  const { sendMessage, subscribe } = useWebsocket();

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const selections = useSelectionStore(selectSelections);
  const clearSelectionById = useSelectionStore((state) => state.clearSelectionById);
  const selectionsContainerRef = useRef<HTMLDivElement>(null);

  // Image attachments hook
  const {
    attachments,
    addFiles,
    removeAttachment,
    clearAttachments,
    updateAttachmentStatus,
    handlePaste,
  } = useImageAttachments();

  // Auto-scroll to latest selection
  useEffect(() => {
    if (selectionsContainerRef.current && selections.length > 0) {
      selectionsContainerRef.current.scrollLeft = selectionsContainerRef.current.scrollWidth;
    }
  }, [selections]);

  // Avoid hydration mismatch by only using theme after mount
  useEffect(() => {
    setMounted(true);

    return () => {
      clearSelectionsAction();
    };
  }, []);

  const isDark = mounted && theme === "dark";

  // Command handler for / commands
  const handleCommandExecute = useCallback(
    (commandId: string) => {
      switch (commandId) {
        case "clear":
          setMessages([]);
          toast.success("Chat history cleared");
          break;
        case "help":
          const helpMessage: Message = {
            uuid: uuidv4(),
            role: "assistant",
            content: `**Getting Started with Melina:**

Ask Melina to generate text, shapes, or ideas directly on your canvas. Just describe what you want!

**Working with Selections:**
Use the **Marquee Select** tool to draw a selection around shapes on the canvas. Selected shapes appear as pills above the input - Melina can then see and edit those specific shapes based on your instructions.

**Commands:**
- \`/clear\` - Clear chat history
- \`/help\` - Show this help message
- \`/export\` - Export canvas as image

Type \`/\` to see available commands.`,
          };
          setMessages((msgs) => [...msgs, helpMessage]);
          break;
        case "export":
          if (onExportCanvas) {
            onExportCanvas();
            toast.success("Exporting canvas...");
          } else {
            toast.error("Export not available");
          }
          break;
        default:
          break;
      }
    },
    [onExportCanvas]
  );

  // Mention/Command popup hook
  const {
    popupState,
    popupRef,
    filteredItems,
    handleKeyDown: handleMentionKeyDown,
    handleInput: handleMentionInput,
    selectItem,
  } = useMentionCommand({
    textareaRef,
    onCommandExecute: handleCommandExecute,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (tokenStatus?.type === "blocked") return;
    const text = textareaRef.current?.value.trim();
    if (!text) return;

    // Clear input immediately for responsiveness
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }

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
      wasNewlyUploaded: boolean;
    };
    let shapeImageUrls: ShapeImageData[] = [];

    // Start loading state - uploads happen before message is shown
    setLoading(true);

    // Step 1: Upload attached images FIRST (before showing user message)
    let uploadedImageUrls: string[] = [];
    if (attachments.length > 0) {
      try {
        const uploadPromises = attachments.map(async (attachment) => {
          updateAttachmentStatus(attachment.id, "uploading");
          try {
            const response = await uploadChatImage(boardId, attachment.file);
            updateAttachmentStatus(attachment.id, "uploaded", response.url);
            return response.url;
          } catch (error) {
            updateAttachmentStatus(attachment.id, "error");
            throw error;
          }
        });

        const results = await Promise.allSettled(uploadPromises);
        uploadedImageUrls = results
          .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
          .map((r) => r.value);

        // Check if any uploads failed
        const failedCount = results.filter((r) => r.status === "rejected").length;
        if (failedCount > 0) {
          toast.error(`${failedCount} image(s) failed to upload`);
        }

        // If ALL uploads failed, abort
        if (uploadedImageUrls.length === 0 && attachments.length > 0) {
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error("Error uploading attached images:", error);
        toast.error(error instanceof Error ? error.message : "Failed to upload attached images");
        setLoading(false);
        return;
      }
    }

    // Step 2: Upload selection images
    if (selections.length > 0) {
      try {
        // Flatten all shapes from all selections and upload for each
        const uploadPromises = selections.flatMap((selection) =>
          selection.shapes.map(async (shape): Promise<ShapeImageData | null> => {
            let url = shape.imageUrl;
            const wasNewlyUploaded = !url;

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
              wasNewlyUploaded,
            };
          })
        );

        const results = await Promise.all(uploadPromises);
        shapeImageUrls = results.filter((r): r is ShapeImageData => r !== null);

        // Batch update all newly uploaded shapes' imageUrls at once (avoids race conditions)
        const newlyUploadedShapes = shapeImageUrls.filter((r) => r.wasNewlyUploaded);
        if (newlyUploadedShapes.length > 0) {
          const updates = newlyUploadedShapes.map((r) => ({
            shapeId: r.shapeId,
            imageUrl: r.url,
          }));
          onBatchShapeImageUrlUpdate?.(updates);
        }
      } catch (error) {
        console.error("Error uploading selection images:", error);
        toast.error(error instanceof Error ? error.message : "Failed to upload images");
      }
    }

    // Step 3: All uploads complete - NOW add user message to UI
    const humanMessageId = uuidv4();
    humanMessageIdRef.current = humanMessageId;
    setMessages((msgs) => [...msgs, { uuid: humanMessageId, role: "user", content: text }]);

    // Step 4: Send message via websocket
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
          metadata: {
            ...(shapeImageUrls.length > 0 && {
              shape_image_urls: shapeImageUrls,
            }),
            ...(uploadedImageUrls.length > 0 && {
              uploaded_image_urls: uploadedImageUrls,
            }),
          },
        },
      });
      // Clear selections and attachments after successful send
      clearSelectionsAction();
      clearAttachments();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      humanMessageIdRef.current = null;
      return;
    } finally {
      setLoading(false);
    }
  };

  // Function to send a message programmatically (for initial message)
  const sendMessageProgrammatically = async (text: string) => {
    if (!text.trim() || tokenStatus?.type === "blocked") return;

    // Add user message with temporary UUID
    const humanMessageId = uuidv4();
    humanMessageIdRef.current = humanMessageId;
    setMessages((msgs) => [...msgs, { uuid: humanMessageId, role: "user", content: text }]);

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
      wasNewlyUploaded: boolean;
    };
    let shapeImageUrls: ShapeImageData[] = [];

    setLoading(true);
    if (selections.length > 0) {
      try {
        const uploadPromises = selections.flatMap((selection) =>
          selection.shapes.map(async (shape): Promise<ShapeImageData | null> => {
            let url = shape.imageUrl;
            const wasNewlyUploaded = !url;

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
              wasNewlyUploaded,
            };
          })
        );

        const results = await Promise.all(uploadPromises);
        shapeImageUrls = results.filter((r): r is ShapeImageData => r !== null);

        // Batch update all newly uploaded shapes' imageUrls at once (avoids race conditions)
        const newlyUploadedShapes = shapeImageUrls.filter((r) => r.wasNewlyUploaded);
        if (newlyUploadedShapes.length > 0) {
          const updates = newlyUploadedShapes.map((r) => ({
            shapeId: r.shapeId,
            imageUrl: r.url,
          }));
          onBatchShapeImageUrlUpdate?.(updates);
        }
      } catch (error) {
        console.error("Error uploading selection images:", error);
        toast.error(error instanceof Error ? error.message : "Failed to upload images");
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
          metadata: {
            ...(shapeImageUrls.length > 0 && {
              shape_image_urls: shapeImageUrls,
            }),
          },
        },
      });
      // Clear selections and attachments after successful send
      clearSelectionsAction();
      clearAttachments();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      humanMessageIdRef.current = null;
    } finally {
      setLoading(false);
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
      setLoading(true);

      // Create temporary AI message ID, but don't create the message yet
      // Wait for first chunk to arrive before creating the message bubble
      const aiId = crypto.randomUUID();
      aiMessageIdRef.current = aiId;
    });

    const unsubscribeChatCompleted = subscribe("chat_completed", (data: ChatResponse) => {
      setIsMessageLoading(false);
      setLoading(false);

      const { ai_message_id, human_message_id } = data.data;

      if (ai_message_id && human_message_id) {
        // Update both message UUIDs with the actual IDs from backend
        setMessages((msgs) =>
          msgs.map((msg) => {
            // Update human message UUID
            if (msg.uuid === humanMessageIdRef.current && msg.role === "user") {
              humanMessageIdRef.current = null;
              return { ...msg, uuid: human_message_id };
            }
            // Update AI message UUID
            if (msg.uuid === aiMessageIdRef.current && msg.role === "assistant") {
              aiMessageIdRef.current = null;
              return { ...msg, uuid: ai_message_id };
            }
            return msg;
          })
        );
      }

      aiMessageIdRef.current = null;
      humanMessageIdRef.current = null;
    });

    const unsubscribeChatResponse = subscribe("chat_response", (data: ChatResponse) => {
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
    });

    const unsubscribeChatError = subscribe("error", () => {
      setIsMessageLoading(false);
      setLoading(false);

      // Remove the empty AI message if it exists
      if (aiMessageIdRef.current) {
        setMessages((msgs) => msgs.filter((msg) => msg.uuid !== aiMessageIdRef.current));
      }

      aiMessageIdRef.current = null;
      humanMessageIdRef.current = null;
    });

    const unsubscribeTokenWarning = subscribe(
      "token_warning",
      (data: { data: TokenWarningPayload }) => {
        setTokenStatus({
          type: "warning",
          consumed: data.data.consumed_tokens,
          limit: data.data.total_limit,
          remaining: data.data.total_limit - data.data.consumed_tokens,
        });
      }
    );

    const unsubscribeTokenBlocked = subscribe(
      "token_blocked",
      (data: { data: TokenBlockedPayload }) => {
        setTokenStatus({
          type: "blocked",
          consumed: data.data.consumed_tokens,
          limit: data.data.total_limit,
          remaining: 0,
        });
      }
    );

    return () => {
      unsubscribeChatStart();
      unsubscribeChatCompleted();
      unsubscribeChatResponse();
      unsubscribeChatError();
      unsubscribeTokenWarning();
      unsubscribeTokenBlocked();
    };
  }, [subscribe]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current || !onWidthChange) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      // Since resize handle is on left edge and chat is on right side, calculate width from right edge
      const newWidth = containerRect.right - e.clientX;
      
      // Constrain width between initial width (500px) and 60% of viewport width
      const minWidth = 500; // Same as first render width
      const maxWidth = window.innerWidth * 0.6; // Maximum is 60% of screen width
      const constrainedWidth = Math.min(Math.max(minWidth, newWidth), maxWidth);
      onWidthChange(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Re-enable transitions after resize
      if (containerRef.current) {
        containerRef.current.style.transition = "";
      }
    };

    if (isResizing) {
      // Disable transitions during resize for smooth performance
      if (containerRef.current) {
        containerRef.current.style.transition = "none";
      }
      
      document.addEventListener("mousemove", handleMouseMove, { passive: true });
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      
      // Re-enable transitions on cleanup
      if (containerRef.current) {
        containerRef.current.style.transition = "";
      }
    };
  }, [isResizing, onWidthChange]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  return (
    <div
      ref={containerRef}
      className="rounded-md shadow-2xl border flex flex-col backdrop-blur-xl relative"
      style={{
        width: `${controlledWidth}px`,
        height: "100%",
        maxHeight: "100%",
        transition: "width 0.2s ease-out",
        background: isDark ? "rgba(50, 51, 50, 0.5)" : "rgba(220, 220, 220, 0)",
        backdropFilter: "saturate(180%) blur(12px)",
        WebkitBackdropFilter: "saturate(180%) blur(12px)",
        borderColor: isDark ? "rgba(107, 114, 128, 0.3)" : "rgba(209, 213, 219, 0.3)",
      }}
    >
      {/* Resize handle on left edge (since chat opens from right) */}
      <div
        ref={resizeRef}
        onMouseDown={handleResizeStart}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:w-1.5 transition-all group z-20"
        style={{
          background: isDark ? "rgba(107, 114, 128, 0.2)" : "rgba(209, 213, 219, 0.2)",
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: isDark ? "rgba(107, 114, 128, 0.6)" : "rgba(209, 213, 219, 0.6)",
            borderRadius: "2px",
            width: "3px",
            height: "40px",
          }}
        />
      </div>
      <h4
        className="text-md p-3 text-center font-bold pb-2 border-b sticky top-0 z-10 rounded-t-md relative"
        style={{
          fontFamily: '"DM Serif Text", serif',
          background: isDark ? "rgba(50, 51, 50, 0.8)" : "rgba(255, 255, 255, 0.8)",
          backdropFilter: "saturate(180%) blur(12px)",
          WebkitBackdropFilter: "saturate(180%) blur(12px)",
        }}
      >
        Ask Melina
      </h4>
      <div className="flex-1 overflow-y-auto relative p-4" style={{ minHeight: 0 }}>
            {/* Messages container */}
            <div className="flex flex-col">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm mt-2 ">
                  Start a conversation with Melina
                </div>
              ) : (
                messages.map((msg, index) => {
                  // Check if this is the latest AI message
                  const isLatestAI =
                    msg.role === "assistant" &&
                    index ===
                      messages.length -
                        1 -
                        [...messages].reverse().findIndex((m) => m.role === "assistant");
                  return (
                    <div key={msg.uuid}>
                      <ChatMessage
                        role={msg.role}
                        content={msg.content}
                        isLatest={isLatestAI}
                        isStreaming={isLatestAI && isMessageLoading}
                      />
                    </div>
                  );
                })
              )}
              {/* bottom chat bubble loader */}
              {isMessageLoading && (
                <div className="flex justify-start gap-3 items-start mb-4">
                  <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-600">
                    <span className="text-white font-medium text-xs">M</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 dark:text-gray-400 text-sm mb-1 font-medium">
                      Melina
                    </span>
                    <div className="inline-flex items-center">
                      <TypingLoader />
                    </div>
                  </div>
                </div>
              )}
              {/* 👇 Auto-scroll anchor */}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* text input */}
          <div className="sticky bottom-0 p-3 z-10">
        {/* Token status banner */}
        {tokenStatus && (
          <WarningBlock isDark={isDark} tokenStatus={tokenStatus} setTokenStatus={setTokenStatus} />
        )}
        <div
          className="flex flex-col rounded-md border"
          style={{
            background: isDark ? "rgba(40, 40, 40, 0.9)" : "rgba(255, 255, 255, 0.9)",
            borderColor: isDark ? "rgba(107, 114, 128, 0.4)" : "rgba(209, 213, 219, 0.6)",
          }}
        >
          {/* Selection pills and image attachment pills */}
          {(selections.length > 0 || attachments.length > 0) && (
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
              {attachments.map((attachment) => (
                <ImageAttachmentPill
                  key={attachment.id}
                  attachment={attachment}
                  isDark={isDark}
                  onRemove={removeAttachment}
                />
              ))}
            </div>
          )}
          {/* Input area */}
          <div className="flex flex-col px-3 py-3 relative">
            {/* Mention/Command Popup */}
            <MentionCommandPopup
              ref={popupRef}
              popupState={popupState}
              items={filteredItems}
              onSelectItem={selectItem}
              isDark={isDark}
            />
            <form onSubmit={handleSubmit} className="flex-1">
              <textarea
                ref={textareaRef}
                name="message"
                placeholder={
                  tokenStatus?.type === "blocked"
                    ? "Token limit reached. Add credits to continue."
                    : "Plan, type / for commands"
                }
                className="w-full outline-none text-sm resize-none overflow-hidden bg-transparent max-h-[150px] placeholder:text-gray-500"
                rows={1}
                disabled={loading || tokenStatus?.type === "blocked"}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                  handleMentionInput();
                }}
                onKeyDown={(e) => {
                  // Handle mention/command popup navigation first
                  if (handleMentionKeyDown(e)) {
                    return;
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                  }
                }}
                onPaste={(e) => {
                  const errors = handlePaste(e);
                  if (errors.length > 0) {
                    toast.error(errors[0].reason);
                  }
                }}
              />
            </form>

            {/* Hidden file input for image attachments */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const errors = addFiles(e.target.files);
                  if (errors.length > 0) {
                    toast.error(errors[0].reason);
                  }
                }
                // Reset input so the same file can be selected again
                e.target.value = "";
              }}
            />

            {/* Footer with model selector, attachment button, and send button */}
            <div className="flex items-end justify-between">
              <div className="flex items-end gap-2">
                <ModelSelector isDark={isDark} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-0.5 cursor-pointer rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Attach images"
                  disabled={loading || tokenStatus?.type === "blocked"}
                >
                  <Paperclip className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <div
                onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                  if (tokenStatus?.type === "blocked") return;
                  handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                }}
                className={`bg-gray-200/80 dark:bg-gray-500/20 rounded-md p-2 flex items-center justify-center ${
                  loading || tokenStatus?.type === "blocked"
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                {loading ? (
                  <Spinner
                    className="w-4 h-4 shrink-0 hover:text-blue-500 transition-colors"
                    color="gray"
                  />
                ) : (
                  <SendHorizontal
                    className="w-4 h-4 shrink-0 hover:text-blue-500 transition-colors"
                    color="gray"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIController;
