"use client";

import Link from "next/link";
import { ThemeSwitchToggle } from "@/components/landing/ThemeSwitchToggle";
import { Button } from "@/components/ui/button";
import Logo from "@/components/custom/General/Logo";
import { useIsOnDark } from "@/hooks/useIsOnDark";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const isOnDark = useIsOnDark();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto relative flex items-center justify-between">
        {/* Logo */}
        <Logo />

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
          <Link href="/auth" className="hidden sm:block">
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
