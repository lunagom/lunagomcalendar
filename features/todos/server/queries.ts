// features/todos/server/queries.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

/** 특정 날짜의 할 일 (이 날 scheduled). */
export async function getTodosForDate(dateString: string): Promise<TaskRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("scheduled_date", dateString)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

/** 오늘 이전 + 미완료 = 밀린 항목. 오래된 순. */
export async function getOverdueTodos(todayString: string): Promise<TaskRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .lt("scheduled_date", todayString)
    .is("completed_at", null)
    .order("scheduled_date");
  if (error) throw error;
  return data ?? [];
}

/** 월 그리드 셀들에 분배할 용도. 6주 범위 모든 task. */
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

  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .gte("scheduled_date", toIso(startDate))
    .lt("scheduled_date", toIso(endDate))
    .order("scheduled_date");
  if (error) throw error;
  return data ?? [];
}
