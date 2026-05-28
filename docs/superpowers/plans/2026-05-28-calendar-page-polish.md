# 캘린더 페이지 폴리시 강화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캘린더 페이지에 월 라벨 강조 헤더, 월간 통계 칩, 오늘 셀 강조, 월 전환 fade, 이벤트 hover lift, 멀티데이 hover 공유, 모바일 FAB 추가.

**Architecture:** 신규 7개 컴포넌트 (CalendarMonthHeader, CalendarMonthlyStatsChips, FloatingActionButton, EventHoverContext + 보조 utility) 만들고 page.tsx / MonthGrid / DayCell / DraggableEventBar / WeekMultiDayLayer / CalendarShell 통합.

**Tech Stack:** Next.js 14, React 18, framer-motion, Supabase, shadcn/ui, lucide-react.

**Spec 출처:** `docs/superpowers/specs/2026-05-28-calendar-page-polish-design.md`

---

## File Structure

### Create
- `features/calendar/lib/monthly-stats.ts` — events/todos/expenses 합산 utility
- `features/calendar/components/CalendarMonthlyStatsChips.tsx` — 통계 칩 3개
- `features/calendar/components/CalendarMonthHeader.tsx` — 페이지 헤더 통합 (label + chips + actions)
- `features/calendar/components/FloatingActionButton.tsx` — 모바일 FAB
- `features/calendar/lib/event-hover-context.tsx` — 멀티데이 hover 공유

### Modify
- `app/(app)/calendar/page.tsx` — header 통합 + stats 계산
- `features/calendar/components/MonthGrid.tsx` — framer-motion + EventHoverProvider + FAB
- `features/calendar/components/DayCell.tsx` — 오늘 강조 + today pulse + hover desktop only
- `features/calendar/components/DraggableEventBar.tsx` — hover lift + context hookup
- `features/calendar/components/WeekMultiDayLayer.tsx` — segment hover hookup
- `features/calendar/components/CalendarShell.tsx` — 기존 wallet 토글/캘린더 픽커 위치 확인

---

## Task 1: monthly-stats utility

**Files:**
- Create: `features/calendar/lib/monthly-stats.ts`

- [ ] **Step 1: monthly-stats.ts 작성**

`features/calendar/lib/monthly-stats.ts` 생성:

```ts
import { isoToLocalDateKey } from "@/lib/datetime";
import type { EventRow } from "@/features/calendar/server/queries";
import type { TaskRow } from "@/features/todos/server/queries";
import type {
  ExpenseRow,
  IncomeRow,
} from "@/features/expense/server/queries";

export type MonthlyStats = {
  /** 그 달에 시작하는 일정 수 */
  eventCount: number;
  /** 그 달에 scheduled 된 할 일 — 완료 / 총 */
  todoDone: number;
  todoTotal: number;
  /** 그 달 순수익 (수입 - 지출) */
  net: number;
};

/**
 * 캘린더 헤더 통계용. month 와 무관한 데이터는 호출자가 미리 필터링 (page.tsx 에서
 * getEventsForMonth 등을 호출하므로 그 결과를 그대로 받는다).
 *
 * @param month "YYYY-MM"
 */
export function computeMonthlyStats(
  month: string,
  events: EventRow[],
  todos: TaskRow[],
  expenses: ExpenseRow[],
  incomes: IncomeRow[],
): MonthlyStats {
  let eventCount = 0;
  for (const e of events) {
    if (isoToLocalDateKey(e.start_at).startsWith(month)) {
      eventCount++;
    }
  }

  let todoDone = 0;
  let todoTotal = 0;
  for (const t of todos) {
    if (t.scheduled_date.startsWith(month)) {
      todoTotal++;
      if (t.completed_at) todoDone++;
    }
  }

  let net = 0;
  for (const i of incomes) {
    if (isoToLocalDateKey(i.received_at).startsWith(month)) {
      net += i.amount;
    }
  }
  for (const e of expenses) {
    if (isoToLocalDateKey(e.paid_at).startsWith(month)) {
      net -= e.amount;
    }
  }

  return { eventCount, todoDone, todoTotal, net };
}
```

- [ ] **Step 2: 타입체크**

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add features/calendar/lib/monthly-stats.ts
git commit -m "$(cat <<'EOF'
feat(calendar): monthly-stats utility — 헤더 통계 계산

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: CalendarMonthlyStatsChips 컴포넌트

**Files:**
- Create: `features/calendar/components/CalendarMonthlyStatsChips.tsx`

- [ ] **Step 1: StatsChips 작성**

