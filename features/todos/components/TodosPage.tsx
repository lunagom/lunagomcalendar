// features/todos/components/TodosPage.tsx
import { TodoSection } from "./TodoSection";
import { QuickAddInput } from "./QuickAddInput";
import type { TaskRow } from "../server/queries";

type Props = {
  todayIso: string;
  todayTodos: TaskRow[];
  overdueTodos: TaskRow[];
};

export function TodosPage({ todayIso, todayTodos, overdueTodos }: Props) {
  const isEmpty = todayTodos.length === 0 && overdueTodos.length === 0;
  const todayLabel = new Date(todayIso).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">오늘의 할 일</h1>
        <p className="text-sm text-muted-foreground">{todayLabel}</p>
      </header>

      {isEmpty ? (
        <p className="text-sm text-muted-foreground py-6">
          오늘 할 일이 없어요. 천천히 하세요.
        </p>
      ) : (
        <>
          {overdueTodos.length > 0 && (
            <TodoSection
              label="밀린 항목"
              todos={overdueTodos}
              todayIso={todayIso}
              variant="overdue"
            />
          )}
          {/* 오늘 섹션은 밀린 항목이 있더라도 항상 표시 (빈 상태엔 안내문) */}
          <TodoSection
            label="오늘"
            todos={todayTodos}
            todayIso={todayIso}
            emptyMessage="오늘 할 일이 없어요"
          />
        </>
      )}

      <QuickAddInput date={todayIso} />
    </div>
  );
}
