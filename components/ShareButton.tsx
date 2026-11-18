"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/*
 * Share button (PRD Section 8.7): Web Share API when the platform supports
 * it, with a copy-link fallback and visible confirmation. Copy success is
 * announced with aria-live so screen readers hear it too.
 */
export function ShareButton({ cafeName }: { cafeName: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

  async function handleShare() {
    const shareData = {
      title: cafeName,
      text: `${cafeName} - speciality coffee house`,
      url,
    };
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User dismissed the share sheet - nothing to do.
        return;
      }
    }
    // Fallback: copy the link.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-card border border-muted/40 bg-surface px-5 py-2.5 text-sm text-foreground transition-colors hover:border-foreground"
    >
      {copied ? (
        <Check className="h-4 w-4 text-success" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Share2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      )}
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}
