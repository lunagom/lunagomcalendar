// features/widgets/components/TodayTodosWidget.tsx
import { CheckSquare } from "lucide-react";
import { WidgetCard, WidgetEmpty } from "./WidgetCard";
import { getTodayAndOverdueTodos } from "../server/queries";

export async function TodayTodosWidget() {
  let todos: Awaited<ReturnType<typeof getTodayAndOverdueTodos>> = [];
  try {
    todos = await getTodayAndOverdueTodos();
  } catch {
    return (
      <WidgetCard icon={CheckSquare} title="오늘 할 일" href="/todos">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  if (todos.length === 0) {
    return (
      <WidgetCard icon={CheckSquare} title="오늘 할 일" href="/todos">
        <WidgetEmpty icon={CheckSquare} text="할 일이 없어요" />
      </WidgetCard>
    );
  }

  const overdueCount = todos.filter((t) => t.isOverdue).length;
  const undoneCount = todos.filter((t) => !t.completed_at).length;

  return (
    <WidgetCard
      icon={CheckSquare}
      title="오늘 할 일"
      href="/todos"
      trailing={
        overdueCount > 0 ? (
          <span className="text-red-600">밀린 {overdueCount}</span>
        ) : (
          `${undoneCount}개`
        )
      }
    >
      <div className="mb-3 flex items-baseline gap-2">
        <span
          className={`text-3xl font-bold tabular-nums ${overdueCount > 0 ? "text-red-600" : ""}`}
        >
          {undoneCount}
        </span>
        <span className="text-sm text-muted-foreground">개 남음</span>
      </div>
      <ul className="space-y-1 border-t pt-3">
        {todos.slice(0, 4).map((t) => (
          <li
            key={t.id}
            className={`flex items-center gap-1.5 ${
              t.completed_at ? "line-through text-muted-foreground" : ""
            }`}
          >
            <span className="text-xs">{t.completed_at ? "☑" : "☐"}</span>
            {t.emoji && <span>{t.emoji}</span>}
            <span className="truncate">{t.title}</span>
            {t.isOverdue && (
              <span className="ml-auto text-xs text-red-600">밀림</span>
            )}
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
