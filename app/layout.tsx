import type { Metadata } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import { getSite } from "@/lib/content";
import "./globals.css";

/*
 * Theme v1 "Paper & Espresso" pairing: Fraunces for display (warm, slightly
 * wonky serif that suits a specialty cafe) and Work Sans for body text
 * (humanist, highly legible). Both are loaded with next/font and exposed as
 * CSS variables that the Tailwind theme maps to the font-display and
 * font-body utilities. To change the pairing, edit here, the fallback
 * stacks in app/globals.css, and design/tokens.md.
 */
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
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
