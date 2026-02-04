import { SendHorizontal, Paperclip, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import pLimit from "p-limit";
import { useTheme } from "next-themes";
import ChatMessage from "./ChatMessage";
import ModelSelector from "./ModelSelector";
import MentionCommandPopup from "./MentionCommandPopup";
import { v4 as uuidv4 } from "uuid";
import { useParams } from "next/navigation";
import { useWebsocket } from "@/hooks/useWebsocket";
import { clearSelectionsAction, selectSelections, useSelectionStore } from "@/store/useSelection";
import SelectionPill from "./SelectionPill";
import ImageAttachmentPill from "./ImageAttachmentPill";
import { uploadSelectionImageToBackend } from "@/service/boardService";
import { uploadChatImage, getChatHistory } from "@/service/chatService";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useMentionCommand } from "@/hooks/useMentionCommand";
import { useImageAttachments } from "@/hooks/useImageAttachments";
import { TokenBlockedPayload, TokenWarningPayload } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";
import WarningBlock from "./WarningBlock";
import { Switch } from "@/components/ui/switch";
import { useModelAccess } from "@/hooks/useModelAccess";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MELINA_HELP_DEFAULT_TEXT } from "@/lib/constants";

type Message = {
  uuid: string;
  role: "user" | "assistant";
  content: string;
  thought?: string; // Thinking/reasoning content (only for assistant messages)
};

