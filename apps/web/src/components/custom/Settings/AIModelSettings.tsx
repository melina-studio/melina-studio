"use client";

import { useEffect, useState } from "react";
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

interface Settings {
  activeModel: string;
  temperature: number;
  maxTokens: number;
  theme: string;
}

const DEFAULT_SETTINGS: Settings = {
  activeModel: "anthropic",
  temperature: 0.5,
  maxTokens: 1000,
  theme: "dark",
};

const MODEL_OPTIONS = [
  { value: "openai", label: "OpenAI", model: "gpt-5.1" },
  { value: "anthropic", label: "Anthropic", model: "claude-4.5-sonnet" },
  { value: "groq", label: "Groq", model: "llama-3.3-70b" },
  { value: "gemini", label: "Gemini", model: "gemini-2.5-flash" },
];

export function AIModelSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [customRules, setCustomRules] = useState("");
  const [mounted, setMounted] = useState(false);

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

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      // Save to localStorage
      try {
        localStorage.setItem("settings", JSON.stringify(newSettings));
      } catch (e) {
        console.error("Failed to save settings:", e);
      }
      return newSettings;
    });
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

  const selectedModel = MODEL_OPTIONS.find((m) => m.value === settings.activeModel);

  return (
    <SettingsSection title="Melina" description="Configure generation parameters for Melina.">
      <SettingsRow label="Model Provider" description="Select the model provider to use.">
        <Select
          value={settings.activeModel}
          onValueChange={(v) => updateSettings({ activeModel: v })}
        >
          <SelectTrigger className="w-full max-w-[280px]">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {MODEL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                <div className="flex gap-2 items-center">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.model}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedModel && (
          <p className="text-xs text-muted-foreground mt-2">
            Currently using: <span className="font-medium">{selectedModel.model}</span>
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
