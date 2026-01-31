"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { DEFAULT_MODEL, type SubscriptionTier, type Model } from "@/lib/constants";
import {
  getModelsWithStatus,
  getAvailableModels,
  getValidModelForUser,
  canUseThinking,
  canAccessModel,
  type ModelWithStatus,
} from "@/lib/modelUtils";

interface UseModelAccessReturn {
  activeModel: string; // Model name (e.g., "claude-4.5-sonnet")
  availableModels: Model[];
  modelsWithStatus: ModelWithStatus[];
  handleModelChange: (modelName: string) => void;
  canAccessModel: (modelName: string) => boolean;
  subscription: SubscriptionTier;
  thinkingAccess: { canUse: boolean; reason: "no_access" | "model_unsupported" | null };
  thinkingEnabled: boolean;
  handleThinkingChange: (enabled: boolean) => void;
}

export function useModelAccess(): UseModelAccessReturn {
  const { user } = useAuth();
  const subscription: SubscriptionTier = user?.subscription || "free";

  const [activeModel, setActiveModel] = useState<string>(DEFAULT_MODEL);
  const [mounted, setMounted] = useState(false);
  const thinkingAccess = canUseThinking(subscription, activeModel);

  const [thinkingEnabled, setThinkingEnabled] = useState(false);

  // Load and validate model from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const settings = localStorage.getItem("settings");
      if (settings) {
        const parsed = JSON.parse(settings);
        const savedModel = parsed.modelName;

        // Validate that saved model is accessible with current subscription
        const validModel = getValidModelForUser(savedModel, subscription);

        // If saved model is not valid, update localStorage with valid model
        if (savedModel !== validModel) {
          const newSettings = { ...parsed, modelName: validModel };
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
        parsed.modelName = validModel;
        localStorage.setItem("settings", JSON.stringify(parsed));
      } catch (e) {
        console.error("Failed to update model settings:", e);
      }
    }
  }, [subscription, activeModel, mounted]);

  const handleModelChange = useCallback(
    (modelName: string) => {
      // Only allow changing to accessible models
      if (!canAccessModel(subscription, modelName)) {
        return;
      }

      setActiveModel(modelName);

      // Update localStorage
      try {
        const settings = localStorage.getItem("settings");
        const parsed = settings ? JSON.parse(settings) : {};
        parsed.modelName = modelName;
        localStorage.setItem("settings", JSON.stringify(parsed));
      } catch (e) {
        console.error("Failed to save model settings:", e);
      }
    },
    [subscription]
  );

  const checkModelAccess = useCallback(
    (modelName: string) => canAccessModel(subscription, modelName),
    [subscription]
  );

  // load from localstorage on mount
  useEffect(() => {
    const settings = localStorage.getItem("settings");
    if (settings) {
      const parsed = JSON.parse(settings);
      setThinkingEnabled(parsed.thinkingEnabled);
    }
  }, []);

  //auto disable thinking mode when it becomes unavailable (model change or subscription change)
  useEffect(() => {
    if (!thinkingAccess.canUse && thinkingEnabled) {
      setThinkingEnabled(false);
    }
  }, [thinkingAccess.canUse, thinkingEnabled]);

  // handler that persists to localstorage when thinking enabled changes
  const handleThinkingChange = (enabled: boolean) => {
    // Only allow enabling if model supports it
    if (enabled && !thinkingAccess.canUse) return;

    setThinkingEnabled(enabled);
    // Persist to localStorage
    const settings = JSON.parse(localStorage.getItem("settings") || "{}");
    settings.thinkingEnabled = enabled;
    localStorage.setItem("settings", JSON.stringify(settings));
  };

  return {
    activeModel,
    availableModels: getAvailableModels(subscription),
    modelsWithStatus: getModelsWithStatus(subscription),
    handleModelChange,
    canAccessModel: checkModelAccess,
    subscription,
    thinkingAccess,
    thinkingEnabled,
    handleThinkingChange,
  };
}
