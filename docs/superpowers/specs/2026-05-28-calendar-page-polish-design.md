# 캘린더 페이지 폴리시 강화 — Spec

**작성일**: 2026-05-28
**주제**: 캘린더 페이지(`app/(app)/calendar/page.tsx`) UX 강화 — 헤더 + 월간 통계 + 애니메이션 + 마이크로 인터랙션 + 모바일

## Context

홈 페이지 폴리시 (인사말 + 빠른 액션 + Mini Week Strip + 위젯 stagger + AnimatedNumber) prod 반영 완료. 다음 단계로 캘린더 페이지 폴리시.

현재 캘린더는 FullCalendar 기반으로 잘 동작하지만:
- 페이지 헤더가 미니멀 (월 라벨만, h1 없음)
- 오늘 시각 강조 없음 (어느 셀이 today 인지 표시 X)
- 월 전환 시 애니메이션 없음
- 월간 통계 숨김 (사용자가 직접 셀별로 봐야 함)
- 이벤트 / 셀 hover 피드백 약함
- 모바일 전용 레이아웃 미흡

사용자는 4가지 옵션 중 **최대치(🅒)** 선택 — 폴리시 + 정보 위계 + 마이크로 인터랙션 + 모바일 전용 폴리시까지 모두 포함.

## Scope (in)

### 시각적 폴리시
- 페이지 헤더 강조 — h1 + 월간 통계 + 빠른 액션
- 오늘 셀 명시적 강조 (border + dot)
- 페이지 진입 시 today pulse 1회

### 정보 위계
- 헤더 우측에 월간 통계 인라인:
  - 일정 N건
  - 할 일 N/M (완료/총)
  - 순수익 ±N원 (양수면 green, 음수면 red)
- `+ 일정` quick action 헤더 안에

### 애니메이션
- 월 전환 시 그리드 부드러운 fade-in (framer-motion)
- 이벤트 막대 hover 시 살짝 들림 (`-translate-y-0.5`)
- 멀티데이 hover 시 같은 event 의 다른 주 segment 동시 강조 (ring)

### 마이크로 인터랙션
- 셀 hover 시 옅은 배경 (모바일에선 X)
- 이벤트 클릭 시 짧은 scale 피드백
- 다이얼로그 진입 부드럽게 (shadcn 기본 트랜지션 유지)

### 모바일 전용
- 헤더 컴팩트 (월 라벨만, 통계는 작은 칩으로)
- 셀 hover 효과 없음 (터치 디바이스)
- `+ 일정` 버튼 fixed bottom-right floating
- (옵션) Week strip 뷰 토글 — 모바일에서만

## Scope (out)

- FullCalendar 자체 교체 (현재 잘 동작 — 그대로)
- 일간 뷰 부활 (이전에 삭제, 그대로 유지)
- 새 일정 모달 자체 재디자인 (별도 작업)
- 캘린더 색 픽커 UI (별도 작업)

## 디자인

### 1. 페이지 헤더 재구성

신규 컴포넌트 `CalendarMonthHeader` (`features/calendar/components/CalendarMonthHeader.tsx`):

**데스크탑 레이아웃**:
```
┌─────────────────────────────────────────────────────────┐
│  < 2026년 5월 >       오늘                              │
│                       │                                 │
│  ─                    │  📅 12   ✅ 8/15   💰 +120만원  │
│                       │                                 │
│  [+ 일정]                                               │
└─────────────────────────────────────────────────────────┘
```

**모바일 레이아웃**:
```
┌──────────────────────────────────────┐
│ 2026년 5월              < > [오늘]   │
│ 📅 12 · ✅ 8/15 · 💰 +120만원        │
└──────────────────────────────────────┘
```

