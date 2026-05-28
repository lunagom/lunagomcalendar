// features/todos/server/queries.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { unfoldRecurring, type VirtualTodo } from "../lib/recurrence";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

/** 특정 날짜의 할 일 (이 날 scheduled). is_recurring=false 만 — 원본은 가상으로 펼쳐짐. */
export async function getTodosForDate(dateString: string): Promise<TaskRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("scheduled_date", dateString)
    .eq("is_recurring", false)
    // 미완료 먼저(NULL), 완료된 항목은 맨 아래
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

/** 오늘 이전 + 미완료 = 밀린 항목. is_recurring=false 만. 오래된 순. */
export async function getOverdueTodos(todayString: string): Promise<TaskRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .lt("scheduled_date", todayString)
    .is("completed_at", null)
    .eq("is_recurring", false)
    .order("scheduled_date");
  if (error) throw error;
  return data ?? [];
}

export type WeekTodos = {
  /** 그 주에 실제로 존재하는 task (is_recurring=false). */
  todos: TaskRow[];
  /** 그 주에 펼쳐진 가상 반복 카드. */
  virtual: VirtualTodo[];
};

/** 주(월~일) 범위. 실제 task + 펼친 가상 반복. */
export async function getTodosForWeek(weekStartIso: string): Promise<WeekTodos> {
  const supabase = createClient();
  const [y, m, day] = weekStartIso.split("-").map(Number);
  const endDate = new Date(y, m - 1, day + 7);
  const pad = (n: number) => String(n).padStart(2, "0");
  const endIso = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;

  const [realResult, recurringResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .gte("scheduled_date", weekStartIso)
      .lt("scheduled_date", endIso)
      .eq("is_recurring", false)
      .order("scheduled_date")
      // 미완료 먼저(NULL), 완료된 항목은 컬럼 맨 아래
      .order("completed_at", { ascending: true, nullsFirst: true })
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("tasks")
      .select("*")
      .eq("is_recurring", true)
      .lte("scheduled_date", endIso),
  ]);

  if (realResult.error) throw realResult.error;
  if (recurringResult.error) throw recurringResult.error;

  const todos = realResult.data ?? [];
  const recurring = recurringResult.data ?? [];
  const virtual = unfoldRecurring(recurring, todos, weekStartIso);
  return { todos, virtual };
}

/**
 * 월 그리드 셀들에 분배할 용도. 6주 범위 실제 task 만.
 * (가상 반복 카드는 캘린더 v1 에서는 표시 안 함 — 주간 보드 위주.)
 */
export async function getTodosForMonth(monthString: string): Promise<TaskRow[]> {
  const supabase = createClient();
  const [yearStr, monthStr] = monthString.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;

  const firstOfMonth = new Date(year, monthIdx, 1);
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 42);

  const pad = (n: number) => String(n).padStart(2, "0");
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .gte("scheduled_date", toIso(startDate))
    .lt("scheduled_date", toIso(endDate))
    .eq("is_recurring", false)
    .order("scheduled_date");
  if (error) throw error;
  return data ?? [];
}
