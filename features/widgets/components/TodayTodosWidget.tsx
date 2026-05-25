// features/widgets/components/TodayTodosWidget.tsx
import { CheckSquare } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { getTodayAndOverdueTodos } from "../server/queries";

export async function TodayTodosWidget() {
  let todos: Awaited<ReturnType<typeof getTodayAndOverdueTodos>> = [];
  try {
    todos = await getTodayAndOverdueTodos();
  } catch {
    return (
      <WidgetCard icon={CheckSquare} title="오늘 할 일">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  const overdueCount = todos.filter((t) => t.isOverdue).length;

  return (
    <WidgetCard
      icon={CheckSquare}
      title="오늘 할 일"
      trailing={
        overdueCount > 0 ? (
          <span className="text-red-600">밀린 {overdueCount}</span>
        ) : (
          `${todos.length}개`
        )
      }
    >
      {todos.length === 0 ? (
        <p className="text-muted-foreground">할 일이 없어요</p>
      ) : (
        <ul className="space-y-1">
          {todos.map((t) => (
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
      )}
    </WidgetCard>
  );
}
