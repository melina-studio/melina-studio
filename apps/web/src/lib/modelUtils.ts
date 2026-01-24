import {
  MODELS,
  SUBSCRIPTION_TIER_ORDER,
  DEFAULT_MODEL,
  type ModelId,
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
  modelId: ModelId
): boolean {
  const userTier = subscription || "free";
  const model = MODELS.find((m) => m.id === modelId);

  if (!model) return false;

  const userTierLevel = SUBSCRIPTION_TIER_ORDER[userTier];
  const requiredTierLevel = SUBSCRIPTION_TIER_ORDER[model.minimumTier];

  return userTierLevel >= requiredTierLevel;
}

/**
 * Get all models available to a user based on their subscription tier
 */
export function getAvailableModels(subscription: SubscriptionTier | undefined): Model[] {
  return MODELS.filter((model) => canAccessModel(subscription, model.id));
}

/**
 * Get all models with their availability status for a user
 */
export function getModelsWithStatus(
  subscription: SubscriptionTier | undefined
): ModelWithStatus[] {
  return MODELS.map((model) => ({
    ...model,
    isAvailable: canAccessModel(subscription, model.id),
  }));
}

/**
 * Get a valid model for a user, falling back to default if saved model is inaccessible
 */
export function getValidModelForUser(
  savedModelId: ModelId | string | undefined,
  subscription: SubscriptionTier | undefined
): ModelId {
  // If saved model is valid and accessible, use it
  if (savedModelId && canAccessModel(subscription, savedModelId as ModelId)) {
    const model = MODELS.find((m) => m.id === savedModelId);
    if (model) return model.id;
  }

  // Fall back to default model (anthropic, which is free tier)
  return DEFAULT_MODEL;
}

/**
 * Get a model by its ID
 */
export function getModelById(modelId: ModelId | string): Model | undefined {
  return MODELS.find((m) => m.id === modelId);
}
