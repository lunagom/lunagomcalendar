// features/todos/components/DraggableTodoItem.tsx
"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { TodoItem } from "./TodoItem";
import type { TaskRow } from "../server/queries";

type Props = {
  todo: TaskRow;
  todayIso: string;
};

/**
 * TodoItem 을 useDraggable 로 감싼 래퍼.
 * - WeekBoard 내부에서만 사용 (DndContext 안).
 * - DayDetailPopup 등 외부에서는 TodoItem 직접 사용.
 */
export function DraggableTodoItem({ todo, todayIso }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: todo.id,
      data: { date: todo.scheduled_date },
    });

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
      className={
        isDragging
          ? "cursor-grabbing relative z-20"
          : "cursor-grab select-none touch-manipulation"
      }
    >
      <TodoItem todo={todo} todayIso={todayIso} />
    </div>
  );
}
