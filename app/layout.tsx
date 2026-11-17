import type { Metadata } from "next";
import { Playfair_Display, Work_Sans } from "next/font/google";
import { getSite } from "@/lib/content";
import "./globals.css";

/*
 * Theme v2 "Ember After Dark" pairing, matching the owner's reference:
 * Playfair Display for display (high-contrast elegant serif, carries the
 * fine-dining tone) and Work Sans for body text (humanist, legible on
 * mobile). Both are loaded with next/font and exposed as CSS variables that
 * the Tailwind theme maps to the font-display and font-body utilities. To
 * change the pairing, edit here, the fallback stacks in app/globals.css,
 * and design/tokens.md.
 */
const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const body = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
});

// TODO(content): the cafe name and description come from /content
// (PRD Section 14). Placeholder text here is not the final brand voice.
export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: `${site.name} - ${site.tagline}`,
    description: "Cafe menu, online orders and pickup. Built phase by phase.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="bg-background font-body text-foreground antialiased">{children}</body>
    </html>
  );
}
