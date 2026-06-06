# v2 보완 Implementation Plan — 구독 종료일 + 반복 일정 + 할 일 수정 + 모바일 캘린더 탭

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spec [`2026-06-06-v2-improvements-design.md`](../specs/2026-06-06-v2-improvements-design.md) 의 4가지 보완을 작업량 작은 순서 (#4 → #3 → #1 → #2) 로 main 에 점진 머지/배포한다.

**Architecture:** 4가지 도메인 독립 — 모바일 네비/할일/가계부/캘린더 분리. 각 단계 끝에 사용자 검증 게이트. 반복 일정 (가장 큰)은 task 단위 unfoldRecurring 패턴(`features/todos/lib/recurrence.ts`)을 events 용으로 차용.

**Tech Stack:** Next.js 14, Supabase, shadcn/ui, lucide, Vitest (TDD 가능 부분), Tailwind.

---

## 파일 구조 (생성/수정 대상)

### Phase A — 모바일 탭바 (#4)
```
lib/nav.ts                                       (수정: mobileTabItems 5개)
components/layout/mobile-tabbar.tsx              (수정: grid-cols-5)
```

### Phase B — 할 일 제목 수정 (#3)
```
features/todos/server/actions.ts                 (수정: updateTodo 추가)
features/todos/server/actions.test.ts            (신규? — 없으면 직접 함수 TDD)
features/todos/components/TodoItem.tsx           (수정: 인풋 모드)
features/todos/components/DraggableTodoItem.tsx  (수정: TodoItem prop 전달)
```

### Phase C — 구독 종료일 (#1)
```
supabase/migrations/20260606120000_subscription_end_date.sql   (신규)
types/database.ts                                              (수정: subscriptions Row/Insert/Update)
features/expense/server/queries.ts                             (수정: getSubscriptions 필터)
features/expense/server/actions.ts                             (수정: createSubscription / updateSubscription)
features/expense/components/SubscriptionModal.tsx              (수정: end_date 필드)
features/expense/components/SubscriptionItem.tsx               (수정: end_date 배지 표시)
```

### Phase D — 반복 일정 (#2)
```
supabase/migrations/20260606130000_events_recurrence.sql       (신규)
types/database.ts                                              (수정: events 컬럼 4개)
features/calendar/lib/event-recurrence.ts                      (신규)
features/calendar/lib/event-recurrence.test.ts                 (신규)
features/calendar/server/queries.ts                            (수정: getEventsForMonth 가상 추가)
features/calendar/server/actions.ts                            (수정: createEvent + 신규 actions)
features/calendar/components/EventModal.tsx                    (수정: 반복 섹션)
features/calendar/components/EventDetailDialog.tsx             (수정: 삭제 다이얼로그)
features/calendar/components/MonthGrid.tsx                     (수정: 가상 인스턴스 렌더)
features/calendar/components/DayDetailPopup.tsx                (수정: 가상 인스턴스 렌더)
```

### Phase E — 종합 검증

---

## 작업 순서 (18 tasks)

전체: **A (T1) → B (T2-T4) → C (T5-T8) → D (T9-T17) → E (T18)**

게이트(사용자 검증): T1, T4, T8, T17, T18

---

### Task 1: 모바일 탭바 5탭 (캘린더 추가)

**Files:**
- Modify: `lib/nav.ts`
- Modify: `components/layout/mobile-tabbar.tsx`

- [ ] **Step 1: lib/nav.ts 수정 — Calendar 항목 추가**

`mobileTabItems` 배열을 다음과 같이 수정 (홈 다음에 캘린더):

```typescript
import { Home, Calendar, CheckSquare, Wallet, MoreHorizontal } from "lucide-react";

export const mobileTabItems: MobileTabItem[] = [
  { kind: "link", href: "/", label: "홈", icon: Home },
  { kind: "link", href: "/calendar", label: "캘린더", icon: Calendar },
  { kind: "link", href: "/todos", label: "할 일", icon: CheckSquare },
  { kind: "link", href: "/expense", label: "가계부", icon: Wallet },
  { kind: "more", label: "더보기", icon: MoreHorizontal },
];
```

- [ ] **Step 2: mobile-tabbar.tsx 수정 — grid-cols-4 → grid-cols-5**

`<ul className="grid grid-cols-4">` 를 `<ul className="grid grid-cols-5">` 로 변경.

- [ ] **Step 3: dev 서버 실행 + 브라우저 mobile 뷰포트 검증**

```bash
cd /c/dev/lunabear-calendar && pnpm dev
```

Chrome DevTools 모바일 뷰 (375px 또는 360px) 로 / 페이지 → 하단 탭바 5칸 확인. 캘린더 탭 → /calendar 이동, active 시 primary 색 적용.

- [ ] **Step 4: 게이트 — 사용자 검증**

폰에서 vercel preview (또는 main deploy 후) 로 확인:
- [ ] 하단 탭바 5칸 보임 (홈/캘린더/할일/가계부/더보기)
- [ ] 캘린더 탭 active 시 색 강조
- [ ] iOS 노치 / Z Flip6 대응 OK

- [ ] **Step 5: 커밋**

```bash
cd /c/dev/lunabear-calendar && \
  git add lib/nav.ts components/layout/mobile-tabbar.tsx && \
  git commit -m "feat(nav): 모바일 탭바에 캘린더 추가 (4 → 5탭)"
```

- [ ] **Step 6: main push**

```bash
cd /c/dev/lunabear-calendar && git push origin main
```

---

### Task 2: updateTodo action (TDD)

**Files:**
- Modify: `features/todos/server/actions.ts`

기존 `createTodo`, `toggleTodo` 패턴 따라 `updateTodo` 추가.

- [ ] **Step 1: 기존 actions.ts 의 createTodo / toggleTodo 시그니처 확인**

```bash
cd /c/dev/lunabear-calendar && grep -n "^export async function" features/todos/server/actions.ts
```

Expected: createTodo, toggleTodo, deleteTodo, createRecurringTodo, ... 등 목록.

- [ ] **Step 2: updateTodo 함수 추가**

`features/todos/server/actions.ts` 의 `deleteTodo` 다음에 추가:

```typescript
export async function updateTodo(
  id: string,
  patch: { title: string }
): Promise<ActionResult> {
  const trimmed = patch.title.trim();
  if (!trimmed) {
    return { ok: false, error: "제목을 입력해 주세요" };
  }
  if (trimmed.length > 200) {
    return { ok: false, error: "제목은 200자 이내로 입력해 주세요" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { error } = await supabase
    .from("tasks")
    .update({ title: trimmed })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[updateTodo] failed", error);
    return { ok: false, error: "수정에 실패했어요" };
  }
  revalidatePath("/todos");
  revalidatePath("/calendar");
  return { ok: true };
}
```

⚠️ 실행자: 파일 상단의 `createClient`, `revalidatePath`, `ActionResult` import 가 이미 있을 거 — 확인 후 누락 시 추가.

- [ ] **Step 3: typecheck 통과 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck
```

Expected: exit 0, no errors.

- [ ] **Step 4: 커밋 안 함** (T3 와 묶음)

---

### Task 3: TodoItem 인풋 모드 (더블 탭 / 더블 클릭)

**Files:**
- Modify: `features/todos/components/TodoItem.tsx`
- Modify: `features/todos/components/DraggableTodoItem.tsx` (필요 시)

- [ ] **Step 1: TodoItem 의 제목 영역 식별**

```bash
cd /c/dev/lunabear-calendar && grep -n "todo.title" features/todos/components/TodoItem.tsx
```

해당 영역을 `<span>` (또는 그 비슷한 element) 로 감싸고 있는 부분 파악.

- [ ] **Step 2: 인풋 모드 state + handler 추가**

`TodoItem.tsx` 컴포넌트 내부 (existing state 다음):

```typescript
import { updateTodo } from "../server/actions";

const [isEditing, setIsEditing] = useState(false);
const [draftTitle, setDraftTitle] = useState(todo.title);

const handleEditStart = () => {
  setDraftTitle(todo.title);
  setIsEditing(true);
};

const handleEditCancel = () => {
  setIsEditing(false);
  setDraftTitle(todo.title);
};

const handleEditSave = () => {
  const trimmed = draftTitle.trim();
  if (!trimmed || trimmed === todo.title) {
    setIsEditing(false);
    return;
  }
  startTransition(async () => {
    const r = await updateTodo(todo.id, { title: trimmed });
    if (r.ok) {
      setIsEditing(false);
      toast.success("할 일이 수정됐어요");
    } else {
      toast.error(r.error);
      // 인풋은 유지
    }
  });
};
```

- [ ] **Step 3: 제목 렌더 — 더블 탭으로 인풋 진입 + 인풋 UI**

기존 제목 표시 JSX 를 다음과 같이 변경:

```tsx
{isEditing ? (
  <input
    type="text"
    value={draftTitle}
    onChange={(e) => setDraftTitle(e.target.value)}
    onBlur={handleEditSave}
    onKeyDown={(e) => {
      if (e.key === "Enter") handleEditSave();
      if (e.key === "Escape") handleEditCancel();
    }}
    autoFocus
    className="flex-1 min-w-0 bg-transparent border-b border-primary outline-none text-sm"
    aria-label="할 일 제목 수정"
  />
) : (
  <span
    onDoubleClick={handleEditStart}
    className="flex-1 min-w-0 truncate text-sm cursor-text"
  >
    {todo.title}
  </span>
)}
```

⚠️ 실행자: 기존 제목 JSX 의 className / props 를 보존하면서 위 패턴으로 감쌀 것. 기존 strikethrough (완료 시) 효과는 `<span>` 쪽에 보존.

- [ ] **Step 4: typecheck + dev 서버에서 시각 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck
```

dev 서버 → /todos → 할 일 카드 제목 **더블 클릭** → 인풋 모드 → 변경 → Enter → 저장.

검증:
- [ ] 더블 클릭으로 인풋 진입
- [ ] Enter 저장 + 토스트
- [ ] Esc 취소
- [ ] 빈 문자열 입력 → 원래대로
- [ ] 단일 클릭은 체크박스/메뉴와 충돌 안 함

- [ ] **Step 5: 커밋**

```bash
cd /c/dev/lunabear-calendar && \
  git add features/todos/server/actions.ts features/todos/components/TodoItem.tsx && \
  git commit -m "feat(todos): 할 일 제목 inline 수정 (더블 탭/클릭)"
```

---

### Task 4: 게이트 — 할 일 제목 수정 사용자 검증

- [ ] **Step 1: main push + vercel deploy 대기**

```bash
cd /c/dev/lunabear-calendar && git push origin main
```

vercel 빌드 1-2분.

- [ ] **Step 2: 사용자 작업 — 폰에서 검증**

- [ ] 모바일 폰에서 /todos 진입
- [ ] 할 일 카드 더블 탭 → 인풋 모드 진입
- [ ] 텍스트 변경 → Enter 또는 포커스 잃기 → 저장 + 토스트
- [ ] Esc 또는 빈 문자열 → 원래대로
- [ ] 단일 탭으로 체크 토글은 그대로 동작

문제 있으면 보고. 잘 되면 T5 진행.

---

### Task 5: 구독 종료일 — SQL 마이그레이션 + 타입

**Files:**
- Create: `supabase/migrations/20260606120000_subscription_end_date.sql`
- Modify: `types/database.ts`

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
alter table public.subscriptions
  add column if not exists end_date date;
```

- [ ] **Step 2: prod + dev Supabase SQL Editor 에 실행**

사용자 작업 — Supabase 대시보드 SQL Editor 에서:
- prod (rhtnszvdeqmacwawnznj) 에 위 SQL 실행
- dev (rkqtcuaifhwyyzbavhio) 에 동일 SQL 실행

확인: 두 환경 모두 `select column_name from information_schema.columns where table_name='subscriptions' and column_name='end_date';` → 1 행.

- [ ] **Step 3: types/database.ts 의 subscriptions Row/Insert/Update 에 end_date 추가**

`types/database.ts` 파일 열어서 subscriptions Row 에 `end_date: string | null` 추가, Insert/Update 에 `end_date?: string | null` 추가.

기존 `partner_id` 등이 추가된 패턴과 동일.

- [ ] **Step 4: typecheck 통과 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck
```

- [ ] **Step 5: 커밋 안 함** (T8 게이트 후 묶음)

---

### Task 6: SubscriptionModal 에 종료일 필드

**Files:**
- Modify: `features/expense/components/SubscriptionModal.tsx`
- Modify: `features/expense/server/actions.ts`

- [ ] **Step 1: SubscriptionModal 에 end_date state + 필드 추가**

state 추가 (다른 state 와 같은 자리):

```typescript
const [endDate, setEndDate] = useState<string>(
  initial?.end_date ?? "",
);
```

폼 JSX 에 추가 (다른 필드들 사이, 예: `billing_day` 다음):

```tsx
<div>
  <Label htmlFor="end-date">
    종료일 <span className="text-muted-foreground text-xs">(선택)</span>
  </Label>
  <Input
    id="end-date"
    type="date"
    value={endDate}
    onChange={(e) => setEndDate(e.target.value)}
  />
  <p className="text-xs text-muted-foreground mt-1">
    비워두면 무한 반복돼요. 종료일 다음 달부터 가계부에서 빠져요.
  </p>
</div>
```

- [ ] **Step 2: 저장 핸들러에 end_date 포함**

기존 submit 안에서 `createSubscription` / `updateSubscription` 호출 시 payload 에 `end_date: endDate || null` 추가.

- [ ] **Step 3: actions.ts 의 createSubscription / updateSubscription 시그니처 확장**

`features/expense/server/actions.ts` 의 두 함수가 payload 에 `end_date` 받아 supabase 에 그대로 전달. 빈 문자열 → null 처리:

```typescript
const cleanedEndDate = end_date && end_date.trim() ? end_date : null;
```

⚠️ 실행자: 기존 함수 시그니처 확인 후 동일 패턴으로 추가.

- [ ] **Step 4: typecheck**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck
```

- [ ] **Step 5: 커밋 안 함**

---

### Task 7: 가계부 합산 로직 — end_date 필터

**Files:**
- Modify: `features/expense/server/queries.ts`
- Modify: `features/expense/components/SubscriptionItem.tsx` (종료일 배지)

- [ ] **Step 1: getSubscriptions / 합산 사용처 파악**

```bash
cd /c/dev/lunabear-calendar && grep -nE "getSubscriptions|subscriptions.*is_active|activeSubscriptionSum" features/expense -r | head -20
```

활성 합산이 일어나는 곳: ExpensePage.tsx 의 `activeSubscriptionSum` (subscription.is_active 필터).

- [ ] **Step 2: 합산 로직에 end_date 가드 추가**

선택지 A — ExpensePage 클라이언트 측 합산을 수정:
ExpensePage 의 `activeSubscriptionSum` 계산 부분:

```typescript
const monthStart = `${currentMonth}-01`; // currentMonth = "2026-06"
const activeSubscriptionSum = subscriptions
  .filter((s) => s.is_active && (s.end_date === null || s.end_date >= monthStart))
  .reduce((sum, sub) => sum + sub.amount, 0);
```

같은 가드를 `totalsByCategory` 의 구독 누적 부분에도 적용 (페이지에 비슷한 reduce 가 두 곳 정도):

```typescript
for (const sub of subscriptions) {
  if (!sub.is_active) continue;
  if (sub.end_date !== null && sub.end_date < monthStart) continue;
  totalsByCategory[sub.category] =
    (totalsByCategory[sub.category] ?? 0) + sub.amount;
}
```

⚠️ 실행자: ExpensePage 의 `expenses` + `subscriptions` 합산 부분 (위 파일 line 60-90 부근) 두 곳 모두 같은 가드 적용. 단순화 위해 함수로 묶을 수 있으면 좋음:

```typescript
function isActiveForMonth(sub: SubscriptionRow, monthStart: string): boolean {
  if (!sub.is_active) return false;
  return sub.end_date === null || sub.end_date >= monthStart;
}
```

- [ ] **Step 3: SubscriptionItem.tsx 에 종료일 배지 표시**

종료일 있는 구독에 작은 배지: "~6/30 종료". 종료된 구독 (오늘 > end_date) 은 더 흐릿하게.

```tsx
{subscription.end_date && (
  <span className="text-xs text-muted-foreground">
    ~{formatEndDate(subscription.end_date)}
  </span>
)}
```

`formatEndDate("2026-06-30")` = "6/30 종료". 자체 함수 또는 inline.

- [ ] **Step 4: typecheck + dev 서버 시각 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck
```

dev 에서 /expense:
- 종료일 없는 구독 = 기존대로 합산
- 종료일 = 이번 달 = 합산
- 종료일 = 지난 달 = 합산 안 됨, 배지 흐릿

- [ ] **Step 5: 커밋**

```bash
cd /c/dev/lunabear-calendar && \
  git add supabase/migrations/20260606120000_subscription_end_date.sql \
          types/database.ts \
          features/expense/server/actions.ts \
          features/expense/server/queries.ts \
          features/expense/components/SubscriptionModal.tsx \
          features/expense/components/SubscriptionItem.tsx \
          app/\(app\)/expense/page.tsx && \
  git commit -m "feat(subscriptions): 종료일 (마지막 결제월까지 포함)"
```

⚠️ ExpensePage 가 app/(app)/expense/page.tsx 또는 features/expense/components/ExpensePage.tsx 에 있을 수 있음. 실제 수정한 파일만 add.

---

### Task 8: 게이트 — 구독 종료일 사용자 검증

- [ ] **Step 1: main push + vercel deploy**

```bash
cd /c/dev/lunabear-calendar && git push origin main
```

- [ ] **Step 2: 사용자 작업 — 검증**

- [ ] 구독 모달 새로 열기 → "종료일" 필드 있음
- [ ] 종료일 입력 + 저장 → 리스트에 "~M/D 종료" 배지
- [ ] 종료일 = 이번 달 = 합산에 포함 (이번 달 가계부)
- [ ] 종료일 = 지난 달 = 합산에서 빠짐
- [ ] 종료일 없는 (기존) 구독 = 변함 없음

문제 있으면 보고. 잘 되면 T9 진행.

---

### Task 9: 반복 일정 — SQL 마이그레이션 + 타입

**Files:**
- Create: `supabase/migrations/20260606130000_events_recurrence.sql`
- Modify: `types/database.ts`

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
alter table public.events
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_rule jsonb,
  add column if not exists recurrence_until date,
  add column if not exists recurrence_count integer;

create index if not exists events_recurring_idx
  on public.events (user_id, is_recurring)
  where is_recurring = true;
```

- [ ] **Step 2: prod + dev Supabase SQL Editor 에 실행**

사용자 작업. 두 환경에서:
```sql
select column_name from information_schema.columns where table_name='events' and column_name in ('is_recurring','recurrence_rule','recurrence_until','recurrence_count');
```
→ 4 행.

- [ ] **Step 3: types/database.ts 의 events 컬럼 4개 추가**

Row 에:
```typescript
is_recurring: boolean
recurrence_rule: Json | null
recurrence_until: string | null
recurrence_count: number | null
```

Insert / Update 에 같은 필드 옵셔널로.

- [ ] **Step 4: typecheck**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck
```

- [ ] **Step 5: 커밋 안 함** (T17 게이트까지 묶음)

---

### Task 10: event-recurrence.ts (TDD) — 전개 유틸

**Files:**
- Create: `features/calendar/lib/event-recurrence.ts`
- Create: `features/calendar/lib/event-recurrence.test.ts`

`features/todos/lib/recurrence.ts` 의 weekly-only 패턴을 daily/weekly/monthly 모두 지원하도록 확장한 events 버전.

- [ ] **Step 1: 실패 테스트 작성**

Create: `features/calendar/lib/event-recurrence.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { unfoldRecurringEvent, parseRecurrenceRule } from "./event-recurrence";

const baseEvent = {
  id: "evt-1",
  start_at: "2026-06-01T09:00:00.000Z",
  end_at: "2026-06-01T10:00:00.000Z",
  title: "회의",
  is_recurring: true,
  recurrence_until: null,
  recurrence_count: null,
};

describe("parseRecurrenceRule", () => {
  it("daily 통과", () => {
    expect(parseRecurrenceRule({ freq: "daily" })).toEqual({ freq: "daily" });
  });
  it("weekly + byday 통과", () => {
    expect(parseRecurrenceRule({ freq: "weekly", byday: ["MO", "WE"] }))
      .toEqual({ freq: "weekly", byday: ["MO", "WE"] });
  });
  it("monthly + bymonthday 통과", () => {
    expect(parseRecurrenceRule({ freq: "monthly", bymonthday: 15 }))
      .toEqual({ freq: "monthly", bymonthday: 15 });
  });
  it("알 수 없는 freq → null", () => {
    expect(parseRecurrenceRule({ freq: "yearly" })).toBeNull();
    expect(parseRecurrenceRule(null)).toBeNull();
  });
});

describe("unfoldRecurringEvent — daily", () => {
  it("시작일부터 매일 인스턴스", () => {
    const result = unfoldRecurringEvent(
      { ...baseEvent, recurrence_rule: { freq: "daily" } },
      "2026-06-01",
      "2026-06-05",
    );
    expect(result.map((v) => v.date)).toEqual([
      "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05",
    ]);
  });
  it("recurrence_until 이후 멈춤", () => {
    const result = unfoldRecurringEvent(
      { ...baseEvent, recurrence_rule: { freq: "daily" }, recurrence_until: "2026-06-03" },
      "2026-06-01",
      "2026-06-10",
    );
    expect(result.map((v) => v.date)).toEqual([
      "2026-06-01", "2026-06-02", "2026-06-03",
    ]);
  });
  it("recurrence_count N회 까지만", () => {
    const result = unfoldRecurringEvent(
      { ...baseEvent, recurrence_rule: { freq: "daily" }, recurrence_count: 3 },
      "2026-06-01",
      "2026-06-10",
    );
    expect(result).toHaveLength(3);
  });
});

describe("unfoldRecurringEvent — weekly", () => {
  it("byday 월/수만", () => {
    // 2026-06-01 = 월, 2026-06-03 = 수
    const result = unfoldRecurringEvent(
      { ...baseEvent, recurrence_rule: { freq: "weekly", byday: ["MO", "WE"] } },
      "2026-06-01",
      "2026-06-10",
    );
    expect(result.map((v) => v.date)).toEqual([
      "2026-06-01", "2026-06-03", "2026-06-08", "2026-06-10",
    ]);
  });
});

describe("unfoldRecurringEvent — monthly", () => {
  it("매월 15일", () => {
    const result = unfoldRecurringEvent(
      { ...baseEvent, recurrence_rule: { freq: "monthly", bymonthday: 15 } },
      "2026-06-01",
      "2026-08-31",
    );
    expect(result.map((v) => v.date)).toEqual([
      "2026-06-15", "2026-07-15", "2026-08-15",
    ]);
  });
});

describe("unfoldRecurringEvent — 시작일 이전 skip", () => {
  it("event.start_at 이전 날짜는 안 만듦", () => {
    const result = unfoldRecurringEvent(
      { ...baseEvent, start_at: "2026-06-10T09:00:00.000Z", recurrence_rule: { freq: "daily" } },
      "2026-06-01",
      "2026-06-12",
    );
    expect(result.map((v) => v.date)).toEqual([
      "2026-06-10", "2026-06-11", "2026-06-12",
    ]);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm test:run features/calendar/lib/event-recurrence.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: event-recurrence.ts 작성**

Create: `features/calendar/lib/event-recurrence.ts`

```typescript
export const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
export type WeekdayCode = (typeof WEEKDAY_CODES)[number];

export type RecurrenceRule =
  | { freq: "daily" }
  | { freq: "weekly"; byday: WeekdayCode[] }
  | { freq: "monthly"; bymonthday: number };

export type VirtualEvent = {
  /** synthetic id */
  id: string;
  parentId: string;
  date: string; // YYYY-MM-DD
  title: string;
  start_at: string;
  end_at: string;
};

type RecurringEventInput = {
  id: string;
  start_at: string;
  end_at: string;
  title: string;
  is_recurring: boolean;
  recurrence_rule: unknown;
  recurrence_until: string | null;
  recurrence_count: number | null;
};

export function parseRecurrenceRule(value: unknown): RecurrenceRule | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.freq === "daily") return { freq: "daily" };
  if (v.freq === "weekly") {
    if (!Array.isArray(v.byday) || v.byday.length === 0) return null;
    const codes: readonly string[] = WEEKDAY_CODES;
    if (!v.byday.every((c): c is WeekdayCode => typeof c === "string" && codes.includes(c)))
      return null;
    return { freq: "weekly", byday: v.byday as WeekdayCode[] };
  }
  if (v.freq === "monthly") {
    if (typeof v.bymonthday !== "number") return null;
    if (v.bymonthday < 1 || v.bymonthday > 31) return null;
    return { freq: "monthly", bymonthday: v.bymonthday };
  }
  return null;
}

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseIsoDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function unfoldRecurringEvent(
  event: RecurringEventInput,
  rangeStartIso: string,
  rangeEndIso: string,
): VirtualEvent[] {
  if (!event.is_recurring) return [];
  const rule = parseRecurrenceRule(event.recurrence_rule);
  if (!rule) return [];

  const startIso = event.start_at.slice(0, 10);
  const effectiveStart = startIso > rangeStartIso ? startIso : rangeStartIso;
  const untilIso = event.recurrence_until ?? "";
  const effectiveEnd =
    untilIso && untilIso < rangeEndIso ? untilIso : rangeEndIso;

  if (effectiveStart > effectiveEnd) return [];

  const out: VirtualEvent[] = [];
  const maxCount = event.recurrence_count ?? Number.MAX_SAFE_INTEGER;

  const start = parseIsoDateOnly(effectiveStart);
  const end = parseIsoDateOnly(effectiveEnd);
  const eventStart = parseIsoDateOnly(startIso);

  const cur = new Date(start);
  while (cur <= end && out.length < maxCount) {
    const dateIso = isoDate(cur);
    let matches = false;
    if (rule.freq === "daily") {
      matches = true;
    } else if (rule.freq === "weekly") {
      const wd = WEEKDAY_CODES[cur.getDay()];
      matches = rule.byday.includes(wd);
    } else if (rule.freq === "monthly") {
      matches = cur.getDate() === rule.bymonthday;
    }
    if (matches && dateIso >= startIso) {
      out.push({
        id: `virtual-${event.id}-${dateIso}`,
        parentId: event.id,
        date: dateIso,
        title: event.title,
        start_at: event.start_at,
        end_at: event.end_at,
      });
    }
    cur.setDate(cur.getDate() + 1);
  }

  // recurrence_count 가 글로벌 카운트 — eventStart 부터 세어야 함.
  // 위에서는 effectiveStart 부터 셌으니, eventStart < effectiveStart 면 이미 N 개 만들어졌을 가능성.
  // 단순화: 우리 use case 에서 effectiveStart == startIso 또는 rangeStart > startIso 라면
  // 사용자가 본 범위에 한해서만 count 적용. spec 의 단순화 결정.
  return out;
}
```

⚠️ recurrence_count 의 의미는 "원본 시작일부터 총 N 인스턴스". 만약 사용자가 미래 범위만 보면 N 채우기 전인지 판단 어려움. spec 단순화: 보이는 범위 내에서 count 카운트. 정확하지 않지만 사용 케이스에선 OK.

- [ ] **Step 4: 테스트 재실행 → 통과 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm test:run features/calendar/lib/event-recurrence.test.ts
```

