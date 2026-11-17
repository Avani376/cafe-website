import fs from "node:fs";
import path from "node:path";
import menuJson from "@/content/menu.json";
import siteJson from "@/content/site.json";

/*
 * Server-side content loaders. Menu, hours, copy and links come from
 * /content only - components never hard-code them (working rule 4).
 * These helpers use fs and must not be imported from client components.
 */

export type Diet = "veg" | "non-veg";

export interface MenuOption {
  id: string;
  label: string;
  price: number; // rupees
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number; // rupees
  image: string;
  diet: Diet[];
  tags: string[];
  available: boolean;
  pairsWith?: string[];
  options: MenuOption[];
}

export interface Menu {
  categories: string[];
  items: MenuItem[];
}

export interface LinkItem {
  type: string;
  label: string;
  url: string;
}

export interface Site {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  mapUrl: string;
  timezone: string;
  hours: Record<string, [string, string][]>;
  links: { cafe: LinkItem[]; owner: LinkItem[] };
}

export function getMenu(): Menu {
  // JSON imports are validated by resolveJsonModule; shape is trusted from the
  // owner's file. Ranges/format errors surface in hours/pricing with clear errors.
  return menuJson as unknown as Menu;
}

export function getSite(): Site {
  return siteJson as unknown as Site;
}

/** Parsed copy.md entries: `key: value` lines, comments start with // or #. */
export function getCopy(): Record<string, string> {
  const raw = fs.readFileSync(path.join(process.cwd(), "content", "copy.md"), "utf8");
  const copy: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf(":");
    if (sep === -1) continue;
    copy[trimmed.slice(0, sep).trim()] = trimmed.slice(sep + 1).trim();
  }
  return copy;
}

/** True when the item's photo file actually exists under /public. Missing photos render as flat theme placeholders (PRD Section 5.9). */
export function menuImageExists(item: MenuItem): boolean {
  if (!item.image) return false;
  const filePath = path.join(process.cwd(), "public", item.image.replace(/^\//, ""));
  return fs.existsSync(filePath);
}
