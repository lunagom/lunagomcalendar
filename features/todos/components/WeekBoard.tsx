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
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { WeekNavigation } from "./WeekNavigation";
import { WeekBoardMobile } from "./WeekBoardMobile";
import { WeekBoardDesktop } from "./WeekBoardDesktop";
import { WeekProgressBar } from "./WeekProgressBar";
import { RecurringTodoModal } from "./RecurringTodoModal";
import { getWeekStart, getWeekDays, WEEKDAY_LABELS } from "../lib/week";
import { reorderTodo, reorderTodosInDay } from "../server/actions";
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
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const moved = allDraggableTodos.find((t) => t.id === activeId);
    if (!moved) return;

    // over.id 가 "day-..." 면 컬럼 자체, 아니면 다른 todo id
    const isOverColumn = overId.startsWith("day-");
    const targetDate = isOverColumn
      ? (over.data.current as { date?: string } | undefined)?.date
      : (over.data.current as { date?: string } | undefined)?.date ??
        allDraggableTodos.find((t) => t.id === overId)?.scheduled_date;
    if (!targetDate) return;

    // 같은 주 범위 내에서만 이동
    const weekDays = getWeekDays(weekStartIso);
    if (!weekDays.includes(targetDate)) return;

    const sourceDate = moved.scheduled_date;

    if (sourceDate === targetDate && !isOverColumn) {
      // 같은 컬럼 안 reorder — arrayMove 로 위치 swap 후 batch update
      const colTodos = weekTodos.filter((t) => t.scheduled_date === targetDate);
      const oldIdx = colTodos.findIndex((t) => t.id === activeId);
      const newIdx = colTodos.findIndex((t) => t.id === overId);
      if (oldIdx < 0 || newIdx < 0) return;
      const reordered = arrayMove(colTodos, oldIdx, newIdx);
      startTransition(async () => {
        const r = await reorderTodosInDay(
          targetDate,
          reordered.map((t) => t.id),
        );
        if (!r.ok) toast.error(r.error);
      });
      return;
    }

    if (sourceDate === targetDate && isOverColumn) {
      // 같은 컬럼인데 빈 영역에 드롭 → no-op
      return;
    }

    // 다른 컬럼으로 이동
    startTransition(async () => {
      const r = await reorderTodo(activeId, targetDate);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const dayIdx = weekDays.indexOf(targetDate);
      const label = WEEKDAY_LABELS[dayIdx] ?? "";
      toast.success(`${label}요일로 이동됨`);
    });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="px-4 py-6 md:px-6 md:py-8 space-y-6">
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