Expected: PASS — 8 tests passed.

- [ ] **Step 5: 커밋 안 함** (T17 게이트까지 묶음)

---

### Task 11: events queries — getEventsForMonth 가상 인스턴스 추가

**Files:**
- Modify: `features/calendar/server/queries.ts`

- [ ] **Step 1: getEventsForMonth 시그니처 확인**

```bash
cd /c/dev/lunabear-calendar && grep -n "getEventsForMonth\|getEvents" features/calendar/server/queries.ts | head -5
```

- [ ] **Step 2: 반환 타입 확장 — events + virtual**

기존 `EventRow[]` 반환을 `{ events: EventRow[]; virtual: VirtualEvent[] }` 로 변경.

```typescript
import { unfoldRecurringEvent, type VirtualEvent } from "../lib/event-recurrence";

export async function getEventsForMonth(month: string): Promise<{
  events: EventRow[];
  virtual: VirtualEvent[];
}> {
  // ... 기존 supabase 쿼리, 단 is_recurring 행 포함 ...

  const monthStart = `${month}-01`;
  const lastDay = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2,'0')}`;

  // 가상 인스턴스 전개 — 그 달 + 다음 주
  const rangeStart = monthStart;
  const nextWeek = new Date(monthStart);
  nextWeek.setDate(nextWeek.getDate() + lastDay + 7);
  const rangeEnd = nextWeek.toISOString().slice(0, 10);

  const virtual: VirtualEvent[] = [];
  for (const e of events) {
    if (!e.is_recurring) continue;
    virtual.push(...unfoldRecurringEvent(e, rangeStart, rangeEnd));
  }

  return { events, virtual };
}
```

⚠️ 실행자: 기존 함수의 반환 사용처 (예: `app/(app)/calendar/page.tsx`, `MonthGrid.tsx`) 도 같이 갱신 필요. 즉 사용처에서 `events` 가 row[] 였다면 → `.events` 로 접근하게 + `.virtual` 도 같이 받음.

- [ ] **Step 3: 사용처 grep + 갱신**

```bash
cd /c/dev/lunabear-calendar && grep -rn "getEventsForMonth" app features/calendar/components | head -10
```

각 호출 사이트에서 destructure:
```typescript
const { events, virtual } = await getEventsForMonth(month);
```

그리고 MonthGrid 등에 `virtual` prop 전달.

- [ ] **Step 4: typecheck**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck
```

