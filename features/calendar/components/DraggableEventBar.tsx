// features/calendar/components/DraggableEventBar.tsx
"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { EventBar, type SpanRole } from "./EventBar";
import { useEventHover } from "../lib/event-hover-context";
import type { EventRow } from "../server/queries";

type Props = {
  event: EventRow;
  color: string;
  onClick?: () => void;
  spanRole?: SpanRole;
  /** 멀티데이 segment 인 경우 식별용 — 같은 event 가 여러 셀에 분할되어 있어 unique id 필요. */
  dragKey?: string;
};

/**
 * EventBar 를 useDraggable 로 감싼 래퍼. MonthGrid 내부에서만 사용 (DndContext 안).
 * - 클릭 → onClick (5px 미만 이동 시 dnd-kit 이 click 통과)
 * - 5px 이상 이동 → 드래그 시작
 */
export function DraggableEventBar({
  event,
  color,
  onClick,
  spanRole,
  dragKey,
}: Props) {
  const id = dragKey ?? event.id;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data: { event },
    });
  const { hoveredId, setHoveredId } = useEventHover();
  const isHovered = hoveredId === event.id;

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setHoveredId(event.id)}
      onMouseLeave={() => setHoveredId(null)}
      className={`transition-all duration-150 ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      } ${isHovered && !isDragging ? "-translate-y-0.5" : ""}`}
    >
      <EventBar
        title={event.title}
        emoji={event.emoji}
        color={color}
        onClick={onClick}
        spanRole={spanRole}
      />
    </div>
  );
}
