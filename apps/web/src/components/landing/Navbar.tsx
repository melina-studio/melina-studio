"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ThemeSwitchToggle } from "@/components/landing/ThemeSwitchToggle";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [isOnDark, setIsOnDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Get all dark sections
      const darkSections = document.querySelectorAll('[data-theme="dark"]');
      const navbarHeight = 80; // Approximate navbar height

      let onDarkSection = false;

      darkSections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        // Check if navbar is overlapping this dark section
        if (rect.top < navbarHeight && rect.bottom > 0) {
          onDarkSection = true;
        }
      });

      setIsOnDark(onDarkSection);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial state

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto relative flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 z-10">
          <div className="flex items-center gap-1 px-1 pt-1.5 cursor-pointer opacity-[0.85] hover:opacity-100 transition-all">
            <Image
              src={
                mounted && (theme === "dark" || isOnDark)
                  ? "/icons/logo-dark.svg"
                  : "/icons/logo.svg"
              }
              alt="Melina Studio"
              width={18}
              height={18}
              className="size-[18px] mr-1"
            />
            <span
              className={`text-sm font-semibold tracking-wide transition-colors duration-300 ${
                isOnDark ? "text-white" : "text-foreground"
              }`}
            >
              Melina Studio
            </span>
          </div>
        </Link>

        {/* Center Navigation - Absolutely positioned for true center */}
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`text-sm font-medium transition-colors duration-300 hover:opacity-100 whitespace-nowrap ${
                isOnDark
                  ? "text-white/70 hover:text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 z-10">
          <ThemeSwitchToggle isOnDark={isOnDark} />
          <Link href="/login" className="hidden sm:block">
            <Button
              variant="ghost"
              className={`text-sm font-medium cursor-pointer ${
                isOnDark
                  ? "text-white/80 hover:text-white hover:bg-white/10"
                  : ""
              }`}
            >
              Log in
            </Button>
          </Link>
          <Link href="/playground/all">
            <Button
              className={`text-sm font-medium cursor-pointer ${
                isOnDark ? "bg-white text-black hover:bg-white/90" : ""
              }`}
            >
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
