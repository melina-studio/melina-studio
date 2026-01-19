import { useState, useCallback, useRef, useEffect } from "react";

export type CommandItem = {
  id: string;
  label: string;
  description: string;
  type: "command";
};

export type PopupItem = CommandItem;

export type TriggerType = "/" | null;

export type PopupState = {
  isOpen: boolean;
  triggerType: TriggerType;
  query: string;
  selectedIndex: number;
  triggerPosition: { start: number; end: number } | null;
};

const COMMAND_ITEMS: CommandItem[] = [
  {
    id: "clear",
    label: "/clear",
    description: "Clear chat history",
    type: "command",
  },
  {
    id: "help",
    label: "/help",
    description: "Show help message",
    type: "command",
  },
  {
    id: "export",
    label: "/export",
    description: "Export canvas as image",
    type: "command",
  },
];

type UseMentionCommandProps = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onCommandExecute?: (commandId: string) => void;
};

export function useMentionCommand({
  textareaRef,
  onCommandExecute,
}: UseMentionCommandProps) {
  const [popupState, setPopupState] = useState<PopupState>({
    isOpen: false,
    triggerType: null,
    query: "",
    selectedIndex: 0,
    triggerPosition: null,
  });

  const popupRef = useRef<HTMLDivElement>(null);

  // Get filtered items based on trigger type and query
  const getFilteredItems = useCallback((): PopupItem[] => {
    const { triggerType, query } = popupState;
    if (!triggerType) return [];

    if (!query) return COMMAND_ITEMS;

    const lowerQuery = query.toLowerCase();
    return COMMAND_ITEMS.filter(
      (item) =>
        item.id.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery)
    );
  }, [popupState.triggerType, popupState.query]);

  const filteredItems = getFilteredItems();

  // Detect trigger in textarea
  const detectTrigger = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = textarea.value;
    const cursorPos = textarea.selectionStart;

    // Look backwards from cursor to find trigger
    let triggerStart = -1;
    let triggerType: TriggerType = null;

    for (let i = cursorPos - 1; i >= 0; i--) {
      const char = text[i];

      // Stop if we hit whitespace (trigger must be preceded by whitespace or be at start)
      if (char === " " || char === "\n" || char === "\t") {
        break;
      }

      // Check for / trigger character only
      if (char === "/") {
        // Trigger is valid if it's at the start or preceded by whitespace
        const prevChar = i > 0 ? text[i - 1] : " ";
        if (prevChar === " " || prevChar === "\n" || prevChar === "\t" || i === 0) {
          triggerStart = i;
          triggerType = "/";
        }
        break;
      }
    }

    if (triggerStart !== -1 && triggerType) {
      const query = text.slice(triggerStart + 1, cursorPos);
      setPopupState((prev) => ({
        ...prev,
        isOpen: true,
        triggerType,
        query,
        selectedIndex: 0,
        triggerPosition: { start: triggerStart, end: cursorPos },
      }));
    } else {
      closePopup();
    }
  }, [textareaRef]);

  // Close popup
  const closePopup = useCallback(() => {
    setPopupState({
      isOpen: false,
      triggerType: null,
      query: "",
      selectedIndex: 0,
      triggerPosition: null,
    });
  }, []);

  // Select an item (commands only)
  const selectItem = useCallback(
    (item: PopupItem) => {
      const textarea = textareaRef.current;
      if (!textarea || !popupState.triggerPosition) return;

      const { start, end } = popupState.triggerPosition;
      const text = textarea.value;

      // Clear the trigger text and execute the command
      const newText = text.slice(0, start) + text.slice(end);
      textarea.value = newText;
      textarea.setSelectionRange(start, start);
      closePopup();
      onCommandExecute?.(item.id);

      textarea.focus();
    },
    [textareaRef, popupState.triggerPosition, closePopup, onCommandExecute]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!popupState.isOpen || filteredItems.length === 0) return false;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setPopupState((prev) => ({
            ...prev,
            selectedIndex: (prev.selectedIndex + 1) % filteredItems.length,
          }));
          return true;

        case "ArrowUp":
          e.preventDefault();
          setPopupState((prev) => ({
            ...prev,
            selectedIndex:
              (prev.selectedIndex - 1 + filteredItems.length) %
              filteredItems.length,
          }));
          return true;

        case "Enter":
        case "Tab":
          e.preventDefault();
          const selectedItem = filteredItems[popupState.selectedIndex];
          if (selectedItem) {
            selectItem(selectedItem);
          }
          return true;

        case "Escape":
          e.preventDefault();
          closePopup();
          return true;

        default:
          return false;
      }
    },
    [popupState.isOpen, popupState.selectedIndex, filteredItems, selectItem, closePopup]
  );

  // Handle input changes
  const handleInput = useCallback(() => {
    detectTrigger();
  }, [detectTrigger]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        closePopup();
      }
    };

    if (popupState.isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [popupState.isOpen, closePopup, textareaRef]);

  return {
    popupState,
    popupRef,
    filteredItems,
    handleKeyDown,
    handleInput,
    selectItem,
    closePopup,
  };
}
