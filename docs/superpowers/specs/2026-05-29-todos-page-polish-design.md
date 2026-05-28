# 할 일 페이지 폴리시 강화 — Spec

**작성일**: 2026-05-29
**주제**: 할 일 페이지 (`app/(app)/todos/page.tsx`) UX 향상 — stagger 진입 + AnimatedNumber + 모바일 FAB + 완료 마이크로 인터랙션 + 오늘 pulse

## Context

홈 → 캘린더 → 가계부 폴리시 prod 반영 완료. 할 일 페이지 차례.

할 일 페이지는 이미 다음이 적용되어 있음:
- 페이지 헤더 (h1 "주간 할 일" text-2xl bold)
- 주간 보드 (모바일 세로 / 데스크탑 7컬럼)
- 드래그앤드롭 (컬럼 내 + 컬럼 간)
- 체크박스 optimistic UI
- 완료 항목 자동 하단 정렬
- 반복 할 일 모달

남은 폴리시 후보 (사용자 4가지 옵션 중 🅑 선택):
- 페이지 진입 stagger fade-in 부재
- 진행률 숫자 정적 (AnimatedNumber 미적용)
- 모바일 빠른 추가 FAB 없음 (캘린더/가계부는 있음)
- 체크 시 마이크로 인터랙션 없음
- 오늘 컬럼 진입 pulse 없음 (캘린더 셀은 있음)

## Scope (in)

### 진입 애니메이션 (Stagger fade-in)
- WeekBoard 진입 시 컴포넌트들이 60ms 간격으로 fade-in + slide-up
  - WeekNavigation (0ms)
  - WeekProgressBar (60ms)
  - Overdue banner (120ms, if exists)
  - DayColumn 들 (180ms 부터 60ms 간격)
- framer-motion 활용

### AnimatedNumber 진행률
- WeekProgressBar 의 "X / Y 완료" 숫자에 AnimatedNumber
- 퍼센트 숫자도 동일

### 모바일 FAB
- `+ 할 일` FAB (오른쪽 하단)
- 탭 시 → 작은 Sheet 모달 (하단 슬라이드 업) 에 제목 입력 + 날짜 선택 (default: 오늘)
- 또는 더 간단히: 탭 → 오늘 컬럼의 QuickAddInput 으로 스크롤 + 포커스
- 캘린더/가계부 FAB 패턴 재사용 (h-14 w-14 rounded-full bg-primary fixed bottom-20 right-4 md:hidden)

**선택**: Sheet 방식 — 일관성 있는 모달 UX. 캘린더는 EventModal 큰 dialog, 가계부는 TransactionModal — 둘 다 dialog. 할 일은 quick add 가 인라인이라 가벼운 Sheet 가 자연스러움.

### 체크 완료 마이크로 인터랙션
- TodoItem 의 optimisticDone 이 false → true 가 되면:
  - 짧은 scale pulse (체크박스 영역만) `1.0 → 1.15 → 1.0` 200ms
  - 줄긋기 + opacity 페이드 인 (line-through 적용 시) 부드럽게
- 단일 task transition 만 — 다른 UI 영향 없음
- framer-motion `useAnimate` 또는 CSS transition

### 오늘 컬럼 pulse
- 데스크탑 7컬럼 보드의 오늘 컬럼 첫 진입 시 1회 pulse
- 캘린더 DayCell 의 today pulse 와 동일 패턴 (framer-motion motion.div + ring)
- 모바일 세로 스택의 오늘 카드도 동일 적용

## Scope (out)

- 모든 일 완료 시 격려 토스트 (🅒 옵션, 별도 작업)
- 빈 상태 루나곰 일러스트 (🅒 옵션)
- 연속 완료 streak 카운터 (데이터 모델 변경 필요, 별도)
- 데이터 모델 / 쿼리 변경
- 새 기능

## 디자인

### 1. WeekBoard 진입 stagger

`features/todos/components/WeekBoard.tsx` 수정:

```tsx
import { motion } from "framer-motion";

const stagger = (idx: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: idx * 0.06, ease: "easeOut" as const },
});

// JSX:
<motion.div {...stagger(0)}><WeekNavigation /></motion.div>
<motion.div {...stagger(1)}><WeekProgressBar /></motion.div>
<motion.div {...stagger(2)}><WeekBoardMobile /></motion.div>
<motion.div {...stagger(2)}><WeekBoardDesktop /></motion.div>
```

(Mobile 과 Desktop 는 md: hidden 으로 toggle 되니까 하나만 보임 — stagger 인덱스 같음)

### 2. AnimatedNumber 진행률

`features/todos/components/WeekProgressBar.tsx` 수정:

기존:
```tsx
<span>{done} / {total} 완료 · {pct}%</span>
```

신규:
```tsx
<span>
  <AnimatedNumber value={done} /> / <AnimatedNumber value={total} /> 완료 ·{" "}
  <AnimatedNumber value={pct} unit="%" />
</span>
```

`import { AnimatedNumber } from "@/features/widgets/components/AnimatedNumber";`

### 3. 모바일 FAB (TodoFloatingActionButton)

