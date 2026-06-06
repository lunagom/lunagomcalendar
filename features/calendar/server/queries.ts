// features/calendar/server/queries.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { unfoldRecurringEvent } from "@/features/calendar/lib/event-recurrence";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type CalendarRow = Database["public"]["Tables"]["calendars"]["Row"];

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 반복 원본을 가상 인스턴스 EventRow 들로 펼침 (해당 날짜의 start_at/end_at 으로 갱신). */
function expandRecurring(
  parent: EventRow,
  rangeStartIso: string,
  rangeEndIso: string,
): EventRow[] {
  const virtual = unfoldRecurringEvent(
    {
      id: parent.id,
      start_at: parent.start_at,
      end_at: parent.end_at,
      title: parent.title,
      is_recurring: parent.is_recurring,
      recurrence_rule: parent.recurrence_rule,
      recurrence_until: parent.recurrence_until,
      recurrence_count: parent.recurrence_count,
    },
    rangeStartIso,
    rangeEndIso,
  );

  // 원본 일자와 같은 가상은 원본이 차지 — 중복 제거
  const parentDate = parent.start_at.slice(0, 10);
  const parentStartTime = parent.start_at.slice(10); // "THH:MM:..."
  const parentEndTime = parent.end_at.slice(10);

  return virtual
    .filter((v) => v.date !== parentDate)
    .map((v) => ({
      ...parent,
      id: v.id, // "virtual-{parentId}-{date}"
      start_at: `${v.date}${parentStartTime}`,
      end_at: `${v.date}${parentEndTime}`,
    }));
}

/**
 * 특정 월의 일정 fetch.
 * monthString: "YYYY-MM"
 * 월 그리드는 앞뒤 다른 달의 일부도 보여주므로, 6주(42일) 범위로 확장.
 * 반복 원본은 가상 인스턴스로 펼쳐서 합쳐 반환 (id 가 "virtual-" 로 시작).
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

  // 그 범위 안의 단발 일정 + 모든 반복 원본 (시작일이 그 범위에 포함되든 안 되든)
  const { data: rangeData, error: e1 } = await supabase
    .from("events")
    .select("*")
    .gte("start_at", startDate.toISOString())
    .lt("start_at", endDate.toISOString())
    .order("start_at");
  if (e1) throw e1;

  const { data: recurringData, error: e2 } = await supabase
    .from("events")
    .select("*")
    .eq("is_recurring", true);
  if (e2) throw e2;

  const real = rangeData ?? [];
  const allRecurring = recurringData ?? [];

  // 가상 인스턴스 펼치기
  const rangeStartIso = isoDate(startDate);
  const rangeEndIso = isoDate(new Date(endDate.getTime() - 1)); // exclusive → 포함 일자
  const virtualRows: EventRow[] = [];
  for (const p of allRecurring) {
    virtualRows.push(...expandRecurring(p, rangeStartIso, rangeEndIso));
  }

  return [...real, ...virtualRows].sort((a, b) =>
    a.start_at.localeCompare(b.start_at),
  );
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
