// app/(app)/todos/page.tsx
import { WeekBoard } from "@/features/todos/components/WeekBoard";
import {
  getOverdueTodos,
  getTodosForWeek,
} from "@/features/todos/server/queries";
import { getWeekStart } from "@/features/todos/lib/week";

export const metadata = { title: "주간 할 일" };

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;

type Props = {
  searchParams?: { week?: string };
};

export default async function TodosRoute({ searchParams }: Props) {
  const today = todayIso();
  const weekParam = searchParams?.week;
  const weekStart =
    weekParam && WEEK_RE.test(weekParam)
      ? getWeekStart(weekParam)
      : getWeekStart(new Date(today));

  const [weekResult, overdueTodos] = await Promise.all([
    getTodosForWeek(weekStart),
    getOverdueTodos(today),
  ]);

  return (
    <WeekBoard
      weekStartIso={weekStart}
      todayIso={today}
      weekTodos={weekResult.todos}
      virtualTodos={weekResult.virtual}
      overdueTodos={overdueTodos}
    />
  );
}
