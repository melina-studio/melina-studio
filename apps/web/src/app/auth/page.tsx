"use client";
import Image from "next/image";
import { useState } from "react";

import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";
import { HalftoneImage } from "@/components/ui/HalftoneImage";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import Noise from "@/blocks/Animations/Noise/Noise";
import { Toaster } from "@/components/ui/sonner";

export default function AuthPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <Image
              src={
                mounted && theme === "dark"
                  ? "/icons/logo.svg"
                  : "/icons/logo-dark.svg"
              }
              alt="Melina Studio"
              width={16}
              height={16}
              className="size-[16px]"
            />
          </div>
          Melina Studio
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
    </div>
  );
}
