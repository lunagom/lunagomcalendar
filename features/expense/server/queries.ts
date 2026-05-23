// features/expense/server/queries.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
export type SubscriptionRow =
  Database["public"]["Tables"]["subscriptions"]["Row"];
export type BudgetRow = Database["public"]["Tables"]["budgets"]["Row"];

/** 'YYYY-MM' 의 첫날 00:00 ~ 다음달 00:00 (로컬 시간 → ISO). */
function monthRange(month: string): { startIso: string; endIso: string } {
  const [yStr, mStr] = month.split("-");
  const year = Number(yStr);
  const m = Number(mStr) - 1;
  const start = new Date(year, m, 1);
  const end = new Date(year, m + 1, 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** 특정 월의 지출. paid_at 오름차순. */
export async function getExpensesForMonth(
  month: string,
): Promise<ExpenseRow[]> {
  const supabase = createClient();
  const { startIso, endIso } = monthRange(month);
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("paid_at", startIso)
    .lt("paid_at", endIso)
    .order("paid_at");
  if (error) throw error;
  return data ?? [];
}

/** 특정 날짜 (YYYY-MM-DD) 의 지출. */
export async function getExpensesForDay(date: string): Promise<ExpenseRow[]> {
  const supabase = createClient();
  const start = new Date(date + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("paid_at", start.toISOString())
    .lt("paid_at", end.toISOString())
    .order("paid_at");
  if (error) throw error;
  return data ?? [];
}

/**
 * 월간 카테고리별 합계.
 * { 식비: 123000, 교통: 50000, ... } — 0인 카테고리는 키 없음.
 */
export async function getMonthlyTotalsByCategory(
  month: string,
): Promise<Record<string, number>> {
  const expenses = await getExpensesForMonth(month);
  const totals: Record<string, number> = {};
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amount;
  }
  return totals;
}

/** 모든 구독. 활성 먼저 → 결제일 순. */
export async function getSubscriptions(): Promise<SubscriptionRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .order("is_active", { ascending: false })
    .order("billing_day");
  if (error) throw error;
  return data ?? [];
}

/** 특정 월의 예산 목록. */
export async function getBudgetsForMonth(month: string): Promise<BudgetRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("month", month);
  if (error) throw error;
  return data ?? [];
}

/**
 * 사용자가 이전에 사용한 distinct 카테고리.
 * expenses / subscriptions / budgets / events.expense_category 모두 모은 후 unique.
 * UI 추천 칩에 기본 6개와 합쳐 표시.
 */
export async function getUsedCategories(): Promise<string[]> {
  const supabase = createClient();
  const [exp, sub, bud, evt] = await Promise.all([
    supabase.from("expenses").select("category"),
    supabase.from("subscriptions").select("category"),
    supabase.from("budgets").select("category"),
    supabase
      .from("events")
      .select("expense_category")
      .not("expense_category", "is", null),
  ]);
  if (exp.error) throw exp.error;
  if (sub.error) throw sub.error;
  if (bud.error) throw bud.error;
  if (evt.error) throw evt.error;

  const set = new Set<string>();
  exp.data?.forEach((r) => r.category && set.add(r.category));
  sub.data?.forEach((r) => r.category && set.add(r.category));
  bud.data?.forEach((r) => r.category && set.add(r.category));
  evt.data?.forEach(
    (r) => r.expense_category && set.add(r.expense_category),
  );
  return Array.from(set).sort();
}
