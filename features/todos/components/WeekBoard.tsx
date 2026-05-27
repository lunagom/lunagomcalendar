// features/todos/components/WeekBoard.tsx
"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { WeekNavigation } from "./WeekNavigation";
import { WeekBoardMobile } from "./WeekBoardMobile";
import { WeekBoardDesktop } from "./WeekBoardDesktop";
import { WeekProgressBar } from "./WeekProgressBar";
import { RecurringTodoModal } from "./RecurringTodoModal";
import { getWeekStart, getWeekDays, WEEKDAY_LABELS } from "../lib/week";
import { reorderTodo } from "../server/actions";
import type { TaskRow } from "../server/queries";
import type { VirtualTodo } from "../lib/recurrence";

type Props = {
  weekStartIso: string;
  todayIso: string;
  weekTodos: TaskRow[];
  virtualTodos: VirtualTodo[];
  overdueTodos: TaskRow[];
};

export function WeekBoard({
  weekStartIso,
  todayIso,
  weekTodos,
  virtualTodos,
  overdueTodos,
}: Props) {
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [, startTransition] = useTransition();
  const isCurrentWeek = weekStartIso === getWeekStart(new Date(todayIso));

  // 데스크탑: 마우스 — 5px 이동 후 드래그 (클릭 보존)
  // 모바일: 터치 — 500ms long-press 후 드래그 (스크롤 보존)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 500, tolerance: 5 },
    }),
  );

  const allDraggableTodos = [...weekTodos, ...overdueTodos];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const newDate = (over.data.current as { date?: string } | undefined)?.date;
    if (!newDate) return;

    const moved = allDraggableTodos.find((t) => t.id === active.id);
    if (!moved) return;
    if (moved.scheduled_date === newDate) return; // 같은 컬럼이면 무시

    // 같은 주 내에서만 이동 — over.id 가 day-{dateIso} 라 항상 그 주 컬럼.
    const weekDays = getWeekDays(weekStartIso);
    if (!weekDays.includes(newDate)) return;

    startTransition(async () => {
      const r = await reorderTodo(active.id as string, newDate);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const dayIdx = weekDays.indexOf(newDate);
      const label = WEEKDAY_LABELS[dayIdx] ?? "";
      toast.success(`${label}요일로 이동됨`);
    });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="px-4 py-6 space-y-4">
        <WeekNavigation
          weekStartIso={weekStartIso}
          isCurrentWeek={isCurrentWeek}
          onOpenRecurring={() => setRecurringOpen(true)}
        />
        <WeekProgressBar weekTodos={weekTodos} />
        {/* 모바일: 세로 스택 */}
        <div className="md:hidden">
          <WeekBoardMobile
            weekStartIso={weekStartIso}
            todayIso={todayIso}
            weekTodos={weekTodos}
            virtualTodos={virtualTodos}
            overdueTodos={overdueTodos}
          />
        </div>
        {/* 데스크탑: 7컬럼 */}
        <div className="hidden md:block">
          <WeekBoardDesktop
            weekStartIso={weekStartIso}
            todayIso={todayIso}
            weekTodos={weekTodos}
            virtualTodos={virtualTodos}
            overdueTodos={overdueTodos}
          />
        </div>

        <RecurringTodoModal
          open={recurringOpen}
          onOpenChange={setRecurringOpen}
          todayIso={todayIso}
        />
      </div>
    </DndContext>
  );
}