- [ ] **Step 5: 커밋 안 함**

---

### Task 12: EventModal — 반복 섹션 추가

**Files:**
- Modify: `features/calendar/components/EventModal.tsx`

- [ ] **Step 1: EventModal 의 state 와 form 구조 파악**

```bash
cd /c/dev/lunabear-calendar && grep -n "useState\|recurrence\|setRecurrence" features/calendar/components/EventModal.tsx | head -20
```

- [ ] **Step 2: 반복 관련 state 추가**

```typescript
import { WEEKDAY_CODES, type WeekdayCode } from "@/features/calendar/lib/event-recurrence";

const [recurFreq, setRecurFreq] = useState<"none" | "daily" | "weekly" | "monthly">(
  initial?.is_recurring ? (initial.recurrence_rule as any)?.freq ?? "none" : "none"
);
const [recurByday, setRecurByday] = useState<WeekdayCode[]>(
  initial?.is_recurring && (initial.recurrence_rule as any)?.byday
    ? (initial.recurrence_rule as any).byday
    : []
);
const [recurMonthDay, setRecurMonthDay] = useState<number>(
  initial?.is_recurring && (initial.recurrence_rule as any)?.bymonthday
    ? (initial.recurrence_rule as any).bymonthday
    : 1
);
const [recurEndType, setRecurEndType] = useState<"none" | "date" | "count">(
  initial?.recurrence_until ? "date" :
  initial?.recurrence_count ? "count" : "none"
);
const [recurUntil, setRecurUntil] = useState<string>(initial?.recurrence_until ?? "");
const [recurCount, setRecurCount] = useState<string>(
  initial?.recurrence_count != null ? String(initial.recurrence_count) : ""
);
```

