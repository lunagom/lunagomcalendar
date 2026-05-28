# 홈페이지 폴리시 강화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈페이지에 인사말, 빠른 액션, 미니 week strip, framer-motion 애니메이션, hover lift, 숫자 counter 추가해서 프로페셔널한 대시보드 톤으로 업그레이드.

**Architecture:** 신규 6개 컴포넌트(PageGreeting, QuickActions, MiniWeekStrip, AnimatedWidgetCard, AnimatedNumber + 보조 쿼리)를 만들고, page.tsx 에서 통합. WidgetCard 의 hover 효과 보강. 기존 위젯 기능은 보존.

**Tech Stack:** Next.js 14 App Router, React 18, framer-motion, Supabase, shadcn/ui, lucide-react.

**Spec 출처:** `docs/superpowers/specs/2026-05-28-home-page-polish-design.md`

---

## File Structure

### Create
- `features/widgets/components/PageGreeting.tsx` — 인사말 (server component, user 닉네임 prop)
- `features/widgets/components/QuickActions.tsx` — `+ 일정` `+ 할 일` `+ 지출` 3개 버튼 (client component)
- `features/widgets/components/MiniWeekStrip.tsx` — 오늘 + 다음 6일 (client wrapper + server data)
- `features/widgets/server/week-strip-queries.ts` — 이번 주 일정+할 일 fetch
- `features/widgets/components/AnimatedWidgetCard.tsx` — framer-motion 래퍼
- `features/widgets/components/AnimatedNumber.tsx` — 숫자 counter

### Modify
- `app/(app)/page.tsx` — 레이아웃 재구성
- `app/(app)/layout.tsx` — PageGreeting 으로 user 정보 prop 흘리기 (path 검토 후)
- `features/widgets/components/WidgetCard.tsx` — hover lift 추가
- `features/widgets/components/MonthSummaryWidget.tsx` — AnimatedNumber 활용

### Install
- `framer-motion`

---

## Task 1: framer-motion 설치 + AnimatedWidgetCard

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Create: `features/widgets/components/AnimatedWidgetCard.tsx`

- [ ] **Step 1: framer-motion 설치**

```bash
cd /c/dev/lunabear-calendar
pnpm add framer-motion
```

Expected: 새 dependency 추가 완료.

- [ ] **Step 2: AnimatedWidgetCard 작성**

`features/widgets/components/AnimatedWidgetCard.tsx` 생성:

```tsx
"use client";

import { motion } from "framer-motion";

type Props = {
  index: number;
  children: React.ReactNode;
};

/**
 * 홈 위젯 카드를 framer-motion 으로 감싸는 래퍼.
 * 페이지 진입 시 index * 60ms stagger 로 fade-in + slide-up.
 * prefers-reduced-motion 사용자는 즉시 표시 (framer-motion 이 자동 처리).
 */
export function AnimatedWidgetCard({ index, children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: 타입체크**

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 4: Commit**

```bash
cd /c/dev/lunabear-calendar
git add package.json pnpm-lock.yaml features/widgets/components/AnimatedWidgetCard.tsx
git commit -m "$(cat <<'EOF'
feat(home): framer-motion 설치 + AnimatedWidgetCard 래퍼

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: PageGreeting 컴포넌트

**Files:**
- Create: `features/widgets/components/PageGreeting.tsx`

- [ ] **Step 1: PageGreeting 작성**

`features/widgets/components/PageGreeting.tsx` 생성:

