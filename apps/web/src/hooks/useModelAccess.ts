"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  MODELS,
  DEFAULT_MODEL,
  type ModelId,
  type SubscriptionTier,
} from "@/lib/constants";
import {
  getModelsWithStatus,
  getAvailableModels,
  getValidModelForUser,
  canAccessModel,
  type ModelWithStatus,
} from "@/lib/modelUtils";

interface UseModelAccessReturn {
  activeModel: ModelId;
  availableModels: typeof MODELS;
  modelsWithStatus: ModelWithStatus[];
  handleModelChange: (modelId: ModelId) => void;
  canAccessModel: (modelId: ModelId) => boolean;
  subscription: SubscriptionTier;
}

export function useModelAccess(): UseModelAccessReturn {
  const { user } = useAuth();
  const subscription: SubscriptionTier = user?.subscription || "free";

  const [activeModel, setActiveModel] = useState<ModelId>(DEFAULT_MODEL);
  const [mounted, setMounted] = useState(false);

  // Load and validate model from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const settings = localStorage.getItem("settings");
      if (settings) {
        const parsed = JSON.parse(settings);
        const savedModel = parsed.activeModel;

        // Validate that saved model is accessible with current subscription
        const validModel = getValidModelForUser(savedModel, subscription);

        // If saved model is not valid, update localStorage with valid model
        if (savedModel !== validModel) {
          const newSettings = { ...parsed, activeModel: validModel };
          localStorage.setItem("settings", JSON.stringify(newSettings));
        }

        setActiveModel(validModel);
      }
    } catch (e) {
      console.error("Failed to load model settings:", e);
      setActiveModel(DEFAULT_MODEL);
    }
  }, [subscription]);

  // Handle subscription changes (e.g., downgrade)
  useEffect(() => {
    if (!mounted) return;

    // Check if current model is still accessible
    if (!canAccessModel(subscription, activeModel)) {
      const validModel = getValidModelForUser(activeModel, subscription);
      setActiveModel(validModel);

      // Update localStorage
      try {
        const settings = localStorage.getItem("settings");
        const parsed = settings ? JSON.parse(settings) : {};
        parsed.activeModel = validModel;
        localStorage.setItem("settings", JSON.stringify(parsed));
      } catch (e) {
        console.error("Failed to update model settings:", e);
      }
    }
  }, [subscription, activeModel, mounted]);

  const handleModelChange = useCallback(
    (modelId: ModelId) => {
      // Only allow changing to accessible models
      if (!canAccessModel(subscription, modelId)) {
        return;
      }

      setActiveModel(modelId);

      // Update localStorage
      try {
        const settings = localStorage.getItem("settings");
        const parsed = settings ? JSON.parse(settings) : {};
        parsed.activeModel = modelId;
        localStorage.setItem("settings", JSON.stringify(parsed));
      } catch (e) {
        console.error("Failed to save model settings:", e);
      }
    },
    [subscription]
  );

  const checkModelAccess = useCallback(
    (modelId: ModelId) => canAccessModel(subscription, modelId),
    [subscription]
  );

  return {
    activeModel,
    availableModels: getAvailableModels(subscription),
    modelsWithStatus: getModelsWithStatus(subscription),
    handleModelChange,
    canAccessModel: checkModelAccess,
    subscription,
  };
}
