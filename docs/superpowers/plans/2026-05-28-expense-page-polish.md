# 가계부 페이지 폴리시 강화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 가계부 페이지에 페이지 헤더 + 색강조 요약 + 탭 fade 전환 + 모바일 FAB + 빈상태 통일 + stagger 진입.

**Architecture:** 3개 신규 컴포넌트 (ExpensePageHeader, ExpenseSummary, ExpenseFloatingActionButton) 만들고 ExpensePage 헤더 통합 + 탭 framer-motion fade + 빈상태 4곳 EmptyState 적용.

**Tech Stack:** Next.js 14, React 18, framer-motion, shadcn/ui, lucide-react.

**Spec 출처:** `docs/superpowers/specs/2026-05-28-expense-page-polish-design.md`

---

## File Structure

### Create
- `features/expense/components/ExpensePageHeader.tsx` — 페이지 헤더 (h1 + 월 네비 + 데스크탑 + 거래 버튼)
- `features/expense/components/ExpenseSummary.tsx` — 순수익/수입/지출 카드 그룹 (AnimatedNumber 적용 + 색 강조)
- `features/expense/components/ExpenseFloatingActionButton.tsx` — 모바일 FAB

### Modify
- `features/expense/components/ExpensePage.tsx` — 헤더 교체, ExpenseSummary 사용, 탭 fade, FAB 마운트, stagger
- `features/expense/components/ExpenseMonthGrid.tsx` — 빈 상태 EmptyState
- `features/expense/components/SubscriptionList.tsx` — 빈 상태 EmptyState
- `features/expense/components/RecurringIncomeList.tsx` — 빈 상태 EmptyState
- `features/expense/components/BudgetTabContent.tsx` — 빈 상태 EmptyState

### Keep
- `MonthSummaryWidget.tsx` — 신규 ExpenseSummary 가 대체 (삭제 검토는 사용처 확인 후)
- `MonthTargetWidget.tsx` — 그대로 (월 목표 편집 기능)
- 4개 탭 콘텐츠 (CategoryTotalsBar 등) — 기능 그대로

---

## Task 1: ExpensePageHeader

**Files:**
- Create: `features/expense/components/ExpensePageHeader.tsx`

- [ ] **Step 1: 작성**

`features/expense/components/ExpensePageHeader.tsx` 생성:

```tsx
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionModal } from "./TransactionModal";

type Props = {
  monthLabel: string;
  currentMonth: string;
  usedCategories: string[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isThisMonth: boolean;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 가계부 페이지 헤더 — h1 + 월 네비 + 데스크탑 (+ 거래) 버튼.
 * 모바일 (+ 거래) 는 FloatingActionButton 으로 별도.
 */
export function ExpensePageHeader({
  monthLabel,
  usedCategories,
  onPrev,
  onNext,
  onToday,
  isThisMonth,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="space-y-2 mb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">가계부</h1>
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className="hidden md:inline-flex gap-1.5 active:scale-[0.98] transition-transform"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            거래
          </Button>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <h2 className="text-lg font-semibold tabular-nums">{monthLabel}</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onPrev}
            aria-label="이전 달"
            className="h-7 w-7"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onNext}
            aria-label="다음 달"
            className="h-7 w-7"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onToday}
            disabled={isThisMonth}
            className="h-7"
          >
            오늘
          </Button>
        </div>
      </header>

      <TransactionModal
        mode="create"
        open={open}
        onOpenChange={setOpen}
        defaultType="expense"
        defaultDate={todayIso()}
        usedCategories={usedCategories}
      />
    </>
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add features/expense/components/ExpensePageHeader.tsx
git commit -m "$(cat <<'EOF'
feat(expense): ExpensePageHeader — h1 + 월 네비 + 데스크탑 거래 버튼

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: ExpenseSummary (AnimatedNumber + 색강조)

**Files:**
- Create: `features/expense/components/ExpenseSummary.tsx`

- [ ] **Step 1: 작성**

`features/expense/components/ExpenseSummary.tsx` 생성:

```tsx
"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { AnimatedNumber } from "@/features/widgets/components/AnimatedNumber";