```tsx
type Props = {
  nickname: string | null;
  /** 사용자 이메일 — 닉네임 없을 때 prefix 사용. */
  email: string;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 홈 페이지 최상단 인사말.
 * "[닉네임]님 오늘도 좋은 하루 되세요!🐻" + 오늘 날짜.
 */
export function PageGreeting({ nickname, email }: Props) {
  const displayName = nickname ?? email.split("@")[0];
  const today = new Date();
  const dateLabel = `${today.getMonth() + 1}월 ${today.getDate()}일 ${WEEKDAYS[today.getDay()]}요일`;

  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-bold">
        {displayName}님 오늘도 좋은 하루 되세요!🐻
      </h1>
      <p className="text-sm text-muted-foreground tabular-nums">
        {dateLabel}
      </p>
    </header>
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
git add features/widgets/components/PageGreeting.tsx
git commit -m "$(cat <<'EOF'
feat(home): PageGreeting — 닉네임 인사말 + 오늘 날짜

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: QuickActions 컴포넌트

**Files:**
- Create: `features/widgets/components/QuickActions.tsx`

- [ ] **Step 1: 기존 EventModal / ExpenseModal 사용 패턴 확인**

Read: `features/calendar/components/EventModal.tsx` 의 props (defaultDate, calendars 등)
Read: `features/expense/components/...Modal*.tsx` (가계부 모달이 있다면 위치 파악)

CalendarRow 가 필요한 경우 props 로 받기.

- [ ] **Step 2: QuickActions 작성**

`features/widgets/components/QuickActions.tsx` 생성:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, CheckSquare, Wallet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventModal } from "@/features/calendar/components/EventModal";
import type { CalendarRow } from "@/features/calendar/server/queries";

type Props = {
  calendars: CalendarRow[];
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 홈 페이지 상단 빠른 액션 — 일정 / 할 일 / 지출 빠르게 추가.
 * 일정: 모달 오픈. 할 일: /todos 이동. 지출: /expense 이동 (모달은 expense 페이지에).
 */
export function QuickActions({ calendars }: Props) {
  const [eventOpen, setEventOpen] = useState(false);
  const canCreate = calendars.length > 0;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setEventOpen(true)}
        disabled={!canCreate}
        className="gap-1.5 active:scale-[0.98] transition-transform"
      >
        <Calendar className="h-3.5 w-3.5" strokeWidth={1.8} />
        <Plus className="h-3 w-3 -ml-1" strokeWidth={2} />
        일정
      </Button>
      <Button
        variant="outline"
        size="sm"
        asChild
        className="gap-1.5 active:scale-[0.98] transition-transform"
      >
        <Link href="/todos">
          <CheckSquare className="h-3.5 w-3.5" strokeWidth={1.8} />
          <Plus className="h-3 w-3 -ml-1" strokeWidth={2} />
          할 일
        </Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        asChild
        className="gap-1.5 active:scale-[0.98] transition-transform"
      >
        <Link href="/expense">
          <Wallet className="h-3.5 w-3.5" strokeWidth={1.8} />
          <Plus className="h-3 w-3 -ml-1" strokeWidth={2} />
          지출
        </Link>
      </Button>

      {canCreate && (
        <EventModal
          open={eventOpen}
          onOpenChange={setEventOpen}
          calendars={calendars}
          defaultDate={todayIso()}
        />
      )}
    </div>
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
git add features/widgets/components/QuickActions.tsx
git commit -m "$(cat <<'EOF'
feat(home): QuickActions — 일정/할 일/지출 빠른 추가 버튼

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: MiniWeekStrip 컴포넌트 + 쿼리

**Files:**
- Create: `features/widgets/server/week-strip-queries.ts`
- Create: `features/widgets/components/MiniWeekStrip.tsx`

- [ ] **Step 1: week-strip-queries.ts 작성**

`features/widgets/server/week-strip-queries.ts` 생성:

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type WeekStripDay = {
  iso: string;
  isToday: boolean;
  hasEvent: boolean;
  hasTodo: boolean;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 오늘부터 다음 6일 (총 7일) 의 일정/할 일 존재 여부.
 */
export async function getWeekStripDays(): Promise<WeekStripDay[]> {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(today);
  last.setDate(today.getDate() + 7); // exclusive

  const todayIso = isoOf(today);
  const lastIso = isoOf(last);

  const [eventsRes, todosRes] = await Promise.all([
    supabase
      .from("events")
      .select("start_at")
      .gte("start_at", today.toISOString())
      .lt("start_at", last.toISOString()),
    supabase
      .from("tasks")
      .select("scheduled_date")
      .gte("scheduled_date", todayIso)
      .lt("scheduled_date", lastIso)
      .eq("is_recurring", false),
  ]);

  const eventDates = new Set<string>();
  for (const e of eventsRes.data ?? []) {
    if (e.start_at) eventDates.add(e.start_at.slice(0, 10));
  }
  const todoDates = new Set<string>();
  for (const t of todosRes.data ?? []) {
    if (t.scheduled_date) todoDates.add(t.scheduled_date);
  }

  const out: WeekStripDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = isoOf(d);
    out.push({
      iso,
      isToday: i === 0,
      hasEvent: eventDates.has(iso),
      hasTodo: todoDates.has(iso),
    });
  }
  return out;
}
```

- [ ] **Step 2: MiniWeekStrip 작성**

`features/widgets/components/MiniWeekStrip.tsx` 생성:

