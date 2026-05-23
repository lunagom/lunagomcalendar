import { ExpensePage } from "@/features/expense/components/ExpensePage";
import {
  getExpensesForMonth,
  getMonthlyTarget,
  getSubscriptions,
  getUsedCategories,
} from "@/features/expense/server/queries";

export const metadata = { title: "가계부" };

type Props = { searchParams: { month?: string } };

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
  const [expenses, usedCategories, target, subscriptions] = await Promise.all([
    getExpensesForMonth(month),
    getUsedCategories(),
    getMonthlyTarget(month),
    getSubscriptions(),
  ]);
  const actual = expenses.reduce((s, e) => s + e.amount, 0);
  const totalsByCategory: Record<string, number> = {};
  for (const e of expenses) {
    totalsByCategory[e.category] = (totalsByCategory[e.category] ?? 0) + e.amount;
  }
  return (
    <ExpensePage
      currentMonth={month}
      expenses={expenses}
      usedCategories={usedCategories}
      target={target}
      actual={actual}
      totalsByCategory={totalsByCategory}
      subscriptions={subscriptions}
    />
  );
}
