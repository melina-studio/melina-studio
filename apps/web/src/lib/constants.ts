export const STAGE_MIN_SCALE = 0.1; // 10%
export const STAGE_MAX_SCALE = 1; // 100%
export const STAGE_DEFAULT_SCALE = 1;

export const HISTORY_LIMIT = 60;

export const BaseURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Model tier definitions
export type SubscriptionTier = "free" | "pro" | "premium" | "on_demand";

export type ModelId = "groq" | "anthropic" | "gemini" | "openai";

export type Model = {
  id: ModelId;
  name: string;
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
    id: "groq",
    name: "llama-4-scout-17b-16e-instruct",
    displayName: "Llama 4 Scout 17B",
    dropdownName: "groq (llama-4-scout-17b-16e-instruct)",
    label: "Groq",
    minimumTier: "free",
  },
  {
    id: "anthropic",
    name: "claude-4.5-sonnet",
    displayName: "Claude 4.5 Sonnet",
    dropdownName: "anthropic (claude-4.5-sonnet)",
    label: "Anthropic",
    minimumTier: "free",
  },
  {
    id: "gemini",
    name: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    dropdownName: "gemini (gemini-2.5-flash)",
    label: "Gemini",
    minimumTier: "pro",
  },
  {
    id: "openai",
    name: "gpt-5.1",
    displayName: "GPT 5.1",
    dropdownName: "openai (gpt-5.1)",
    label: "OpenAI",
    minimumTier: "premium",
  },
];

export const DEFAULT_MODEL: ModelId = "anthropic";
