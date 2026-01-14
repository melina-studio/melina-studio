"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

export default function Demo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const fullText = "Draw a flowchart for user authentication";

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top 80%",
        onEnter: () => {
          let i = 0;
          const typeInterval = setInterval(() => {
            if (i <= fullText.length) {
              setDisplayedText(fullText.slice(0, i));
              i++;
            } else {
              clearInterval(typeInterval);
              setIsTypingComplete(true);
            }
          }, 40);
        },
        once: true,
      });

      // Animate the mockup
      gsap.from(".demo-mockup", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
        },
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-6 bg-muted/5">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            See Melina in action
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tell Melina what you want, watch her create it
          </p>
        </div>

        {/* Demo container */}
        <div className="demo-mockup relative rounded-2xl overflow-hidden border border-border/50 bg-background shadow-2xl">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="px-4 py-1 rounded-md bg-background/50 text-xs text-muted-foreground">
                melina.studio/playground
              </div>
            </div>
          </div>

          {/* App interface */}
          <div className="flex flex-col lg:flex-row h-auto lg:h-[600px]">
            {/* Sidebar - hidden on mobile */}
            <div className="hidden lg:flex w-16 border-r border-border/50 flex-col items-center py-4 gap-4 bg-muted/20">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </div>
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Canvas area */}
            <div className="flex-1 relative bg-[radial-gradient(circle_at_1px_1px,_rgba(0,0,0,0.05)_1px,_transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.05)_1px,_transparent_0)] bg-[length:24px_24px] min-h-[350px] lg:min-h-0">
              {/* Animated shapes - responsive positioning */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isTypingComplete ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="absolute top-6 lg:top-12 left-1/2 -translate-x-1/2 px-6 lg:px-8 py-2 lg:py-3 rounded-full bg-green-500/20 border-2 border-green-500/50"
              >
                <span className="text-green-500 dark:text-green-400 font-medium text-xs lg:text-sm">Start</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isTypingComplete ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="absolute top-20 lg:top-32 left-1/2 -translate-x-1/2 px-6 lg:px-10 py-3 lg:py-4 rounded-lg bg-blue-500/20 border-2 border-blue-500/50"
              >
                <span className="text-blue-500 dark:text-blue-400 font-medium text-xs lg:text-sm">Login Form</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isTypingComplete ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="absolute top-40 lg:top-56 left-1/2 -translate-x-1/2 w-16 h-16 lg:w-24 lg:h-24 rotate-45 bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center"
              >
                <span className="text-yellow-500 dark:text-yellow-400 font-medium text-[10px] lg:text-xs -rotate-45">Valid?</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isTypingComplete ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute bottom-16 lg:bottom-32 left-4 lg:left-1/4 px-4 lg:px-6 py-2 lg:py-3 rounded-lg bg-green-500/20 border-2 border-green-500/50"
              >
                <span className="text-green-500 dark:text-green-400 font-medium text-xs lg:text-sm">Dashboard</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isTypingComplete ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute bottom-16 lg:bottom-32 right-4 lg:right-1/4 px-4 lg:px-6 py-2 lg:py-3 rounded-lg bg-red-500/20 border-2 border-red-500/50"
              >
                <span className="text-red-500 dark:text-red-400 font-medium text-xs lg:text-sm">Error</span>
              </motion.div>

              {/* Connection lines - hidden on mobile for cleaner look */}
              {isTypingComplete && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block">
                  <motion.line
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    x1="50%"
                    y1="70"
                    x2="50%"
                    y2="120"
                    stroke="rgba(128,128,128,0.3)"
                    strokeWidth="2"
                  />
                  <motion.line
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 1.4, duration: 0.5 }}
                    x1="50%"
                    y1="170"
                    x2="50%"
                    y2="220"
                    stroke="rgba(128,128,128,0.3)"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </div>

            {/* Chat sidebar - stacks below on mobile */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border/50 flex flex-col bg-muted/10">
              <div className="p-3 lg:p-4 border-b border-border/50">
                <h3 className="font-semibold text-sm">Chat with Melina</h3>
              </div>
              <div className="flex-1 p-3 lg:p-4 overflow-hidden min-h-[100px] lg:min-h-0">
                {/* AI response */}
                {isTypingComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                    className="flex gap-3 mb-4"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">M</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Melina</p>
                      <p className="text-sm">I&apos;ve created a flowchart with the authentication flow. You can drag the shapes to rearrange them.</p>
                    </div>
                  </motion.div>
                )}
              </div>
              {/* Chat input */}
              <div className="p-3 lg:p-4 border-t border-border/50">
                <div className="flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-3 rounded-lg bg-background border border-border/50">
                  <span className="text-xs lg:text-sm text-foreground truncate">{displayedText}</span>
                  <span className="w-0.5 h-4 bg-primary animate-pulse shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
