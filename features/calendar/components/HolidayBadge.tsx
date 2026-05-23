"use client";
import { findHoliday, get24SolarTerm } from "@/lib/holidays";

type Props = { isoDate: string };

/**
 * 공휴일/24절기 배지 — block 으로 셀 전체 너비 사용, truncate 로 한 줄 클리핑.
 * 전체 텍스트는 DayDetailPopup 에서 확인.
 */
export function HolidayBadge({ isoDate }: Props) {
  const holiday = findHoliday(isoDate);
  if (holiday?.isPublicHoliday) {
    return (
      <div
        className="truncate px-1.5 py-px rounded-full text-[10px] bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 inline-block max-w-full"
        title={holiday.name}
      >
        {holiday.name}
      </div>
    );
  }
  const term = get24SolarTerm(isoDate);
  if (term) {
    return (
      <div
        className="truncate px-1.5 py-px rounded-full text-[10px] bg-muted text-muted-foreground inline-block max-w-full"
        title={term}
      >
        {term}
      </div>
    );
  }
  return null;
}
