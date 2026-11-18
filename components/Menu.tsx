"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Search } from "lucide-react";
import type { Menu, MenuItem } from "@/lib/content";
import { springs } from "@/lib/motion";
import { DietMark } from "./DietMark";
import { ItemDetailSheet } from "./ItemDetailSheet";
import { MenuCard } from "./MenuCard";

type DietFilter = "all" | "veg" | "non-veg";

/*
 * Menu section (PRD Section 6.3): category tabs with a sliding active
 * underline (layoutId), Veg / Non-veg filter, search field, and cards that
 * cross-fade and reflow with AnimatePresence + layout. The first bestseller
 * is featured large for asymmetry (anti-slop rule 5) when no filter narrows
 * the list.
 */
export function MenuSection({ menu, images }: { menu: Menu; images: Record<string, boolean> }) {
  const [category, setCategory] = useState<string>("all");
  const [diet, setDiet] = useState<DietFilter>("all");
  const [query, setQuery] = useState("");
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  const reduce = useReducedMotion();

  const tabs = ["all", ...menu.categories];
  const tabLabel = (tab: string) => (tab === "all" ? "All" : tab[0].toUpperCase() + tab.slice(1));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu.items.filter(
      (item) =>
        (category === "all" || item.category === category) &&
        (diet === "all" || item.diet.includes(diet)) &&
        (q === "" || `${item.name} ${item.description}`.toLowerCase().includes(q)),
    );
  }, [menu, category, diet, query]);

  // Searching: results grouped by category with headings (owner request).
  const searching = query.trim() !== "";
  const groups = useMemo(() => {
    if (!searching) return [];
    return menu.categories
      .map((cat) => ({
        cat,
        label: cat[0].toUpperCase() + cat.slice(1),
        items: filtered.filter((item) => item.category === cat),
      }))
      .filter((group) => group.items.length > 0);
  }, [menu, filtered, searching]);

  const featuredId =
    !searching && category === "all" && diet === "all"
      ? (menu.items.find((i) => i.tags.includes("bestseller"))?.id ?? menu.items[0]?.id)
      : null;

  return (
    <section id="menu" className="scroll-mt-24 border-t border-muted/10">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-4xl text-foreground">Menu</h2>
          <label className="relative">
            <span className="sr-only">Search the menu</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes"
              className="w-56 rounded-card border border-muted/30 bg-surface px-9 py-2 text-sm text-foreground placeholder:text-muted focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-accent"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-muted/20">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                aria-pressed={category === tab}
                onClick={() => setCategory(tab)}
                className={`relative px-4 py-3 text-sm transition-colors ${
                  category === tab ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {tabLabel(tab)}
                {category === tab && (
                  <motion.span
                    layoutId={reduce ? undefined : "menu-tab-underline"}
                    className="absolute inset-x-2 bottom-0 h-0.5 bg-accent"
                    transition={springs.snappy}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pb-2">
            {(["all", "veg", "non-veg"] as DietFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={diet === option}
                onClick={() => setDiet(option)}
                className={`flex items-center gap-1.5 rounded-card border px-3 py-1.5 text-xs capitalize transition-colors ${
                  diet === option
                    ? "border-foreground bg-surface text-foreground"
                    : "border-muted/30 text-muted hover:text-foreground"
                }`}
              >
                {option !== "all" && <DietMark diet={option} />}
                {option === "all" ? "All" : option === "veg" ? "Veg" : "Non-veg"}
              </button>
            ))}
          </div>
        </div>

        {/* When searching, results are grouped by category so the menu stays
            scannable (owner request). Otherwise the flat asymmetric grid. */}
        {searching ? (
          <div className="mt-8 flex flex-col gap-10">
            {groups.map((group) => (
              <div key={group.cat}>
                <h3 className="font-display text-2xl text-foreground">{group.label}</h3>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {group.items.map((item) => (
                      <MenuCard
                        key={item.id}
                        item={item}
                        hasImage={images[item.id] ?? false}
                        onOpen={setOpenItem}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div layout className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {filtered.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  hasImage={images[item.id] ?? false}
                  featured={item.id === featuredId}
                  onOpen={setOpenItem}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {filtered.length === 0 && (
          <p className="mt-12 text-muted">Nothing matches that search. Try another word.</p>
        )}
      </div>

      {/* key remount resets option/quantity state per opened item */}
      <ItemDetailSheet
        key={openItem?.id ?? "none"}
        item={openItem}
        hasImage={openItem ? (images[openItem.id] ?? false) : false}
        onClose={() => setOpenItem(null)}
      />
    </section>
  );
}
