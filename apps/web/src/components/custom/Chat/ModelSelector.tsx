import { Check, ChevronDown, Lock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useModelAccess } from "@/hooks/useModelAccess";
import { SUBSCRIPTION_TIER_DISPLAY_NAMES } from "@/lib/constants";

type ModelSelectorProps = {
  isDark: boolean;
};

function ModelSelector({ isDark }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { activeModel, modelsWithStatus, handleModelChange } = useModelAccess();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectModel = (modelName: string, isAvailable: boolean) => {
    if (!isAvailable) return;

    handleModelChange(modelName);
    setIsOpen(false);
  };

  const currentModel = modelsWithStatus.find((m) => m.name === activeModel);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
      >
        <span>{currentModel?.displayName || "Select model"}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-1 rounded-md shadow-lg border overflow-hidden z-50"
          style={{
            background: isDark ? "#252528" : "#ffffff",
            borderColor: isDark ? "rgba(107, 114, 128, 0.2)" : "rgba(209, 213, 219, 0.6)",
          }}
        >
          {/* Model list */}
          <div className="py-0.5">
            {modelsWithStatus.map((model) => (
              <button
                key={model.name}
                onClick={() => handleSelectModel(model.name, model.isAvailable)}
                disabled={!model.isAvailable}
                className={`w-full flex items-center justify-between gap-4 px-2.5 py-1.5 text-xs transition-colors ${
                  model.isAvailable
                    ? "hover:bg-gray-100 dark:hover:bg-gray-700/40 cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                }`}
                style={{ color: isDark ? "#d1d5db" : "#374151" }}
                title={
                  !model.isAvailable
                    ? `Requires ${SUBSCRIPTION_TIER_DISPLAY_NAMES[model.minimumTier]} plan`
                    : undefined
                }
              >
                <span className="whitespace-nowrap flex items-center gap-1.5">
                  {model.dropdownName}
                  {!model.isAvailable && <Lock className="w-3 h-3 text-gray-400" />}
                </span>
                {activeModel === model.name && model.isAvailable && (
                  <Check className="w-3 h-3 text-gray-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelSelector;
