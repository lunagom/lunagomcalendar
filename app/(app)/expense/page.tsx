import { ExpensePage } from "@/features/expense/components/ExpensePage";
import { isSubscriptionActiveForMonth } from "@/lib/subscription";
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
  // 시작일 이전 달 또는 종료일 다음 달은 제외 (시작/끝 둘 다 포함)
  const activeSubscriptions = subscriptions.filter((s) =>
    isSubscriptionActiveForMonth(s, month),
  );

  const expenseSum = expenses.reduce((s, e) => s + e.amount, 0);
  const activeSubscriptionSum = activeSubscriptions.reduce(
    (s, sub) => s + sub.amount,
    0,
  );
  const actual = expenseSum + activeSubscriptionSum;

  const totalsByCategory: Record<string, number> = {};
  for (const e of expenses) {
    totalsByCategory[e.category] =
      (totalsByCategory[e.category] ?? 0) + e.amount;
  }
  for (const sub of activeSubscriptions) {
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
