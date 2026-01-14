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
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      // Animate title characters
      const chars = document.querySelectorAll(".hero-char");
      tl.from(chars, {
        opacity: 0,
        y: 100,
        rotateX: -90,
        stagger: 0.02,
        duration: 1,
      });

      // Animate subtitle
      tl.from(
        ".hero-subtitle",
        {
          opacity: 0,
          y: 30,
          duration: 0.8,
        },
        "-=0.5"
      );

      // Animate CTA
      tl.from(
        ".hero-cta",
        {
          opacity: 0,
          y: 20,
          duration: 0.6,
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

      <ContainerScroll
        titleComponent={
          <div ref={headerRef} className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-sm text-muted-foreground">
                Meet Melina, your design assistant
              </span>
            </div>

            {/* Title */}
            <h1
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
              style={{ perspective: "1000px" }}
            >
              {titleChars}
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Just describe what you want and watch Melina bring your ideas to life on the canvas.
            </p>

            {/* CTA */}
            <div className="hero-cta flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/playground/all">
                <Button
                  size="lg"
                  className="text-md px-8 py-6 rounded-md group cursor-pointer w-[150px]"
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
                  variant="secondary"
                  className="text-md px-8 py-6 rounded-md group cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-white w-[150px]"
                >
                  <Github className="mr-2 h-5 w-5" />
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
