"use client";

import { SettingsSection } from "./SettingsSection";
import { LineChart } from "lucide-react";

export function AnalyticsSettings() {
  return (
    <SettingsSection
      title="Analytics"
      description="View insights and analytics about your projects."
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <LineChart className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Coming Soon</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Analytics and insights will be available here soon. Track your project activity,
          collaboration metrics, and design patterns.
        </p>
      </div>
    </SettingsSection>
  );
}
