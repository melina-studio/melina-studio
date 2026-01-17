"use client";

import { WebSocketProvider } from "@/providers/WebsocketProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { refreshUser, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  // Fetch user data when entering protected routes
  useEffect(() => {
    const checkAuth = async () => {
      await refreshUser();
      setAuthChecked(true);
    };
    checkAuth();
  }, [refreshUser]);

  // Redirect to auth if not authenticated after auth check completes
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      router.push("/auth");
    }
  }, [authChecked, isAuthenticated, router]);

  if (!authChecked || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <WebSocketProvider>{children}</WebSocketProvider>;
}
