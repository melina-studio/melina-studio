"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { SettingsSection, SettingsRow } from "./SettingsSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useModelAccess } from "@/hooks/useModelAccess";
import { SUBSCRIPTION_TIER_DISPLAY_NAMES } from "@/lib/constants";
import { getModelByName } from "@/lib/modelUtils";

interface Settings {
  modelName: string; // e.g., "claude-4.5-sonnet"
  temperature: number;
  maxTokens: number;
  theme: string;
}

const DEFAULT_SETTINGS: Settings = {
  modelName: "claude-4.5-sonnet",
  temperature: 0.5,
  maxTokens: 1000,
  theme: "dark",
};

export function AIModelSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [customRules, setCustomRules] = useState("");
  const [mounted, setMounted] = useState(false);

  const { activeModel, modelsWithStatus, handleModelChange, canAccessModel } = useModelAccess();

  useEffect(() => {
    setMounted(true);
    // Load settings from localStorage
    try {
      const savedSettings = localStorage.getItem("settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }

    // TODO: Load customRules from backend
    // fetchCustomRules().then(rules => setCustomRules(rules));
  }, []);

  // Sync activeModel from hook with local state
  useEffect(() => {
    if (mounted) {
      setSettings((prev) => ({ ...prev, modelName: activeModel }));
    }
  }, [activeModel, mounted]);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      try {
        localStorage.setItem("settings", JSON.stringify(newSettings));
      } catch (e) {
        console.error("Failed to save settings:", e);
      }
      return newSettings;
    });
  };

  const handleModelSelect = (modelName: string) => {
    if (!canAccessModel(modelName)) {
      return;
    }
    handleModelChange(modelName);
    updateSettings({ modelName });
  };

  const updateCustomRules = (rules: string) => {
    setCustomRules(rules);
    // TODO: Save customRules to backend
    // saveCustomRules(rules);
  };

  if (!mounted) {
    return (
      <SettingsSection title="Melina" description="Configure generation parameters for Melina.">
        <SettingsRow label="Model Provider" description="Select the model provider.">
          <div className="h-9 w-full max-w-[280px] bg-muted animate-pulse rounded-md" />
        </SettingsRow>
        <SettingsRow label="Temperature" description="Controls randomness in responses.">
          <div className="h-9 w-full max-w-[280px] bg-muted animate-pulse rounded-md" />
        </SettingsRow>
        <SettingsRow label="Max Tokens" description="Maximum length of generated responses.">
          <div className="h-9 w-full max-w-[140px] bg-muted animate-pulse rounded-md" />
        </SettingsRow>
        <SettingsRow label="Custom Melina Rules" description="Add custom instructions for Melina.">
          <div className="h-24 w-full max-w-[400px] bg-muted animate-pulse rounded-md" />
        </SettingsRow>
      </SettingsSection>
    );
  }

  const selectedModel = getModelByName(settings.modelName);

  return (
    <SettingsSection title="Melina" description="Configure generation parameters for Melina.">
      <SettingsRow label="Model Provider" description="Select the model provider to use.">
        <Select value={settings.modelName} onValueChange={handleModelSelect}>
          <SelectTrigger className="w-full max-w-[280px] cursor-pointer">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {modelsWithStatus.map((model) => (
              <SelectItem
                key={model.name}
                value={model.name}
                disabled={!model.isAvailable}
                className={`cursor-pointer ${!model.isAvailable ? "opacity-50" : ""}`}
              >
                <div className="flex gap-2 items-center">
                  <span className={`font-medium ${!model.isAvailable ? "text-muted-foreground" : ""}`}>
                    {model.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{model.displayName}</span>
                  {!model.isAvailable && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      {SUBSCRIPTION_TIER_DISPLAY_NAMES[model.minimumTier]}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedModel && (
          <p className="text-xs text-muted-foreground mt-2">
            Currently using: <span className="font-medium">{selectedModel.displayName}</span>
          </p>
        )}
      </SettingsRow>

      <SettingsRow
        label="Temperature"
        description="Controls creativity. Lower values are more focused, higher values are more creative."
      >
        <div className="flex flex-col gap-3 w-full max-w-[280px]">
          <Slider
            value={[settings.temperature]}
            onValueChange={(v) => updateSettings({ temperature: v[0] })}
            min={0}
            max={1}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Focused (0)</span>
            <span className="font-medium text-foreground">{settings.temperature.toFixed(1)}</span>
            <span>Creative (1)</span>
          </div>
        </div>
      </SettingsRow>

      <SettingsRow
        label="Max Tokens"
        description="Maximum number of tokens in the AI response (1 - 10,000)."
      >
        <div className="flex flex-col gap-2">
          <Input
            type="number"
            value={settings.maxTokens}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value) && value >= 1 && value <= 10000) {
                updateSettings({ maxTokens: value });
              }
            }}
            min={1}
            max={10000}
            step={100}
            className="w-full max-w-[140px]"
          />
          <p className="text-xs text-muted-foreground">
            Higher values allow longer responses but may increase latency.
          </p>
        </div>
      </SettingsRow>

      <SettingsRow
        label="Custom Melina Rules"
        description="Add custom instructions to personalize Melina's behavior and responses."
      >
        <div className="flex flex-col gap-2 w-full max-w-[400px]">
          <Textarea
            value={customRules}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              updateCustomRules(e.target.value)
            }
            placeholder="e.g., Always respond in a formal tone. Focus on minimalist designs. Use pastel colors by default..."
            className="min-h-[120px] resize-y"
          />
          <p className="text-xs text-muted-foreground">
            These rules will be added to Melina&apos;s system prompt to customize how it generates
            designs and responds to your requests.
          </p>
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}
