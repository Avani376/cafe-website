import type { Site } from "./content";

/*
 * Opening-hours logic for the cafe's timezone (Asia/Kolkata per site.json).
 * All computations go through Intl with the configured IANA zone - never the
 * server's local time. Windows are same-day [open, close] in 24h "HH:MM".
 */

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

function dayKeyAt(date: Date, timeZone: string): DayKey {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  return weekday.toLowerCase() as DayKey;
}

/** Minutes since local midnight in the cafe's zone. */
export function minutesOfDay(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function parseHHMM(value: string): number {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error(`Invalid time in site.json hours: ${value}`);
  }
  return h * 60 + m;
}

export function windowsForDay(hours: Site["hours"], day: DayKey): [number, number][] {
  return (hours[day] ?? []).map(
    ([open, close]) => [parseHHMM(open), parseHHMM(close)] as [number, number],
  );
}

export function isOpenAt(hours: Site["hours"], date: Date, timeZone: string): boolean {
  const now = minutesOfDay(date, timeZone);
  return windowsForDay(hours, dayKeyAt(date, timeZone)).some(
    ([open, close]) => now >= open && now < close,
  );
}

export function formatTime12(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "Closed, opens at 8 AM" style label from real hours. */
export function nextOpeningLabel(hours: Site["hours"], date: Date, timeZone: string): string {
  const today = minutesOfDay(date, timeZone);
  const todayWindows = windowsForDay(hours, dayKeyAt(date, timeZone));
  const laterToday = todayWindows.map(([open]) => open).find((open) => open > today);
  if (laterToday !== undefined) return `Closed, opens at ${formatTime12(laterToday)}`;
  for (let i = 1; i <= 7; i++) {
    const future = new Date(date.getTime() + i * 24 * 60 * 60 * 1000);
    const open = windowsForDay(hours, dayKeyAt(future, timeZone)).map(([o]) => o)[0];
    if (open !== undefined) {
      const dayName = i === 1 ? "tomorrow" : dayKeyAt(future, timeZone);
      return `Closed, opens ${dayName === "tomorrow" ? "tomorrow" : `on ${dayName}`} at ${formatTime12(open)}`;
    }
  }
  return "Closed";
}

export interface OpenNow {
  open: boolean;
  label: string;
}

export function openNowStatus(
  site: Pick<Site, "hours" | "timezone">,
  date: Date = new Date(),
): OpenNow {
  const open = isOpenAt(site.hours, date, site.timezone);
  return open
    ? { open: true, label: "Open now" }
    : { open: false, label: nextOpeningLabel(site.hours, date, site.timezone) };
}

/** Today's windows formatted for the hours table, e.g. "8 AM - 10 PM". Closed days render as "Closed". */
export function dayHoursLabel(hours: Site["hours"], day: DayKey): string {
  const windows = windowsForDay(hours, day);
  if (windows.length === 0) return "Closed";
  return windows
    .map(([open, close]) => `${formatTime12(open)} - ${formatTime12(close)}`)
    .join(", ");
}

export interface PickupSlot {
  /** "HH:MM" 24h, sent to the server. */
  value: string;
  /** "8:30 AM" style display label. */
  label: string;
}

/**
 * Pickup slots inside opening hours, at least `leadMin` minutes ahead,
 * every `intervalMin` minutes, for today (PRD Section 6.4). Empty when the
 * cafe is closed for the rest of the day - the cart then offers ASAP only.
 */
export function getPickupSlots(
  site: Pick<Site, "hours" | "timezone">,
  now: Date = new Date(),
  options: { intervalMin?: number; leadMin?: number; maxSlots?: number } = {},
): PickupSlot[] {
  const { intervalMin = 30, leadMin = 15, maxSlots = 8 } = options;
  const nowMin = minutesOfDay(now, site.timezone);
  const earliest = nowMin + leadMin;
  const windows = windowsForDay(site.hours, dayKeyAt(now, site.timezone));
  const slots: PickupSlot[] = [];
  for (const [open, close] of windows) {
    const first = Math.max(open, Math.ceil(earliest / intervalMin) * intervalMin);
    for (let t = first; t <= close; t += intervalMin) {
      if (slots.length >= maxSlots) return slots;
      const h = String(Math.floor(t / 60)).padStart(2, "0");
      const m = String(t % 60).padStart(2, "0");
      slots.push({ value: `${h}:${m}`, label: formatTime12(t) });
    }
  }
  return slots;
}

/** Server-side validation of a pickup slot: exists today, inside hours, at least 15 min ahead. */
export function isValidPickupSlot(
  site: Pick<Site, "hours" | "timezone">,
  value: string,
  now: Date = new Date(),
): boolean {
  return getPickupSlots(site, now, { intervalMin: 1, leadMin: 15, maxSlots: 24 * 60 }).some(
    (s) => s.value === value,
  );
}

export function todayDayKey(date: Date, timeZone: string): DayKey {
  return dayKeyAt(date, timeZone);
}

export { DAY_KEYS };
