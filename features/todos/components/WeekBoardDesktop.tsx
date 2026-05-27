// features/todos/components/WeekBoardDesktop.tsx
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

export function WeekBoardDesktop({
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
    <div className="space-y-3">
      {overdueTodos.length > 0 && (
        <section className="rounded-lg bg-red-50/40 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/40 px-3 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400 mb-1">
            밀린 항목 · {overdueTodos.length}개
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-2">
            {overdueTodos.map((t) => (
              <DraggableTodoItem key={t.id} todo={t} todayIso={todayIso} />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-7 divide-x divide-border border-y border-border">
        {days.map((dateIso, idx) => (
          <DayColumn
            key={dateIso}
            dayIndex={idx}
            dateIso={dateIso}
            todos={realByDate.get(dateIso) ?? []}
            virtualTodos={virtualByDate.get(dateIso) ?? []}
            todayIso={todayIso}
            collapsible={false}
            isToday={dateIso === todayIso}
            variant="line"
          />
        ))}
      </div>
    </div>
  );
}
