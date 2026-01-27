"use client";

import { SettingsSection, SettingsRow } from "./SettingsSection";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useAuth, Subscription } from "@/providers/AuthProvider";
import { useState } from "react";
import { toast } from "sonner";
import { createOrder, verifyPayment } from "@/service/orders";

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
    tokenLimit: "200K tokens/month",
    features: [
      "200,000 tokens per month",
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
    tokenLimit: "2M tokens/month",
    features: [
      "2,000,000 tokens per month",
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
    tokenLimit: "20M tokens/month",
    features: [
      "20,000,000 tokens per month",
      "All AI models (incl. Thinking and Pro models)",
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
    tokenLimit: "200M tokens/month",
    features: [
      "200,000,000 tokens per month",
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

// Declare Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

export function BillingSettings() {
  const { user, refreshUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const currentPlanId = user?.subscription || "free";
  const tokensConsumed = user?.tokens_consumed || 0;
  const tokenLimit = user?.token_limit || 50000; // 50,000 tokens per month for free
  const tokensRemaining = Math.max(0, tokenLimit - tokensConsumed);
  const usagePercentage = tokenLimit > 0 ? (tokensConsumed / tokenLimit) * 100 : 0;

  const currentPlan = PLANS.find((p) => p.id === currentPlanId) || PLANS[0];

  // Load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (plan: Subscription) => {
    if (plan === "free" || plan === "on_demand") {
      toast.error("This plan is not available for purchase.");
      return;
    }

    setIsProcessing(true);
    setLoadingPlan(plan);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay SDK");
      }

      // Create order using service
      const orderData = await createOrder(plan);

      // Open Razorpay checkout
      const options = {
        key: orderData.razorpay_key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Melina Studio",
        description: `${PLANS.find((p) => p.id === plan)?.name} Plan Subscription`,
        order_id: orderData.razorpay_order_id,
        handler: async function (response: any) {
          try {
            // Verify payment using service
            const verifyData = await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            toast.success(verifyData.message || "Your subscription has been upgraded.");

            // Refresh user data
            if (refreshUser) {
              await refreshUser();
            }
          } catch (error: any) {
            toast.error(error.message || "Failed to verify payment. Please contact support.");
          }
        },
        prefill: {
          name: `${user?.first_name} ${user?.last_name}`,
          email: user?.email,
        },
        theme: {
          color: "#3b82f6",
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setLoadingPlan(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate payment. Please try again.");
      setIsProcessing(false);
      setLoadingPlan(null);
    }
  };

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
                  {!isCurrent && plan.id !== "on_demand" && (
                    <Button
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isProcessing || loadingPlan === plan.id}
                    >
                      {loadingPlan === plan.id ? "Processing..." : "Upgrade"}
                    </Button>
                  )}
                  {plan.id === "on_demand" && !isCurrent && (
                    <Button size="sm" variant="outline" disabled>
                      Contact Sales
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
