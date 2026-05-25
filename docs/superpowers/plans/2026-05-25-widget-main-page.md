# 위젯 메인 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 후 첫 화면을 6개 위젯 (오늘 일정·다가오는 7일·이번 달 지출+목표·카테고리별 지출·오늘 할 일·받은 초대) 의 메인 페이지로 교체하고, /settings 에서 위젯 보임/숨김 가능하게 한다.

**Architecture:** root `/` 가 메인 위젯 페이지 (server component, 모든 위젯 데이터 동시 fetch). visibility 는 `profiles.widget_visibility jsonb` 에 저장. 모바일 1col / 데스크탑 2col grid. 모바일 탭바 4개로 재구성 (홈/할일/가계부/더보기).

**Tech Stack:** Next.js 14 App Router · Supabase (Postgres + RLS) · Tailwind · shadcn/ui · zustand (영향 없음)

---

## File Structure

**Create:**
- `supabase/migrations/20260525130000_profiles_widget_visibility.sql`
- `features/widgets/lib/items.ts` — 위젯 메타 단일 정의
- `features/widgets/server/queries.ts` — 위젯별 server fetch
- `features/widgets/server/actions.ts` — updateWidgetVisibility
- `features/widgets/components/WidgetCard.tsx` — 공통 카드 wrapper
- `features/widgets/components/TodayEventsWidget.tsx`
- `features/widgets/components/UpcomingEventsWidget.tsx`
- `features/widgets/components/MonthExpenseWidget.tsx`
- `features/widgets/components/CategoryExpenseWidget.tsx`
- `features/widgets/components/TodayTodosWidget.tsx`
- `features/widgets/components/IncomingInvitesWidget.tsx`
- `app/(app)/page.tsx` — 신규 메인 위젯 페이지 (또는 기존 root redirect 교체)

**Modify:**
- `lib/nav.ts` — navItems 첫 항목 "홈" 추가, mobileTabItems 재구성
- `features/settings/components/SettingsClient.tsx` — "메인 위젯" 섹션 추가
- `types/database.ts` — profiles 에 widget_visibility 추가 (수동 또는 `pnpm db:types` 재생성)
- `middleware.ts` (있다면) — root redirect 점검

---

### Task 1: DB 마이그레이션 (사용자가 SQL editor 적용)

**Files:**
- Create: `supabase/migrations/20260525130000_profiles_widget_visibility.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- profiles 에 메인 위젯 가시성 컬럼 추가.
-- 값: hidden 된 위젯 key 의 배열 (예: ["upcoming","category"]).
-- null/[] 이면 모두 보임.

alter table public.profiles
  add column widget_visibility jsonb;
```

- [ ] **Step 2: 사용자 SQL editor 또는 CLI 로 적용**

대시보드: https://supabase.com/dashboard/project/rkqtcuaifhwyyzbavhio/sql
또는: `pnpm exec supabase db push`

- [ ] **Step 3: types/database.ts 갱신**

```bash
pnpm db:types
```
실패 시 수동 — `profiles.Row.widget_visibility: Json | null` 추가.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260525130000_profiles_widget_visibility.sql types/database.ts
git commit -m "migration: profiles.widget_visibility jsonb"
```

---

### Task 2: 위젯 메타 (items.ts)

**Files:**
- Create: `features/widgets/lib/items.ts`

- [ ] **Step 1: 메타 작성**

```ts
// features/widgets/lib/items.ts
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CalendarDays,
  Wallet,
  BarChart3,
  CheckSquare,
  Users,
} from "lucide-react";

export type WidgetKey =
  | "today_events"
  | "upcoming"
  | "month_expense"
  | "category"
  | "today_todos"
  | "invites";

export type WidgetMeta = { key: WidgetKey; label: string; icon: LucideIcon };

export const WIDGET_ITEMS: WidgetMeta[] = [
  { key: "today_events",  label: "오늘의 일정",     icon: Calendar },
  { key: "upcoming",      label: "다가오는 일정",   icon: CalendarDays },
  { key: "month_expense", label: "이번 달 지출",    icon: Wallet },
  { key: "category",      label: "카테고리별 지출", icon: BarChart3 },
  { key: "today_todos",   label: "오늘 할 일",      icon: CheckSquare },
  { key: "invites",       label: "받은 초대",       icon: Users },
];