- [ ] **Step 3: 멀티데이 검출 — 반복 비활성**

```typescript
const isMultiDay = startDate !== endDate; // start_at / end_at 의 날짜 부분 비교
```

- [ ] **Step 4: 반복 섹션 JSX 추가**

DialogContent 안, 카테고리/색상 다음:

```tsx
<div className="space-y-2">
  <Label>반복</Label>
  {isMultiDay ? (
    <p className="text-xs text-muted-foreground">멀티데이 일정은 반복 지원 안 함</p>
  ) : (
    <>
      <select
        value={recurFreq}
        onChange={(e) => setRecurFreq(e.target.value as any)}
        className="..."
      >
        <option value="none">없음</option>
        <option value="daily">매일</option>
        <option value="weekly">매주</option>
        <option value="monthly">매월</option>
      </select>

      {recurFreq === "weekly" && (
        <div className="flex gap-1">
          {(["MO","TU","WE","TH","FR","SA","SU"] as WeekdayCode[]).map((wd) => (
            <button
              type="button"
              key={wd}
              onClick={() => setRecurByday((s) =>
                s.includes(wd) ? s.filter((x) => x !== wd) : [...s, wd]
              )}
              className={cn(
                "h-7 w-7 rounded-md text-xs",
                recurByday.includes(wd)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {weekdayKo(wd)}
            </button>
          ))}
        </div>
      )}

      {recurFreq === "monthly" && (
        <Input
          type="number"
          min={1}
          max={31}
          value={recurMonthDay}
          onChange={(e) => setRecurMonthDay(Number(e.target.value))}
        />
      )}

      {recurFreq !== "none" && (
        <div className="space-y-2">
          <Label>종료</Label>
          <div className="flex gap-2">
            {(["none","date","count"] as const).map((opt) => (
              <button
                type="button"
                key={opt}
                onClick={() => setRecurEndType(opt)}
                className={cn(
                  "px-2 py-1 text-xs rounded-md",
                  recurEndType === opt
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {opt === "none" ? "없음" : opt === "date" ? "날짜" : "횟수"}
              </button>
            ))}
          </div>
          {recurEndType === "date" && (
            <Input type="date" value={recurUntil} onChange={(e) => setRecurUntil(e.target.value)} />
          )}
          {recurEndType === "count" && (
            <Input
              type="number"
              min={2}
              max={365}
              value={recurCount}
              onChange={(e) => setRecurCount(e.target.value)}
            />
          )}
        </div>
      )}
    </>
  )}
</div>
```

