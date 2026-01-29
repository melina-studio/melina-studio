export const STAGE_MIN_SCALE = 0.1; // 10%
export const STAGE_MAX_SCALE = 1; // 100%
export const STAGE_DEFAULT_SCALE = 1;

export const HISTORY_LIMIT = 60;

export const BaseURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Model tier definitions
export type SubscriptionTier = "free" | "pro" | "premium" | "on_demand";

// Provider types (internal - for backend communication)
export type Provider = "groq" | "anthropic" | "gemini" | "openai" | "openrouter";

export type Model = {
  name: string; // Model name sent to backend (e.g., "claude-4.5-sonnet")
  displayName: string;
  dropdownName: string;
  label: string;
  minimumTier: SubscriptionTier;
};

export const SUBSCRIPTION_TIER_ORDER: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  premium: 2,
  on_demand: 3,
};

export const SUBSCRIPTION_TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
  on_demand: "On Demand",
};

export const MODELS: Model[] = [
  {
    name: "meta-llama/llama-4-scout-17b-16e-instruct",
    displayName: "Llama 4 Scout 17B",
    dropdownName: "Groq (Llama 4 Scout)",
    label: "Groq",
    minimumTier: "free",
  },
  {
    name: "claude-4.5-sonnet",
    displayName: "Claude 4.5 Sonnet",
    dropdownName: "Anthropic (Claude 4.5 Sonnet)",
    label: "Anthropic",
    minimumTier: "free",
  },
  {
    name: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    dropdownName: "Gemini (2.5 Flash)",
    label: "Gemini",
    minimumTier: "pro",
  },
  {
    name: "gpt-5.1",
    displayName: "GPT 5.1",
    dropdownName: "OpenAI (GPT 5.1)",
    label: "OpenAI",
    minimumTier: "premium",
  },
  {
    name: "moonshotai/kimi-k2.5",
    displayName: "Kimi K2.5",
    dropdownName: "OpenRouter (Kimi K2.5)",
    label: "OpenRouter",
    minimumTier: "pro",
  },
];

// Default model name
export const DEFAULT_MODEL = "claude-4.5-sonnet";

// Helper to get model by name
export function getModelByName(name: string): Model | undefined {
  return MODELS.find((m) => m.name === name);
}

// LocalStorage model settings structure
export interface ModelSettings {
  modelName: string; // e.g., "claude-4.5-sonnet"
  temperature: number;
}

// Default model settings
export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  modelName: DEFAULT_MODEL,
  temperature: 0.3,
};