`features/calendar/components/CalendarMonthlyStatsChips.tsx` 생성:

```tsx
"use client";

import { Calendar, CheckSquare, TrendingUp, TrendingDown } from "lucide-react";
import { AnimatedNumber } from "@/features/widgets/components/AnimatedNumber";
import type { MonthlyStats } from "../lib/monthly-stats";

type Props = {
  stats: MonthlyStats;
  /** 모바일 컴팩트 모드 (작게). */
  compact?: boolean;
};

/**
 * 캘린더 헤더의 월간 통계 칩 3개 — 일정 / 할 일 / 순수익.
 * 데스크탑: text-sm, 모바일(compact): text-xs.
 */
export function CalendarMonthlyStatsChips({ stats, compact = false }: Props) {
  const sizeCls = compact ? "text-xs" : "text-sm";
  const iconCls = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  const isPositive = stats.net > 0;
  const isNeutral = stats.net === 0;
  const NetIcon = isPositive ? TrendingUp : TrendingDown;
  const netColor = isNeutral
    ? "text-muted-foreground"
    : isPositive
      ? "text-[#16A34A] dark:text-[#4ADE80]"
      : "text-[#DC2626] dark:text-[#F87171]";

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${sizeCls}`}>
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Calendar className={iconCls} strokeWidth={1.8} />
        <AnimatedNumber
          value={stats.eventCount}
          className="font-medium text-foreground tabular-nums"
        />
        <span>건</span>
      </span>
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <CheckSquare className={iconCls} strokeWidth={1.8} />
        <span className="font-medium text-foreground tabular-nums">
          {stats.todoDone}/{stats.todoTotal}
        </span>
      </span>
      {!isNeutral && (
        <span className={`inline-flex items-center gap-1 ${netColor}`}>
          <NetIcon className={iconCls} strokeWidth={1.8} />
          <span className="font-medium tabular-nums">
            {isPositive ? "+" : "-"}
            <AnimatedNumber value={Math.abs(stats.net)} />원
          </span>
        </span>
      )}
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
git add features/calendar/components/CalendarMonthlyStatsChips.tsx
git commit -m "$(cat <<'EOF'
feat(calendar): CalendarMonthlyStatsChips — 일정/할 일/순수익 통계 칩

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: CalendarMonthHeader 컴포넌트

**Files:**
- Create: `features/calendar/components/CalendarMonthHeader.tsx`

- [ ] **Step 1: Read 기존 CalendarHeaderBar.tsx 패턴 확인**

Read: `features/calendar/components/CalendarHeaderBar.tsx` — 기존 prev/next/today 버튼 패턴 참조.

- [ ] **Step 2: CalendarMonthHeader 작성**

`features/calendar/components/CalendarMonthHeader.tsx` 생성:

```tsx
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventModal } from "./EventModal";
import { CalendarMonthlyStatsChips } from "./CalendarMonthlyStatsChips";
import type { CalendarRow } from "../server/queries";
import type { MonthlyStats } from "../lib/monthly-stats";

type Props = {
  monthLabel: string; // "2026년 5월"
  stats: MonthlyStats;
  calendars: CalendarRow[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 캘린더 페이지 헤더 — 월 라벨 + 네비/오늘 + 통계 칩 + 빠른 일정 추가.
 * 데스크탑: 가로 한 줄. 모바일: 2줄 (라벨/네비 / 통계).
 */
export function CalendarMonthHeader({
  monthLabel,
  stats,
  calendars,
  onPrev,
  onNext,
  onToday,
}: Props) {
  const [eventOpen, setEventOpen] = useState(false);
  const canCreate = calendars.length > 0;

  return (
    <>
      <header className="space-y-2 mb-4">
        {/* 라인 1: 월 라벨 + 네비 + 오늘 + (데스크탑) 통계 + 액션 */}
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tabular-nums">
            {monthLabel}
          </h1>
          <div className="flex items-center gap-1">
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
              className="h-7"
            >
              오늘
            </Button>
          </div>

          {/* 데스크탑 통계 + 액션 */}
          <div className="ml-auto hidden md:flex items-center gap-3">
            <CalendarMonthlyStatsChips stats={stats} />
            <Button
              size="sm"
              onClick={() => setEventOpen(true)}
              disabled={!canCreate}
              className="gap-1.5 active:scale-[0.98] transition-transform"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              일정
            </Button>
          </div>
        </div>

        {/* 라인 2: 모바일 통계 (한 줄) */}
        <div className="md:hidden">
          <CalendarMonthlyStatsChips stats={stats} compact />
        </div>
      </header>

      {canCreate && (
        <EventModal
          open={eventOpen}
          onOpenChange={setEventOpen}
          calendars={calendars}
          defaultDate={todayIso()}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 4: Commit**

```bash
git add features/calendar/components/CalendarMonthHeader.tsx
git commit -m "$(cat <<'EOF'
feat(calendar): CalendarMonthHeader — 통합 헤더 (라벨+네비+통계+액션)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: FloatingActionButton (모바일 FAB)

