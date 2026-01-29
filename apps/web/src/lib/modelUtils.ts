import {
  MODELS,
  SUBSCRIPTION_TIER_ORDER,
  DEFAULT_MODEL,
  type SubscriptionTier,
  type Model,
} from "./constants";

export type ModelWithStatus = Model & {
  isAvailable: boolean;
};

/**
 * Check if a user can access a specific model based on their subscription tier
 */
export function canAccessModel(
  subscription: SubscriptionTier | undefined,
  modelName: string
): boolean {
  const userTier = subscription || "free";
  const model = MODELS.find((m) => m.name === modelName);

  if (!model) return false;

  const userTierLevel = SUBSCRIPTION_TIER_ORDER[userTier];
  const requiredTierLevel = SUBSCRIPTION_TIER_ORDER[model.minimumTier];

  return userTierLevel >= requiredTierLevel;
}

/**
 * Get all models available to a user based on their subscription tier
 */
export function getAvailableModels(subscription: SubscriptionTier | undefined): Model[] {
  return MODELS.filter((model) => canAccessModel(subscription, model.name));
}

/**
 * Get all models with their availability status for a user
 */
export function getModelsWithStatus(
  subscription: SubscriptionTier | undefined
): ModelWithStatus[] {
  return MODELS.map((model) => ({
    ...model,
    isAvailable: canAccessModel(subscription, model.name),
  }));
}

/**
 * Get a valid model for a user, falling back to default if saved model is inaccessible
 */
export function getValidModelForUser(
  savedModelName: string | undefined,
  subscription: SubscriptionTier | undefined
): string {
  // If saved model is valid and accessible, use it
  if (savedModelName && canAccessModel(subscription, savedModelName)) {
    const model = MODELS.find((m) => m.name === savedModelName);
    if (model) return model.name;
  }

  // Fall back to default model
  return DEFAULT_MODEL;
}

/**
 * Get a model by its name
 */
export function getModelByName(modelName: string): Model | undefined {
  return MODELS.find((m) => m.name === modelName);
}

// Alias for backwards compatibility
export const getModelById = getModelByName;
