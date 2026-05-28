// features/todos/components/DayColumn.tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableTodoItem } from "./DraggableTodoItem";
import { VirtualTodoItem } from "./VirtualTodoItem";
import { QuickAddInput } from "./QuickAddInput";
import { WEEKDAY_LABELS, isExpandedByDefault } from "../lib/week";
import type { TaskRow } from "../server/queries";
import type { VirtualTodo } from "../lib/recurrence";

type Props = {
  /** 0=월 1=화 ... 6=일 */
  dayIndex: number;
  /** "YYYY-MM-DD" */
  dateIso: string;
  todos: TaskRow[];
  virtualTodos: VirtualTodo[];
  todayIso: string;
  collapsible: boolean;
  isToday: boolean;
  variant?: "card" | "line";
};

export function DayColumn({
  dayIndex,
  dateIso,
  todos,
  virtualTodos,
  todayIso,
  collapsible,
  isToday,
  variant = "card",
}: Props) {
  const [open, setOpen] = useState(() => isExpandedByDefault(dayIndex));
  const label = WEEKDAY_LABELS[dayIndex];
  const [, , dayStr] = dateIso.split("-");
  const dayNum = Number(dayStr);
  const done = todos.filter((t) => !!t.completed_at).length;
  const total = todos.length + virtualTodos.length;

  const showContent = collapsible ? open : true;

  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateIso}`,
    data: { date: dateIso },
  });

  const wrapperCls =
    variant === "card"
      ? `rounded-lg border transition-colors ${
          isOver
            ? "bg-primary/10 ring-1 ring-primary/40 border-transparent"
            : isToday
              ? "bg-primary/5 ring-1 ring-primary/20 border-transparent"
              : "border-border/60"
        }`
      : `transition-colors ${
          isOver
            ? "bg-primary/10 ring-1 ring-primary/40"
            : isToday
              ? "bg-primary/5"
              : ""
        }`;

  return (
    <section ref={setNodeRef} className={wrapperCls}>
      <header
        className={`flex items-center gap-2 px-3 py-2 ${
          collapsible ? "cursor-pointer select-none" : ""
        }`}
        onClick={() => collapsible && setOpen((v) => !v)}
      >
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${
            isToday ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {label}
        </span>
        <span className={`text-sm ${isToday ? "font-semibold" : "font-medium"}`}>
          {dayNum}일
        </span>
        {total > 0 && (
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
            {done}/{total}
          </span>
        )}
        {collapsible && (
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              open ? "" : "-rotate-90"
            } ${total > 0 ? "" : "ml-auto"}`}
          />
        )}
      </header>

      {showContent && (
        <div className="px-1 pb-1">
          {total === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-2">할 일 없음</p>
          ) : (
            <SortableContext
              items={todos.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col">
                {todos.map((t) => (
                  <DraggableTodoItem key={t.id} todo={t} todayIso={todayIso} />
                ))}
                {virtualTodos.map((v) => (
                  <VirtualTodoItem key={v.id} virtual={v} />
                ))}
              </div>
            </SortableContext>
          )}
          <QuickAddInput date={dateIso} />
        </div>
      )}
    </section>
  );
}
