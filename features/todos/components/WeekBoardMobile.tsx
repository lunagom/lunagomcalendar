// features/todos/components/WeekBoardMobile.tsx
"use client";

import { DayColumn } from "./DayColumn";
import { DraggableTodoItem } from "./DraggableTodoItem";
import { getWeekDays } from "../lib/week";
import type { TaskRow } from "../server/queries";
import type { VirtualTodo } from "../lib/recurrence";

type Props = {
  weekStartIso: string;
  todayIso: string;
  weekTodos: TaskRow[];
  virtualTodos: VirtualTodo[];
  overdueTodos: TaskRow[];
};

export function WeekBoardMobile({
  weekStartIso,
  todayIso,
  weekTodos,
  virtualTodos,
  overdueTodos,
}: Props) {
  const days = getWeekDays(weekStartIso);

  const realByDate = new Map<string, TaskRow[]>();
  for (const t of weekTodos) {
    const arr = realByDate.get(t.scheduled_date) ?? [];
    arr.push(t);
    realByDate.set(t.scheduled_date, arr);
  }
  const virtualByDate = new Map<string, VirtualTodo[]>();
  for (const v of virtualTodos) {
    const arr = virtualByDate.get(v.scheduled_date) ?? [];
    arr.push(v);
    virtualByDate.set(v.scheduled_date, arr);
  }

  return (
    <div className="flex flex-col gap-2">
      {overdueTodos.length > 0 && (
        <section className="rounded-lg bg-red-50/40 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/40 px-3 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400 mb-1">
            밀린 항목 · {overdueTodos.length}개
          </div>
          <div className="flex flex-col">
            {overdueTodos.map((t) => (
              <DraggableTodoItem key={t.id} todo={t} todayIso={todayIso} />
            ))}
          </div>
        </section>
      )}

      {days.map((dateIso, idx) => (
        <DayColumn
          key={dateIso}
          dayIndex={idx}
          dateIso={dateIso}
          todos={realByDate.get(dateIso) ?? []}
          virtualTodos={virtualByDate.get(dateIso) ?? []}
          todayIso={todayIso}
          collapsible
          isToday={dateIso === todayIso}
        />
      ))}
    </div>
  );
}