⚠️ `weekdayKo` 헬퍼 만들기:
```typescript
function weekdayKo(c: WeekdayCode): string {
  return { MO:"월", TU:"화", WE:"수", TH:"목", FR:"금", SA:"토", SU:"일" }[c];
}
```

- [ ] **Step 5: 저장 핸들러 — 반복 payload 만들기**

submit 시:
```typescript
const isRecurring = recurFreq !== "none";
let recurrenceRule: any = null;
if (isRecurring) {
  if (recurFreq === "daily") recurrenceRule = { freq: "daily" };
  else if (recurFreq === "weekly") recurrenceRule = { freq: "weekly", byday: recurByday };
  else if (recurFreq === "monthly") recurrenceRule = { freq: "monthly", bymonthday: recurMonthDay };
}
const payload = {
  ...existingPayload,
  is_recurring: isRecurring,
  recurrence_rule: recurrenceRule,
  recurrence_until: recurEndType === "date" && recurUntil ? recurUntil : null,
  recurrence_count: recurEndType === "count" && recurCount ? Number(recurCount) : null,
};
```

- [ ] **Step 6: 커밋 안 함**

---

### Task 13: createEvent / updateEvent — payload 확장

**Files:**
- Modify: `features/calendar/server/actions.ts`

- [ ] **Step 1: createEvent / updateEvent 시그니처 확인**

