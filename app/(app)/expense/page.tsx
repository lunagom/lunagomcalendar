import { ExpensePage } from "@/features/expense/components/ExpensePage";
import {
  getBudgetsForMonth,
  getExpensesForMonth,
  getIncomesForMonth,
  getMonthlyTarget,
  getMonthlyTotalsByIncomeCategory,
  getRecentMemos,
  getRecurringIncomes,
  getSavingsTotal,
  getSubscriptions,
  getUsedCategories,
} from "@/features/expense/server/queries";
import {
  getCardNames,
  getCardPaymentTotalsForMonth,
} from "@/features/expense/server/card-queries";

export const metadata = { title: "가계부" };

type Props = { searchParams: { month?: string; action?: string } };

function thisMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isValidMonth(m: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}

export default async function ExpenseRoute({ searchParams }: Props) {
  const month =
    searchParams.month && isValidMonth(searchParams.month)
      ? searchParams.month
      : thisMonthIso();
  const [
    expenses,
    incomes,
    usedCategories,
    target,
    subscriptions,
    recurringIncomes,
    budgets,
    totalsByIncomeCategory,
    recentMemos,
    cardNames,
    savingsTotal,
  ] = await Promise.all([
    getExpensesForMonth(month),
    getIncomesForMonth(month),
    getUsedCategories(),
    getMonthlyTarget(month),
    getSubscriptions(),
    getRecurringIncomes(),
    getBudgetsForMonth(month),
    getMonthlyTotalsByIncomeCategory(month),
    getRecentMemos(),
    getCardNames(),
    getSavingsTotal(),
  ]);
  const cardTotals = await getCardPaymentTotalsForMonth(month, cardNames);
  // "실제 소비" = 그 달 지출 + 활성 구독료 합산
  // 카테고리 칩도 같은 기준으로 — 각 구독의 category 에 amount 누적
  // end_date 가 그 달 1일보다 이전인 구독은 제외 (마지막 결제월까지 포함, 그 다음 월부터 빠짐)
  const monthStart = `${month}-01`;
  const isSubscriptionActiveForMonth = (s: (typeof subscriptions)[number]) =>
    s.is_active && (s.end_date === null || s.end_date >= monthStart);

  const expenseSum = expenses.reduce((s, e) => s + e.amount, 0);
  const activeSubscriptionSum = subscriptions
    .filter(isSubscriptionActiveForMonth)
    .reduce((s, sub) => s + sub.amount, 0);
  const actual = expenseSum + activeSubscriptionSum;

  const totalsByCategory: Record<string, number> = {};
  for (const e of expenses) {
    totalsByCategory[e.category] =
      (totalsByCategory[e.category] ?? 0) + e.amount;
  }
  for (const sub of subscriptions) {
    if (!isSubscriptionActiveForMonth(sub)) continue;
    totalsByCategory[sub.category] =
      (totalsByCategory[sub.category] ?? 0) + sub.amount;
  }

  // 수입 카테고리 합계에 활성 정기 수입도 합산
  for (const ri of recurringIncomes) {
    if (!ri.is_active) continue;
    totalsByIncomeCategory[ri.category] =
      (totalsByIncomeCategory[ri.category] ?? 0) + ri.amount;
  }
  return (
    <ExpensePage
      currentMonth={month}
      expenses={expenses}
      incomes={incomes}
      usedCategories={usedCategories}
      target={target}
      actual={actual}
      totalsByCategory={totalsByCategory}
      totalsByIncomeCategory={totalsByIncomeCategory}
      subscriptions={subscriptions}
      recurringIncomes={recurringIncomes}
      budgets={budgets}
      recentMemos={recentMemos}
      cardNames={cardNames}
      cardTotals={cardTotals}
      savingsTotal={savingsTotal}
      initialAction={searchParams.action}
    />
  );
}
