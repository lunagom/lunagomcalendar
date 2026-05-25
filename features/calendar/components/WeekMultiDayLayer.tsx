// features/calendar/components/WeekMultiDayLayer.tsx
"use client";
import { getTextColor } from "@/lib/colors";
import type { CalendarRow, EventRow } from "../server/queries";
import type { WeekSegment } from "../lib/multi-day";

type Props = {
  segments: WeekSegment[];
  calendars: CalendarRow[];
  onEventClick: (e: EventRow) => void;
};

/** 막대 한 줄 높이 + 간격. tr 안에서 slot 별 top 계산에 사용. */
const BAR_HEIGHT = 18; // px
const BAR_GAP = 2; // px
/** 셀의 날짜 라인 아래에서 시작. 셀 padding(6px) + 날짜(약 20px). */
const LAYER_TOP = 26; // px

/**
 * 한 주(tr) 에 absolute 로 떠 있는 멀티데이 막대 layer.
 * 부모 tr 폭 = 7 셀 = 100%. 각 막대는 col 기준 left/width 계산.
 * single-day 이벤트는 여기 없음(DayCell 이 그대로 표시).
 */
export function WeekMultiDayLayer({
  segments,
  calendars,
  onEventClick,
}: Props) {
  const calColor = (id: string) =>
    calendars.find((c) => c.id === id)?.color ?? "#888";

  return (
    <div
      className="absolute inset-x-0 pointer-events-none"
      style={{ top: LAYER_TOP, zIndex: 10 }}
    >
      {segments.map((seg) => {
        const color = seg.event.color ?? calColor(seg.event.calendar_id);
        const left = `${(seg.startCol / 7) * 100}%`;
        const width = `${((seg.endCol - seg.startCol + 1) / 7) * 100}%`;
        const top = seg.slot * (BAR_HEIGHT + BAR_GAP);
        return (
          <button
            key={`${seg.event.id}-${seg.weekKey}-${seg.startCol}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(seg.event);
            }}
            className="absolute px-1.5 sm:px-2 rounded text-[10px] sm:text-[11px] truncate pointer-events-auto hover:opacity-80 text-left transition"
            style={{
              left,
              width,
              top,
              height: BAR_HEIGHT,
              lineHeight: `${BAR_HEIGHT}px`,
              backgroundColor: color,
              color: getTextColor(color),
            }}
          >
            {seg.event.emoji ? `${seg.event.emoji} ` : ""}
            {seg.event.title}
          </button>
        );
      })}
    </div>
  );
}
