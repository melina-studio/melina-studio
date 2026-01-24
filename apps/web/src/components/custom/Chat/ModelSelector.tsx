import { Check, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type Model = {
  id: string;
  name: string;
  displayName: string;
  dropdownName: string;
};

const MODELS: Model[] = [
  { id: "openai", name: "gpt-5.1", displayName: "GPT 5.1", dropdownName: "openai (gpt-5.1)" },
  {
    id: "anthropic",
    name: "claude-4.5-sonnet",
    displayName: "Claude 4.5 Sonnet",
    dropdownName: "anthropic (claude-4.5-sonnet)",
  },
  {
    id: "groq",
    name: "llama-3.3-70b-versatile",
    displayName: "Llama 3.3 70B",
    dropdownName: "groq (llama-3.3-70b-versatile)",
  },
  {
    id: "gemini",
    name: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    dropdownName: "gemini (gemini-2.5-flash)",
  },
];

type ModelSelectorProps = {
  isDark: boolean;
};

function ModelSelector({ isDark }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("anthropic");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load selected model from localStorage on mount
  useEffect(() => {
    const settings = localStorage.getItem("settings");
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.activeModel) {
        setSelectedModel(parsed.activeModel);
      }
    }
  }, []);

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

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    setIsOpen(false);

    // Update localStorage
    const settings = localStorage.getItem("settings");
    const parsed = settings ? JSON.parse(settings) : {};
    parsed.activeModel = modelId;
    localStorage.setItem("settings", JSON.stringify(parsed));
  };

  const currentModel = MODELS.find((m) => m.id === selectedModel);

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
            {MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelectModel(model.id)}
                className="w-full flex items-center justify-between gap-4 px-2.5 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors cursor-pointer"
                style={{ color: isDark ? "#d1d5db" : "#374151" }}
              >
                <span className="whitespace-nowrap">{model.dropdownName}</span>
                {selectedModel === model.id && (
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
