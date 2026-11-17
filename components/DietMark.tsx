/*
 * Standard Indian dietary marks (PRD Section 6.3): green square with a dot
 * for veg, bordered square with a triangle for non-veg. Colors come from
 * tokens; the FSSAI brown for non-veg is approximated by --danger (see
 * design/tokens.md, owner notes).
 */
export function DietMark({ diet }: { diet: "veg" | "non-veg" }) {
  const color = diet === "veg" ? "var(--success)" : "var(--danger)";
  const label = diet === "veg" ? "Vegetarian" : "Non-vegetarian";
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      role="img"
      aria-label={label}
      className="shrink-0"
    >
      <rect
        x="1"
        y="1"
        width="12"
        height="12"
        rx="2"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
      />
      {diet === "veg" ? (
        <circle cx="7" cy="7" r="3" fill={color} />
      ) : (
        <path d="M7 3.8 L10.4 10.2 L3.6 10.2 Z" fill={color} />
      )}
    </svg>
  );
}
