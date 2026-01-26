"use client";

import { motion } from "motion/react";

export default function PlaygroundTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1], // Smooth easeOut
      }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}
