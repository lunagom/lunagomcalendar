import "server-only";
import { createClient } from "@/lib/supabase/server";

export type WeekStripDay = {
  iso: string;
  isToday: boolean;
  hasEvent: boolean;
  hasTodo: boolean;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 오늘부터 다음 6일 (총 7일) 의 일정/할 일 존재 여부.
 */
export async function getWeekStripDays(): Promise<WeekStripDay[]> {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(today);
  last.setDate(today.getDate() + 7);

  const todayIso = isoOf(today);
  const lastIso = isoOf(last);

  const [eventsRes, todosRes] = await Promise.all([
    supabase
      .from("events")
      .select("start_at")
      .gte("start_at", today.toISOString())
      .lt("start_at", last.toISOString()),
    supabase
      .from("tasks")
      .select("scheduled_date")
      .gte("scheduled_date", todayIso)
      .lt("scheduled_date", lastIso)
      .eq("is_recurring", false),
  ]);

  const eventDates = new Set<string>();
  for (const e of eventsRes.data ?? []) {
    if (e.start_at) eventDates.add(e.start_at.slice(0, 10));
  }
  const todoDates = new Set<string>();
  for (const t of todosRes.data ?? []) {
    if (t.scheduled_date) todoDates.add(t.scheduled_date);
  }

  const out: WeekStripDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = isoOf(d);
    out.push({
      iso,
      isToday: i === 0,
      hasEvent: eventDates.has(iso),
      hasTodo: todoDates.has(iso),
    });
  }
  return out;
}
