import { useRef, useState } from "react";
import { Shape } from "@/lib/konavaTypes";

export const useTextEditor = (
  canvasRef: any,
  shapes: Shape[],
  setShapes: (shapes: Shape[] | ((prev: Shape[]) => Shape[])) => void,
  setShapesWithHistory: (shapes: Shape[], options?: any) => void,
  handleSave: (shapes?: Shape[]) => void
) => {
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [pendingTextEdit, setPendingTextEdit] = useState<{
    id: string;
    pos: { x: number; y: number };
  } | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const textEditingInitialRef = useRef<string | null>(null);

  const openTextEditor = (id: string, stagePos: { x: number; y: number }) => {
    const stage = canvasRef?.current;
    if (!stage) return;

    // get style values from shape for matching font etc
    const shape = shapes.find((s) => s.id === id) as any;
    if (!shape) return;

    // Scale font size to match canvas appearance
    // When zoomed out, canvas text appears smaller, so textarea should too
    const baseFontSize = shape?.fontSize ?? 18;
    const scaledFontSize = baseFontSize * stage.scaleX();
    // Clamp to reasonable min/max for usability (min 12px, max 72px)
    const fontSize = Math.max(12, Math.min(72, scaledFontSize));
    const fontFamily = shape?.fontFamily ?? "Arial";
    const fill = shape?.fill ?? "#111";

    // Save the current state before editing (in case user cancels)
    const stateBeforeEditing = [...shapes];

    // Remove existing textarea if any
    if (textAreaRef.current) {
      try {
        textAreaRef.current.remove();
      } catch (e) {}
      textAreaRef.current = null;
    }

    // create new textarea
    const textarea = document.createElement("textarea");
    textAreaRef.current = textarea;
    document.body.appendChild(textarea);

    // style it
    const bgColor = "transparent";
    const textColor = fill;
    Object.assign(textarea.style, {
      position: "fixed",
      zIndex: "100000",
      padding: "2px",
      margin: "0",
      border: "1px dashed rgba(100, 150, 255, 0.5)",
      outline: "none",
      resize: "none",
      background: bgColor,
      color: textColor,
      fontSize: `${fontSize}px`,
      fontFamily,
      lineHeight: "1.2",
      minWidth: "50px",
      minHeight: "auto",
      overflow: "hidden",
      whiteSpace: "pre",
      boxShadow: "none",
    });
    // accessibility
    textarea.setAttribute("aria-label", "Edit text");

    // place textarea at correct container coords (account for stage container offset)
    const containerRect = stage.container().getBoundingClientRect();
    const left = containerRect.left + (stagePos.x * stage.scaleX() + stage.x());
    const top = containerRect.top + (stagePos.y * stage.scaleY() + stage.y());

    textarea.style.left = `${left}px`;
    textarea.style.top = `${top}px`;

    // set initial value
    const currentText = (shape && (shape as any).text) || "";
    textarea.value = currentText;
    textEditingInitialRef.current = currentText;

    // Auto-resize textarea as user types
    const autoResize = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.style.width = "auto";
      const minWidth = 50;
      const measuredWidth = Math.max(minWidth, textarea.scrollWidth + 4);
      textarea.style.width = `${measuredWidth}px`;
    };

    textarea.addEventListener("input", autoResize);

    // Initial resize
    autoResize();

    // Add a small delay before focusing to ensure DOM is ready
    setTimeout(() => {
      textarea.focus();
      textarea.select();
    }, 10);

    setEditingTextId(id);

    // handle keys & finish
    const finish = (commit = true) => {
      const val = textarea!.value;

      // cleanup listeners first
      textarea!.removeEventListener("blur", onBlur);
      textarea!.removeEventListener("keydown", onKeyDown);
      textarea!.removeEventListener("input", autoResize);

      setEditingTextId(null);

      // Hide textarea immediately (but don't remove yet) to prevent blink
      textarea!.style.opacity = "0";
      textarea!.style.pointerEvents = "none";

      if (!commit) {
        // if we created a brand new empty text, remove it
        if (!val.trim()) {
          const filtered = stateBeforeEditing.filter((s) => s.id !== id);
          setShapes(filtered);
          removeTextarea();

          setTimeout(() => {
            setShapesWithHistory(filtered, {
              pushHistory: true,
            });
            handleSave(filtered);
          }, 0);
          return;
        } else {
          // just discard changes, remove textarea
          removeTextarea();
          return;
        }
      }

      // If text is empty, remove the shape
      if (!val.trim()) {
        const filtered = stateBeforeEditing.filter((s) => s.id !== id);
        setShapes(filtered);
        removeTextarea();

        setTimeout(() => {
          setShapesWithHistory(filtered, {
            pushHistory: true,
          });
          handleSave(filtered);
        }, 0);
        return;
      }

      // commit value to shapes and push history
      let finalShapes: Shape[] = [];

      // Update shapes state so canvas shows the text
      setShapes((latestShapes) => {
        const updatedShapes = latestShapes.map((s) =>
          s.id === id ? { ...s, text: val } : s
        );
        finalShapes = updatedShapes;
        return updatedShapes;
      });

      // Remove textarea after a short delay to ensure smooth transition
      setTimeout(() => {
        removeTextarea();
      }, 50);

      // Schedule history update
      setTimeout(() => {
        setShapesWithHistory(finalShapes, {
          pushHistory: true,
          stateToPush: stateBeforeEditing,
        });
        handleSave(finalShapes);
      }, 0);
    };

    // Helper to remove textarea cleanly
    const removeTextarea = () => {
      try {
        textarea!.remove();
      } catch (e) {}
      textAreaRef.current = null;
    };

    const onBlur = () => finish(true);
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        finish(false);
      } else if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        finish(true);
      }
    };

    textarea.addEventListener("blur", onBlur);
    textarea.addEventListener("keydown", onKeyDown);
  };

  return {
    editingTextId,
    pendingTextEdit,
    setPendingTextEdit,
    openTextEditor,
  };
};
