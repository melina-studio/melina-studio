"use client";

import { SettingsSection } from "./SettingsSection";
import { Cpu } from "lucide-react";

export function MelinaMCPSettings() {
  return (
    <SettingsSection
      title="Melina MCP"
      description="Configure Melina Model Context Protocol integration."
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Cpu className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Coming Soon</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Melina MCP integration settings will be available here soon. Connect external tools and
          services to enhance your design workflow.
        </p>
      </div>
    </SettingsSection>
  );
}
