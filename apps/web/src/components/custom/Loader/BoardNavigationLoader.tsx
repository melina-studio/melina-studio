"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EncryptedText } from "@/components/ui/encrypted-text";
import { Progress } from "@/components/ui/progress";

interface BoardNavigationLoaderProps {
  isVisible: boolean;
  boardTitle?: string;
  /** Minimum time in ms to show the loader (default: 800ms) */
  minDisplayTime?: number;
}

export function BoardNavigationLoader({
  isVisible,
  boardTitle,
  minDisplayTime = 800
}: BoardNavigationLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [shouldRender, setShouldRender] = useState(false);
  const [showStartTime, setShowStartTime] = useState<number | null>(null);

  // Handle visibility with minimum display time
  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setShowStartTime(Date.now());
      setProgress(0);
    } else if (showStartTime) {
      // Calculate remaining time to meet minimum display
      const elapsed = Date.now() - showStartTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsed);

      // Complete the progress bar before hiding
      setProgress(100);

      const hideTimer = setTimeout(() => {
        setShouldRender(false);
        setShowStartTime(null);
      }, remainingTime + 300); // +300ms for the progress bar to complete

      return () => clearTimeout(hideTimer);
    }
  }, [isVisible, showStartTime, minDisplayTime]);

  // Progress animation - spreads progress over ~1500ms to match navigation delay
  useEffect(() => {
    if (!shouldRender || !isVisible) return;

    // Start progress animation
    const timer0 = setTimeout(() => setProgress(10), 50);
    const timer1 = setTimeout(() => setProgress(25), 200);
    const timer2 = setTimeout(() => setProgress(40), 400);
    const timer3 = setTimeout(() => setProgress(55), 600);
    const timer4 = setTimeout(() => setProgress(70), 850);
    const timer5 = setTimeout(() => setProgress(82), 1100);
    const timer6 = setTimeout(() => setProgress(92), 1350);

    return () => {
      clearTimeout(timer0);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
      clearTimeout(timer6);
    };
  }, [shouldRender, isVisible]);

  const displayText = boardTitle || "Opening board...";

  return (
    <AnimatePresence>
      {shouldRender && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
            className="flex flex-col items-center gap-6 p-8"
          >
            <EncryptedText
              text={displayText}
              className="text-md font-semibold text-foreground"
              revealDelayMs={35}
              flipDelayMs={25}
              encryptedClassName="text-muted-foreground/70"
              revealedClassName="text-foreground"
            />
            <div className="w-72">
              <Progress
                value={progress}
                className="h-1 bg-muted/50 [&>[data-slot=progress-indicator]]:transition-all [&>[data-slot=progress-indicator]]:duration-300 [&>[data-slot=progress-indicator]]:ease-out"
              />
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-muted-foreground"
            >
              Please wait...
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