**Files:**
- Create: `features/calendar/components/FloatingActionButton.tsx`

- [ ] **Step 1: FAB 작성**

`features/calendar/components/FloatingActionButton.tsx` 생성:

```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { EventModal } from "./EventModal";
import type { CalendarRow } from "../server/queries";

type Props = {
  calendars: CalendarRow[];
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 모바일 전용 floating action button — 어디서든 + 일정 추가.
 * bottom-20 으로 모바일 탭바(h-14) 위에 배치.
 */
export function FloatingActionButton({ calendars }: Props) {
  const [open, setOpen] = useState(false);
  const canCreate = calendars.length > 0;
  if (!canCreate) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform flex items-center justify-center"
        aria-label="일정 추가"
      >
        <Plus className="h-6 w-6" strokeWidth={2.2} />
      </button>
      <EventModal
        open={open}
        onOpenChange={setOpen}
        calendars={calendars}
        defaultDate={todayIso()}
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
git add features/calendar/components/FloatingActionButton.tsx
git commit -m "$(cat <<'EOF'
feat(calendar): FloatingActionButton — 모바일 전용 + 일정 FAB

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: EventHoverContext (멀티데이 hover 공유)

**Files:**
- Create: `features/calendar/lib/event-hover-context.tsx`

- [ ] **Step 1: Context 작성**

`features/calendar/lib/event-hover-context.tsx` 생성:

```tsx
"use client";

import { createContext, useContext, useState } from "react";

type Ctx = {
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
};

const EventHoverContext = createContext<Ctx>({
  hoveredId: null,
  setHoveredId: () => {},
});

export function EventHoverProvider({ children }: { children: React.ReactNode }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  return (
    <EventHoverContext.Provider value={{ hoveredId, setHoveredId }}>
      {children}
    </EventHoverContext.Provider>
  );
}

export function useEventHover() {
  return useContext(EventHoverContext);
}
```

- [ ] **Step 2: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add features/calendar/lib/event-hover-context.tsx
git commit -m "$(cat <<'EOF'
feat(calendar): EventHoverContext — 멀티데이 segment hover 공유

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: DraggableEventBar + WeekMultiDayLayer hover 강화

**Files:**
- Modify: `features/calendar/components/DraggableEventBar.tsx`
- Modify: `features/calendar/components/WeekMultiDayLayer.tsx`

- [ ] **Step 1: Read 두 파일 현재 상태**

- [ ] **Step 2: DraggableEventBar 에 hover lift + context hookup**

`features/calendar/components/DraggableEventBar.tsx`:

```tsx
"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { EventBar, type SpanRole } from "./EventBar";
import { useEventHover } from "../lib/event-hover-context";
import type { EventRow } from "../server/queries";

type Props = {
  event: EventRow;
  color: string;
  onClick?: () => void;
  spanRole?: SpanRole;
  dragKey?: string;
};

export function DraggableEventBar({
  event,
  color,
  onClick,
  spanRole,
  dragKey,
}: Props) {
  const id = dragKey ?? event.id;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data: { event },
    });
  const { hoveredId, setHoveredId } = useEventHover();
  const isHovered = hoveredId === event.id;

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setHoveredId(event.id)}
      onMouseLeave={() => setHoveredId(null)}
      className={`transition-all duration-150 ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      } ${isHovered && !isDragging ? "-translate-y-0.5" : ""}`}
    >
      <EventBar
        title={event.title}
        emoji={event.emoji}
        color={color}
        onClick={onClick}
        spanRole={spanRole}
      />
    </div>
  );
}
```

- [ ] **Step 3: WeekMultiDayLayer 의 DraggableSegment 에 hover 추가**

Read 후, 기존 DraggableSegment 컴포넌트에 `onMouseEnter/onMouseLeave` + `useEventHover` 추가. isHovered 일 때 `-translate-y-0.5` 적용 (transform CSS 변경).

기존 코드 패턴 유지하면서 hover 강화. 같은 event id 의 다른 segment 들이 함께 강조됨.

- [ ] **Step 4: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 5: Commit**

```bash
git add features/calendar/components/DraggableEventBar.tsx features/calendar/components/WeekMultiDayLayer.tsx
git commit -m "$(cat <<'EOF'
feat(calendar): 이벤트 hover lift + 멀티데이 segment 공유 강조

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: DayCell 오늘 강조 + pulse

