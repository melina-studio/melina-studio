"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="relative bg-zinc-950 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and tagline */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/icons/logo-dark.svg"
                alt="Melina Studio"
                width={18}
                height={18}
                className="size-[18px]"
              />
              <span className="text-sm font-semibold text-white tracking-wide">
                Melina Studio
              </span>
            </Link>
            <p className="text-sm text-zinc-500">Your design assistant</p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8">
            <Link
              href="/playground/all"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="#features"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Features
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-500">
            &copy; {new Date().getFullYear()} Melina Studio. All rights
            reserved.
          </p>
          <p className="text-sm text-zinc-500">
            Built with <span className="text-red-500">&hearts;</span>
          </p>
        </div>

        {/* Easter egg */}
        <p className="text-center mt-6 text-[10px] text-zinc-700 italic">
          Melina is always watching the canvas.
        </p>
      </div>

      {/* Large watermark text */}
      <div className="w-full flex justify-center translate-y-[20%]">
        <span
          className="text-[16vw] md:text-[15vw] sm:text-[12vw] font-black select-none whitespace-nowrap tracking-tighter"
          style={{
            background:
              "linear-gradient(to bottom, #52525b 0%, #3f3f46 40%, #27272a 70%, #18181b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Melina-Studio
        </span>
      </div>
    </footer>
  );
}
