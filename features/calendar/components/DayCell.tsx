// features/calendar/components/DayCell.tsx
"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { EventBar } from "./EventBar";
import { HolidayBadge } from "./HolidayBadge";
import { isLunarFirstDay, toLunar } from "@/lib/lunar";
import { isPublicHoliday } from "@/lib/holidays";
import { toggleTodo } from "@/features/todos/server/actions";
import type { EventRow, CalendarRow } from "../server/queries";
import type { TaskRow } from "@/features/todos/server/queries";

type Props = {
  date: Date;
  isCurrentMonth: boolean;
  events: EventRow[];
  todos: TaskRow[];
  calendars: CalendarRow[];
  onEventClick: (e: EventRow) => void;
  /** 셀(빈 영역·날짜·배지) 클릭 — DayDetailPopup 열기. 이벤트 막대/체크박스 자체 클릭은 stopPropagation 처리됨. */
  onDayClick: () => void;
};

export function DayCell({
  date,
  isCurrentMonth,
  events,
  todos,
  calendars,
  onEventClick,
  onDayClick,
}: Props) {
  const isoDate = date.toISOString().slice(0, 10);
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

  return (
    <div
      className="h-full flex flex-col p-1.5 cursor-pointer"
      onClick={onDayClick}
    >
      {/* 윗줄: 날짜 + 음력 + 배지 */}
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className={`text-sm font-semibold ${dayNumberColor}`}>
          {date.getDate()}
        </span>
        {lunar && (
          <span className="text-[10px] text-muted-foreground">
            ·음 {lunar.month}/1
          </span>
        )}
        <span className="ml-auto">
          <HolidayBadge isoDate={isoDate} />
        </span>
      </div>

      {/* 이벤트 막대 */}
      <div className="flex flex-col gap-0.5">
        {shownEvents.map((ev) => (
          <EventBar
            key={ev.id}
            title={ev.title}
            emoji={ev.emoji}
            color={ev.color ?? calColor(ev.calendar_id)}
            onClick={() => onEventClick(ev)}
          />
        ))}
        {moreCount > 0 && (
          <span className="text-[10px] text-muted-foreground px-1">
            + {moreCount}개 더
          </span>
        )}
      </div>

      {/* 할 일 (점선 구분) */}
      {(shownTodos.length > 0 || moreTodoCount > 0) && (
        <div className="mt-auto pt-1.5 border-t border-dashed border-border flex flex-col gap-0.5">
          {shownTodos.map((t) => (
            <TodoMiniRow key={t.id} todo={t} />
          ))}
          {moreTodoCount > 0 && (
            <span className="text-[10px] text-muted-foreground px-1">
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
        className={`text-[11px] truncate ${
          done ? "line-through text-muted-foreground" : ""
        }`}
      >
        {todo.emoji ? `${todo.emoji} ` : ""}
        {todo.title}
      </span>
    </div>
  );
}
