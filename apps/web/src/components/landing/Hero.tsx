"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Github } from "lucide-react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import Image from "next/image";
import { useTheme } from "next-themes";

// Dynamic imports to avoid SSR issues with WebGL
const ModelViewer = dynamic(
  () => import("@/components/ui/model-viewer").then((mod) => mod.ModelViewer),
  { ssr: false }
);

const LightRays = dynamic(
  () => import("@/blocks/Backgrounds/LightRays/LightRays"),
  { ssr: false }
);

export default function Hero() {
  const headerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Slow, controlled sequence - presence, not bounce
      // 1. "This is Melina" fades in first
      tl.from(".hero-intro", {
        opacity: 0,
        duration: 1.2,
      });

      // 2. Then headline characters
      const chars = document.querySelectorAll(".hero-char");
      tl.from(
        chars,
        {
          opacity: 0,
          y: 40,
          stagger: 0.03,
          duration: 0.8,
        },
        "-=0.4"
      );

      // 3. Then subtitle
      tl.from(
        ".hero-subtitle",
        {
          opacity: 0,
          duration: 1,
        },
        "-=0.3"
      );

      // 4. Then buttons - slide up only to preserve glassy effect
      tl.from(
        ".hero-cta",
        {
          opacity: 0,
          duration: 0.8,
        },
        "-=0.4"
      );

      // Floating orbs animation
      gsap.to(".orb", {
        y: "random(-20, 20)",
        x: "random(-20, 20)",
        duration: "random(3, 5)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: {
          each: 0.5,
          from: "random",
        },
      });
    }, headerRef);

    return () => ctx.revert();
  }, []);

  // Split text into characters for animation
  const titleText = "Cursor for Canvas";
  const titleChars = titleText.split("").map((char, i) => (
    <span
      key={i}
      className="hero-char inline-block"
      style={{ display: char === " " ? "inline" : "inline-block" }}
    >
      {char === " " ? "\u00A0" : char}
    </span>
  ));

  return (
    <section className="relative overflow-hidden">
      {/* Giant ghosted background text - abstract, immersive */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Main text - massive, bleeding off all edges */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span
            className="block text-[45vw] md:text-[35vw] lg:text-[30vw] font-black whitespace-nowrap select-none tracking-tighter"
            style={{
              backgroundImage:
                mounted && theme === "dark"
                  ? "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.2) 80%, transparent 100%)"
                  : "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.2) 80%, transparent 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Melina S
          </span>
        </div>
        {/* Second layer - offset, even more abstract */}
        <div className="absolute top-[60%] left-1/2 -translate-x-[40%] -translate-y-1/2">
          <span
            className="block text-[40vw] md:text-[32vw] lg:text-[28vw] font-black whitespace-nowrap select-none tracking-tighter"
            style={{
              backgroundImage:
                mounted && theme === "dark"
                  ? "linear-gradient(180deg, transparent 10%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.2) 60%, transparent 90%)"
                  : "linear-gradient(180deg, transparent 10%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.2) 60%, transparent 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            tudio
          </span>
        </div>
        {/* Soft edge masks */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background opacity-50" />
      </div>

      {/* Light rays background */}
      <div className="absolute inset-0 h-screen opacity-30">
        <LightRays
          raysColor="#8b5cf6"
          raysOrigin="top-center"
          lightSpread={1.2}
          raysSpeed={0.3}
          rayLength={2}
          fadeDistance={0.8}
          saturation={0.6}
          followMouse={true}
          mouseInfluence={0.03}
        />
      </div>

      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="orb absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="orb absolute top-1/3 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="orb absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Mystery element - Melina's observing presence */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="relative">
          {/* Outer glow - pulsing */}
          <div className="absolute inset-0 w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-b from-violet-500/20 to-transparent blur-3xl animate-pulse" />
          {/* Inner core - subtle */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-b from-violet-400/5 to-transparent blur-2xl" />
        </div>
      </div>

      <ContainerScroll
        titleComponent={
          <div ref={headerRef} className="relative z-10">
            {/* Introduction - intentional, not a label */}
            <div className="hero-intro inline-flex items-center gap-3 mb-8 border border-white/50 dark:border-white/10 rounded-md px-2 py-1 backdrop-blur-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400/60 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-400/80" />
              </span>
              <span className="text-xs text-muted-foreground/60 tracking-[0.1em] uppercase">
                This is Melina
              </span>
            </div>

            {/* Title - with more breathing room */}
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8"
              style={{ perspective: "1000px" }}
            >
              {titleChars}
            </h1>

            {/* Subtitle - confident, not tutorial-ish */}
            <p className="hero-subtitle text-sm md:text-base text-muted-foreground/80 max-w-md mx-auto mb-16 leading-relaxed tracking-[0.1em]">
              Describe your intent. Melina handles the canvas.
            </p>

            {/* CTA */}
            <div className="hero-cta flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/playground/all"
                className="w-[160px] h-12 inline-flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 rounded-xl font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="https://github.com/orgs/melina-studio/repositories"
                target="_blank"
                rel="noopener noreferrer"
                className="w-[160px] h-12 inline-flex items-center justify-center gap-2 bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/20 px-6 rounded-xl font-medium text-black dark:text-white hover:bg-white/90 dark:hover:bg-white/20 transition-colors cursor-pointer"
              >
                {/* <Github className="h-4 w-4" /> */}
                <Image
                  src="/icons/github.svg"
                  alt="GitHub"
                  width={18}
                  height={18}
                  className="size-[18px]"
                />
                GitHub
              </Link>
            </div>
          </div>
        }
      >
        {/* 3D Model Viewer inside the scroll container */}
        <div className="h-full w-full flex flex-col rounded-2xl overflow-hidden">
          {/* Browser chrome */}
          <div className="relative flex items-center px-4 py-3 border-b border-white/10 bg-zinc-900/80">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="px-4 py-1 rounded-md bg-white/5 text-xs text-white/50">
                melina.studio
              </div>
            </div>
          </div>

          {/* 3D Scene with dotted canvas background */}
          <div className="flex-1 relative overflow-hidden bg-white dark:bg-zinc-950">
            {/* Dotted background pattern - like the actual canvas */}
            <div
              className="absolute inset-0 [background-image:radial-gradient(#d4d4d4_1px,transparent_1px)] dark:[background-image:radial-gradient(#404040_1px,transparent_1px)]"
              style={{ backgroundSize: "20px 20px" }}
            />
            {/* 3D shapes */}
            <div
              className="absolute inset-0 transition-transform duration-500 ease-out"
              style={{
                transform: "translateZ(0)",
                isolation: "isolate",
                willChange: "transform",
              }}
            >
              <ModelViewer />
            </div>
            {/* Subtle vignette overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.1)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.3)_100%)]" />
          </div>
        </div>
      </ContainerScroll>
    </section>
  );
}
