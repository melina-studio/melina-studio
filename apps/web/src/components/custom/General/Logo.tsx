"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

const Logo = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className="flex items-center gap-1 px-1 pt-1.5 cursor-pointer opacity-[0.85] hover:opacity-100 transition-opacity"
      onClick={() => router.push("/playground/all")}
    >
      <Image
        src={
          mounted && theme === "dark"
            ? "/icons/logo-dark.svg"
            : "/icons/logo.svg"
        }
        alt="Melina Studio"
        width={18}
        height={18}
        className="size-[18px] mr-1"
      />
      <span className="text-sm font-medium text-foreground/80 tracking-wide">
        Melina Studio
      </span>
    </div>
  );
};

export default Logo;
