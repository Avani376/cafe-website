"use client";

import { useState } from "react";
import type { Site } from "@/lib/content";
import { DAY_KEYS, dayHoursLabel, todayDayKey, type DayKey } from "@/lib/hours";

/*
 * Hours table with today highlighted (PRD Section 6.8). Today is computed
 * in the cafe's timezone on the client so the server's clock cannot skew it.
 */
export function HoursTable({ site }: { site: Site }) {
  const [today] = useState<DayKey>(() => todayDayKey(new Date(), site.timezone));

  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as DayKey[];
  const labelFor = (day: DayKey) => day[0].toUpperCase() + day.slice(1);

  return (
    <table className="w-full max-w-sm text-sm">
      <caption className="sr-only">Opening hours</caption>
      <tbody>
        {order.map((day) => (
          <tr
            key={day}
            className={day === today ? "bg-surface font-medium text-foreground" : "text-muted"}
          >
            <th scope="row" className="rounded-card px-3 py-1.5 text-left font-normal">
              {labelFor(day)}
              {day === today && <span className="sr-only"> (today)</span>}
            </th>
            <td className="px-3 py-1.5 text-right tabular-nums">
              {dayHoursLabel(site.hours, day)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export { DAY_KEYS };
