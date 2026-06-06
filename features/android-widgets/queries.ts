"use client";

import { createClient } from "@/lib/supabase/client";
import { unfoldRecurringEvent } from "@/features/calendar/lib/event-recurrence";

export async function fetchCurrentMonthCalendarEvents(): Promise<
  Array<{ date: string; color: string; title: string }>
> {
  const supabase = createClient();
  const now = new Date();
  const year = now.getFullYear();
  const monthIdx = now.getMonth();
  const monthStart = new Date(year, monthIdx, 1);
  const monthEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59);
  const pad = (n: number) => String(n).padStart(2, "0");
  const rangeStartIso = `${year}-${pad(monthIdx + 1)}-01`;
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();
  const rangeEndIso = `${year}-${pad(monthIdx + 1)}-${pad(lastDay)}`;

  // 단발 events: 시작일이 그 달 안 + is_recurring=false
  const { data: singleData } = await supabase
    .from("events")
    .select("start_at, color, title")
    .eq("is_recurring", false)
    .gte("start_at", monthStart.toISOString())
    .lte("start_at", monthEnd.toISOString())
    .order("start_at", { ascending: true });

  // 반복 원본 (시작일이 그 달 밖이어도 포함)
  const { data: recurringData } = await supabase
    .from("events")
    .select(
      "id, start_at, end_at, color, title, is_recurring, recurrence_rule, recurrence_until, recurrence_count",
    )
    .eq("is_recurring", true);

  const out: Array<{ date: string; color: string; title: string }> = [];

  if (singleData) {
    for (const row of singleData) {
      out.push({
        date: new Date(row.start_at).toISOString().slice(0, 10),
        color: row.color ?? "#6B7280",
        title: row.title ?? "",
      });
    }
  }

  if (recurringData) {
    for (const parent of recurringData) {
      const virtual = unfoldRecurringEvent(
        {
          id: parent.id,
          start_at: parent.start_at,
          end_at: parent.end_at,
          title: parent.title ?? "",
          is_recurring: parent.is_recurring,
          recurrence_rule: parent.recurrence_rule,
          recurrence_until: parent.recurrence_until,
          recurrence_count: parent.recurrence_count,
        },
        rangeStartIso,
        rangeEndIso,
      );
      for (const v of virtual) {
        out.push({
          date: v.date,
          color: (parent.color as string | null) ?? "#6B7280",
          title: parent.title ?? "",
        });
      }
    }
  }

  return out;
}

export async function fetchCurrentMonthExpenseTotal(): Promise<number> {
  const supabase = createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const { data } = await supabase
    .from("expenses")
    .select("amount")
    .gte("paid_at", monthStart.toISOString())
    .lte("paid_at", monthEnd.toISOString());
  if (!data) return 0;
  return data.reduce((sum, row) => sum + (row.amount ?? 0), 0);
}
