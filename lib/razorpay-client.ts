"use client";

/*
 * Client-side loader for the Razorpay Checkout script (PRD Section 6.5).
 * Loads on demand, once. If the script fails to load (blocked, offline),
 * the cart offers Pay at counter instead (PRD Section 10, Resilience).
 */

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loadPromise: Promise<boolean> | null = null;

export function loadRazorpayCheckout(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      loadPromise = null; // allow a retry on the next attempt
      resolve(false);
    };
    document.head.appendChild(script);
    // Hard timeout: a hung network must not freeze the checkout button.
    window.setTimeout(() => resolve(Boolean(window.Razorpay)), 10000);
  });
  return loadPromise;
}
