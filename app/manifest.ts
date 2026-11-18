import type { MetadataRoute } from "next";

/*
 * PWA manifest (PRD Section 8.9): installable on the home screen. Colors
 * mirror the theme tokens in app/globals.css (documented in
 * design/tokens.md) - manifest metadata is config, not component styling.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ember & Ink - Speciality coffee house",
    short_name: "Ember & Ink",
    description: "Speciality coffee, menu and pickup orders.",
    start_url: "/",
    display: "standalone",
    background_color: "#0e1618",
    theme_color: "#0e1618",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
