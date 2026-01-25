"use client";

import { SettingsSection, SettingsRow } from "./SettingsSection";
import { Button } from "@/components/ui/button";
import { Mail, Copy, Check } from "lucide-react";
import { useState } from "react";

export function ContactSettings() {
  const [copied, setCopied] = useState(false);
  const email = "studiomelina007@gmail.com";

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SettingsSection title="Contact" description="Get in touch with us for any questions or support.">
      <SettingsRow label="Email" description="For issues, queries, payments, or feedback.">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{email}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 cursor-pointer"
            onClick={handleCopyEmail}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </SettingsRow>

      <SettingsRow label="Support Topics" description="What you can reach out to us about.">
        <ul className="text-sm text-muted-foreground space-y-1.5">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Technical issues or bugs
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            General queries and questions
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Payment related inquiries
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Feedback and suggestions
          </li>
        </ul>
      </SettingsRow>
    </SettingsSection>
  );
}
