import { ExpensePage } from "@/features/expense/components/ExpensePage";
import {
  getExpensesForMonth,
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
  const [expenses, usedCategories] = await Promise.all([
    getExpensesForMonth(month),
    getUsedCategories(),
  ]);
  return (
    <ExpensePage
      currentMonth={month}
      expenses={expenses}
      usedCategories={usedCategories}
    />
  );
}
