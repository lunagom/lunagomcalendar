// app/(app)/todos/page.tsx
import { TodosPage } from "@/features/todos/components/TodosPage";
import {
  getOverdueTodos,
  getTodosForDate,
} from "@/features/todos/server/queries";

export const metadata = { title: "오늘의 할 일" };

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function TodosRoute() {
  const today = todayIso();
  const [todayTodos, overdueTodos] = await Promise.all([
    getTodosForDate(today),
    getOverdueTodos(today),
  ]);
  return (
    <TodosPage
      todayIso={today}
      todayTodos={todayTodos}
      overdueTodos={overdueTodos}
    />
  );
}
