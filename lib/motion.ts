import type { Transition, Variants } from "motion/react";

/*
 * Shared spring presets and durations (PRD Section 7). Every animated
 * component imports from here so the motion feels related.
 *
 * Rules: animate transform and opacity only, never width/height/top;
 * every consumer must degrade to plain fades under prefers-reduced-motion.
 * Client components only.
 */

export const springs = {
  snappy: { type: "spring", stiffness: 400, damping: 30 },
  soft: { type: "spring", stiffness: 260, damping: 24 },
  gentle: { type: "spring", stiffness: 170, damping: 20 },
} satisfies Record<string, Transition>;

export const durations = {
  fast: 0.25,
  sheet: 0.35,
  reveal: 0.5,
  max: 0.7, // total entrance for any section stays under 700 ms
} satisfies Record<string, number>;

/** Sections fade and rise 16 px once. Reduced motion swaps in a plain fade. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/** Menu card hover: lift 6 px on a spring (PRD Section 7). */
export const cardHover = { y: -6 } as const;

/** Image zoom inside the overflow-hidden mask. */
export const imageHover = { scale: 1.06 } as const;

/** Cursor tilt ceiling, degrees. */
export const tiltMax = 5 as const;

/** Stagger between list items: 40 ms or less (PRD motion rules). */
export const stagger = 0.04 as const;
