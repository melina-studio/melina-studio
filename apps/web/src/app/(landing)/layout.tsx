"use client";

import { Toaster } from "sonner";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
      <Toaster position="bottom-right" />
    </div>
  );
}