type Props = {
  totalIncome: number;
  totalExpense: number;
};

/**
 * 가계부 페이지 요약 카드 그룹.
 * - 순수익을 큰 카드로 (좌측 또는 상단)
 * - 수입/지출을 작은 보조 카드 (우측 또는 하단 좌우)
 * - 색: 수입 green, 지출 red, 순수익 상태 기반
 * - 모든 숫자 AnimatedNumber (0 → 실제 부드럽게)
 */
export function ExpenseSummary({ totalIncome, totalExpense }: Props) {
  const net = totalIncome - totalExpense;
  const isPositive = net > 0;
  const isNeutral = net === 0;

  const netColorCls = isNeutral
    ? "text-muted-foreground"
    : isPositive
      ? "text-[#16A34A] dark:text-[#4ADE80]"
      : "text-[#DC2626] dark:text-[#F87171]";
  const NetIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* 순수익 — 데스크탑 2 컬럼 폭 */}
      <div className="rounded-lg border bg-card p-4 sm:col-span-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">순수익</p>
          {!isNeutral && (
            <NetIcon className={`h-4 w-4 ${netColorCls}`} strokeWidth={1.8} />
          )}
        </div>
        <p className={`mt-1 text-3xl font-bold tabular-nums ${netColorCls}`}>
          {isPositive ? "+" : isNeutral ? "" : "-"}
          <AnimatedNumber value={Math.abs(net)} unit="원" />
        </p>
      </div>

      {/* 수입 + 지출 — 모바일 가로 2개, 데스크탑 세로 stack */}
      <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">수입</p>
          <p className="text-lg font-semibold tabular-nums text-[#16A34A] dark:text-[#4ADE80]">
            +<AnimatedNumber value={totalIncome} unit="원" />
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">지출</p>
          <p className="text-lg font-semibold tabular-nums text-[#DC2626] dark:text-[#F87171]">
            -<AnimatedNumber value={totalExpense} unit="원" />
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add features/expense/components/ExpenseSummary.tsx
git commit -m "$(cat <<'EOF'
feat(expense): ExpenseSummary — 순수익 큰 카드 + 수입/지출 작은 카드 + AnimatedNumber

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: ExpenseFloatingActionButton (모바일 FAB)

**Files:**
- Create: `features/expense/components/ExpenseFloatingActionButton.tsx`

- [ ] **Step 1: 작성**

`features/expense/components/ExpenseFloatingActionButton.tsx` 생성:

```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TransactionModal } from "./TransactionModal";

type Props = {
  usedCategories: string[];
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 모바일 전용 + 거래 floating action button.
 * 캘린더 페이지의 FAB 와 동일 패턴 (h-14 w-14 rounded-full fixed bottom-20 right-4).
 */
export function ExpenseFloatingActionButton({ usedCategories }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform flex items-center justify-center"
        aria-label="거래 추가"
      >
        <Plus className="h-6 w-6" strokeWidth={2.2} />
      </button>
      <TransactionModal
        mode="create"
        open={open}
        onOpenChange={setOpen}
        defaultType="expense"
        defaultDate={todayIso()}
        usedCategories={usedCategories}
      />
    </>
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add features/expense/components/ExpenseFloatingActionButton.tsx
git commit -m "$(cat <<'EOF'
feat(expense): ExpenseFloatingActionButton — 모바일 + 거래 FAB

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: ExpensePage 통합 (헤더 교체 + 요약 교체 + 탭 fade + FAB + stagger)

**Files:**
- Modify: `features/expense/components/ExpensePage.tsx`

- [ ] **Step 1: ExpensePage.tsx 전체 교체**

`features/expense/components/ExpensePage.tsx` 를 다음으로 교체:

```tsx
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
```

- [ ] **Step 2: 타입체크 + 페이지 200**

```bash
pnpm tsc --noEmit
curl -s -o /dev/null -w "/expense: %{http_code}\n" http://localhost:3000/expense
```
Expected: tsc 0, curl 307

- [ ] **Step 3: Commit**

```bash
git add features/expense/components/ExpensePage.tsx
git commit -m "$(cat <<'EOF'
feat(expense): ExpensePage 통합 — 신규 헤더 + ExpenseSummary + 탭 fade + FAB + stagger

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 빈 상태 EmptyState 통일

