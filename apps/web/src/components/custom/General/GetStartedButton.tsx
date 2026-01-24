"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import api from "@/lib/axios";

interface GetStartedButtonProps {
  children: React.ReactNode;
  className?: string;
}

export function GetStartedButton({ children, className }: GetStartedButtonProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const handleClick = async () => {
    // If already authenticated, go directly to playground
    if (isAuthenticated) {
      router.push("/playground/all");
      return;
    }

    // Check if user has valid tokens by calling /me
    setIsChecking(true);
    try {
      await api.get("/api/v1/auth/me");
      // If successful, user is authenticated - go to playground
      router.push("/playground/all");
    } catch {
      // Not authenticated - go to auth page
      router.push("/auth");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={isChecking} className={className}>
      {children}
    </button>
  );
}
