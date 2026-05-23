// features/todos/components/TodoSection.tsx
import { TodoItem } from "./TodoItem";
import type { TaskRow } from "../server/queries";

type Props = {
  label: string;
  todos: TaskRow[];
  todayIso: string;
  variant?: "overdue" | "today";
};

export function TodoSection({ label, todos, todayIso, variant = "today" }: Props) {
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
        {todos.map((t) => (
          <TodoItem key={t.id} todo={t} todayIso={todayIso} />
        ))}
      </div>
    </section>
  );
}