**Files:**
- Modify: `features/expense/components/ExpenseMonthGrid.tsx`
- Modify: `features/expense/components/SubscriptionList.tsx`
- Modify: `features/expense/components/RecurringIncomeList.tsx`
- Modify: `features/expense/components/BudgetTabContent.tsx`

- [ ] **Step 1: 각 파일에서 빈 상태 찾기**

Grep / Read 하여 패턴 확인:
- "거래가 아직 없어요" 또는 비슷
- "등록된 정기 결제가 없어요" 또는 비슷
- "정기 수입이 없어요" 또는 비슷
- "설정된 예산이 없어요" 또는 비슷

각 빈 상태 패턴을 `<EmptyState message="..." />` 로 교체.

Import: `import { EmptyState } from "@/components/ui/empty-state";`

빈 상태가 큰 영역(페이지 단위) 인 경우만 EmptyState 적용. 카드 내부 작은 공간은 기존 텍스트 유지.

- [ ] **Step 2: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add features/expense/components
git commit -m "$(cat <<'EOF'
style(expense): 빈 상태 EmptyState 통일 — 월간/정기결제/정기수입/예산

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 최종 회귀 + push

- [ ] **Step 1: 전체 검증**

```bash
cd /c/dev/lunabear-calendar
pnpm tsc --noEmit
pnpm lint
curl -s -o /dev/null -w "/expense: %{http_code}\n" http://localhost:3000/expense
```
Expected: tsc 0, lint clean, curl 307

- [ ] **Step 2: 시각 회귀 (playwright)**

`/expense` 진입:
- 헤더에 "가계부" h1 + 월 라벨 + 네비
- 데스크탑: `+ 거래` 버튼 헤더 우측
- 모바일: FAB 우측 하단 보임
- 요약 3카드: 순수익 큰 카드 (좌측 데스크탑), 수입/지출 작은 카드
- 숫자 AnimatedNumber (0 → 0 — 어차피 0이라 변화 없음, but no crash)
- 진입 시 헤더 → 요약 → 목표 → 탭 stagger
- 탭 클릭 시 콘텐츠 부드러운 fade 전환
- 모바일 viewport 깨짐 없음
- 다크모드 정상

- [ ] **Step 3: Push**

```bash
git push origin main
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 페이지 헤더 → Task 1
- ✅ 요약 카드 재구성 + 색 강조 + AnimatedNumber → Task 2
- ✅ 모바일 FAB → Task 3
- ✅ ExpensePage 헤더 통합 + 탭 fade + stagger → Task 4
- ✅ 빈 상태 EmptyState → Task 5
- ✅ 회귀 검증 → Task 6

**2. Placeholder scan:** Task 5 에 약간의 유연성 (빈 상태 패턴 grep 후 판단) — 의도적.

**3. Type consistency:** Props 시그니처 유지 (currentMonth, expenses 등 그대로). ExpensePage props 변화 없음 — page.tsx 안 건드림.

**4. 의존성 순서:**
- Task 1, 2, 3 — 독립 (서로 의존 X)
- Task 4 — Task 1, 2, 3 후 (모두 import)
- Task 5 — 독립이지만 Task 4 후 작업하면 효율
- Task 6 — 모두 후

권장 순서: 1 → 2 → 3 → 4 → 5 → 6