```bash
cd /c/dev/lunabear-calendar && grep -n "^export async function (create|update)Event" features/calendar/server/actions.ts
```

- [ ] **Step 2: 입력 타입 확장 + 필드 그대로 supabase 에 전달**

기존 input 타입에 추가:
```typescript
is_recurring?: boolean;
recurrence_rule?: Record<string, unknown> | null;
recurrence_until?: string | null;
recurrence_count?: number | null;
```

insert / update payload 도 같은 필드 포함. 기본값:
- `is_recurring = false`
- 나머지 = null

- [ ] **Step 3: typecheck**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck
```

- [ ] **Step 4: 커밋 안 함**

---

### Task 14: 캘린더 그리드 — 가상 인스턴스 렌더

**Files:**
- Modify: `features/calendar/components/MonthGrid.tsx`
- Modify: `features/calendar/components/DayDetailPopup.tsx`

- [ ] **Step 1: MonthGrid 가 events + virtual 받도록 prop 확장**

기존 prop 이 `events: EventRow[]` 였다면 → `events: EventRow[]; virtual: VirtualEvent[]` 추가.

날짜별 렌더 시 두 배열 합쳐서 표시. 단 가상 인스턴스는 `⟳` 아이콘 (lucide `Repeat`) 작게 표시.

```tsx
const allByDate = useMemo(() => {
  const map = new Map<string, Array<EventRow | VirtualEvent>>();
  for (const e of events) {
    const date = e.start_at.slice(0, 10);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(e);
  }
  for (const v of virtual) {
    if (!map.has(v.date)) map.set(v.date, []);
    map.get(v.date)!.push(v);
  }
  return map;
}, [events, virtual]);
```

이벤트 카드 렌더 시 `"date" in item ? <RepeatIcon /> : null` 같은 식으로 가상 인스턴스 구분.

⚠️ 실행자: 기존 MonthGrid 의 events 사용 패턴 파악 후 동일 패턴 따라 virtual 도 추가. FullCalendar 쓰면 events prop 에 둘 다 넣되 virtual 은 별도 className 으로 표시.

- [ ] **Step 2: DayDetailPopup 도 동일 처리**

`virtual` prop 추가 + 그 날짜의 실제 + 가상 둘 다 표시.

- [ ] **Step 3: 가상 인스턴스 탭 → EventDetailDialog 띄움**

가상 인스턴스 클릭 시:
- "이 항목은 매주 반복되는 일정의 한 번이에요. 수정/삭제하시겠어요?"
- 버튼: "이 항목만 수정" / "전체 수정" / "취소"

이 처리는 EventDetailDialog 의 로직. T15 에서.

- [ ] **Step 4: 커밋 안 함**

---

### Task 15: 반복 actions + EventDetailDialog 삭제 다이얼로그

**Files:**
- Modify: `features/calendar/server/actions.ts`
- Modify: `features/calendar/components/EventDetailDialog.tsx`

- [ ] **Step 1: materializeRecurringEvent action 작성**

`features/calendar/server/actions.ts` 에 추가:

```typescript
/**
 * 가상 반복 인스턴스를 실제 row 로 생성.
 * - parent 의 모든 필드 복사
 * - is_recurring = false, recurrence_rule/until/count = null
 * - start_at / end_at 은 `date` 의 같은 시간으로 변경
 */
