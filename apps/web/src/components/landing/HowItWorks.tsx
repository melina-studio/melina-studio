"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { PenTool, MousePointer, MessageCircle } from "lucide-react";

const steps = [
  {
    id: 1,
    title: "DRAW",
    icon: PenTool,
    headline: "Create your canvas",
    description:
      "Draw shapes, add text, sketch freely. Build your ideas visually with intuitive tools that feel natural.",
    // Unique card content
    cardContent: "shapes",
  },
  {
    id: 2,
    title: "SELECT",
    icon: MousePointer,
    headline: "Select what matters",
    description:
      "Click on any shape to select it. Melina sees exactly what you're working on and understands the context.",
    cardContent: "selection",
  },
  {
    id: 3,
    title: "ASK",
    icon: MessageCircle,
    headline: "Tell Melina what you want",
    description:
      '"Make this into a flowchart" or "Change colors to blue" — just tell Melina and watch her work.',
    cardContent: "chat",
  },
];

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.6", "end end"], // Start earlier when section is 80% into view
  });

  return (
    <section
      id="how-it-works"
      ref={containerRef}
      data-theme="dark"
      className="relative bg-gradient-to-b from-zinc-900 via-black to-zinc-950 min-h-[250vh]"
    >
      {/* Sticky container */}
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left side - Stacking cards */}
          <div className="relative h-[400px] lg:h-[500px] flex items-center justify-center perspective-[1000px]">
            {steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                progress={scrollYProgress}
                total={steps.length}
              />
            ))}
          </div>

          {/* Right side - Text content */}
          <div className="relative h-[300px] flex items-center">
            {steps.map((step, index) => (
              <StepContent
                key={step.id}
                step={step}
                index={index}
                progress={scrollYProgress}
                total={steps.length}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  step,
  index,
  progress,
  total,
}: {
  step: (typeof steps)[0];
  index: number;
  progress: any;
  total: number;
}) {
  const segmentSize = 1 / total;
  const start = index * segmentSize;

  // Card slides up from bottom and stacks - newer cards on TOP
  const y = useTransform(
    progress,
    [start, start + segmentSize * 0.5],
    [200, index * -35] // Stack upward, each card offset
  );

  const opacity = useTransform(
    progress,
    [start, start + segmentSize * 0.3],
    [0, 1]
  );

  const scale = useTransform(
    progress,
    [start, start + segmentSize * 0.5],
    [0.85, 1]
  );

  const rotateX = useTransform(
    progress,
    [start, start + segmentSize * 0.5],
    [35, 12]
  );

  return (
    <motion.div
      style={{
        y,
        opacity,
        scale,
        rotateX,
        zIndex: index + 1, // Latest card (higher index) on top
      }}
      className="absolute w-full max-w-[320px] lg:max-w-[380px]"
    >
      <div
        className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/95 to-zinc-950 p-6 lg:p-8 backdrop-blur-sm"
        style={{
          transformStyle: "preserve-3d",
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        {/* Card header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
            <step.icon className="w-5 h-5 text-white/80" />
          </div>
          <span className="text-white/50 text-sm font-medium tracking-widest">
            {step.title}
          </span>
        </div>

        {/* Unique card content based on step */}
        <CardContent type={step.cardContent} />

        {/* Step number badge */}
        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-black text-sm font-bold flex items-center justify-center shadow-lg">
          {step.id}
        </div>
      </div>
    </motion.div>
  );
}

function CardContent({ type }: { type: string }) {
  if (type === "shapes") {
    // Draw step - show various shapes
    return (
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-lg border-2 border-blue-500/50 bg-blue-500/10" />
          <div className="w-16 h-16 rounded-full border-2 border-purple-500/50 bg-purple-500/10" />
          <div className="w-16 h-10 rounded border-2 border-green-500/50 bg-green-500/10" />
        </div>
        <div className="flex gap-3">
          <div className="w-24 h-8 rounded border-2 border-yellow-500/50 bg-yellow-500/10" />
          <div className="w-12 h-12 rotate-45 border-2 border-pink-500/50 bg-pink-500/10" />
        </div>
        <div className="h-0.5 w-full bg-gradient-to-r from-white/20 via-white/10 to-transparent mt-2" />
      </div>
    );
  }

  if (type === "selection") {
    // Select step - show selection UI
    return (
      <div className="space-y-3">
        <div className="flex gap-3 items-center">
          <div className="relative w-20 h-20 rounded-lg border-2 border-primary bg-primary/10">
            {/* Selection handles */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white rounded-sm" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white rounded-sm" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white rounded-sm" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white rounded-sm" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-3 w-full bg-white/10 rounded" />
            <div className="h-3 w-3/4 bg-white/10 rounded" />
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="px-2 py-1 text-xs bg-white/10 rounded text-white/50">
            Selected: Rectangle
          </div>
        </div>
      </div>
    );
  }

  if (type === "chat") {
    // Ask step - show chat interface
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">M</span>
          </div>
          <div className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/70">
              Done! I&apos;ve converted your shapes into a flowchart.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <div className="p-2 rounded-lg bg-primary/20 border border-primary/30 max-w-[80%]">
            <p className="text-xs text-white/80">
              &quot;Make this a flowchart&quot;
            </p>
          </div>
          <div className="w-6 h-6 rounded-full bg-white/20" />
        </div>
      </div>
    );
  }

  return null;
}

function StepContent({
  step,
  index,
  progress,
  total,
}: {
  step: (typeof steps)[0];
  index: number;
  progress: any;
  total: number;
}) {
  const segmentSize = 1 / total;
  const start = index * segmentSize;
  const end = (index + 1) * segmentSize;

  // For the last step, keep it visible
  const opacity = useTransform(
    progress,
    index === total - 1
      ? [start, start + segmentSize * 0.3]
      : [start, start + segmentSize * 0.3, end - segmentSize * 0.2, end],
    index === total - 1 ? [0, 1] : [0, 1, 1, 0]
  );

  const y = useTransform(
    progress,
    index === total - 1
      ? [start, start + segmentSize * 0.4]
      : [start, start + segmentSize * 0.4, end - segmentSize * 0.3, end],
    index === total - 1 ? [30, 0] : [30, 0, 0, -30]
  );

  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-0 flex flex-col justify-center"
    >
      <span className="text-white/40 text-sm font-medium tracking-[0.3em] mb-4">
        STEP {step.id}
      </span>
      <h3 className="text-3xl lg:text-5xl font-bold text-white mb-6">
        {step.headline}
      </h3>
      <p className="text-lg lg:text-xl text-white/60 leading-relaxed max-w-md">
        {step.description}
      </p>
    </motion.div>
  );
}
