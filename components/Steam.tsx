"use client";

import { motion, useReducedMotion } from "motion/react";

/*
 * Subtle steam rising over the hero cup illustration (PRD Section 6.2).
 * Looping SVG path motion at very low opacity, transform/opacity only,
 * replaced by a static faint mark under reduced motion.
 */
export function Steam({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const wisps = [0, 1, 2];
  return (
    <svg viewBox="0 0 48 56" className={className} aria-hidden="true" fill="none">
      {wisps.map((i) => (
        <motion.path
          key={i}
          d={`M${14 + i * 10} 46 C ${10 + i * 10} 38, ${18 + i * 10} 32, ${14 + i * 10} 24`}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          initial={reduce ? { opacity: 0.22 } : { opacity: 0, y: 5 }}
          animate={
            reduce ? { opacity: 0.22 } : { opacity: [0, 0.3, 0], y: [5, -1, -7], x: [0, 1.5, -1] }
          }
          transition={
            reduce
              ? undefined
              : { duration: 3.6, repeat: Infinity, delay: i * 1.1, ease: "easeInOut" }
          }
        />
      ))}
      {/* cup silhouette */}
      <path
        d="M10 50 h28 v3 a4 4 0 0 1 -4 4 h-20 a4 4 0 0 1 -4 -4 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M38 52 h4 a4 4 0 0 0 0 -8 h-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