**구성**:
- 월 라벨: `text-2xl font-bold` (데스크탑), `text-xl font-bold` (모바일)
- 이전/다음 / 오늘 버튼: 데스크탑은 라벨 옆, 모바일은 우측
- 통계 칩: 작은 icon + 숫자, `text-sm` (데스크탑) / `text-xs` (모바일)
- `+ 일정` 버튼: 데스크탑은 헤더 우측, 모바일은 fixed bottom-right floating

### 2. 월간 통계 (CalendarMonthlyStats)

`features/calendar/server/monthly-stats.ts` 신규 — server query.

```ts
export type MonthlyStats = {
  eventCount: number;
  todoCount: { done: number; total: number };
  net: number; // 수입 - 지출
};

export async function getMonthlyStats(month: string): Promise<MonthlyStats>;
```

기존 query 들 (`getEventsForMonth`, `getTodosForMonth`, `getExpensesForMonth`, `getIncomesForMonth`) 의 결과를 활용 — 별도 fetch 없이 page.tsx 에서 계산해서 prop 으로 전달.

### 3. 오늘 셀 강조

`DayCell.tsx` 수정:
- 오늘이면 셀 wrapper 에 `ring-2 ring-primary/40` 추가
- 날짜 숫자에 작은 dot `bg-primary` (날짜 뒤에 attach)
- 첫 진입 시 today pulse 1회 (framer-motion `useAnimation` + ring scale)

### 4. 월 전환 애니메이션

`MonthGrid.tsx` 에 framer-motion `<motion.div>` 래퍼:
- `key={month}` 로 리렌더 강제
- `initial={{ opacity: 0 }}` → `animate={{ opacity: 1 }}` 0.25s
- 부드러운 fade 전환

### 5. 이벤트 hover 강화

`DraggableEventBar.tsx` 와 `WeekMultiDayLayer.tsx`:
- hover 시 `-translate-y-0.5 + shadow-md` (CSS only, framer-motion 불필요)
- 멀티데이: 같은 event id 의 모든 segment 가 hover 상태 공유 (DragOverState 와 비슷한 별도 hover state context)

### 6. 빠른 액션 (+ 일정)

데스크탑: `CalendarMonthHeader` 우측 inline 버튼.
모바일: `FloatingActionButton` (fixed bottom-right, primary 색, `+` 아이콘)

신규 컴포넌트 `FloatingActionButton.tsx`:
```tsx
<button className="md:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 ...">
  <Plus className="h-6 w-6 mx-auto" />
</button>
```

(`bottom-20` 으로 모바일 탭바 위)

### 7. 멀티데이 hover 공유

신규 React context `EventHoverContext`:
- `hoveredEventId: string | null`
- `setHoveredEventId: (id) => void`

`DraggableEventBar` 와 multi-day segment:
- `onMouseEnter` → setHoveredEventId(event.id)
- `onMouseLeave` → setHoveredEventId(null)
- isHovered 시 ring 또는 lift

### 8. 모바일 폴리시

- `CalendarMonthHeader` 모바일 분기 (위 디자인 참조)
- Cell hover effects (`hover:bg-accent/20` 등) → desktop only (`md:hover:bg-...`)
- 셀 클릭 시 popup 진입 부드럽게 (이미 dialog/sheet 사용 중 — 자동 처리)
- FloatingActionButton 모바일 전용

## 구현 전략

### 파일 구조

#### Create
- `features/calendar/components/CalendarMonthHeader.tsx` — 헤더 (h1, 통계, 액션)
- `features/calendar/components/CalendarMonthlyStatsChips.tsx` — 통계 칩 UI
- `features/calendar/components/FloatingActionButton.tsx` — 모바일 FAB
- `features/calendar/lib/event-hover-context.tsx` — 멀티데이 hover 공유 context
- `features/calendar/lib/monthly-stats.ts` — 통계 계산 utility

