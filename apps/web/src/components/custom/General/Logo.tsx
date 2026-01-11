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
      className="flex items-center gap-1 pt-1.5 cursor-pointer opacity-[0.85] hover:opacity-100 transition-opacity"
      onClick={() => router.push("/playground/all")}
    >
      <Image
        src={mounted && theme === "dark" ? "/logo-dark.svg" : "/logo.svg"}
        alt="Melina Studio"
        width={30}
        height={30}
        className="size-[30px]"
      />
      <span className="text-sm font-medium text-foreground/80 tracking-wide">
        Melina Studio
      </span>
    </div>
  );
};

export default Logo;
