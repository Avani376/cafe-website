"use client";

import { motion, useReducedMotion } from "motion/react";
import { durations, fadeOnly, fadeUp } from "@/lib/motion";

/*
 * Scroll reveal (PRD Section 7): sections fade and rise 16 px once, never
 * re-triggering. Under prefers-reduced-motion the movement is replaced with
 * a plain fade. Delay is capped at 40 ms steps per the motion rules.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      variants={reduce ? fadeOnly : fadeUp}
      transition={{ duration: reduce ? durations.fast : durations.reveal, delay }}
    >
      {children}
    </motion.div>
  );
}