**Files:**
- Modify: `features/calendar/components/DayCell.tsx`

- [ ] **Step 1: Read 현재 DayCell.tsx**

- [ ] **Step 2: 오늘 셀에 ring + dot 추가**

`features/calendar/components/DayCell.tsx`:

- 새 prop `isToday: boolean` 추가
- wrapper className 에 `isToday ? "ring-2 ring-primary/40" : ""` 추가
- 날짜 숫자 옆에 `isToday && <span className="absolute h-1 w-1 rounded-full bg-primary -ml-1 mt-1" />` 또는 비슷한 dot 표시 (위치는 미세조정)

- [ ] **Step 3: framer-motion 으로 today pulse (1회)**

날짜 숫자 또는 wrapper 에 framer-motion `<motion.div>`:

```tsx
{isToday && (
  <motion.div
    initial={{ scale: 1.1, opacity: 0 }}
    animate={{ scale: 1, opacity: 0 }}
    transition={{ duration: 1.2, ease: "easeOut" }}
    className="absolute inset-0 rounded-lg ring-2 ring-primary pointer-events-none"
  />
)}
```

1초 동안 부드럽게 사라지는 pulse — 진입 시 한 번만.

- [ ] **Step 4: hover 효과 desktop only**

기존 셀 hover 가 있으면 `md:hover:...` 로 분기 (모바일 터치 디바이스 hover sticky 방지).

- [ ] **Step 5: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 6: Commit**

```bash
git add features/calendar/components/DayCell.tsx
git commit -m "$(cat <<'EOF'
feat(calendar): 오늘 셀 ring + dot + 진입 시 pulse 1회

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: MonthGrid 통합 (framer-motion 전환 + EventHoverProvider + FAB + isToday)

**Files:**
- Modify: `features/calendar/components/MonthGrid.tsx`

- [ ] **Step 1: Read 현재 MonthGrid.tsx**

- [ ] **Step 2: 통합 작업**

다음 변경:

a. `EventHoverProvider` 로 전체 래핑 (DndContext 안 또는 밖 — 컴포넌트들이 도달해야 함)

b. month 변경 시 부드러운 fade — 그리드 영역을 `<motion.div key={viewedMonth} initial={{opacity: 0}} animate={{opacity: 1}} transition={{duration: 0.25}}>` 로 감쌈

c. DayCell 에 `isToday` prop 전달 (오늘 date 와 매칭)

d. 컴포넌트 하단에 `<FloatingActionButton calendars={calendars} />` 추가

- [ ] **Step 3: 타입체크 + 페이지 200**

```bash
pnpm tsc --noEmit
curl -s -o /dev/null -w "/calendar: %{http_code}\n" http://localhost:3000/calendar
```
Expected: tsc 0, curl 307

- [ ] **Step 4: Commit**

```bash
git add features/calendar/components/MonthGrid.tsx
git commit -m "$(cat <<'EOF'
feat(calendar): MonthGrid 통합 — EventHoverProvider + fade 전환 + isToday + FAB

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: CalendarShell + page.tsx 정리

**Files:**
- Modify: `features/calendar/components/CalendarShell.tsx`
- Modify: `app/(app)/calendar/page.tsx`

- [ ] **Step 1: Read CalendarShell.tsx**

기존 헤더 (Wallet 토글, CalendarPickerDropdown) 는 유지. 단, CalendarMonthHeader 는 MonthGrid 내부에서 렌더되므로 충돌 없음 — children 영역에 새 header 가 자연스레 들어가도록.

- [ ] **Step 2: page.tsx 에 monthly stats 계산**

`app/(app)/calendar/page.tsx`:

```tsx
import { CalendarShell } from "@/features/calendar/components/CalendarShell";
import { MonthGrid } from "@/features/calendar/components/MonthGrid";
import {
  getCalendars,
  getEventsForMonth,
} from "@/features/calendar/server/queries";
import { getTodosForMonth } from "@/features/todos/server/queries";
import {
  getExpensesForMonth,
  getIncomesForMonth,
} from "@/features/expense/server/queries";
import { computeMonthlyStats } from "@/features/calendar/lib/monthly-stats";

export const metadata = { title: "캘린더" };

type Props = { searchParams: { month?: string } };

function defaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }: Props) {
  const month = searchParams.month ?? defaultMonth();
  const [calendars, events, todos, expenses, incomes] = await Promise.all([
    getCalendars(),
    getEventsForMonth(month),
    getTodosForMonth(month),
    getExpensesForMonth(month),
    getIncomesForMonth(month),
  ]);

  const stats = computeMonthlyStats(month, events, todos, expenses, incomes);

  return (
    <CalendarShell calendars={calendars}>
      <MonthGrid
        calendars={calendars}
        events={events}
        todos={todos}
        expenses={expenses}
        incomes={incomes}
        initialMonth={month}
        stats={stats}
      />
    </CalendarShell>
  );
}
```

