// features/widgets/server/queries.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getMyIncomingInvites } from "@/features/social/server/queries";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function thisMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type TodayEvent = {
  id: string;
  title: string;
  start_at: string;
  color: string | null;
  calendar_color: string;
};

/** 오늘 일정 (시간순). 종일 포함. */
export async function getTodayEvents(): Promise<TodayEvent[]> {
  const supabase = createClient();
  const today = todayIso();
  const start = new Date(`${today}T00:00:00`).toISOString();
  const end = new Date(`${today}T23:59:59.999`).toISOString();

  const { data, error } = await supabase
    .from("events")
    .select("id, title, start_at, color, calendar_id, calendars(color)")
    .gte("start_at", start)
    .lte("start_at", end)
    .order("start_at");
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    color: e.color,
    calendar_color:
      (e.calendars as { color?: string } | null)?.color ?? "#888",
  }));
}

export type UpcomingEvent = TodayEvent;

/** 내일~7일 후 일정 (오늘 제외). */
export async function getUpcomingEvents(): Promise<UpcomingEvent[]> {
  const supabase = createClient();
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const sevenDaysLater = new Date(tomorrow);
  sevenDaysLater.setDate(tomorrow.getDate() + 7);

  const { data, error } = await supabase
    .from("events")
    .select("id, title, start_at, color, calendar_id, calendars(color)")
    .gte("start_at", tomorrow.toISOString())
    .lt("start_at", sevenDaysLater.toISOString())
    .order("start_at")
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    color: e.color,
    calendar_color:
      (e.calendars as { color?: string } | null)?.color ?? "#888",
  }));
}

export type MonthExpenseSummary = {
  actual: number;
  target: number | null;
};

/** 이번 달 지출 합계 + 월 목표. */
export async function getMonthExpenseSummary(): Promise<MonthExpenseSummary> {
  const supabase = createClient();
  const month = thisMonthIso();
  const start = new Date(`${month}-01T00:00:00`).toISOString();
  const next = new Date(`${month}-01T00:00:00`);
  next.setMonth(next.getMonth() + 1);

  const [expRes, targetRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("amount")
      .gte("paid_at", start)
      .lt("paid_at", next.toISOString()),
    supabase
      .from("monthly_targets")
      .select("amount")
      .eq("month", month)
      .maybeSingle(),
  ]);
  if (expRes.error) throw expRes.error;
  const actual = (expRes.data ?? []).reduce((s, e) => s + e.amount, 0);
  return { actual, target: targetRes.data?.amount ?? null };
}

export type CategoryTotal = { category: string; amount: number };

/** 이번 달 카테고리별 지출 (금액 내림차순). */
export async function getCategoryTotals(): Promise<CategoryTotal[]> {
  const supabase = createClient();
  const month = thisMonthIso();
  const start = new Date(`${month}-01T00:00:00`).toISOString();
  const next = new Date(`${month}-01T00:00:00`);
  next.setMonth(next.getMonth() + 1);

  const { data, error } = await supabase
    .from("expenses")
    .select("category, amount")
    .gte("paid_at", start)
    .lt("paid_at", next.toISOString());
  if (error) throw error;
  const map = new Map<string, number>();
  for (const e of data ?? []) {
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export type TodayTodo = {
  id: string;
  title: string;
  emoji: string | null;
  completed_at: string | null;
  scheduled_date: string;
  isOverdue: boolean;
};

/** 오늘 할 일 + 밀린(미완료, scheduled_date < today). 최대 8개. */
export async function getTodayAndOverdueTodos(): Promise<TodayTodo[]> {
  const supabase = createClient();
  const today = todayIso();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, emoji, completed_at, scheduled_date")
    .lte("scheduled_date", today)
    .order("scheduled_date", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .filter((t) => t.scheduled_date === today || !t.completed_at)
    .slice(0, 8)
    .map((t) => ({
      ...t,
      isOverdue: t.scheduled_date < today && !t.completed_at,
    }));
}

export type MonthSummary = {
  totalIncome: number;
  totalExpense: number;
};

/**
 * 이번 달 월 요약 — 일회성 + 활성 정기 모두 합산.
 *   수입 = incomes(이번 달) + 활성 recurring_incomes
 *   지출 = expenses(이번 달) + 활성 subscriptions
 */
export async function getMonthSummary(): Promise<MonthSummary> {
  const supabase = createClient();
  const month = thisMonthIso();
  const start = new Date(`${month}-01T00:00:00`).toISOString();
  const next = new Date(`${month}-01T00:00:00`);
  next.setMonth(next.getMonth() + 1);
  const end = next.toISOString();

  const [expRes, incRes, subRes, rincRes] = await Promise.all([
    supabase.from("expenses").select("amount").gte("paid_at", start).lt("paid_at", end),
    supabase.from("incomes").select("amount").gte("received_at", start).lt("received_at", end),
    supabase.from("subscriptions").select("amount, is_active"),
    supabase.from("recurring_incomes").select("amount, is_active"),
  ]);
  if (expRes.error) throw expRes.error;
  if (incRes.error) throw incRes.error;
  if (subRes.error) throw subRes.error;
  if (rincRes.error) throw rincRes.error;

  const oneOffExpense = (expRes.data ?? []).reduce((s, e) => s + e.amount, 0);
  const oneOffIncome = (incRes.data ?? []).reduce((s, i) => s + i.amount, 0);
  const activeSub = (subRes.data ?? [])
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + s.amount, 0);
  const activeRecurringIncome = (rincRes.data ?? [])
    .filter((r) => r.is_active)
    .reduce((sum, r) => sum + r.amount, 0);

  return {
    totalIncome: oneOffIncome + activeRecurringIncome,
    totalExpense: oneOffExpense + activeSub,
  };
}

/** social 의 받은 초대 — 재export (위젯에서 직접 사용). */
export { getMyIncomingInvites };
