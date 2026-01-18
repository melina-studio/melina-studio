"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";
import { HalftoneImage } from "@/components/ui/HalftoneImage";
import Noise from "@/blocks/Animations/Noise/Noise";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import Logo from "@/components/custom/General/Logo";

// Map error codes to user-friendly messages
const errorMessages: Record<string, string> = {
  missing_code: "OAuth authorization code is missing",
  oauth_exchange_failed: "Failed to authenticate with provider",
  failed_to_get_user_info: "Failed to retrieve user information",
  failed_to_decode_user_info: "Failed to process user information",
  failed_to_check_user: "Failed to verify user account",
  failed_to_create_user: "Failed to create user account",
  failed_to_retrieve_user: "Failed to retrieve user data",
  failed_to_generate_token: "Failed to generate authentication token",
  failed_to_generate_refresh_token: "Failed to complete authentication",
  email_exists_different_provider: "This email is already registered with a different login method",
  failed_to_get_user_emails: "Failed to retrieve email from provider",
  failed_to_decode_user_emails: "Failed to process email data",
  no_verified_email: "No verified email found. Please verify your email with the provider first",
};

// Component that uses useSearchParams - must be wrapped in Suspense
function AuthErrorHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    const provider = searchParams.get("provider");

    if (error) {
      let message = errorMessages[error] || "Authentication failed. Please try again.";

      if (error === "email_exists_different_provider" && provider) {
        message = `This email is already registered with ${provider}. Please use ${provider} to login.`;
      }

      toast.error(message);
      window.history.replaceState({}, "", "/auth");
    }
  }, [searchParams]);

  return null;
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="grid min-h-svh lg:grid-cols-2 relative">
      <div className="bg-black relative hidden lg:block overflow-hidden">
        {/* Halftone Image Background */}
        <HalftoneImage
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop"
          alt="Abstract geometric shapes"
          className="absolute inset-0"
        />

        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/50" />

        {/* Smooth blend to right side */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/50" />

        {/* Branding text at bottom */}
        <div className="absolute bottom-8 left-8 right-8 z-10">
          <h2 className="text-white text-3xl font-bold mb-2">
            Design without limits
          </h2>
          <p className="text-white/70 text-sm max-w-md">
            Create stunning visuals with our intuitive design platform. Your
            imagination is the only boundary.
          </p>
        </div>
      </div>
      <div className="relative flex flex-col gap-4 p-6 px-10 overflow-hidden">
        <Noise />
        <div className="relative z-10 flex justify-center gap-2 md:justify-end">
          <Logo />
        </div>
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {isLogin ? (
              <LoginForm onSwitchToSignup={() => setIsLogin(false)} />
            ) : (
              <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
            )}
          </div>
        </div>
      </div>
      <div className="absolute">
        <Toaster position="top-center" />
      </div>
      {/* Suspense boundary for useSearchParams */}
      <Suspense fallback={null}>
        <AuthErrorHandler />
      </Suspense>
    </div>
  );
}
