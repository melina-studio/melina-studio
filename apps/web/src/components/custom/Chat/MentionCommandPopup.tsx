import { forwardRef } from "react";
import type { CommandItem, PopupState } from "@/hooks/useMentionCommand";

type MentionCommandPopupProps = {
  popupState: PopupState;
  items: CommandItem[];
  onSelectItem: (item: CommandItem) => void;
  isDark: boolean;
};

const MentionCommandPopup = forwardRef<HTMLDivElement, MentionCommandPopupProps>(
  ({ popupState, items, onSelectItem, isDark }, ref) => {
    if (!popupState.isOpen || items.length === 0) {
      return null;
    }

    return (
      <div
        ref={ref}
        className="absolute bottom-full left-0 mb-1 rounded-md shadow-lg border overflow-hidden z-50 min-w-[200px] max-w-[280px]"
        style={{
          background: isDark ? "#252528" : "#ffffff",
          borderColor: isDark ? "rgba(107, 114, 128, 0.2)" : "rgba(209, 213, 219, 0.6)",
        }}
      >
        <div className="py-0.5">
          {items.map((item, index) => {
            const isSelected = index === popupState.selectedIndex;
            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`w-full flex flex-col items-start gap-0.5 px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-gray-100 dark:bg-gray-700/40"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700/40"
                }`}
                style={{ color: isDark ? "#d1d5db" : "#374151" }}
              >
                <span
                  className="font-medium whitespace-nowrap"
                  style={{ color: isDark ? "#e5e7eb" : "#1f2937" }}
                >
                  {item.label}
                </span>
                <span
                  className="text-[10px] opacity-70"
                  style={{ color: isDark ? "#9ca3af" : "#6b7280" }}
                >
                  {item.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);

MentionCommandPopup.displayName = "MentionCommandPopup";

export default MentionCommandPopup;