- [ ] **Step 3: MonthGrid 가 stats prop 받아서 CalendarMonthHeader 에 전달**

`MonthGrid.tsx` 의 Props 에 `stats: MonthlyStats` 추가. 기존 CalendarHeaderBar 자리에 새 `CalendarMonthHeader` 를 사용 (또는 둘 다 유지하되 CalendarMonthHeader 가 위에).

기존 CalendarHeaderBar 는 나중에 안 쓰이면 삭제 (Task 10 정리 단계).

- [ ] **Step 4: 타입체크 + 페이지 200**

```bash
pnpm tsc --noEmit
curl -s -o /dev/null -w "/calendar: %{http_code}\n" http://localhost:3000/calendar
```
Expected: tsc 0, curl 307

- [ ] **Step 5: Commit**

```bash
git add 'app/(app)/calendar/page.tsx' features/calendar/components/MonthGrid.tsx
git commit -m "$(cat <<'EOF'
feat(calendar): page.tsx + MonthGrid — stats prop drilling + 새 헤더 통합

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: 최종 회귀 + push

- [ ] **Step 1: 전체 검증**

```bash
cd /c/dev/lunabear-calendar
pnpm tsc --noEmit
pnpm lint
curl -s -o /dev/null -w "/calendar: %{http_code}\n" http://localhost:3000/calendar
```
Expected: tsc 0, lint clean, curl 307.

- [ ] **Step 2: 시각 회귀 (playwright)**

`/calendar` 진입:
- 새 헤더에 "2026년 5월" 크게 보임
- 통계 칩 (일정 N · 할 일 N/M · 순수익) 표시
- `+ 일정` 버튼 데스크탑 헤더 우측
- 오늘 셀 (28일 목요일) ring + dot 강조 + 진입 시 pulse 1회
- 이전/다음 달 전환 시 부드러운 fade
- 이벤트 막대 hover 시 살짝 들림
- 멀티데이 segment 둘 다 hover 시 함께 lift
- 모바일 viewport: 헤더 컴팩트, FAB (우측 하단 동그란 + 버튼) 보임
- 다크모드 정상

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: prod 확인**

배포 후 https://lunabear-calendar.vercel.app/calendar 시각 확인.

---

## Self-Review

**1. Spec coverage:**
- ✅ 페이지 헤더 강조 → Task 3
- ✅ 월간 통계 칩 → Task 1, 2
- ✅ + 일정 quick action → Task 3 (데스크탑), Task 4 (모바일)
- ✅ 오늘 셀 강조 + pulse → Task 7
- ✅ 월 전환 fade → Task 8
- ✅ 이벤트 hover lift → Task 6
- ✅ 멀티데이 hover 공유 → Task 5, 6
- ✅ 모바일 폴리시 → Task 3 (컴팩트 헤더), Task 4 (FAB), Task 7 (hover desktop only)
- ✅ 검증 → Task 10

**2. Placeholder scan:** Step 들이 코드/명령 모두 구체적. 일부 step (예: WeekMultiDayLayer hover) 은 "Read 후" 안내라 구현자가 패턴 파악 필요 — 의도된 유연성.

**3. Type consistency:** MonthlyStats type 이 monthly-stats.ts 에서 정의 후 CalendarMonthlyStatsChips, CalendarMonthHeader, MonthGrid, page.tsx 에서 일관 사용.

**4. 의존성 순서:**
- Task 1 (monthly-stats) → Task 2 (chips 가 의존) → Task 3 (header 가 chips 의존) → Task 9 (page 가 monthly-stats 의존)
- Task 4 (FAB) 독립
- Task 5 (Context) → Task 6 (DraggableEventBar 가 context 의존)
- Task 7 (DayCell) 독립
- Task 8 (MonthGrid 통합) — Task 5, 7, 4 후
- Task 9 (page + monthly stats) — Task 1, 3, 8 후
- Task 10 최종

권장 순서: 1 → 2 → 5 → 6 → 7 → 4 → 3 → 8 → 9 → 10
