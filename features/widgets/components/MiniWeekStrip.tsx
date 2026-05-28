import Link from "next/link";
import { getWeekStripDays } from "../server/week-strip-queries";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 오늘 + 다음 6일 strip. 셀마다 요일/날짜 + 일정/할 일 dot.
 * 클릭 시 /calendar?month=YYYY-MM 으로 이동.
 */
export async function MiniWeekStrip() {
  const days = await getWeekStripDays();

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((d) => {
        const [, m, day] = d.iso.split("-").map(Number);
        const dayOfWeek = new Date(d.iso).getDay();
        const month = `${d.iso.slice(0, 4)}-${String(m).padStart(2, "0")}`;
        return (
          <Link
            key={d.iso}
            href={`/calendar?month=${month}`}
            className={`flex flex-col items-center gap-1 rounded-lg py-2 transition-colors hover:bg-accent/40 ${
              d.isToday
                ? "bg-primary/10 ring-1 ring-primary/40"
                : ""
            }`}
            aria-label={`${m}월 ${day}일로 이동`}
          >
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {WEEKDAYS[dayOfWeek]}
            </span>
            <span
              className={`text-sm tabular-nums ${
                d.isToday ? "font-bold text-primary" : "font-medium"
              }`}
            >
              {day}
            </span>
            <div className="flex gap-0.5 h-1.5">
              {d.hasEvent && (
                <span className="w-1 h-1 rounded-full bg-primary" />
              )}
              {d.hasTodo && (
                <span className="w-1 h-1 rounded-full bg-[#16A34A] dark:bg-[#4ADE80]" />
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
