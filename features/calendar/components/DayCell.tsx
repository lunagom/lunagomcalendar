// features/calendar/components/DayCell.tsx
"use client";
import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { DraggableEventBar } from "./DraggableEventBar";
import { type SpanRole } from "./EventBar";
import { HolidayBadge } from "./HolidayBadge";
import { isLunarFirstDay, toLunar } from "@/lib/lunar";
import { isPublicHoliday } from "@/lib/holidays";
import { toggleTodo } from "@/features/todos/server/actions";
import { formatDelta } from "@/lib/colors";
import type { EventRow, CalendarRow } from "../server/queries";
import type { TaskRow } from "@/features/todos/server/queries";

export type DayCellEvent = { event: EventRow; spanRole: SpanRole };

type Props = {
  date: Date;
  isCurrentMonth: boolean;
  isToday?: boolean;
  events: DayCellEvent[];
  todos: TaskRow[];
  calendars: CalendarRow[];
  onEventClick: (e: EventRow) => void;
  /** 셀(빈 영역·날짜·배지) 클릭 — DayDetailPopup 열기. */
  onDayClick: () => void;
  /** 그날 순수익 (수입 - 지출). undefined 또는 0 이면 표시 안 함. */
  dailyDelta?: number;
  /**
   * 이 셀을 지나가는 멀티데이 막대 슬롯 수 (0=없음). 단일 일정을 그만큼 아래로
   * 밀어서 멀티데이 layer 와 겹치지 않게 함.
   */
  multiDaySlots?: number;
};

/** WeekMultiDayLayer 의 BAR_HEIGHT(18) + BAR_GAP(2) 와 동기화. */
const MULTI_DAY_SLOT_HEIGHT = 20;

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DayCell({
  date,
  isCurrentMonth,
  isToday = false,
  events,
  todos,
  calendars,
  onEventClick,
  onDayClick,
  dailyDelta,
  multiDaySlots = 0,
}: Props) {
  const isoDate = isoOf(date);
  const day = date.getDay();
  const lunar = isLunarFirstDay(date) ? toLunar(date) : null;
  const dayNumberColor = !isCurrentMonth
    ? "text-muted-foreground/50"
    : isPublicHoliday(isoDate) || day === 0
      ? "text-red-600 dark:text-red-400"
      : day === 6
        ? "text-[#5b6cff]"
        : "text-foreground";

  const calColor = (id: string) =>
    calendars.find((c) => c.id === id)?.color ?? "#888";
  const shownEvents = events.slice(0, 3);
  const moreCount = Math.max(0, events.length - 3);
  const shownTodos = todos.slice(0, 2);
  const moreTodoCount = Math.max(0, todos.length - 2);

  // 일정 드롭 타겟 — 다른 셀에서 드래그한 일정이 여기로 떨어지면 그 날짜로 이동.
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${isoDate}`,
    data: { date, isoDate },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative h-full flex flex-col p-1.5 cursor-pointer transition-colors ${
        isOver ? "bg-primary/10 ring-1 ring-primary/40 rounded" : ""
      } ${isToday ? "ring-2 ring-primary/40 rounded-lg" : ""}`}
      onClick={onDayClick}
    >
      {isToday && (
        <motion.div
          initial={{ opacity: 1, scale: 0.95 }}
          animate={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 rounded-lg ring-2 ring-primary pointer-events-none"
        />
      )}
      {/* 날짜 + 음력 + 지출 합계 */}
      <div className="flex items-baseline gap-1">
        <span className={`text-[8px] font-semibold ${dayNumberColor}`}>
          {date.getDate()}
        </span>
        {isToday && (
          <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
        )}
        {lunar && (
          <span className="text-[8px] text-muted-foreground whitespace-nowrap">
            ·음 {lunar.month}/1
          </span>
        )}
        {dailyDelta != null && dailyDelta !== 0 && (
          <span
            className={`ml-auto min-w-0 truncate text-[8px] font-medium tabular-nums ${
              dailyDelta > 0
                ? "text-[#16A34A] dark:text-[#4ADE80]"
                : "text-[#DC2626] dark:text-[#F87171]"
            }`}
          >
            {formatDelta(dailyDelta)}
          </span>
        )}
      </div>
      {/* 공휴일/24절기 배지 */}
      <div className="mb-1">
        <HolidayBadge isoDate={isoDate} />
      </div>

      {/* 이벤트 막대 — 드래그 가능. 멀티데이가 지나가는 셀이면 그만큼 아래로 밀림. */}
      <div
        className="flex flex-col gap-0.5"
        style={
          multiDaySlots > 0
            ? { marginTop: multiDaySlots * MULTI_DAY_SLOT_HEIGHT }
            : undefined
        }
      >
        {shownEvents.map(({ event: ev, spanRole }) => (
          <DraggableEventBar
            key={`${ev.id}-${spanRole}`}
            event={ev}
            color={ev.color ?? calColor(ev.calendar_id)}
            onClick={() => onEventClick(ev)}
            spanRole={spanRole}
          />
        ))}
        {moreCount > 0 && (
          <span className="text-[8px] text-muted-foreground px-1">
            + {moreCount}개 더
          </span>
        )}
      </div>

      {/* 할 일 */}
      {(shownTodos.length > 0 || moreTodoCount > 0) && (
        <div className="mt-auto pt-1.5 border-t border-dashed border-border flex flex-col gap-0.5">
          {shownTodos.map((t) => (
            <TodoMiniRow key={t.id} todo={t} />
          ))}
          {moreTodoCount > 0 && (
            <span className="text-[8px] text-muted-foreground px-1">
              + {moreTodoCount}개
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function TodoMiniRow({ todo }: { todo: TaskRow }) {
  const done = !!todo.completed_at;
  return (
    <div className="flex items-center gap-1.5 px-1">
      <Checkbox
        checked={done}
        onCheckedChange={(v) => void toggleTodo(todo.id, Boolean(v))}
        onClick={(e) => e.stopPropagation()}
        className="h-3 w-3"
      />
      <span
        className={`text-[8px] truncate ${
          done ? "line-through text-muted-foreground" : ""
        }`}
      >
        {todo.emoji ? `${todo.emoji} ` : ""}
        {todo.title}
      </span>
    </div>
  );
}