```tsx
import Link from "next/link";
import { getWeekStripDays } from "../server/week-strip-queries";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 오늘 + 다음 6일 strip. 셀마다 요일/날짜 + 일정/할 일 dot.
 * 클릭 시 /calendar?month=YYYY-MM 으로 이동.
 */
export async function MiniWeekStrip() {
  const days = await getWeekStripDays();

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((d) => {
        const [, m, day] = d.iso.split("-").map(Number);
        const dayOfWeek = new Date(d.iso).getDay();
        const month = `${d.iso.slice(0, 4)}-${String(m).padStart(2, "0")}`;
        return (
          <Link
            key={d.iso}
            href={`/calendar?month=${month}`}
            className={`flex flex-col items-center gap-1 rounded-lg py-2 transition-colors hover:bg-accent/40 ${
              d.isToday
                ? "bg-primary/10 ring-1 ring-primary/40"
                : ""
            }`}
            aria-label={`${m}월 ${day}일로 이동`}
          >
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {WEEKDAYS[dayOfWeek]}
            </span>
            <span
              className={`text-sm tabular-nums ${
                d.isToday ? "font-bold text-primary" : "font-medium"
              }`}
            >
              {day}
            </span>
            <div className="flex gap-0.5 h-1.5">
              {d.hasEvent && (
                <span className="w-1 h-1 rounded-full bg-primary" />
              )}
              {d.hasTodo && (
                <span className="w-1 h-1 rounded-full bg-[#16A34A] dark:bg-[#4ADE80]" />
              )}
            </div>
          </Link>
        );
      })}
    </div>
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
git add features/widgets/server/week-strip-queries.ts features/widgets/components/MiniWeekStrip.tsx
git commit -m "$(cat <<'EOF'
feat(home): MiniWeekStrip — 오늘+6일 일정/할 일 dot 표시

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: AnimatedNumber + MonthSummary 적용

**Files:**
- Create: `features/widgets/components/AnimatedNumber.tsx`
- Modify: `features/widgets/components/MonthSummaryWidget.tsx`

- [ ] **Step 1: AnimatedNumber 작성**

`features/widgets/components/AnimatedNumber.tsx` 생성:

```tsx
"use client";

import { useEffect, useState } from "react";

type Props = {
  /** 최종 표시할 값 (정수). */
  value: number;
  /** 단위 (예: "원"). 기본 빈 문자열. */
  unit?: string;
  /** 애니메이션 길이 ms. 기본 600. */
  duration?: number;
  /** 클래스. */
  className?: string;
};

/**
 * 0 에서 value 까지 부드럽게 카운트 업.
 * value 가 음수이면 음수 부호 유지 (절댓값을 카운트 업 후 부호 prefix).
 * prefers-reduced-motion 시 즉시 표시.
 */
export function AnimatedNumber({
  value,
  unit = "",
  duration = 600,
  className,
}: Props) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // reduced motion 체크
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={className}>
      {display.toLocaleString("ko-KR")}
      {unit}
    </span>
  );
}
```

- [ ] **Step 2: MonthSummaryWidget 에 적용**

`features/widgets/components/MonthSummaryWidget.tsx` 를 읽고, 금액 표시 부분을 `AnimatedNumber` 로 교체.

Read 후 패턴 확인:
- 순수익 큰 숫자 → `AnimatedNumber value={net} unit="원" ...`
- 수입/지출 작은 숫자 → 동일하게 적용

기존 className 유지하면서 숫자 출력 부분만 `AnimatedNumber` 로.

- [ ] **Step 3: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 4: Commit**

```bash
git add features/widgets/components/AnimatedNumber.tsx features/widgets/components/MonthSummaryWidget.tsx
git commit -m "$(cat <<'EOF'
feat(home): AnimatedNumber counter + MonthSummary 적용

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: WidgetCard hover lift

**Files:**
- Modify: `features/widgets/components/WidgetCard.tsx`

- [ ] **Step 1: WidgetCard 의 className 수정**

`features/widgets/components/WidgetCard.tsx` 의 cardClass 변경:

Before:
```tsx
const cardClass = `rounded-lg border bg-card p-4 transition ${
  href ? "hover:border-primary/60" : ""
} h-full`;
```

After:
```tsx
const cardClass = `rounded-lg border bg-card p-4 transition-all duration-200 ${
  href
    ? "hover:border-primary/60 hover:-translate-y-0.5 hover:shadow-md"
    : ""
} h-full`;
```

(href 없는 정적 위젯은 hover lift 없음 — 클릭 가능 시각 신호와 일치)

- [ ] **Step 2: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add features/widgets/components/WidgetCard.tsx
git commit -m "$(cat <<'EOF'
style(home): WidgetCard hover lift + shadow — 클릭 시각 피드백

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: page.tsx 통합 + 위젯 그룹핑

**Files:**
- Modify: `app/(app)/page.tsx`
- 필요 시: `features/widgets/lib/items.ts`

- [ ] **Step 1: 현재 page.tsx 와 widgets/lib/items.ts 확인**

Read both files. items.ts 에서 위젯이 spanTwo prop 을 갖는지 확인.

- [ ] **Step 2: page.tsx 재구성**

`app/(app)/page.tsx` 를 다음 구조로 변경:

