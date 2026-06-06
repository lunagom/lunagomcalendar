"use client";

import { createClient } from "@/lib/supabase/client";

export async function fetchCurrentMonthCalendarEvents(): Promise<
  Array<{ date: string; color: string; title: string }>
> {
  const supabase = createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const { data } = await supabase
    .from("events")
    .select("start_at, color, title")
    .gte("start_at", monthStart.toISOString())
    .lte("start_at", monthEnd.toISOString())
    .order("start_at", { ascending: true });
  if (!data) return [];
  return data.map((row) => ({
    date: new Date(row.start_at).toISOString().slice(0, 10),
    color: row.color ?? "#6B7280",
    title: row.title ?? "",
  }));
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
