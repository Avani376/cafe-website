import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import "./globals.css";

/*
 * TODO(theme): this pairing is provisional because design/theme.png is
 * missing from the repo. Swap the families here (and in design/tokens.md and
 * app/globals.css) once the owner confirms the real theme. Both fonts are
 * loaded with next/font and exposed as CSS variables that the Tailwind theme
 * maps to the font-display and font-body utilities.
 */
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const body = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

// TODO(content): the cafe name and description come from the owner
// (PRD Section 14). Placeholder text here is not the final brand voice.
export const metadata: Metadata = {
  title: "Cafe - foundation build",
  description:
    "Foundation build (Phase 0). Real copy, menu, hours and photos arrive from /content in later phases.",
};

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