export const WIDGET_KEYS: WidgetKey[] = WIDGET_ITEMS.map((w) => w.key);

/** hidden 배열을 안전하게 정규화 — 알 수 없는 key 는 무시. */
export function normalizeHidden(raw: unknown): WidgetKey[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (k): k is WidgetKey =>
      typeof k === "string" && (WIDGET_KEYS as string[]).includes(k),
  );
}
```

- [ ] **Step 2: 단위 테스트 (선택)**

생략 — 메타 정의만이고 normalizeHidden 은 단순. 사용처에서 같이 검증.

- [ ] **Step 3: Commit (Task 3과 묶음)**

다음 task 와 같이 commit.

---

### Task 3: server queries (위젯별 데이터 fetch)

**Files:**
- Create: `features/widgets/server/queries.ts`

- [ ] **Step 1: queries 작성**

```ts
// features/widgets/server/queries.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getMyIncomingInvites } from "@/features/social/server/queries";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function thisMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type TodayEvent = {
  id: string;
  title: string;
  start_at: string;
  color: string | null;
  calendar_color: string;
};

/** 오늘 일정 (시간순). 종일 포함. */
export async function getTodayEvents(): Promise<TodayEvent[]> {
  const supabase = createClient();
  const today = todayIso();
  const start = new Date(`${today}T00:00:00`).toISOString();
  const end = new Date(`${today}T23:59:59.999`).toISOString();

  const { data, error } = await supabase
    .from("events")
    .select("id, title, start_at, color, calendar_id, calendars(color)")
    .gte("start_at", start)
    .lte("start_at", end)
    .order("start_at");
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    color: e.color,
    // @ts-expect-error supabase 의 join 타입
    calendar_color: e.calendars?.color ?? "#888",
  }));
}

export type UpcomingEvent = {
  id: string;
  title: string;
  start_at: string;
  color: string | null;
  calendar_color: string;
};

/** 내일~7일 후 일정 (오늘 제외). */
export async function getUpcomingEvents(): Promise<UpcomingEvent[]> {
  const supabase = createClient();
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const sevenDaysLater = new Date(tomorrow);
  sevenDaysLater.setDate(tomorrow.getDate() + 7);

  const { data, error } = await supabase
    .from("events")
    .select("id, title, start_at, color, calendar_id, calendars(color)")
    .gte("start_at", tomorrow.toISOString())
    .lt("start_at", sevenDaysLater.toISOString())
    .order("start_at")
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    color: e.color,
    // @ts-expect-error
    calendar_color: e.calendars?.color ?? "#888",
  }));
}

export type MonthExpenseSummary = {
  actual: number;
  target: number | null;
};

/** 이번 달 지출 합계 + 월 목표. */
export async function getMonthExpenseSummary(): Promise<MonthExpenseSummary> {
  const supabase = createClient();
  const month = thisMonthIso();
  const start = new Date(`${month}-01T00:00:00`).toISOString();
  const next = new Date(`${month}-01T00:00:00`);
  next.setMonth(next.getMonth() + 1);

  const [expRes, targetRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("amount")
      .gte("paid_at", start)
      .lt("paid_at", next.toISOString()),
    supabase
      .from("monthly_targets")
      .select("amount")
      .eq("month", month)
      .maybeSingle(),
  ]);
  if (expRes.error) throw expRes.error;
  const actual = (expRes.data ?? []).reduce((s, e) => s + e.amount, 0);
  return { actual, target: targetRes.data?.amount ?? null };
}

export type CategoryTotal = { category: string; amount: number };

