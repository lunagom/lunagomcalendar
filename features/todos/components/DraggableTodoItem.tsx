// features/todos/components/DraggableTodoItem.tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TodoItem } from "./TodoItem";
import type { TaskRow } from "../server/queries";

type Props = {
  todo: TaskRow;
  todayIso: string;
};

/**
 * TodoItem 을 useSortable 로 감싼 래퍼.
 * - 같은 컬럼 안 위/아래 reorder + 다른 컬럼으로 이동 모두 지원
 * - SortableContext 안에서만 동작 (DayColumn 이 wrap).
 */
export function DraggableTodoItem({ todo, todayIso }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: todo.id,
      data: { date: todo.scheduled_date },
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 20 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={
        isDragging
          ? "cursor-grabbing"
          : "cursor-grab select-none touch-manipulation"
      }
    >
      <TodoItem todo={todo} todayIso={todayIso} />
    </div>
  );
}
