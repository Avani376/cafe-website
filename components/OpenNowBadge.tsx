"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Site } from "@/lib/content";
import { openNowStatus, type OpenNow } from "@/lib/hours";

/*
 * Open now / Closed badge computed from /content/site.json hours in the
 * cafe's timezone (PRD Section 6.1). Computed on the client only - the
 * server's clock and zone must not influence the label. The dot pulses
 * slowly only while open (PRD Section 7), disabled under reduced motion.
 */
export function OpenNowBadge({ site }: { site: Site }) {
  const [status, setStatus] = useState<OpenNow | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const update = () => setStatus(openNowStatus(site, new Date()));
    // First evaluation goes through a timer so the effect body itself never
    // calls setState synchronously.
    const initial = setTimeout(update, 0);
    const timer = setInterval(update, 60_000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [site]);

  const open = status?.open ?? false;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-muted/30 bg-surface px-3 py-1 text-sm text-muted">
      <motion.span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${status === null ? "bg-muted/40" : open ? "bg-success" : "bg-danger"}`}
        animate={open && status !== null && !reduce ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
        transition={
          open && status !== null && !reduce
            ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
            : undefined
        }
      />
      <span className="tabular-nums" suppressHydrationWarning>
        {status?.label ?? ""}
      </span>
    </span>
  );
}