신규 `features/todos/components/TodoFloatingActionButton.tsx`:

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

### 4. 체크 완료 마이크로 인터랙션

`features/todos/components/TodoItem.tsx` 수정:

체크박스 영역에 framer-motion `<motion.div>` 래퍼 추가. optimisticDone (또는 done) 이 변경되면 짧은 scale pulse:

```tsx
import { motion } from "framer-motion";

// 체크박스 부분:
<motion.div
  animate={done ? { scale: [1, 1.15, 1] } : { scale: 1 }}
  transition={{ duration: 0.2 }}
>
  <Checkbox ... />
</motion.div>
```

text 의 line-through + 페이드는 CSS transition 으로 부드럽게:

```tsx
<span
  className={`flex-1 text-sm truncate flex items-center gap-1 transition-all duration-200 ${
    done ? "line-through text-muted-foreground opacity-70" : ""
  }`}
>
```

### 5. 오늘 컬럼 pulse

`features/todos/components/DayColumn.tsx` 수정:

isToday 인 경우 wrapper 안에 absolute-positioned motion.div 추가 — 캘린더 DayCell 패턴과 동일:

```tsx
{isToday && (
  <motion.div
    initial={{ opacity: 1, scale: 0.95 }}
    animate={{ opacity: 0, scale: 1.05 }}
    transition={{ duration: 1.2, ease: "easeOut" }}
    className="absolute inset-0 rounded-lg ring-2 ring-primary pointer-events-none"
  />
)}
```

wrapper 가 `position: relative` 인지 확인 후 추가.

## 구현 전략

### 파일 구조

#### Create
- `features/todos/components/TodoFloatingActionButton.tsx` — 모바일 FAB

#### Modify
- `features/todos/components/WeekBoard.tsx` — stagger 진입 + TodoFloatingActionButton 마운트
- `features/todos/components/WeekProgressBar.tsx` — AnimatedNumber 적용
- `features/todos/components/TodoItem.tsx` — 체크박스 pulse + line-through 페이드
- `features/todos/components/DayColumn.tsx` — 오늘 컬럼 pulse motion.div

### 작업 순서

1. TodoFloatingActionButton (단순, 빠른 가시 효과)
2. WeekProgressBar AnimatedNumber 적용
3. TodoItem 체크박스 pulse + 페이드
4. DayColumn 오늘 컬럼 pulse
5. WeekBoard stagger 진입 + FAB 마운트
6. 최종 회귀 + 모바일

### 작업 분량

| 단계 | 시간 |
|---|---|
| 1. TodoFloatingActionButton | 30분 |
| 2. WeekProgressBar AnimatedNumber | 20분 |
| 3. TodoItem 체크 pulse + 페이드 | 40분 |
| 4. DayColumn pulse | 30분 |
| 5. WeekBoard stagger + FAB | 40분 |
| 6. 최종 회귀 + 모바일 | 1시간 |
| **합계** | **3.5~4.5시간** |

## 검증

### 단계마다
- `pnpm tsc --noEmit` 통과
- `/todos` 200 응답
- 브라우저 시각 확인

### 최종 체크리스트
- [ ] 페이지 진입 시 WeekNavigation → ProgressBar → 보드 stagger fade-in
- [ ] 진행률 숫자 (X / Y 완료 · NN%) 모두 AnimatedNumber
- [ ] 데스크탑: + 할 일 FAB 없음 (인라인 quick add 만)
- [ ] 모바일: 우측 하단 + 할 일 FAB 보임 → 탭 → 시트 슬라이드 업 → 입력
- [ ] 체크박스 클릭 시 짧은 scale pulse + 텍스트 부드럽게 line-through
- [ ] 오늘 컬럼 첫 진입 시 부드러운 ring pulse 1회
- [ ] 모바일 viewport 깨짐 없음
- [ ] 다크모드 정상

### 회귀
- 할 일 추가/체크/삭제 정상
- 드래그앤드롭 (컬럼 내/컬럼 간) 정상
- 반복 할 일 모달 정상
- 가상 카드 + materialize 정상
- 주간 네비 정상

## 위험 (Known unknowns)

- TodoItem 의 framer-motion pulse 가 DnD 의 useSortable 와 충돌 가능 — useSortable 는 transform 적용, motion.div 는 scale 적용. 둘 다 transform 이라 합쳐질 가능성. 분리된 motion.div 로 감싸면 OK.
- Sheet 컴포넌트가 모바일에서 키보드와 충돌 가능 — 입력 포커스 시 키보드 올라옴, sheet 가 위로 함께 올라가는지 확인 필요
- 오늘 pulse 가 isToday 인 컬럼만 mount 시 1회 발동 — 주 전환 시에는 컬럼이 mount 안 되므로 안 발동 (의도)

## 미정 (별도 결정 필요)

- 모든 일 완료 시 격려 토스트 — 별도 작업 (UX 디자인 결정 후)
- streak 카운터 — 데이터 모델 (last_streak_date 등) 추가 필요, 별도
- 빈 상태 루나곰 일러스트 — 어떤 상황에 보일지 합의 필요
