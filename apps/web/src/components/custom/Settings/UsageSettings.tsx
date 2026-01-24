"use client";

import { SettingsSection } from "./SettingsSection";
import { BarChart3 } from "lucide-react";

export function UsageSettings() {
  return (
    <SettingsSection title="Usage" description="View your usage statistics and limits.">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Coming Soon</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Usage statistics and limits tracking will be available here soon. You&apos;ll be able to
          monitor your API usage, storage, and more.
        </p>
      </div>
    </SettingsSection>
  );
}
