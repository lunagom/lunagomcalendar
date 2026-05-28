// features/expense/components/ExpensePage.tsx
"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ExpenseMonthGrid } from "./ExpenseMonthGrid";
import { MonthTargetWidget } from "./MonthTargetWidget";
import { CategoryTotalsBar } from "./CategoryTotalsBar";
import { MonthSummaryWidget } from "./MonthSummaryWidget";
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

  // 월 요약은 일회성 + 활성 정기까지 모두 포함 (가계부의 진짜 월 흐름)
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

  const isProfit = totalIncome - totalExpense > 0;

  const goMonth = (delta: -1 | 1) => {
    router.push(`/expense?month=${shiftMonth(currentMonth, delta)}`);
  };
  const goToday = () => {
    router.push(`/expense?month=${thisMonthIso()}`);
  };

  return (
    <div className="h-full flex flex-col">
      <header className="px-4 py-3 border-b">
        {/* 모바일: 2행 스택 — 1행 (오늘 + 월 네비), 2행 (월 목표 위젯) */}
        <div className="flex flex-col gap-2 sm:hidden">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToday}
              disabled={isThisMonth}
            >
              오늘
            </Button>
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => goMonth(-1)}
                aria-label="이전 달"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
              </Button>
              <h1 className="text-lg font-semibold px-1">{monthLabel}</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => goMonth(1)}
                aria-label="다음 달"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <MonthTargetWidget
              month={currentMonth}
              target={target}
              actual={actual}
            />
          </div>
        </div>

        {/* 데스크톱: 기존 3단 한 줄 — 좌(오늘) | 중(월 네비) | 우(위젯) */}
        <div className="hidden sm:flex sm:items-center sm:gap-2">
          <div className="flex-1 flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={goToday}
              disabled={isThisMonth}
            >
              오늘
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goMonth(-1)}
              aria-label="이전 달"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold px-1">{monthLabel}</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goMonth(1)}
              aria-label="다음 달"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 flex justify-end">
            <MonthTargetWidget
              month={currentMonth}
              target={target}
              actual={actual}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 월 요약 위젯 + 흑자 격려 메시지 */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <MonthSummaryWidget
              totalIncome={totalIncome}
              totalExpense={totalExpense}
            />
          </div>
          {isProfit && (
            <p className="text-xs text-muted-foreground shrink-0">
              이번 달 흑자네요 ✨
            </p>
          )}
        </div>

        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="monthly">월간</TabsTrigger>
            <TabsTrigger value="subscriptions">정기 결제</TabsTrigger>
            <TabsTrigger value="recurring_incomes">정기 수입</TabsTrigger>
            <TabsTrigger value="budgets">예산</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="mt-4 space-y-4">
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
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-4">
            <SubscriptionTabContent
              subscriptions={subscriptions}
              usedCategories={usedCategories}
            />
          </TabsContent>

          <TabsContent value="recurring_incomes" className="mt-4">
            <RecurringIncomeTabContent
              items={recurringIncomes}
              usedCategories={usedCategories}
            />
          </TabsContent>

          <TabsContent value="budgets" className="mt-4">
            <BudgetTabContent
              month={currentMonth}
              budgets={budgets}
              totalsByCategory={totalsByCategory}
              usedCategories={usedCategories}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
