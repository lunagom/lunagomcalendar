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

type Props = {
  currentMonth: string; // "YYYY-MM"
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

export function ExpensePage({ currentMonth }: Props) {
  const router = useRouter();
  const [year, monthNum] = currentMonth.split("-");
  const monthLabel = `${year}년 ${Number(monthNum)}월`;
  const isThisMonth = currentMonth === thisMonthIso();

  const goMonth = (delta: -1 | 1) => {
    router.push(`/expense?month=${shiftMonth(currentMonth, delta)}`);
  };
  const goToday = () => {
    router.push(`/expense?month=${thisMonthIso()}`);
  };

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b">
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
        <Button
          variant="outline"
          size="sm"
          onClick={goToday}
          disabled={isThisMonth}
        >
          오늘
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList>
            <TabsTrigger value="monthly">월간</TabsTrigger>
            <TabsTrigger value="subscriptions">구독</TabsTrigger>
            <TabsTrigger value="budgets">예산</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="mt-4">
            <p className="text-sm text-muted-foreground py-8 text-center">
              월간 지출 캘린더가 들어갈 자리 (단위 C-2 에서 구현)
            </p>
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-4">
            <p className="text-sm text-muted-foreground py-8 text-center">
              구독 트래커가 들어갈 자리 (단위 D 에서 구현)
            </p>
          </TabsContent>

          <TabsContent value="budgets" className="mt-4">
            <p className="text-sm text-muted-foreground py-8 text-center">
              카테고리별 예산 설정이 들어갈 자리 (단위 E 에서 구현)
            </p>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
