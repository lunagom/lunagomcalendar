// features/expense/components/ExpensePage.tsx
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ExpensePageHeader } from "./ExpensePageHeader";
import { ExpenseSummary } from "./ExpenseSummary";
import { ExpenseFloatingActionButton } from "./ExpenseFloatingActionButton";
import { ExpenseMonthGrid } from "./ExpenseMonthGrid";
import { MonthTargetWidget } from "./MonthTargetWidget";
import { CategoryTotalsBar } from "./CategoryTotalsBar";
import { SubscriptionTabContent } from "./SubscriptionTabContent";
import { RecurringIncomeTabContent } from "./RecurringIncomeTabContent";
import { BudgetTabContent } from "./BudgetTabContent";
import type {
  BudgetRow,
  ExpenseRow,
  IncomeRow,
  MonthlyTargetRow,
  RecurringIncomeRow,
  SubscriptionRow,
} from "../server/queries";

type Props = {
  currentMonth: string; // "YYYY-MM"
  expenses: ExpenseRow[];
  incomes: IncomeRow[];
  usedCategories: string[];
  target: MonthlyTargetRow | null;
  actual: number;
  totalsByCategory: Record<string, number>;
  totalsByIncomeCategory: Record<string, number>;
  subscriptions: SubscriptionRow[];
  recurringIncomes: RecurringIncomeRow[];
  budgets: BudgetRow[];
};

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function thisMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const stagger = (idx: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: idx * 0.06, ease: "easeOut" as const },
});

const tabContentMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};

export function ExpensePage({
  currentMonth,
  expenses,
  incomes,
  usedCategories,
  target,
  actual,
  totalsByCategory,
  totalsByIncomeCategory,
  subscriptions,
  recurringIncomes,
  budgets,
}: Props) {
  const router = useRouter();
  const [year, monthNum] = currentMonth.split("-");
  const monthLabel = `${year}년 ${Number(monthNum)}월`;
  const isThisMonth = currentMonth === thisMonthIso();

  const oneOffIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const recurringIncomeSum = recurringIncomes
    .filter((r) => r.is_active)
    .reduce((s, r) => s + r.amount, 0);
  const totalIncome = oneOffIncome + recurringIncomeSum;

  const oneOffExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const recurringExpenseSum = subscriptions
    .filter((s) => s.is_active)
    .reduce((sum, sub) => sum + sub.amount, 0);
  const totalExpense = oneOffExpense + recurringExpenseSum;

  const goMonth = (delta: -1 | 1) => {
    router.push(`/expense?month=${shiftMonth(currentMonth, delta)}`);
  };
  const goToday = () => {
    router.push(`/expense?month=${thisMonthIso()}`);
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8 space-y-4">
      <motion.div {...stagger(0)}>
        <ExpensePageHeader
          monthLabel={monthLabel}
          currentMonth={currentMonth}
          usedCategories={usedCategories}
          onPrev={() => goMonth(-1)}
          onNext={() => goMonth(1)}
          onToday={goToday}
          isThisMonth={isThisMonth}
        />
      </motion.div>

      <motion.div {...stagger(1)}>
        <ExpenseSummary
          totalIncome={totalIncome}
          totalExpense={totalExpense}
        />
      </motion.div>

      <motion.div {...stagger(2)}>
        <MonthTargetWidget
          month={currentMonth}
          target={target}
          actual={actual}
        />
      </motion.div>

      <motion.div {...stagger(3)}>
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="monthly">월간</TabsTrigger>
            <TabsTrigger value="subscriptions">정기 결제</TabsTrigger>
            <TabsTrigger value="recurring_incomes">정기 수입</TabsTrigger>
            <TabsTrigger value="budgets">예산</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="mt-4">
            <motion.div {...tabContentMotion} className="space-y-4">
              <CategoryTotalsBar
                expenseTotals={totalsByCategory}
                incomeTotals={totalsByIncomeCategory}
              />
              <ExpenseMonthGrid
                month={currentMonth}
                expenses={expenses}
                incomes={incomes}
                usedCategories={usedCategories}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-4">
            <motion.div {...tabContentMotion}>
              <SubscriptionTabContent
                subscriptions={subscriptions}
                usedCategories={usedCategories}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="recurring_incomes" className="mt-4">
            <motion.div {...tabContentMotion}>
              <RecurringIncomeTabContent
                items={recurringIncomes}
                usedCategories={usedCategories}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="budgets" className="mt-4">
            <motion.div {...tabContentMotion}>
              <BudgetTabContent
                month={currentMonth}
                budgets={budgets}
                totalsByCategory={totalsByCategory}
                usedCategories={usedCategories}
              />
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      <ExpenseFloatingActionButton usedCategories={usedCategories} />
    </div>
  );
}