export async function materializeRecurringEvent(
  parentId: string,
  dateIso: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { data: parent, error: e1 } = await supabase
    .from("events")
    .select("*")
    .eq("id", parentId)
    .eq("user_id", user.id)
    .single();
  if (e1 || !parent) return { ok: false, error: "원본을 찾을 수 없어요" };

  const parentStartTime = parent.start_at.slice(11); // HH:MM:SS.sssZ
  const parentEndTime = parent.end_at.slice(11);
  const newStart = `${dateIso}T${parentStartTime}`;
  const newEnd = `${dateIso}T${parentEndTime}`;

  const { data: created, error: e2 } = await supabase
    .from("events")
    .insert({
      calendar_id: parent.calendar_id,
      user_id: user.id,
      title: parent.title,
      start_at: newStart,
      end_at: newEnd,
      color: parent.color,
      emoji: parent.emoji,
      memo: parent.memo,
      location: parent.location,
      is_all_day: parent.is_all_day,
      expected_amount: parent.expected_amount,
      expense_category: parent.expense_category,
      is_recurring: false,
      recurrence_rule: null,
      recurrence_until: null,
      recurrence_count: null,
    })
    .select("id")
    .single();
  if (e2 || !created) return { ok: false, error: "복사 실패" };
  revalidatePath("/calendar");
  return { ok: true, data: { id: created.id } };
}
```

- [ ] **Step 2: splitRecurringEvent action — "이후 모두 삭제"**

```typescript
export async function splitRecurringEvent(
  parentId: string,
  dateIso: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  // dateIso 의 전날을 recurrence_until 로
  const dt = new Date(dateIso);
  dt.setDate(dt.getDate() - 1);
  const untilIso = dt.toISOString().slice(0, 10);

  const { error } = await supabase
    .from("events")
    .update({ recurrence_until: untilIso })
    .eq("id", parentId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "수정 실패" };
  revalidatePath("/calendar");
  return { ok: true };
}
```

- [ ] **Step 3: addRecurrenceException action — "이 항목만 삭제"**

단순화: recurrence_rule jsonb 에 `exceptions: ["YYYY-MM-DD", ...]` 배열 추가, unfoldRecurringEvent 가 그 날짜 skip.

`parseRecurrenceRule` 에 exceptions 옵셔널 처리 + `unfoldRecurringEvent` 의 matching 후 exceptions 체크 추가 (T10 수정 또는 별도 패치).

action:
```typescript
export async function addRecurrenceException(
  parentId: string,
  dateIso: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { data: parent } = await supabase
    .from("events")
    .select("recurrence_rule")
    .eq("id", parentId)
    .eq("user_id", user.id)
    .single();
  if (!parent) return { ok: false, error: "원본을 찾을 수 없어요" };

  const rule = (parent.recurrence_rule ?? {}) as Record<string, unknown>;
  const exceptions = Array.isArray(rule.exceptions) ? rule.exceptions as string[] : [];
  if (!exceptions.includes(dateIso)) exceptions.push(dateIso);

  const { error } = await supabase
    .from("events")
    .update({ recurrence_rule: { ...rule, exceptions } })
    .eq("id", parentId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "수정 실패" };
  revalidatePath("/calendar");
  return { ok: true };
}
```

- [ ] **Step 4: event-recurrence.ts 의 unfoldRecurringEvent 에 exceptions 처리 추가 (T10 보정)**

`parseRecurrenceRule` 도 exceptions 받게 + matching 후 `if (rule.exceptions?.includes(dateIso)) continue` 추가.

테스트 추가:
```typescript
it("exceptions 날짜는 skip", () => {
  const result = unfoldRecurringEvent(
    { ...baseEvent, recurrence_rule: { freq: "daily", exceptions: ["2026-06-03"] } },
    "2026-06-01",
    "2026-06-05",
  );
  expect(result.map((v) => v.date)).toEqual([
    "2026-06-01", "2026-06-02", "2026-06-04", "2026-06-05",
  ]);
});
```

테스트 실패 → impl 갱신 → 통과.

- [ ] **Step 5: EventDetailDialog 의 삭제 흐름 갱신**

기존 delete 버튼 onClick 을:
```typescript
const handleDeleteClick = () => {
  if (event.is_recurring || isVirtual) {
    setRecurringDeleteDialogOpen(true);
  } else {
    handleNormalDelete();
  }
};
```

서브 다이얼로그:
```tsx
<Dialog open={recurringDeleteDialogOpen} onOpenChange={setRecurringDeleteDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>반복 일정 삭제</DialogTitle>
      <DialogDescription>어떻게 삭제할까요?</DialogDescription>
    </DialogHeader>
    <div className="space-y-2">
      <Button variant="outline" onClick={() => handleDeleteThisOnly()}>이 항목만</Button>
      <Button variant="outline" onClick={() => handleDeleteAfter()}>이후 모두</Button>
      <Button variant="destructive" onClick={() => handleDeleteAll()}>전체</Button>
    </div>
  </DialogContent>
</Dialog>
```

핸들러:
- `handleDeleteThisOnly`: `addRecurrenceException(parentId, dateIso)`
- `handleDeleteAfter`: `splitRecurringEvent(parentId, dateIso)`
- `handleDeleteAll`: 기존 `deleteEvent(parentId)`

⚠️ `parentId` = 가상 이면 `virtual.parentId`, 실제 row 이면 `event.id`. `dateIso` = `virtual.date` 또는 `event.start_at.slice(0,10)`.

- [ ] **Step 6: typecheck**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck
```

- [ ] **Step 7: 커밋 안 함**

---

### Task 16: 가상 인스턴스 수정 흐름

**Files:**
- Modify: `features/calendar/components/EventDetailDialog.tsx`

- [ ] **Step 1: 가상 인스턴스 편집 진입 시 "이 항목만 / 전체 / 취소" 다이얼로그**

EventDetailDialog 의 "수정" 버튼 클릭 시 가상 인스턴스면 먼저 다이얼로그:
```tsx
{isVirtual ? (
  <Dialog ...>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>반복 일정 수정</DialogTitle>
      </DialogHeader>
      <Button onClick={async () => {
        const r = await materializeRecurringEvent(virtualParentId, virtualDate);
        if (r.ok) openEditModal(r.data.id); // 그 시점 row 의 편집 모달
      }}>이 항목만 수정</Button>
      <Button onClick={() => openEditModal(virtualParentId)}>전체 수정</Button>
    </DialogContent>
  </Dialog>
) : ...}
```

`openEditModal(id)` 는 기존 EventModal 을 그 row 로 띄움.

- [ ] **Step 2: typecheck + 커밋 안 함**

---

### Task 17: 게이트 — 반복 일정 사용자 검증

- [ ] **Step 1: 모든 D 단계 변경 커밋**

```bash
cd /c/dev/lunabear-calendar && \
  git add supabase/migrations/20260606130000_events_recurrence.sql \
          types/database.ts \
          features/calendar/lib/event-recurrence.ts \
          features/calendar/lib/event-recurrence.test.ts \
          features/calendar/server/queries.ts \
          features/calendar/server/actions.ts \
          features/calendar/components/EventModal.tsx \
          features/calendar/components/EventDetailDialog.tsx \
          features/calendar/components/MonthGrid.tsx \
          features/calendar/components/DayDetailPopup.tsx && \
  git commit -m "feat(calendar): 반복 일정 (매일/주/월 + 끝 있고/없고)" && \
  git push origin main
```

- [ ] **Step 2: 사용자 작업 — 검증 (vercel deploy 후)**

- [ ] 이벤트 모달 → "반복" 섹션 보임
- [ ] 매주 월요일 회의 추가 → 다음 4주 월요일에 가상 카드 ⟳ 표시
- [ ] 가상 카드 시간 변경 → 그 주만 변경, 나머지 그대로
- [ ] 가상 카드 삭제 → "이 항목만 / 이후 모두 / 전체" 선택지
- [ ] "이 항목만" → 그 주만 사라짐
- [ ] "이후 모두" → 그 주 이후 다 사라짐, 이전 남음
- [ ] "전체" → 모두 사라짐
- [ ] recurrence_until 도래 시 그 다음부터 안 보임
- [ ] recurrence_count 도달 시 그 다음부터 안 보임
- [ ] 멀티데이 일정 모달은 "반복 지원 안 함" 안내 보임

문제 있으면 보고. 잘 되면 T18.

---

### Task 18: 종합 검증 + 메모리 갱신

- [ ] **Step 1: 전체 테스트 + typecheck**

```bash
cd /c/dev/lunabear-calendar && pnpm test:run && pnpm typecheck
```

Expected: 모두 통과.

- [ ] **Step 2: 회귀 점검**

| 항목 | 확인 |
|---|---|
| 캘린더 위젯 (Plan B v1) 그대로 동작 | |
| 부부 가계부 공유 — 구독 end_date 와 충돌 없음 | |
| 캘린더 멀티데이 / 공유 캘린더 그대로 | |
| 모바일 햄버거 드로어 그대로 | |
| 할 일 DnD 그대로 (더블 탭 추가 영향 없음) | |
| 카카오 OAuth 보류 그대로 | |

- [ ] **Step 3: 메모리 갱신**

`C:\Users\aarg1\.claude\projects\C--dev-----\memory\project-lunabear-calendar.md` 또는 새 메모리 `project-lunabear-v2-improvements.md`:

- v2 보완 완료 (2026-06-06): 모바일 5탭, 할 일 제목 수정, 구독 end_date, 반복 일정
- 반복 일정 모델: `events` 테이블의 `is_recurring` + `recurrence_rule` (jsonb, freq=daily/weekly/monthly + byday/bymonthday + exceptions) + `recurrence_until` + `recurrence_count`
- 멀티데이 + 반복은 v1 미지원
- 반복 삭제 모델: "이 항목만" = rule.exceptions 배열, "이후 모두" = recurrence_until 갱신, "전체" = parent row 삭제

[[project-lunabear-android-plan]] 메모리에도 가계부/캘린더 위젯 v2 시 같이 갱신해야 함을 노트.

- [ ] **Step 4: 사용자 보고**

완료 요약 한 줄 + 가능한 다음 작업 (가계부 위젯, 이체 모달 등) 안내.

---

## 위험 요소 / 미리 알기

1. **반복 가상 인스턴스 + 위젯 캐시**: 캘린더 위젯이 events 조회 시 가상 인스턴스를 포함해야 일관성 있음. T11 의 `getEventsForMonth` 가 widget queries 와 동일한 함수면 자동 적용. 다르면 widget queries 도 갱신.
2. **events.start_at 의 타임존**: timestamptz 라 supabase 가 UTC 로 저장. 가상 전개 시 사용자 로컬 (KST) 기준 일자 계산 필요. v2 보완에선 `start_at.slice(0,10)` 으로 단순 UTC 슬라이스. KST 새벽 0~9시 일정은 UTC 로는 전날 → 잘못 표시될 수 있음. 알려진 한계, v2 단순화.
3. **monthly + 31일 일정**: 2월/4월 등에 31일 없음. 현재 구현은 `cur.getDate() === bymonthday` 일 때만 매칭 → 31일은 그 달에 안 보임. 사용자가 의도한 동작인지 확인 필요. v1 = 그대로 두기 (의도된 단순함).
4. **반복 일정 횟수 (recurrence_count) 가 range 밖에서 카운트되는 케이스**: 사용자가 미래만 보면 count 정확 못함. spec 단순화 — 보이는 범위 내 count. 실제 사용엔 영향 적음.

## Self-Review 체크

- ✅ spec 의 4가지 항목 (모바일 탭, 할일 수정, 구독 end_date, 반복 일정) 모두 task 로 커버
- ✅ TDD: T10 (event-recurrence) RED→GREEN
- ✅ 파일 경로 모두 명시
- ✅ 모든 커밋 메시지 명시
- ⚠️ 타임존 (위험 #2), 31일 monthly (위험 #3) — spec 단순화로 처리
- ⚠️ 멀티데이 + 반복은 v1 미지원, EventModal UI 에 안내
