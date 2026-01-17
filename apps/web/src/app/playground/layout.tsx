"use client";

import { WebSocketProvider } from "@/providers/WebsocketProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { refreshUser, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Fetch user data when entering protected routes
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Redirect to auth if not authenticated after loading
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <WebSocketProvider>{children}</WebSocketProvider>;
}
