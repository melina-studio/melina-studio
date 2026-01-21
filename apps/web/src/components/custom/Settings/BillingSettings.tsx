"use client";

import { SettingsSection, SettingsRow } from "./SettingsSection";
import { Button } from "@/components/ui/button";
import { CreditCard, Check } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "5 projects",
      "Basic AI assistance",
      "Community support",
    ],
    current: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "per month",
    features: [
      "Unlimited projects",
      "Advanced AI features",
      "Priority support",
      "Custom exports",
    ],
    current: false,
  },
  {
    id: "team",
    name: "Team",
    price: "$49",
    period: "per month",
    features: [
      "Everything in Pro",
      "Team collaboration",
      "Admin controls",
      "SSO integration",
    ],
    current: false,
  },
];

export function BillingSettings() {
  return (
    <SettingsSection
      title="Billing"
      description="Manage your subscription and billing information."
    >
      <SettingsRow label="Current Plan" description="Your active subscription plan.">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Free Plan</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
            Active
          </span>
        </div>
      </SettingsRow>

      <SettingsRow label="Available Plans" description="Choose a plan that works for you.">
        <div className="grid gap-4 w-full max-w-2xl">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-lg border p-4 ${
                plan.current
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {plan.current && (
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
                {!plan.current && (
                  <Button size="sm" className="cursor-pointer">Upgrade</Button>
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
          ))}
        </div>
      </SettingsRow>

      <SettingsRow label="Payment Method" description="Manage your payment methods.">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-muted/30">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">No payment method added</span>
          </div>
          <Button variant="outline" size="sm" className="cursor-pointer">
            Add Payment Method
          </Button>
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}