// Type for streaming thinking state
type StreamingThinking = {
  content: string;
  isActive: boolean;
  startTime: number | null;
  duration: number | null;
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
  initialHasMore?: boolean;
  initialPage?: number;
  isAiResponding?: boolean;
  onHumanMessageIdChange?: (id: string | null) => void;
  isMobile?: boolean;
  onClose?: () => void;
  // Unified streaming state - associates thinking with specific message
  streamingMessageId?: string | null;
  streamingThinking?: StreamingThinking;
  // Dynamic loader text from backend (shows what the agent is doing)
  loaderText?: string | null;
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
  initialHasMore = false,
  initialPage = 1,
  isAiResponding = false,
  onHumanMessageIdChange,
  isMobile = false,
  onClose,
  streamingMessageId = null,
  streamingThinking,
  loaderText = null,
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

  // Pagination state for infinite scroll
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const hasInitializedScroll = useRef(false);
  const shouldScrollToBottom = useRef(true);
  const {
    thinkingAccess,
    handleModelChange,
    thinkingEnabled,
    handleThinkingChange,
    activeModel,
    modelsWithStatus,
  } = useModelAccess();

  const getThinkingTooltip = () => {
    if (thinkingAccess.reason === "no_access") return "Upgrade your subscription";
    if (thinkingAccess.reason === "model_unsupported") return "Model doesn't support thinking";
    return null;
  };

  // Auto-disable thinking mode when it becomes unavailable (model change or subscription change)
  useEffect(() => {
    if (!thinkingAccess.canUse && thinkingEnabled) {
      handleThinkingChange(false);
    }
  }, [handleThinkingChange, thinkingAccess.canUse, thinkingEnabled]);

  // Get boardId early for use in callbacks
  const params = useParams();
  const boardId = params?.id as string;

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

  // Ref to track current messages for comparison (avoids infinite loops)
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;

  // Flag to track when syncing from parent (to avoid feedback loop with onMessagesChange)
  const syncingFromParentRef = useRef(false);

  // Sync chatHistory from parent to local state when it changes
  // This handles both initial load AND streaming updates from parent
  useEffect(() => {
    const currentMessages = messagesRef.current;

    // Always sync when chatHistory changes - use JSON comparison for deep check
    // This ensures thought field updates on any message are detected
    const chatHistoryJson = JSON.stringify(chatHistory);
    const currentMessagesJson = JSON.stringify(currentMessages);

    if (chatHistoryJson !== currentMessagesJson && chatHistory.length > 0) {
      syncingFromParentRef.current = true;
      setMessages(chatHistory);
    }
  }, [chatHistory]); // Only depend on chatHistory, use ref for messages

  // Update hasMore when initialHasMore changes
  useEffect(() => {
    setHasMore(initialHasMore);
  }, [initialHasMore]);

  // Load more messages (older messages) when scrolling to top
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    shouldScrollToBottom.current = false; // Prevent auto-scroll when loading older messages
    const nextPage = currentPage + 1;

    try {
      const response = await getChatHistory(boardId, nextPage, 20);
      const olderMessages: Message[] = response.chats || [];

      if (olderMessages.length > 0) {
        // Store scroll position before prepending
        const container = messagesContainerRef.current;
        const prevScrollHeight = container?.scrollHeight || 0;

        // Prepend older messages to the beginning, filtering out duplicates
        setMessages((prev) => {
          const existingUuids = new Set(prev.map((m) => m.uuid));
          const uniqueOlderMessages = olderMessages.filter((m) => !existingUuids.has(m.uuid));
          return [...uniqueOlderMessages, ...prev];
        });
        setCurrentPage(nextPage);
        setHasMore(response.hasMore);

        // Restore scroll position after prepending
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more messages:", error);
      toast.error("Failed to load more messages");
    } finally {
      setLoadingMore(false);
    }
  }, [boardId, currentPage, hasMore, loadingMore]);

  // Scroll handler to detect when user scrolls to top or bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Only trigger load more after initial scroll to bottom is complete
      if (!hasInitializedScroll.current) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      // Re-enable auto-scroll when user scrolls back to bottom
      if (isNearBottom) {
        shouldScrollToBottom.current = true;
      }

      // Load more when scrolled near the top (within 50px)
      if (scrollTop < 50 && hasMore && !loadingMore) {
        loadMoreMessages();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, loadingMore, loadMoreMessages]);

  // Sync messages back to parent whenever they change (but not when syncing FROM parent)
  useEffect(() => {
    if (syncingFromParentRef.current) {
      // This update came from syncing chatHistory, don't push back to parent
      syncingFromParentRef.current = false;
      return;
    }
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialMessageSentRef = useRef(false);

  // Resize functionality
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
            content: MELINA_HELP_DEFAULT_TEXT,
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
    const { modelName, temperature, maxTokens, theme } = settingsObj;

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
        const limit = pLimit(8);
        const uploadPromises = attachments.map((attachment) =>
          limit(async () => {
            updateAttachmentStatus(attachment.id, "uploading");
            try {
              const response = await uploadChatImage(boardId, attachment.file);
              updateAttachmentStatus(attachment.id, "uploaded", response.url);
              return response.url;
            } catch (error) {
              updateAttachmentStatus(attachment.id, "error");
              throw error;
            }
          })
        );
        
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
    onHumanMessageIdChange?.(humanMessageId);
    shouldScrollToBottom.current = true; // Ensure we scroll to bottom for new messages
    setMessages((msgs) => [...msgs, { uuid: humanMessageId, role: "user", content: text }]);

    // Step 4: Send message via websocket
    try {
      sendMessage({
        type: "chat_message",
        data: {
          board_id: boardId,
          message: text,
          model_name: modelName,
          temperature: temperature,
          max_tokens: maxTokens,
          active_theme: theme,
          enable_thinking: thinkingEnabled,
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
      onHumanMessageIdChange?.(null);
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
    onHumanMessageIdChange?.(humanMessageId);
    shouldScrollToBottom.current = true; // Ensure we scroll to bottom for new messages
    setMessages((msgs) => [...msgs, { uuid: humanMessageId, role: "user", content: text }]);

    const settings = localStorage.getItem("settings");
    if (!settings) return;
    const settingsObj = JSON.parse(settings);
    const { modelName, temperature, maxTokens, theme } = settingsObj;

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
          model_name: modelName,
          temperature: temperature,
          max_tokens: maxTokens,
          enable_thinking: thinkingEnabled,
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
      onHumanMessageIdChange?.(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, boardId]);

  // Token status subscriptions (chat streaming is handled by parent)
  useEffect(() => {
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
      unsubscribeTokenWarning();
      unsubscribeTokenBlocked();
    };
  }, [subscribe]);

  useEffect(() => {
    // Only auto-scroll to bottom if we should (not when loading older messages)
    if (!shouldScrollToBottom.current) return;

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

    // Mark scroll as initialized after first scroll completes
    // This prevents immediate load-more triggers on mount
    if (!hasInitializedScroll.current && messages.length > 0) {
      setTimeout(() => {
        hasInitializedScroll.current = true;
      }, 500); // Allow smooth scroll animation to complete
    }
  }, [messages]);

  // Auto-scroll when AI starts responding (chat_starting event triggers isAiResponding=true)
  useEffect(() => {
    if (isAiResponding) {
      shouldScrollToBottom.current = true;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isAiResponding]);

  // Auto-scroll when thinking content updates (thinking_response events)
  useEffect(() => {
    if (streamingThinking?.content && shouldScrollToBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingThinking?.content]);

  // Resize handlers
  useEffect(() => {
    const container = containerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !container || !onWidthChange) return;

      const containerRect = container.getBoundingClientRect();
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
      if (container) {
        container.style.transition = "";
      }
    };

    if (isResizing) {
      // Disable transitions during resize for smooth performance
      if (container) {
        container.style.transition = "none";
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
      if (container) {
        container.style.transition = "";
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
      className={`flex flex-col relative ${isMobile ? "rounded-none" : "rounded-md shadow-2xl border backdrop-blur-xl"
        }`}
      style={{
        width: isMobile ? "100%" : `${controlledWidth}px`,
        height: "100%",
        maxHeight: "100%",
        transition: isMobile ? "none" : "width 0.2s ease-out",
        background: isDark
          ? isMobile
            ? "#1a1a1a"
            : "rgba(50, 51, 50, 0.5)"
          : isMobile
            ? "#ffffff"
            : "rgba(255, 255, 255, 0.5)",
        backdropFilter: isMobile ? "none" : "saturate(180%) blur(12px)",
        WebkitBackdropFilter: isMobile ? "none" : "saturate(180%) blur(12px)",
        borderColor: isMobile
          ? "transparent"
          : isDark
            ? "rgba(107, 114, 128, 0.3)"
            : "rgba(209, 213, 219, 0.3)",
      }}
    >
      {/* Resize handle on left edge - only show on desktop */}
      {!isMobile && (
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
      )}
      {/* Header with close button on mobile */}
      <div
        className={`flex items-center justify-between border-b sticky top-0 z-10 ${isMobile ? "px-4 py-3 pt-safe" : "p-3 rounded-t-md"
          }`}
        style={{
          background: isDark
            ? isMobile
              ? "#1a1a1a"
              : "rgba(50, 51, 50, 0.8)"
            : isMobile
              ? "#ffffff"
              : "rgba(255, 255, 255, 0.8)",
          backdropFilter: isMobile ? "none" : "saturate(180%) blur(12px)",
          WebkitBackdropFilter: isMobile ? "none" : "saturate(180%) blur(12px)",
          paddingTop: isMobile ? "env(safe-area-inset-top, 12px)" : undefined,
        }}
      >
        {isMobile && <div className="w-8" />}
        <h4
          className="text-md font-bold flex-1 text-center"
          style={{ fontFamily: '"DM Serif Text", serif' }}
        >
          Ask Melina
        </h4>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {!isMobile && <div className="w-8" />}
      </div>
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto relative p-4"
        style={{ minHeight: 0 }}
      >
        {/* Load more indicator at top */}
        {loadingMore && (
          <div className="flex justify-center py-2 mb-2">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}
        {hasMore && !loadingMore && messages.length > 0 && (
          <div className="flex justify-center py-2 mb-2">
            <button
              onClick={loadMoreMessages}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
            >
              Load older messages
            </button>
          </div>
        )}
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
              // Check if this is the currently streaming message
              const isStreamingMessage = msg.uuid === streamingMessageId && msg.role === "assistant";
              return (
                <div key={`${msg.uuid}-${index}`}>
                  <ChatMessage
                    role={msg.role}
                    content={msg.content}
                    isLatest={isLatestAI}
                    isStreaming={isStreamingMessage && isAiResponding}
                    thought={msg.thought}
                    streamingThinking={isStreamingMessage ? streamingThinking : undefined}
                    loaderText={isStreamingMessage ? loaderText : undefined}
                  />
                </div>
              );
            })
          )}
          {/* 👇 Auto-scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* text input */}
      <div
        className="sticky bottom-0 p-3 z-10"
        style={{
          paddingBottom: isMobile ? "max(12px, env(safe-area-inset-bottom))" : "12px",
        }}
      >
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
                    : isAiResponding
                      ? "Melina is working..."
                      : "Plan, type / for commands"
                }
                className="w-full outline-none text-sm resize-none overflow-hidden bg-transparent max-h-[150px] placeholder:text-gray-500"
                rows={1}
                disabled={loading || isAiResponding || tokenStatus?.type === "blocked"}
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
                <ModelSelector
                  isDark={isDark}
                  onModelChange={handleModelChange}
                  activeModel={activeModel}
                  modelsWithStatus={modelsWithStatus}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-0.5 cursor-pointer rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Attach images"
                  disabled={loading || isAiResponding || tokenStatus?.type === "blocked"}
                >
                  <Paperclip className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>

                {/* Thinking enabled toggle */}
                <div className="flex items-center gap-2">
                  {!thinkingAccess.canUse ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Switch
                            size="sm"
                            id="thinking-mode"
                            checked={thinkingEnabled}
                            disabled
                            className="opacity-50 cursor-not-allowed"
                          />
                          <span className="text-xs text-gray-400">Thinking Mode</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{getThinkingTooltip()}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Switch
                        size="sm"
                        id="thinking-mode"
                        checked={thinkingEnabled}
                        onCheckedChange={handleThinkingChange}
                        className="cursor-pointer"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {thinkingEnabled ? "Thinking Mode: On" : "Thinking Mode: Off"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div
                onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                  if (tokenStatus?.type === "blocked" || isAiResponding) return;
                  handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                }}
                className={`bg-gray-200/80 dark:bg-gray-500/20 rounded-md p-2 flex items-center justify-center ${loading || isAiResponding || tokenStatus?.type === "blocked"
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
                  }`}
              >
                {loading || isAiResponding ? (
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
