"use client";

import { SettingsSection, SettingsRow } from "./SettingsSection";
import { Button } from "@/components/ui/button";
import { ExternalLink, Heart, Link } from "lucide-react";

// Custom GitHub icon to avoid deprecation warning from lucide-react
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function AboutSettings() {
  return (
    <SettingsSection title="About" description="Information about Melina Studio.">
      <SettingsRow label="Version" description="Current version of the application.">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">0.1.0</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primary/20">
            Beta
          </span>
        </div>
      </SettingsRow>

      <SettingsRow label="What is Melina?" description="Learn more about the application.">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Melina Studio is an AI-powered design canvas that helps you create flowcharts, diagrams,
          and visual designs using natural language. Simply describe what you want to create, and
          Melina will generate it for you.
        </p>
      </SettingsRow>

      <SettingsRow label="Resources" description="Helpful links and documentation.">
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-fit justify-start gap-2 cursor-pointer"
            asChild
          >
            <a
              href="https://github.com/melina-studio/melina-studio"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitHubIcon className="h-4 w-4" />
              GitHub Repository
              <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
            </a>
          </Button>
        </div>
      </SettingsRow>

      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          Made with <Heart className="h-3 w-3 text-red-500 fill-red-500" />
          by
          <a
            href="https://aryan-shaw.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1"
          >
            <span className="font-medium underline"> Aryan Shaw</span>
            <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
          </a>
        </p>
      </div>
    </SettingsSection>
  );
}
