import React from "react";
import { useTheme } from "next-themes";
import { X } from "lucide-react";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectItem,
  SelectContent,
} from "../../ui/select";
import { Slider } from "../../ui/slider";
import { ThemeToggle } from "../General/ThemeToggle";
import { Input } from "../../ui/input";
import { Settings } from "@/app/playground/[id]/page";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  activeSettings: Settings | null;
  setActiveSettings: (settings: Settings) => void;
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  activeSettings,
  setActiveSettings,
}) => {
  const [activeModel, setActiveModel] = React.useState("openai");
  const [temperature, setTemperature] = React.useState(0.5);
  const [maxTokens, setMaxTokens] = React.useState(1000);

  React.useEffect(() => {
    // update state with active settings
    setActiveModel(activeSettings?.activeModel || "openai");
    setTemperature(activeSettings?.temperature || 0.5);
    setMaxTokens(activeSettings?.maxTokens || 1000);
  }, [activeSettings]);

  if (!isOpen) return null;

  const handleSaveSettings = (key: keyof Settings, value: any) => {
    const settings = { ...activeSettings, [key]: value };
    localStorage.setItem("settings", JSON.stringify(settings));
    if (key === "activeModel") {
      setActiveModel(value);
    }
    if (key === "temperature") {
      setTemperature(value);
    }
    if (key === "maxTokens") {
      setMaxTokens(value);
    }
    setActiveSettings(settings as Settings);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-transparent z-40" onClick={onClose} />

      {/* Modal - positioned below settings button, aligned to the right */}
      <div className="absolute top-full right-0 mt-2 w-[320px] bg-white dark:bg-[#323332] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
        {/* Content - empty for now */}
        <div className="p-4 min-h-[100px] flex flex-col gap-2">
          {/* Content will be added later */}

          {/* active llm model selector */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-500 dark:text-white">
              Active Model
            </p>
            <Select
              value={activeModel}
              onValueChange={(value) =>
                handleSaveSettings("activeModel", value)
              }
            >
              <SelectTrigger className="w-[180px] h-[16px]">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai" className="text-sm">
                  openai (gpt-5.1)
                </SelectItem>
                <SelectItem value="anthropic" className="text-sm">
                  anthropic (claude-4.5-sonnet)
                </SelectItem>
                <SelectItem value="groq" className="text-sm">
                  groq (llama-3.3-70b-versatile)
                </SelectItem>
                <SelectItem value="gemini" className="text-sm">
                  gemini (gemini-2.5-flash)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* temperature slider */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-500 dark:text-white">
              Temperature
            </p>
            <div className="w-[180px]">
              <Slider
                value={[temperature]}
                onValueChange={(value) =>
                  handleSaveSettings("temperature", value[0])
                }
                max={1}
                min={0}
                step={0.1}
              />
            </div>
          </div>

          {/* max tokens input */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-500 dark:text-white">
              Max Tokens
            </p>
            <Input
              type="number"
              value={maxTokens}
              onChange={(e) =>
                handleSaveSettings("maxTokens", Number(e.target.value))
              }
              className="w-[180px] h-8 text-sm"
              min={1}
              max={10000}
              step={100}
              placeholder="Max tokens"
            />
          </div>

          {/* divider */}
          <div className="h-[1px] bg-gray-200 dark:bg-gray-700" />

          {/* theme toggler */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-500 dark:text-white">
              Theme
            </p>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  );
};
