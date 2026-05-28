# 할 일 페이지 폴리시 강화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 할 일 페이지에 stagger 진입, AnimatedNumber 진행률, 모바일 FAB, 체크 마이크로 인터랙션, 오늘 컬럼 pulse 추가.

**Architecture:** 1개 신규 컴포넌트 (TodoFloatingActionButton) + 4개 기존 컴포넌트 수정 (WeekBoard, WeekProgressBar, TodoItem, DayColumn). framer-motion 활용.

**Tech Stack:** Next.js 14, React 18, framer-motion (이미 설치됨), shadcn/ui (Sheet 컴포넌트 활용).

**Spec 출처:** `docs/superpowers/specs/2026-05-29-todos-page-polish-design.md`

---

## File Structure

### Create
- `features/todos/components/TodoFloatingActionButton.tsx` — 모바일 FAB → Sheet 슬라이드 업

### Modify
- `features/todos/components/WeekBoard.tsx` — stagger 진입 + FAB 마운트
- `features/todos/components/WeekProgressBar.tsx` — AnimatedNumber 적용
- `features/todos/components/TodoItem.tsx` — 체크박스 pulse + 텍스트 페이드
- `features/todos/components/DayColumn.tsx` — 오늘 컬럼 pulse motion.div

---

## Task 1: TodoFloatingActionButton

**Files:**
- Create: `features/todos/components/TodoFloatingActionButton.tsx`

- [ ] **Step 1: 작성**

`features/todos/components/TodoFloatingActionButton.tsx` 생성:

```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { QuickAddInput } from "./QuickAddInput";

type Props = {
  todayIso: string;
};

/**
 * 모바일 전용 + 할 일 FAB. 탭 시 하단 시트가 슬라이드 업 → 오늘 날짜로 quick add.
 */
export function TodoFloatingActionButton({ todayIso }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform flex items-center justify-center"
        aria-label="할 일 추가"
      >
        <Plus className="h-6 w-6" strokeWidth={2.2} />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetTitle className="text-base mb-3">오늘 할 일 추가</SheetTitle>
          <SheetDescription className="sr-only">
            오늘 날짜로 새 할 일을 빠르게 추가합니다.
          </SheetDescription>
          <QuickAddInput date={todayIso} />
        </SheetContent>
      </Sheet>
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
git add features/todos/components/TodoFloatingActionButton.tsx
git commit -m "$(cat <<'EOF'
feat(todos): TodoFloatingActionButton — 모바일 + 할 일 FAB (Sheet)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: WeekProgressBar AnimatedNumber

**Files:**
- Modify: `features/todos/components/WeekProgressBar.tsx`

- [ ] **Step 1: Read 현재 파일**

- [ ] **Step 2: AnimatedNumber 적용**

기존 숫자 출력 부분:
```tsx
<span>
  {done} / {total} 완료 · {pct}%
</span>
```

다음으로 교체:
```tsx
<span>
  <AnimatedNumber value={done} /> / <AnimatedNumber value={total} /> 완료 ·{" "}
  <AnimatedNumber value={pct} unit="%" />
</span>
```

상단에 import 추가:
```tsx
import { AnimatedNumber } from "@/features/widgets/components/AnimatedNumber";
```

서버 컴포넌트라면 `"use client"` 필요 — 추가.

- [ ] **Step 3: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 4: Commit**

```bash
git add features/todos/components/WeekProgressBar.tsx
git commit -m "$(cat <<'EOF'
feat(todos): WeekProgressBar — 진행률 숫자 AnimatedNumber

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: TodoItem 체크 마이크로 인터랙션

**Files:**
- Modify: `features/todos/components/TodoItem.tsx`

- [ ] **Step 1: Read 현재 파일**

`done` 상태 (optimisticDone 또는 serverDone) 가 어떻게 컴포넌트에 흐르는지 확인.

- [ ] **Step 2: framer-motion 적용**

상단에 import 추가:
```tsx
import { motion } from "framer-motion";
```

체크박스 영역을 motion.div 로 감싸기:

기존:
```tsx
<Checkbox checked={done} onCheckedChange={(v) => handleToggle(Boolean(v))} />
```

신규:
```tsx
<motion.div
  animate={done ? { scale: [1, 1.15, 1] } : { scale: 1 }}
  transition={{ duration: 0.2 }}
>
  <Checkbox checked={done} onCheckedChange={(v) => handleToggle(Boolean(v))} />
</motion.div>
```

텍스트 span 의 line-through 부드럽게:

기존 className:
```tsx
className={`flex-1 text-sm truncate flex items-center gap-1 ${
  done ? "line-through text-muted-foreground" : ""
}`}
```

신규:
```tsx
className={`flex-1 text-sm truncate flex items-center gap-1 transition-all duration-200 ${
  done ? "line-through text-muted-foreground opacity-70" : ""
}`}
```

- [ ] **Step 3: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 4: Commit**

