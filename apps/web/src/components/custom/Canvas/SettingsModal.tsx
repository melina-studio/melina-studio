import React from "react";
import { Lock } from "lucide-react";
import { Select, SelectValue, SelectTrigger, SelectItem, SelectContent } from "../../ui/select";
import { Slider } from "../../ui/slider";
import { ThemeToggle } from "../General/ThemeToggle";
import { Input } from "../../ui/input";
import { Settings } from "@/app/playground/[id]/page";
import { useModelAccess } from "@/hooks/useModelAccess";
import { SUBSCRIPTION_TIER_DISPLAY_NAMES, type ModelId } from "@/lib/constants";

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
  const { modelsWithStatus, canAccessModel, handleModelChange } = useModelAccess();

  const [activeModel, setActiveModel] = React.useState("anthropic");
  const [temperature, setTemperature] = React.useState(0.5);
  const [maxTokens, setMaxTokens] = React.useState(1000);

  React.useEffect(() => {
    // update state with active settings
    setActiveModel(activeSettings?.activeModel || "anthropic");
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

  const handleModelSelect = (modelId: string) => {
    if (!canAccessModel(modelId as ModelId)) {
      return;
    }
    handleModelChange(modelId as ModelId);
    handleSaveSettings("activeModel", modelId);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-transparent z-40" onClick={onClose} />

      {/* Modal - positioned below settings button, aligned to the right */}
      <div className="absolute top-full right-0 mt-2 w-[320px] bg-white dark:bg-[#323332] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
        {/* Content - empty for now */}
        <div className="p-2 px-4 min-h-[100px] flex flex-col gap-2">
          {/* Content will be added later */}

          {/* active llm model selector */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-500 dark:text-white">Active Model</p>
            <Select value={activeModel} onValueChange={handleModelSelect}>
              <SelectTrigger className="w-[180px] h-[16px] cursor-pointer">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {modelsWithStatus.map((model) => (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                    disabled={!model.isAvailable}
                    className={`text-sm cursor-pointer ${!model.isAvailable ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{model.dropdownName}</span>
                      {!model.isAvailable && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Lock className="w-3 h-3" />
                          {SUBSCRIPTION_TIER_DISPLAY_NAMES[model.minimumTier]}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* temperature slider */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-500 dark:text-white">Temperature</p>
            <div className="w-[180px]">
              <Slider
                value={[temperature]}
                onValueChange={(value) => handleSaveSettings("temperature", value[0])}
                max={1}
                min={0}
                step={0.1}
              />
            </div>
          </div>

          {/* max tokens input */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-500 dark:text-white">Max Tokens</p>
            <Input
              type="number"
              value={maxTokens}
              onChange={(e) => handleSaveSettings("maxTokens", Number(e.target.value))}
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
            <p className="text-sm font-medium text-gray-500 dark:text-white">Appearance</p>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  );
};
