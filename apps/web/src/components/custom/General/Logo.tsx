"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useIsOnDark } from "@/hooks/useIsOnDark";

const Logo = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const isOnDark = useIsOnDark();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className="flex items-center gap-1.5 px-1 pt-1.5 cursor-pointer opacity-[0.85] hover:opacity-100 transition-all"
      onClick={() => router.push("/")}
    >
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
      <span
        className={`text-sm font-semibold tracking-wide transition-colors duration-300 ${
          isOnDark ? "text-white" : "text-foreground"
        }`}
      >
        Melina Studio
      </span>
    </div>
  );
};

export default Logo;