#### Modify
- `app/(app)/calendar/page.tsx` — header 통합 + stats 계산 + prop drilling
- `features/calendar/components/MonthGrid.tsx` — framer-motion 전환, EventHoverProvider 추가, FAB 렌더
- `features/calendar/components/DayCell.tsx` — 오늘 강조, hover desktop 분기
- `features/calendar/components/DraggableEventBar.tsx` — hover lift + context hookup
- `features/calendar/components/WeekMultiDayLayer.tsx` — DraggableSegment hover hookup
- `features/calendar/components/CalendarShell.tsx` — 기존 헤더와 신규 header 통합 (또는 옮김)

### 작업 순서

1. monthly-stats utility + page.tsx 통합 (server side)
2. CalendarMonthlyStatsChips 컴포넌트
3. CalendarMonthHeader (데스크탑 + 모바일 분기)
4. CalendarShell 정리 — 기존 wallet/picker 와 새 header 통합
5. DayCell 오늘 강조 + today pulse
6. MonthGrid framer-motion 전환
7. EventHoverContext + DraggableEventBar / WeekMultiDayLayer hover lift
8. FloatingActionButton (모바일)
9. 최종 시각 회귀 + 모바일 viewport

### 작업 분량

| 단계 | 시간 |
|---|---|
| 1. monthly-stats utility | 30분 |
| 2. StatsChips | 30분 |
| 3. MonthHeader | 1.5시간 |
| 4. CalendarShell 정리 | 30분 |
| 5. DayCell 오늘 강조 + pulse | 1시간 |
| 6. 월 전환 fade | 30분 |
| 7. EventHoverContext + hover lift | 1.5시간 |
| 8. FloatingActionButton | 1시간 |
| 9. 최종 회귀 + 모바일 | 1.5시간 |
| **합계** | **8.5~10시간** |

## 검증

### 단계마다
- `pnpm tsc --noEmit` 통과
- `pnpm lint` 통과
- `/calendar` 200 응답
- 브라우저 시각 확인

### 최종 체크리스트
- [ ] 헤더에 "2026년 5월" 크게 표시
- [ ] 통계 칩 3개 (일정 / 할 일 / 순수익) 정확
- [ ] `+ 일정` 버튼 클릭 시 EventModal 오픈
- [ ] 오늘 셀에 ring + dot 보임
- [ ] 페이지 진입 시 today pulse 1회 (반복 X)
- [ ] 월 전환 (이전/다음) 시 부드러운 fade
- [ ] 단일 이벤트 hover 시 살짝 들림
- [ ] 멀티데이 segment hover 시 같은 event 의 다른 주 segment 도 강조
- [ ] 모바일 viewport (375px): 헤더 컴팩트, FAB 보임, hover 효과 없음
- [ ] 다크모드 정상
- [ ] Vercel 배포 정상

### 회귀
- 일정 추가 / 수정 / 삭제 정상
- 드래그앤드롭 정상 (단일 + 멀티데이)
- 셀 클릭 → DayDetailPopup 정상
- 일정 클릭 → EventDetailDialog 정상
- 캘린더 색 픽 정상
- "지출 합계 표시" 토글 정상

## 위험 (Known unknowns)

- EventHoverContext 가 React.createPortal 로 렌더되는 cells/multidaylayer 에 잘 도달하는지 — 이미 createPortal 사용 중이라 OK 확률 높음, 검증 필요
- framer-motion 의 key 기반 리렌더가 FullCalendar 의 internal state 와 충돌 가능 — 부드러운 fade만 적용, 셀 내부는 그대로
- 모바일 viewport 에서 FAB 가 다른 UI 가리지 않게 (모바일 탭바 위로 z-index 조정)
- iOS Safari 의 hover 동작 — touch 디바이스에서는 hover sticky 가능, `md:hover` 로 분기

## 미정 (별도 결정 필요)

- Week strip 뷰 토글 (모바일 alternative view) — 본 spec 에서는 제외, v2 검토
- 캘린더 색 픽커 UI 개선 — 별도 작업
- 첫 사용자 가이드 (Empty state guidance) — 별도 작업
