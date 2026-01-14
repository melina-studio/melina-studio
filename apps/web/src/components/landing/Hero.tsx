"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ArrowRight, Github } from "lucide-react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

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

      // 4. Then buttons
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
            className="block text-[45vw] md:text-[35vw] lg:text-[30vw] font-black whitespace-nowrap select-none tracking-tighter blur-[1px]"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.03) 20%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 80%, transparent 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            CURSOR
          </span>
        </div>
        {/* Second layer - offset, even more abstract */}
        <div className="absolute top-[60%] left-1/2 -translate-x-[40%] -translate-y-1/2">
          <span
            className="block text-[40vw] md:text-[32vw] lg:text-[28vw] font-black whitespace-nowrap select-none tracking-tighter blur-[2px]"
            style={{
              background:
                "linear-gradient(180deg, transparent 10%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.03) 60%, transparent 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            CANVAS
          </span>
        </div>
        {/* Soft edge masks */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background opacity-50" />
      </div>

      {/* Light rays background */}
      <div className="absolute inset-0 h-screen opacity-40">
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

            {/* CTA - more vertical space */}
            <div className="hero-cta flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/playground/all">
                <Button
                  size="lg"
                  className="text-md px-8 py-6 rounded-md group cursor-pointer w-[150px] font-semibold"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-md px-8 py-6 rounded-md font-semibold group cursor-pointer border border-white/50 hover:border-white/20 hover:bg-transparent backdrop-blur-sm text-white/70 hover:text-white/80 w-[150px]"
                >
                  <Github className="mr-2 h-4 w-4" />
                  GitHub
                </Button>
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
            <div className="absolute inset-0">
              <ModelViewer autoRotate />
            </div>
            {/* Subtle vignette overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.1)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.3)_100%)]" />
          </div>
        </div>
      </ContainerScroll>
    </section>
  );
}
