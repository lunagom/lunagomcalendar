// features/todos/components/TodoSection.tsx
import { TodoItem } from "./TodoItem";
import type { TaskRow } from "../server/queries";

type Props = {
  label: string;
  todos: TaskRow[];
  todayIso: string;
  variant?: "overdue" | "today";
  /** 빈 상태일 때 보여줄 안내. 없으면 빈 영역만 렌더. */
  emptyMessage?: string;
};

export function TodoSection({
  label,
  todos,
  todayIso,
  variant = "today",
  emptyMessage,
}: Props) {
  const isEmpty = todos.length === 0;

  return (
    <section className="space-y-1">
      <div
        className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
          variant === "overdue" ? "text-red-600" : "text-muted-foreground"
        }`}
      >
        {label} · {todos.length}개
      </div>
      <div
        className={`rounded-lg ${
          variant === "overdue" ? "bg-red-50/40 dark:bg-red-950/20" : ""
        }`}
      >
        {isEmpty && emptyMessage ? (
          <p className="text-sm text-muted-foreground px-1 py-2">
            {emptyMessage}
          </p>
        ) : (
          todos.map((t) => (
            <TodoItem key={t.id} todo={t} todayIso={todayIso} />
          ))
        )}
      </div>
    </section>
  );
}
