"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface ThemeSwitchToggleProps {
  isOnDark?: boolean;
}

export function ThemeSwitchToggle({ isOnDark = false }: ThemeSwitchToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);

    // Sync with settings in localStorage
    const settings = localStorage.getItem("settings");
    if (settings) {
      const settingsObj = JSON.parse(settings);
      settingsObj.theme = newTheme;
      localStorage.setItem("settings", JSON.stringify(settingsObj));
    }
  };

  const isDark = theme === "dark";

  if (!mounted) {
    return (
      <div className="w-14 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
    );
  }

  return (
    <button
      onClick={handleToggle}
      className={`
        relative w-14 h-7 rounded-full p-1 transition-colors duration-300 cursor-pointer
        ${isDark
          ? "bg-zinc-800"
          : isOnDark
            ? "bg-white/20"
            : "bg-zinc-200"
        }
        ${isOnDark ? "border border-white/10" : ""}
      `}
      aria-label="Toggle theme"
    >
      {/* Track icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5">
        <Sun
          className={`h-3.5 w-3.5 transition-opacity duration-300 ${
            isDark ? "opacity-30" : "opacity-0"
          } ${isOnDark ? "text-white" : "text-amber-500"}`}
        />
        <Moon
          className={`h-3.5 w-3.5 transition-opacity duration-300 ${
            isDark ? "opacity-0" : "opacity-30"
          } ${isOnDark ? "text-white" : "text-zinc-600"}`}
        />
      </div>

      {/* Sliding knob */}
      <div
        className={`
          relative w-5 h-5 rounded-full shadow-sm transition-all duration-300 ease-out
          flex items-center justify-center
          ${isDark
            ? "translate-x-7 bg-zinc-950"
            : "translate-x-0 bg-white"
          }
        `}
      >
        {isDark ? (
          <Moon className={`h-3 w-3 ${isOnDark ? "text-white" : "text-blue-400"}`} />
        ) : (
          <Sun className={`h-3 w-3 ${isOnDark ? "text-zinc-800" : "text-amber-500"}`} />
        )}
      </div>
    </button>
  );
}
