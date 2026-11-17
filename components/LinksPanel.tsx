import { MapPin } from "lucide-react";
import type { LinkItem, Site } from "@/lib/content";

/*
 * Links panel (PRD Section 6.6): two clearly labeled groups from
 * /content/site.json, each link one click, new tab with
 * rel="noopener noreferrer". Lucide no longer ships brand icons, so social
 * marks are small custom SVGs at the same 1.75 visual weight (anti-slop
 * rule 4 allows custom SVG); functional icons stay Lucide.
 */

function BrandIcon({ type }: { type: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (type === "instagram") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === "facebook") {
    return (
      <svg {...common}>
        <path d="M14 3h-2.5A3.5 3.5 0 0 0 8 6.5V9H6v4h2v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h2Z" />
      </svg>
    );
  }
  if (type === "linkedin") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M8 10.5V17" />
        <circle cx="8" cy="7.6" r="0.9" fill="currentColor" stroke="none" />
        <path d="M12 17v-4a2.5 2.5 0 0 1 5 0v4" />
        <path d="M12 10.5V17" />
      </svg>
    );
  }
  if (type === "x") {
    return (
      <svg {...common}>
        <path d="M4 4l16 16" />
        <path d="M20 4L4 20" />
      </svg>
    );
  }
  if (type === "whatsapp") {
    return (
      <svg {...common}>
        <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3Z" />
        <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-2-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2Z" />
      </svg>
    );
  }
  return null;
}

function LinkIcon({ type }: { type: string }) {
  if (type === "maps") return <MapPin className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />;
  const brand = BrandIcon({ type });
  if (brand) return <span className="flex h-4 w-4 items-center justify-center">{brand}</span>;
  return <MapPin className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />;
}

function LinkGroup({ title, links }: { title: string; links: LinkItem[] }) {
  return (
    <div>
      <h3 className="text-sm uppercase tracking-widest text-muted">{title}</h3>
      <ul className="mt-3 flex flex-col gap-1">
        {links.map((link) => {
          return (
            <li key={`${link.type}-${link.label}`}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-card px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-surface"
              >
                <LinkIcon type={link.type} />
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function LinksPanel({ site, className }: { site: Site; className?: string }) {
  return (
    <div className={className}>
      <LinkGroup title="The cafe" links={site.links.cafe} />
      <LinkGroup title="The owner" links={site.links.owner} />
    </div>
  );
}
