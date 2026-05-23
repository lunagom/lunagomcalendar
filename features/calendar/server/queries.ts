// features/calendar/server/queries.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type CalendarRow = Database["public"]["Tables"]["calendars"]["Row"];

/**
 * 특정 월의 일정 fetch.
 * monthString: "YYYY-MM"
 * 월 그리드는 앞뒤 다른 달의 일부도 보여주므로, 6주(42일) 범위로 확장.
 */
export async function getEventsForMonth(monthString: string): Promise<EventRow[]> {
  const supabase = createClient();
  const [yearStr, monthStr] = monthString.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1; // 0-based

  // 월의 첫날 + 그 주의 일요일까지 뒤로
  const firstOfMonth = new Date(year, monthIdx, 1);
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - firstOfMonth.getDay()); // 일요일 시작

  // 6주 후 (42일)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 42);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("start_at", startDate.toISOString())
    .lt("start_at", endDate.toISOString())
    .order("start_at");

  if (error) throw error;
  return data ?? [];
}

/** 특정 날짜 (단일 일) 의 이벤트. 일간 뷰용. */
export async function getEventsForDay(dateString: string): Promise<EventRow[]> {
  const supabase = createClient();
  const start = new Date(dateString + "T00:00:00");
  const end = new Date(dateString + "T23:59:59.999");

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("start_at", start.toISOString())
    .lte("start_at", end.toISOString())
    .order("start_at");

  if (error) throw error;
  return data ?? [];
}

/** 현재 사용자의 모든 캘린더. */
export async function getCalendars(): Promise<CalendarRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("calendars")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}
