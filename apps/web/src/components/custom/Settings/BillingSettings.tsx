"use client";

import { SettingsSection, SettingsRow } from "./SettingsSection";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useAuth, Subscription } from "@/providers/AuthProvider";

type Plan = {
  id: Subscription;
  name: string;
  price: string;
  period: string;
  tokenLimit: string;
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tokenLimit: "50K tokens/month",
    features: [
      "50,000 tokens per month",
      "Llama & Anthropic models",
      "Basic AI assistance",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$10",
    period: "per month",
    tokenLimit: "1M tokens/month",
    features: [
      "1,000,000 tokens per month",
      "Llama, Anthropic & Gemini models",
      "Advanced AI features",
      "Priority support",
      "Custom exports",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$30",
    period: "per month",
    tokenLimit: "10M tokens/month",
    features: [
      "10,000,000 tokens per month",
      "All AI models (incl. OpenAI)",
      "Everything in Pro",
      "Team collaboration",
      "SSO integration",
    ],
  },
  {
    id: "on_demand",
    name: "On Demand",
    price: "Custom",
    period: "per month",
    tokenLimit: "100M tokens/month",
    features: [
      "100,000,000 tokens per month",
      "All AI models (incl. OpenAI)",
      "Everything in Premium",
      "Dedicated support",
      "Custom integrations",
    ],
  },
];

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K`;
  }
  return tokens.toLocaleString();
}

export function BillingSettings() {
  const { user } = useAuth();

  const currentPlanId = user?.subscription || "free";
  const tokensConsumed = user?.tokens_consumed || 0;
  const tokenLimit = user?.token_limit || 50000; // 50,000 tokens per month for free
  const tokensRemaining = Math.max(0, tokenLimit - tokensConsumed);
  const usagePercentage = tokenLimit > 0 ? (tokensConsumed / tokenLimit) * 100 : 0;

  const currentPlan = PLANS.find((p) => p.id === currentPlanId) || PLANS[0];

  return (
    <SettingsSection
      title="Billing"
      description="Manage your subscription and billing information."
    >
      <SettingsRow label="Current Plan" description="Your active subscription plan.">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{currentPlan.name} Plan</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
            Active
          </span>
        </div>
      </SettingsRow>

      <SettingsRow label="Token Usage" description="Your monthly token consumption.">
        <div className="w-full max-w-md">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">{formatTokens(tokensConsumed)} used</span>
            <span className="text-muted-foreground">{formatTokens(tokensRemaining)} remaining</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usagePercentage >= 100
                  ? "bg-red-500"
                  : usagePercentage >= 80
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
              style={{ width: `${Math.min(100, usagePercentage)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {formatTokens(tokenLimit)} tokens per month • Resets monthly
          </p>
        </div>
      </SettingsRow>

      <SettingsRow label="Available Plans" description="Choose a plan that works for you.">
        <div className="grid gap-4 w-full max-w-2xl">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <div
                key={plan.id}
                className={`relative rounded-lg border p-4 ${isCurrent
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                  }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2 right-4 text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                    Current
                  </span>
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">{plan.name}</h4>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {plan.price}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        /{plan.period}
                      </span>
                    </p>
                  </div>
                  {!isCurrent && (
                    <Button size="sm" className="cursor-pointer">
                      Upgrade
                    </Button>
                  )}
                </div>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}
