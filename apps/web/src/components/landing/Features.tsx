"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  MessageSquare,
  Eye,
  Zap,
  RefreshCw,
  Moon,
  Save,
} from "lucide-react";
import { CometCard } from "@/components/ui/comet-card";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: MessageSquare,
    title: "Talk to Melina",
    description:
      '"Make it blue", "Add a circle" - just tell Melina what you want in plain English.',
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Eye,
    title: "Melina Sees Your Canvas",
    description:
      "Select shapes and ask questions. Melina understands what you're working on.",
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-400",
  },
  {
    icon: Zap,
    title: "Multi-LLM Powered",
    description:
      "Melina works with Claude, GPT-4, Gemini, and Groq. Choose your preferred brain.",
    gradient: "from-yellow-500/20 to-orange-500/20",
    iconColor: "text-yellow-400",
  },
  {
    icon: RefreshCw,
    title: "Real-time Sync",
    description:
      "WebSocket-powered instant updates. See Melina's changes as they happen.",
    gradient: "from-green-500/20 to-emerald-500/20",
    iconColor: "text-green-400",
  },
  {
    icon: Moon,
    title: "Dark Mode",
    description:
      "Beautiful in any lighting. Melina adapts to your system preference.",
    gradient: "from-indigo-500/20 to-violet-500/20",
    iconColor: "text-indigo-400",
  },
  {
    icon: Save,
    title: "Auto-save",
    description:
      "Never lose your work. Melina automatically saves your canvas as you create.",
    gradient: "from-rose-500/20 to-red-500/20",
    iconColor: "text-rose-400",
  },
];

export default function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".feature-card", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
        y: 60,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: "power3.out",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="features" ref={sectionRef} data-theme="dark" className="py-24 px-6 bg-gradient-to-b from-zinc-900 via-black to-zinc-900">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Everything Melina can do for you
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Powerful features that make designing with Melina effortless.
          </p>
        </div>

        {/* Clean 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <CometCard
              key={index}
              className="feature-card"
              rotateDepth={10}
              translateDepth={12}
            >
              <div
                className="relative p-6 rounded-2xl border border-white/10 backdrop-blur-sm h-full min-h-[200px] flex flex-col"
                style={{
                  background: `linear-gradient(135deg, rgba(30, 30, 35, 0.9) 0%, rgba(20, 20, 25, 0.95) 100%)`,
                }}
              >
                {/* Gradient overlay */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-30`}
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full">
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 ${feature.iconColor} mb-4 shrink-0`}
                  >
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Subtle corner accent */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/5 to-transparent rounded-tr-2xl" />
              </div>
            </CometCard>
          ))}
        </div>
      </div>
    </section>
  );
}