/** 이번 달 카테고리별 지출 (금액 내림차순). */
export async function getCategoryTotals(): Promise<CategoryTotal[]> {
  const supabase = createClient();
  const month = thisMonthIso();
  const start = new Date(`${month}-01T00:00:00`).toISOString();
  const next = new Date(`${month}-01T00:00:00`);
  next.setMonth(next.getMonth() + 1);

  const { data, error } = await supabase
    .from("expenses")
    .select("category, amount")
    .gte("paid_at", start)
    .lt("paid_at", next.toISOString());
  if (error) throw error;
  const map = new Map<string, number>();
  for (const e of data ?? []) {
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export type TodayTodo = {
  id: string;
  title: string;
  emoji: string | null;
  completed_at: string | null;
  scheduled_date: string;
  isOverdue: boolean;
};

/** 오늘 할 일 + 밀린(미완료, scheduled_date < today). */
export async function getTodayAndOverdueTodos(): Promise<TodayTodo[]> {
  const supabase = createClient();
  const today = todayIso();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, emoji, completed_at, scheduled_date")
    .lte("scheduled_date", today)
    .order("scheduled_date", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .filter((t) => t.scheduled_date === today || !t.completed_at)
    .slice(0, 8)
    .map((t) => ({ ...t, isOverdue: t.scheduled_date < today && !t.completed_at }));
}

/** social 의 받은 초대 — 재export (위젯에서 직접 사용). */
export { getMyIncomingInvites };
```

- [ ] **Step 2: Commit (Task 2 와 묶음)**

```bash
git add features/widgets/lib/items.ts features/widgets/server/queries.ts
git commit -m "feat(widgets): items meta + server queries"
```

---

### Task 4: server actions (updateWidgetVisibility)

**Files:**
- Create: `features/widgets/server/actions.ts`

- [ ] **Step 1: action 작성**

```ts
// features/widgets/server/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { WIDGET_KEYS } from "../lib/items";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const hiddenSchema = z
  .array(z.enum(WIDGET_KEYS as [string, ...string[]]))
  .max(WIDGET_KEYS.length);

/** 메인 위젯 보임/숨김 저장. hidden 배열 (=숨길 키). */
export async function updateWidgetVisibility(
  hidden: unknown,
): Promise<ActionResult> {
  const parsed = hiddenSchema.safeParse(hidden);
  if (!parsed.success) return { ok: false, error: "잘못된 위젯 키" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("profiles")
    .update({ widget_visibility: parsed.data })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: tsc + commit**

```bash
pnpm tsc --noEmit
git add features/widgets/server/actions.ts
git commit -m "feat(widgets): updateWidgetVisibility action"
```

---

### Task 5: WidgetCard 공통 컴포넌트

**Files:**
- Create: `features/widgets/components/WidgetCard.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/widgets/components/WidgetCard.tsx
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
};

/** 메인 위젯 카드 공통 wrapper — border / padding / 제목 / body. */
export function WidgetCard({ icon: Icon, title, trailing, children }: Props) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <header className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
        {trailing && (
          <span className="ml-auto text-xs text-muted-foreground">{trailing}</span>
        )}
      </header>
      <div className="text-sm">{children}</div>
    </section>
  );
}
```

---

### Task 6: TodayEventsWidget

**Files:**
- Create: `features/widgets/components/TodayEventsWidget.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/widgets/components/TodayEventsWidget.tsx
import { Calendar } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { getTodayEvents } from "../server/queries";

export async function TodayEventsWidget() {
  let events: Awaited<ReturnType<typeof getTodayEvents>> = [];
  try {
    events = await getTodayEvents();
  } catch {
    return (
      <WidgetCard icon={Calendar} title="오늘의 일정">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard icon={Calendar} title="오늘의 일정" trailing={`${events.length}개`}>
      {events.length === 0 ? (
        <p className="text-muted-foreground">오늘은 일정이 없어요</p>
      ) : (
        <ul className="space-y-1.5">
          {events.slice(0, 5).map((e) => {
            const time = new Date(e.start_at).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <li key={e.id} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: e.color ?? e.calendar_color }}
                />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {time}
                </span>
                <span className="truncate">{e.title}</span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
```

---

### Task 7: UpcomingEventsWidget

**Files:**
- Create: `features/widgets/components/UpcomingEventsWidget.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/widgets/components/UpcomingEventsWidget.tsx
import { CalendarDays } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { getUpcomingEvents } from "../server/queries";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export async function UpcomingEventsWidget() {
  let events: Awaited<ReturnType<typeof getUpcomingEvents>> = [];
  try {
    events = await getUpcomingEvents();
  } catch {
    return (
      <WidgetCard icon={CalendarDays} title="다가오는 일정">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard icon={CalendarDays} title="다가오는 7일">
      {events.length === 0 ? (
        <p className="text-muted-foreground">예정된 일정이 없어요</p>
      ) : (
        <ul className="space-y-1.5">
          {events.slice(0, 6).map((e) => {
            const d = new Date(e.start_at);
            const md = `${d.getMonth() + 1}/${d.getDate()}`;
            const dow = WEEKDAY[d.getDay()];
            return (
              <li key={e.id} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: e.color ?? e.calendar_color }}
                />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {md} ({dow})
                </span>
                <span className="truncate">{e.title}</span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
```

---

### Task 8: MonthExpenseWidget

**Files:**
- Create: `features/widgets/components/MonthExpenseWidget.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/widgets/components/MonthExpenseWidget.tsx
import { Wallet } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { getMonthExpenseSummary } from "../server/queries";

export async function MonthExpenseWidget() {
  let s: Awaited<ReturnType<typeof getMonthExpenseSummary>>;
  try {
    s = await getMonthExpenseSummary();
  } catch {
    return (
      <WidgetCard icon={Wallet} title="이번 달 지출">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  const { actual, target } = s;
  const fmt = (n: number) => `${n.toLocaleString("ko-KR")}원`;
  const pct =
    target != null && target > 0 ? Math.min(100, (actual / target) * 100) : 0;
  const over = target != null && actual > target;

  return (
    <WidgetCard icon={Wallet} title="이번 달 지출">
      <div className="flex items-baseline justify-between">
        <span className={`text-lg font-semibold tabular-nums ${over ? "text-red-600" : ""}`}>
          {fmt(actual)}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {target != null ? `목표 ${fmt(target)}` : "월 목표 미설정"}
        </span>
      </div>
      {target != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${over ? "bg-red-600" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {target != null && (
        <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
          {over
            ? `초과 ${fmt(actual - target)}`
            : `잔여 ${fmt(target - actual)}`}
        </p>
      )}
    </WidgetCard>
  );
}
```

---

### Task 9: CategoryExpenseWidget

**Files:**
- Create: `features/widgets/components/CategoryExpenseWidget.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/widgets/components/CategoryExpenseWidget.tsx
import { BarChart3 } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { getCategoryTotals } from "../server/queries";
import { getCategoryColor } from "@/lib/colors";

export async function CategoryExpenseWidget() {
  let totals: Awaited<ReturnType<typeof getCategoryTotals>> = [];
  try {
    totals = await getCategoryTotals();
  } catch {
    return (
      <WidgetCard icon={BarChart3} title="카테고리별 지출">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  if (totals.length === 0) {
    return (
      <WidgetCard icon={BarChart3} title="카테고리별 지출">
        <p className="text-muted-foreground">이번 달 지출 없음</p>
      </WidgetCard>
    );
  }

  const max = totals[0].amount;
  const top5 = totals.slice(0, 5);

  return (
    <WidgetCard icon={BarChart3} title="카테고리별 지출">
      <ul className="space-y-1.5">
        {top5.map((t) => (
          <li key={t.category}>
            <div className="flex justify-between text-xs">
              <span>{t.category}</span>
              <span className="tabular-nums text-muted-foreground">
                {t.amount.toLocaleString("ko-KR")}원
              </span>
            </div>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(t.amount / max) * 100}%`,
                  backgroundColor: getCategoryColor(t.category),
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
```

---

### Task 10: TodayTodosWidget

**Files:**
- Create: `features/widgets/components/TodayTodosWidget.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/widgets/components/TodayTodosWidget.tsx
import { CheckSquare } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { getTodayAndOverdueTodos } from "../server/queries";

export async function TodayTodosWidget() {
  let todos: Awaited<ReturnType<typeof getTodayAndOverdueTodos>> = [];
  try {
    todos = await getTodayAndOverdueTodos();
  } catch {
    return (
      <WidgetCard icon={CheckSquare} title="오늘 할 일">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  const overdueCount = todos.filter((t) => t.isOverdue).length;

  return (
    <WidgetCard
      icon={CheckSquare}
      title="오늘 할 일"
      trailing={
        overdueCount > 0 ? (
          <span className="text-red-600">밀린 {overdueCount}</span>
        ) : (
          `${todos.length}개`
        )
      }
    >
      {todos.length === 0 ? (
        <p className="text-muted-foreground">할 일이 없어요</p>
      ) : (
        <ul className="space-y-1">
          {todos.map((t) => (
            <li
              key={t.id}
              className={`flex items-center gap-1.5 ${t.completed_at ? "line-through text-muted-foreground" : ""}`}
            >
              <span className="text-xs">{t.completed_at ? "☑" : "☐"}</span>
              {t.emoji && <span>{t.emoji}</span>}
              <span className="truncate">{t.title}</span>
              {t.isOverdue && (
                <span className="ml-auto text-xs text-red-600">밀림</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
```

---

### Task 11: IncomingInvitesWidget

**Files:**
- Create: `features/widgets/components/IncomingInvitesWidget.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/widgets/components/IncomingInvitesWidget.tsx
import Link from "next/link";
import { Users } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { getMyIncomingInvites } from "../server/queries";

export async function IncomingInvitesWidget() {
  let invites: Awaited<ReturnType<typeof getMyIncomingInvites>> = [];
  try {
    invites = await getMyIncomingInvites();
  } catch {
    return (
      <WidgetCard icon={Users} title="받은 초대">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      icon={Users}
      title="받은 초대"
      trailing={invites.length > 0 ? `${invites.length}개` : undefined}
    >
      {invites.length === 0 ? (
        <p className="text-muted-foreground">받은 초대 없음</p>
      ) : (
        <>
          <ul className="space-y-1.5">
            {invites.slice(0, 3).map((inv) => (
              <li key={inv.id} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: inv.calendar?.color ?? "#888" }}
                />
                <span className="truncate">
                  {inv.calendar?.name ?? "(삭제됨)"}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {inv.owner?.nickname ?? "?"}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/social"
            className="mt-2 inline-block text-xs text-primary hover:underline"
          >
            모두 보기 →
          </Link>
        </>
      )}
    </WidgetCard>
  );
}
```

---

### Task 12: 메인 페이지 (app/(app)/page.tsx)

**Files:**
- Create or modify: `app/(app)/page.tsx`

- [ ] **Step 1: 기존 파일 확인 + 작성**

```tsx
// app/(app)/page.tsx
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { WIDGET_ITEMS, normalizeHidden } from "@/features/widgets/lib/items";
import { TodayEventsWidget } from "@/features/widgets/components/TodayEventsWidget";
import { UpcomingEventsWidget } from "@/features/widgets/components/UpcomingEventsWidget";
import { MonthExpenseWidget } from "@/features/widgets/components/MonthExpenseWidget";
import { CategoryExpenseWidget } from "@/features/widgets/components/CategoryExpenseWidget";
import { TodayTodosWidget } from "@/features/widgets/components/TodayTodosWidget";
import { IncomingInvitesWidget } from "@/features/widgets/components/IncomingInvitesWidget";
import type { WidgetKey } from "@/features/widgets/lib/items";

export const metadata = { title: "홈" };

const WIDGET_COMPONENTS: Record<WidgetKey, React.ComponentType> = {
  today_events: TodayEventsWidget,
  upcoming: UpcomingEventsWidget,
  month_expense: MonthExpenseWidget,
  category: CategoryExpenseWidget,
  today_todos: TodayTodosWidget,
  invites: IncomingInvitesWidget,
};

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // (app)/layout 에서 이미 인증 체크 — 여기서는 fail-safe 만

  const hidden = await (async () => {
    if (!user) return [] as WidgetKey[];
    const { data } = await supabase
      .from("profiles")
      .select("widget_visibility")
      .eq("id", user.id)
      .maybeSingle();
    return normalizeHidden(data?.widget_visibility);
  })();

  const visible = WIDGET_ITEMS.filter((w) => !hidden.includes(w.key));

  if (visible.length === 0) {
    return (
      <div className="container mx-auto max-w-5xl p-6 text-center">
        <p className="text-muted-foreground">
          메인 위젯이 모두 꺼져있어요.{" "}
          <Link href="/settings" className="text-primary hover:underline">
            설정에서 켜기
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visible.map((w) => {
          const C = WIDGET_COMPONENTS[w.key];
          return <C key={w.key} />;
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: tsc**

```bash
pnpm tsc --noEmit
```
Expected: EXIT 0

---

### Task 13: lib/nav.ts 변경 (홈 추가, 탭바 재구성)

**Files:**
- Modify: `lib/nav.ts`

- [ ] **Step 1: 변경**

```ts
// lib/nav.ts
import {
  Home,
  Calendar,
  CheckSquare,
  Wallet,
  Users,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * 사이드바(데스크톱) + 모바일 드로어 메뉴.
 * "/" 홈은 메인 위젯 페이지. "하루(/day)" 는 캘린더 헤더 토글에 흡수.
 */
export const navItems: NavItem[] = [
  { href: "/",         label: "홈",          icon: Home },
  { href: "/calendar", label: "캘린더",       icon: Calendar },
  { href: "/todos",    label: "오늘의 할 일", icon: CheckSquare },
  { href: "/expense",  label: "가계부",       icon: Wallet },
  { href: "/social",   label: "공유",         icon: Users },
  { href: "/settings", label: "설정",         icon: Settings },
];

export type MobileTabItem =
  | { kind: "link"; href: string; label: string; icon: LucideIcon }
  | { kind: "more"; label: string; icon: LucideIcon };

/**
 * 모바일 하단 탭바 4개.
 * 캘린더는 더보기 드로어의 사이드바 nav 에서 진입.
 */
export const mobileTabItems: MobileTabItem[] = [
  { kind: "link", href: "/",        label: "홈",     icon: Home },
  { kind: "link", href: "/todos",   label: "할 일",  icon: CheckSquare },
  { kind: "link", href: "/expense", label: "가계부", icon: Wallet },
  { kind: "more", label: "더보기",  icon: MoreHorizontal },
];
```

---

### Task 14: /settings 의 "메인 위젯" 섹션

**Files:**
- Modify: `features/settings/components/SettingsClient.tsx`
- Modify: `app/(app)/settings/page.tsx`

- [ ] **Step 1: settings page 가 widget_visibility 도 fetch**

```ts
// app/(app)/settings/page.tsx — 기존에 profile.nickname fetch 하던 select 에 추가
const { data: profile } = await supabase
  .from("profiles")
  .select("nickname, widget_visibility")
  .eq("id", user.id)
  .maybeSingle();
```

`SettingsClient` 에 prop 추가:
```tsx
<SettingsClient
  email={user.email ?? ""}
  initialNickname={profile?.nickname ?? ""}
  initialHiddenWidgets={normalizeHidden(profile?.widget_visibility)}
  calendars={calendars}
/>
```

import 추가:
```ts
import { normalizeHidden } from "@/features/widgets/lib/items";
```

- [ ] **Step 2: SettingsClient 변경**

위쪽 import 에 추가:
```ts
import { Checkbox } from "@/components/ui/checkbox";
import {
  WIDGET_ITEMS,
  type WidgetKey,
} from "@/features/widgets/lib/items";
import { updateWidgetVisibility } from "@/features/widgets/server/actions";
```

Props 에 `initialHiddenWidgets: WidgetKey[]` 추가.

state 추가:
```ts
const [hiddenWidgets, setHiddenWidgets] = useState<WidgetKey[]>(initialHiddenWidgets);
```

handler 추가:
```ts
const handleWidgetToggle = (key: WidgetKey, visible: boolean) => {
  const next = visible
    ? hiddenWidgets.filter((k) => k !== key)
    : Array.from(new Set([...hiddenWidgets, key]));
  startTransition(async () => {
    const r = await updateWidgetVisibility(next);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setHiddenWidgets(next);
    toast.success("위젯 설정 저장됨");
    router.refresh();
  });
};
```

JSX — 캘린더 섹션 위(또는 테마 다음)에 새 섹션:
```tsx
{/* 메인 위젯 */}
<section className="space-y-3">
  <h2 className="text-base font-semibold">메인 위젯</h2>
  <div className="rounded-lg border p-4 space-y-2">
    {WIDGET_ITEMS.map((w) => {
      const visible = !hiddenWidgets.includes(w.key);
      const Icon = w.icon;
      return (
        <label
          key={w.key}
          className="flex items-center gap-3 py-1 cursor-pointer"
        >
          <Checkbox
            checked={visible}
            onCheckedChange={(v) => handleWidgetToggle(w.key, Boolean(v))}
            disabled={pending}
          />
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{w.label}</span>
        </label>
      );
    })}
  </div>
</section>
```

`useRouter` 추가 (이미 있으면 skip):
```ts
import { useRouter } from "next/navigation";
const router = useRouter();
```

- [ ] **Step 3: tsc**

```bash
pnpm tsc --noEmit
```
Expected: EXIT 0

---

### Task 15: 회귀 점검 (root /, middleware)

**Files:**
- Inspect: `middleware.ts`, `app/(app)/layout.tsx`, 기존 `app/(app)/page.tsx`

- [ ] **Step 1: 기존 root page 확인**

```bash
ls app/\(app\)/page.tsx 2>/dev/null && echo "exists" || echo "none"
```
존재하면 — Task 12 에서 교체됨 (확인).

- [ ] **Step 2: middleware root redirect 확인**

```bash
grep -n "redirect\|/calendar" middleware.ts 2>/dev/null
```
`/` → `/calendar` redirect 코드 있으면 제거 (위젯 페이지가 root 라 redirect 불필요).

- [ ] **Step 3: app/page.tsx (root, layout 그룹 밖) 확인**

`app/page.tsx` 가 있으면 — `(app)/page.tsx` 와 충돌 가능. 보통 `app/page.tsx` 가 `redirect("/calendar")` 같은 코드. `redirect("/")` 또는 제거 검토.

- [ ] **Step 4: 한 묶음 commit (Task 5~15 한꺼번에)**

```bash
git add features/widgets/ app/\(app\)/page.tsx lib/nav.ts \
  features/settings/components/SettingsClient.tsx \
  app/\(app\)/settings/page.tsx \
  middleware.ts app/page.tsx 2>/dev/null
git commit -m "feat(widgets): 메인 위젯 페이지 (홈) + /settings 보임-숨김 + nav 재구성"
```

---

### Task 16: 시각 확인 (사용자)

**Files:** 없음

- [ ] **Step 1: dev 서버 정상 + 자동 회복**

```bash
curl -s -o /dev/null -w "STATUS:%{http_code}\n" http://localhost:3000/login
```
Expected: STATUS:200

- [ ] **Step 2: 사용자에게 시각 확인 가이드 전달**

체크리스트:
- http://localhost:3000/ — 메인 위젯 페이지 (6개 위젯 grid)
- 사이드바 첫 항목 "홈" 보임 + 활성화 상태
- 모바일 탭바: 홈/할 일/가계부/더보기 (캘린더 사라짐)
- /settings — "메인 위젯" 섹션 + 6 체크박스
- 체크 해제 → 홈 페이지 새로고침 → 해당 위젯 사라짐
- 모두 해제 → "설정에서 켜기" 안내 표시
- 데스크탑 2col / 모바일 1col layout

---

## Self-Review

**Spec coverage:** 모든 spec 결정사항 task 에 매핑됨 (위젯 6개 = Task 6~11, 마이그레이션 = Task 1, settings 토글 = Task 14, nav 재구성 = Task 13, 메인 페이지 = Task 12, server queries/actions = Task 3/4, items 메타 = Task 2, 회귀 점검 = Task 15, 시각 확인 = Task 16).

**Placeholder scan:** 없음 — 모든 step 에 실제 코드/명령 포함.

**Type consistency:** `WidgetKey` 타입 / `WIDGET_ITEMS` / `normalizeHidden` 모든 task 에서 동일 시그니처. `getMyIncomingInvites` 는 기존 features/social 의 export 그대로 재사용.

**한 번에 진행 흐름:** 사용자가 "마지막 확인" 요청 → 중간 commit 은 Task 1 (migration) 후, Task 2~4 (백엔드) 후, Task 5~15 (UI 전체) 후 묶음 commit 으로 압축. 사용자 시각 확인은 Task 16 한 번.
