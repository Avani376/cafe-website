import type { Metadata } from "next";
import { Playfair_Display, Work_Sans } from "next/font/google";
import { getSite } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
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
  const title = `${site.name} - ${site.tagline}`;
  const description =
    "Speciality coffee, fresh bakes and pickup orders. Menu, hours and directions.";
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    openGraph: {
      title,
      description,
      url: SITE_URL,
      siteName: site.name,
      images: [{ url: "/gallery/hero.jpg", width: 1600, height: 1200 }],
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/gallery/hero.jpg"],
    },
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
