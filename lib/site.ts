/*
 * Canonical site URL. Override with NEXT_PUBLIC_SITE_URL when the
 * deployment domain changes (Vercel aliases are stable but renameable).
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cafe-website-murex-seven.vercel.app";
