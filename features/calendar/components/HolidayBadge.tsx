"use client";
import { findHoliday, get24SolarTerm } from "@/lib/holidays";

type Props = { isoDate: string };

/**
 * 윗줄 우측 알약 배지 — 공휴일 우선, 없으면 24절기, 둘 다 없으면 null.
 */
export function HolidayBadge({ isoDate }: Props) {
  const holiday = findHoliday(isoDate);
  if (holiday?.isPublicHoliday) {
    return (
      <span className="px-1.5 py-px rounded-full text-[10px] bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
        {holiday.name}
      </span>
    );
  }
  const term = get24SolarTerm(isoDate);
  if (term) {
    return (
      <span className="px-1.5 py-px rounded-full text-[10px] bg-muted text-muted-foreground">
        {term}
      </span>
    );
  }
  return null;
}
