"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Menu as MenuIcon, ShoppingBag, X } from "lucide-react";
import { useCart, useCartCount } from "@/lib/cart-store";
import { durations, fadeOnly, springs } from "@/lib/motion";
import type { Site } from "@/lib/content";
import { OpenNowBadge } from "./OpenNowBadge";

/*
 * Sticky header (PRD Section 6.1): logo, anchors, always-reachable cart
 * button with an item count badge. After 40 px scroll it gains a thin border
 * and a translucent surface - the single translucent surface allowed by the
 * anti-slop rules. The full-screen sheet covers mobile navigation.
 * Header shrink/border is a CSS state change, not a Framer animation, so
 * no layout properties are animated by JS.
 */

const NAV_ITEMS = [
  { href: "#menu", label: "Menu" },
  { href: "#about", label: "About" },
  { href: "#visit", label: "Visit" },
  { href: "#feedback", label: "Feedback" },
];

export function Header({ site }: { site: Site }) {
  const [scrolled, setScrolled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const count = useCartCount();
  const openDrawer = useCart((s) => s.openDrawer);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    // Initial check deferred so the effect body never calls setState directly.
    const initial = setTimeout(onScroll, 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(initial);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,border-color] duration-300 ${
        scrolled
          ? "border-b border-muted/20 bg-background/90 backdrop-blur-sm"
          : "border-b border-transparent bg-background"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 transition-[padding] duration-300 ${
          scrolled ? "py-2" : "py-4"
        }`}
      >
        <a href="#top" className="font-display text-lg text-foreground">
          {site.name}
        </a>

        <nav aria-label="Sections" className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden sm:block">
            <OpenNowBadge site={site} />
          </span>

          <button
            type="button"
            onClick={() => openDrawer()}
            aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
            className="relative rounded-card border border-muted/30 bg-surface p-2 text-foreground transition-colors hover:border-foreground"
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            {count > 0 && (
              <motion.span
                key={count}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springs.snappy}
                className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs text-surface"
              >
                {count}
              </motion.span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Open navigation"
            className="rounded-card border border-muted/30 bg-surface p-2 text-foreground md:hidden"
          >
            <MenuIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: durations.sheet }}
            className="fixed inset-0 z-50 flex flex-col bg-background px-6 py-6 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-lg">{site.name}</span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close navigation"
                className="rounded-card border border-muted/30 bg-surface p-2"
              >
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            <motion.nav
              aria-label="Sections"
              className="mt-10 flex flex-col gap-2"
              variants={fadeOnly}
              initial="hidden"
              animate="visible"
            >
              {NAV_ITEMS.map((item, i) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  onClick={() => setSheetOpen(false)}
                  className="rounded-card px-3 py-4 font-display text-2xl text-foreground hover:bg-surface"
                  variants={fadeOnly}
                  transition={{ duration: durations.fast, delay: i * 0.04 }}
                >
                  {item.label}
                </motion.a>
              ))}
            </motion.nav>
            <div className="mt-auto">
              <OpenNowBadge site={site} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