```bash
git add features/todos/components/TodoItem.tsx
git commit -m "$(cat <<'EOF'
feat(todos): TodoItem 체크박스 pulse + 텍스트 부드러운 줄긋기

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: DayColumn 오늘 pulse

**Files:**
- Modify: `features/todos/components/DayColumn.tsx`

- [ ] **Step 1: Read 현재 파일**

DayColumn 의 wrapper 가 `position: relative` 인지 확인. isToday 조건 위치 파악.

- [ ] **Step 2: framer-motion pulse 추가**

상단에 import 추가:
```tsx
import { motion } from "framer-motion";
```

wrapper 내부 첫 번째 자식으로 isToday 일 때 motion.div pulse:

```tsx
return (
  <section ref={setNodeRef} className={`${wrapperCls} ${isToday ? "relative" : ""}`}>
    {isToday && (
      <motion.div
        initial={{ opacity: 1, scale: 0.95 }}
        animate={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0 rounded-lg ring-2 ring-primary pointer-events-none"
      />
    )}
    <header>...</header>
    ...
  </section>
);
```

(기존 wrapperCls 에 이미 `bg-primary/5` 등 today 강조 있을 텐데, 추가로 한 번만 발동하는 pulse — wrapperCls 의 색은 유지)

wrapper 가 이미 `relative` 인지 또는 isToday 시 추가 — wrapperCls 분기 확인 후 통합.

만약 wrapperCls 가 항상 `relative` 가 아니면 `isToday` 인 경우 명시 추가.

- [ ] **Step 3: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 4: Commit**

```bash
git add features/todos/components/DayColumn.tsx
git commit -m "$(cat <<'EOF'
feat(todos): 오늘 컬럼 진입 시 1회 ring pulse (캘린더 DayCell 패턴 동일)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: WeekBoard stagger + FAB 마운트

**Files:**
- Modify: `features/todos/components/WeekBoard.tsx`

- [ ] **Step 1: Read 현재 파일**

- [ ] **Step 2: framer-motion + FAB import + stagger 적용**

상단에 import 추가:
```tsx
import { motion } from "framer-motion";
import { TodoFloatingActionButton } from "./TodoFloatingActionButton";
```

stagger 헬퍼 정의 (함수 컴포넌트 안 또는 module-level):
```tsx
const stagger = (idx: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: idx * 0.06, ease: "easeOut" as const },
});
```

기존 return:
```tsx
<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
  <div className="px-4 py-6 md:px-6 md:py-8 space-y-6">
    <WeekNavigation ... />
    <WeekProgressBar weekTodos={weekTodos} />
    <div className="md:hidden">
      <WeekBoardMobile ... />
    </div>
    <div className="hidden md:block">
      <WeekBoardDesktop ... />
    </div>
    <RecurringTodoModal ... />
  </div>
</DndContext>
```

신규 — 각 section을 motion.div 로 감쌈 + FAB 추가:

```tsx
<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
  <div className="px-4 py-6 md:px-6 md:py-8 space-y-6">
    <motion.div {...stagger(0)}>
      <WeekNavigation
        weekStartIso={weekStartIso}
        isCurrentWeek={isCurrentWeek}
        onOpenRecurring={() => setRecurringOpen(true)}
      />
    </motion.div>
    <motion.div {...stagger(1)}>
      <WeekProgressBar weekTodos={weekTodos} />
    </motion.div>
    <motion.div {...stagger(2)}>
      <div className="md:hidden">
        <WeekBoardMobile
          weekStartIso={weekStartIso}
          todayIso={todayIso}
          weekTodos={weekTodos}
          virtualTodos={virtualTodos}
          overdueTodos={overdueTodos}
        />
      </div>
      <div className="hidden md:block">
        <WeekBoardDesktop
          weekStartIso={weekStartIso}
          todayIso={todayIso}
          weekTodos={weekTodos}
          virtualTodos={virtualTodos}
          overdueTodos={overdueTodos}
        />
      </div>
    </motion.div>

    <TodoFloatingActionButton todayIso={todayIso} />

    <RecurringTodoModal
      open={recurringOpen}
      onOpenChange={setRecurringOpen}
      todayIso={todayIso}
    />
  </div>
</DndContext>
```

- [ ] **Step 3: 타입체크 + /todos 200**

```bash
pnpm tsc --noEmit
curl -s -o /dev/null -w "/todos: %{http_code}\n" http://localhost:3000/todos
```
Expected: tsc 0, curl 307

- [ ] **Step 4: Commit**

```bash
git add features/todos/components/WeekBoard.tsx
git commit -m "$(cat <<'EOF'
feat(todos): WeekBoard stagger 진입 + 모바일 FAB 마운트

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
curl -s -o /dev/null -w "/todos: %{http_code}\n" http://localhost:3000/todos
```
Expected: tsc 0, lint clean, curl 307

- [ ] **Step 2: 시각 회귀 (playwright)**

`/todos` 진입:
- 페이지 진입 시 stagger fade-in 동작
- 진행률 숫자 AnimatedNumber 적용
- 모바일 viewport (375px): FAB 우측 하단 보임 → 탭 → Sheet 슬라이드 업
- 데스크탑: FAB 없음, 기존 인라인 quick add 유지
- 체크 시 체크박스 짧은 pulse + 텍스트 부드럽게 줄긋기
- 오늘 컬럼 진입 시 ring pulse 1회
- 다크모드 정상

- [ ] **Step 3: Push**

```bash
git push origin main
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Stagger 진입 → Task 5
- ✅ AnimatedNumber 진행률 → Task 2
- ✅ 모바일 FAB → Task 1, 5
- ✅ 체크 마이크로 인터랙션 → Task 3
- ✅ 오늘 컬럼 pulse → Task 4
- ✅ 회귀 → Task 6

**2. Placeholder scan:** Task 3, 4 에 "Read 현재 파일" 단계 있음 — 패턴 확인 위해 의도적.

**3. Type consistency:** TodoFloatingActionButton 의 todayIso prop — WeekBoard 가 이미 props 로 받음. 전달만 하면 됨.

**4. 의존성 순서:**
- Task 1 (FAB) — 독립
- Task 2 (ProgressBar) — 독립
- Task 3 (TodoItem) — 독립
- Task 4 (DayColumn) — 독립
- Task 5 (WeekBoard) — Task 1 후 (FAB import)
- Task 6 — 모두 후

권장 순서: 1 → 2 → 3 → 4 → 5 → 6