```tsx
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getCalendars } from "@/features/calendar/server/queries";
import {
  WIDGET_ITEMS,
  normalizeHidden,
  type WidgetKey,
} from "@/features/widgets/lib/items";
import { PageGreeting } from "@/features/widgets/components/PageGreeting";
import { QuickActions } from "@/features/widgets/components/QuickActions";
import { MiniWeekStrip } from "@/features/widgets/components/MiniWeekStrip";
import { AnimatedWidgetCard } from "@/features/widgets/components/AnimatedWidgetCard";
import { TodayEventsWidget } from "@/features/widgets/components/TodayEventsWidget";
import { UpcomingEventsWidget } from "@/features/widgets/components/UpcomingEventsWidget";
import { MonthSummaryWidget } from "@/features/widgets/components/MonthSummaryWidget";
import { TodayTodosWidget } from "@/features/widgets/components/TodayTodosWidget";
import { IncomingInvitesWidget } from "@/features/widgets/components/IncomingInvitesWidget";

export const metadata = { title: "홈" };

const WIDGET_COMPONENTS: Record<WidgetKey, React.ComponentType> = {
  today_events: TodayEventsWidget,
  upcoming: UpcomingEventsWidget,
  month_summary: MonthSummaryWidget,
  today_todos: TodayTodosWidget,
  invites: IncomingInvitesWidget,
};

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [hidden, calendars, profile] = await Promise.all([
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("widget_visibility")
        .eq("id", user.id)
        .maybeSingle();
      return normalizeHidden(data?.widget_visibility);
    })(),
    getCalendars(),
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    })(),
  ]);

  const visible = WIDGET_ITEMS.filter((w) => !hidden.includes(w.key));

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-6 space-y-6">
      <PageGreeting nickname={profile?.nickname ?? null} email={user.email ?? ""} />
      <QuickActions calendars={calendars} />
      <MiniWeekStrip />

      {visible.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          메인 위젯이 모두 꺼져있어요.{" "}
          <Link href="/settings" className="text-primary hover:underline">
            설정에서 켜기
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visible.map((w, i) => {
            const C = WIDGET_COMPONENTS[w.key];
            return (
              <AnimatedWidgetCard key={w.key} index={i}>
                <C />
              </AnimatedWidgetCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 타입체크 + 홈 페이지 200 확인**

```bash
pnpm tsc --noEmit
curl -s -o /dev/null -w "/: %{http_code}\n" http://localhost:3000/
```
Expected: tsc Exit 0, curl 307

- [ ] **Step 4: Commit**

```bash
git add app/(app)/page.tsx
git commit -m "$(cat <<'EOF'
feat(home): 페이지 레이아웃 재구성 — 인사말 + 빠른액션 + week strip + 위젯 stagger

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 최종 회귀 + push

- [ ] **Step 1: 전체 검증**

```bash
cd /c/dev/lunabear-calendar
pnpm tsc --noEmit
pnpm lint
```
Expected: 둘 다 통과.

- [ ] **Step 2: 시각 회귀 (playwright)**

dev 서버에서 / 페이지 진입:
- 인사말 표시 + 닉네임/이메일 prefix
- Quick actions 3개 클릭 가능
- Mini week strip 7일 표시 + 오늘 강조
- 위젯들 stagger fade-in (browser refresh 시)
- 카드 hover 시 살짝 들림 (데스크탑)
- 월 요약의 숫자 counter up
- 모바일 viewport (375px) 깨짐 없음
- 다크모드 정상

- [ ] **Step 3: Push**

```bash
git push origin main
```
Vercel 자동 배포.

- [ ] **Step 4: prod 확인**

배포 완료 후 https://lunabear-calendar.vercel.app/ 에서 시각 확인.

---

## Self-Review

**1. Spec coverage:**
- ✅ 인사말 "[닉네임]님 오늘도 좋은 하루 되세요!🐻" → Task 2
- ✅ 빠른 액션 3개 → Task 3
- ✅ Mini week strip → Task 4
- ✅ Stagger fade-in → Task 1, 7
- ✅ Card hover lift → Task 6
- ✅ Number counter → Task 5
- ✅ 위젯 그룹핑 (그리드 유지, AnimatedWidgetCard 로 stagger) → Task 7
- ✅ 페이지 레이아웃 통합 → Task 7
- ✅ 검증 → Task 8

**2. Placeholder scan:** 모든 step 구체적 코드 포함. 없음.

**3. Type consistency:** PageGreeting (nickname, email), QuickActions (calendars), MiniWeekStrip (no props, server fetch), AnimatedWidgetCard (index, children), AnimatedNumber (value, unit?, duration?, className?) — 일관 유지.

**4. 의존성 순서:**
- Task 1 (framer-motion + AnimatedWidgetCard) → 다른 task 들 독립
- Task 2 (PageGreeting), Task 3 (QuickActions), Task 4 (MiniWeekStrip) — 병렬 가능
- Task 5 (AnimatedNumber) — 독립
- Task 6 (WidgetCard hover) — 독립
- Task 7 (page.tsx) — 위 모두 완료 후
- Task 8 — 최종

권장 순서: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
