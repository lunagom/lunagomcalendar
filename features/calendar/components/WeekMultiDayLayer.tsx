// features/calendar/components/WeekMultiDayLayer.tsx
"use client";
import { useDndContext, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { getTextColor } from "@/lib/colors";
import { useEventHover } from "../lib/event-hover-context";
import type { CalendarRow, EventRow } from "../server/queries";
import type { WeekSegment } from "../lib/multi-day";

type Props = {
  segments: WeekSegment[];
  calendars: CalendarRow[];
  onEventClick: (e: EventRow) => void;
};

const BAR_HEIGHT = 18; // px
const BAR_GAP = 2; // px
/** 셀의 날짜 라인 아래에서 시작. 셀 padding(6px) + 날짜(약 20px). */
const LAYER_TOP = 26; // px

/**
 * 한 주(tr) 에 absolute 로 떠 있는 멀티데이 막대 layer.
 * 각 막대는 같은 event 라도 weekKey 별로 별도 segment → dnd id 도 segment 별 unique.
 * 드래그하면 그 event 의 start_at 을 드롭한 셀로 이동 (MonthGrid 가 처리).
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
        const dragId = `${seg.event.id}-${seg.weekKey}-${seg.startCol}`;
        return (
          <DraggableSegment
            key={dragId}
            dragId={dragId}
            event={seg.event}
            color={color}
            textColor={getTextColor(color)}
            left={left}
            width={width}
            top={top}
            onClick={() => onEventClick(seg.event)}
          />
        );
      })}
    </div>
  );
}

type SegProps = {
  dragId: string;
  event: EventRow;
  color: string;
  textColor: string;
  left: string;
  width: string;
  top: number;
  onClick: () => void;
};

function DraggableSegment({
  dragId,
  event,
  color,
  textColor,
  left,
  width,
  top,
  onClick,
}: SegProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: dragId,
      data: { event },
    });
  const dragStyle = CSS.Translate.toString(transform);

  // 같은 event 의 다른 주 segment 가 드래그 중이면 이 segment 는 숨김
  // (멀티데이가 여러 주에 걸쳐 있을 때 겹쳐 보이는 현상 방지).
  const { active } = useDndContext();
  const activeEventId = (
    active?.data.current as { event?: EventRow } | undefined
  )?.event?.id;
  const isSiblingOfDragging =
    !isDragging && activeEventId === event.id && active != null;

  const opacity = isDragging ? 0.4 : isSiblingOfDragging ? 0 : 1;

  const { hoveredId, setHoveredId } = useEventHover();
  const isHovered = hoveredId === event.id && !isDragging;

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setHoveredId(event.id)}
      onMouseLeave={() => setHoveredId(null)}
      className={`absolute px-1.5 sm:px-2 rounded text-[10px] sm:text-[11px] truncate pointer-events-auto hover:opacity-80 text-left transition ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{
        left,
        width,
        top,
        height: BAR_HEIGHT,
        lineHeight: `${BAR_HEIGHT}px`,
        backgroundColor: color,
        color: textColor,
        opacity,
        transform: `${dragStyle ?? ""} ${isHovered ? "translateY(-2px)" : ""}`.trim() || undefined,
      }}
    >
      {event.emoji ? `${event.emoji} ` : ""}
      {event.title}
    </button>
  );
}
