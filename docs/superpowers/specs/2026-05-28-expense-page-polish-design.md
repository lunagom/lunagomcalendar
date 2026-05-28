# 가계부 페이지 폴리시 강화 — Spec

**작성일**: 2026-05-28
**주제**: 가계부 페이지 (`app/(app)/expense/page.tsx`) UX 향상 — 헤더 + 요약 위계 + 탭 전환 + 모바일 FAB + 폴리시

## Context

홈 → 캘린더 페이지 폴리시 prod 반영 완료. 가계부 페이지 차례.

현재 가계부:
- 페이지 헤더 없음 (h1 부재 — 다른 페이지 톤과 불일치)
- 요약 카드 3개 (순수익/수입/지출) 가 모두 같은 무게 + 색 강조 없어서 위계 부족
- 숫자가 정적 (캘린더/홈은 AnimatedNumber 적용됨 — 일관성 부족)
- 탭 4개 (월간/정기결제/정기수입/예산) 전환 시 jump
- 모바일에서 + 거래 추가 동선 없음 (탭 안의 작은 + 버튼만)
- 정기/예산 탭의 빈 상태가 페이지마다 제각각 (EmptyState 통일 안 됨)

사용자가 4가지 옵션 중 **🅑 헤더+요약+탭+모바일+폴리시** 선택 (차트 제외).

## Scope (in)

### 페이지 헤더
- 페이지 h1 추가 ("가계부")
- 현재 달 라벨을 헤더 부제로 표시
- 월 네비 (`<` `>` `오늘`) 헤더 안에 통합

### 요약 위계 재구성
- 순수익을 큰 카드로 (좌측 또는 상단 강조)
- 수입/지출을 작은 보조 카드 (오른쪽 또는 하단)
- 수입 → green 톤, 지출 → red 톤
- 모든 금액에 AnimatedNumber 적용
- 월 목표 vs 실제 영역 정리 (현재 우측 작은 텍스트 → 별도 위젯)

### 탭 전환
- 4개 탭 (월간 / 정기 결제 / 정기 수입 / 예산) 전환 시 부드러운 fade
- framer-motion `AnimatePresence` + `<motion.div>` 활용

### 모바일 FAB
- 우측 하단 floating + 버튼 → 거래 추가 (TransactionModal 오픈)
- 캘린더 페이지의 FAB 패턴 재사용

### 폴리시
- 진입 시 카드 stagger fade-in
- 빈 상태 통일 (`<EmptyState>` 컴포넌트 활용 — 이미 만든 것)
- 카테고리 칩 hover 강조 미세 조정

## Scope (out)

- 차트/그래프 (도넛, 라인, 막대) — v2 로 미룸
- 데이터 모델 변경
- 새 기능 추가 (예: 환율 변환, 영수증 OCR 등)
- 탭 자체 추가/제거

## 디자인

### 1. 페이지 헤더 (ExpensePageHeader 신규)

신규 `features/expense/components/ExpensePageHeader.tsx`:

**데스크탑 레이아웃**:
```
┌──────────────────────────────────────────────┐
│  가계부                          [+ 거래]    │
│  2026년 5월   < >  [오늘]                    │
└──────────────────────────────────────────────┘
```

**모바일**:
- h1 작게 (text-xl)
- 월 + 네비 같은 줄
- `+ 거래` 버튼은 모바일에서는 FAB 로 대체

```tsx
<header className="space-y-2 mb-4">
  <div className="flex items-center justify-between gap-2 flex-wrap">
    <h1 className="text-2xl font-bold">가계부</h1>
    <Button onClick={() => setExpenseOpen(true)}>+ 거래</Button>  // 데스크탑만
  </div>
  <div className="flex items-center gap-2 flex-wrap">
    <h2 className="text-lg font-semibold tabular-nums">{monthLabel}</h2>
    <Button size="icon" variant="ghost" onClick={onPrev}><ChevronLeft /></Button>
    <Button size="icon" variant="ghost" onClick={onNext}><ChevronRight /></Button>
    <Button size="sm" variant="ghost" onClick={onToday}>오늘</Button>
  </div>
</header>
```

### 2. 요약 카드 재구성 (ExpenseSummary 신규)

신규 `features/expense/components/ExpenseSummary.tsx`:

**데스크탑** (큰 순수익 + 작은 수입/지출):
```
┌──────────────────────────┬─────────────┐
│  순수익                  │  수입       │
│                          │  ₩0         │
│  ₩0                      ├─────────────┤
│  ── 진행률 ───           │  지출       │
│                          │  ₩0         │
└──────────────────────────┴─────────────┘
```

**모바일** (수직 스택):
```
[순수익] (큰)
[수입] [지출] (좌우)
```

색 톤:
- 순수익 양수 → green 강조, 음수 → red 강조, 0 → 중성
- 수입 → green-tinted
- 지출 → red-tinted

AnimatedNumber 적용 — 0에서 실제값으로 부드럽게.

### 3. MonthTargetWidget 정리

현재 우측 상단에 "월 목표 미설정 ✏️ / 실제 0원" 작게 표시. 별도 위젯으로 분리하거나 ExpenseSummary 와 통합:

옵션:
- A) ExpenseSummary 의 순수익 카드 안에 진행률 바 (실제 / 목표)
- B) 별도 작은 카드로 분리 (현재 위치)

**선택**: A — 정보 응집. 진행률 바가 시각적으로 정보 전달 + 압축.

### 4. 탭 fade 전환

`ExpensePage.tsx` 의 Tabs 컴포넌트 안 `<TabsContent>` 를 framer-motion 으로 감쌈:

```tsx
<TabsContent value="monthly">
  <motion.div key="monthly" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
    ...
  </motion.div>
</TabsContent>
```

각 탭 내용이 부드럽게 페이드.

### 5. 모바일 FAB

신규 `features/expense/components/ExpenseFloatingActionButton.tsx`:
- TransactionModal 오픈 (defaultType="expense" 또는 사용자 선택)
- 캘린더의 FAB 와 동일 패턴 (h-14 w-14 rounded-full bg-primary fixed bottom-20 right-4 md:hidden)

### 6. 빈 상태 통일

기존 EmptyState (`components/ui/empty-state.tsx`) 활용:
- 월간 탭: 거래 없음 → `<EmptyState message="이번 달 거래가 아직 없어요" action={{ label: "+ 첫 거래 추가", onClick: ... }} />`
- 정기 결제 탭: `<EmptyState message="등록된 정기 결제가 없어요" />`
- 정기 수입 탭: 동일
- 예산 탭: `<EmptyState message="설정된 예산이 없어요" />`

### 7. 진입 stagger 애니메이션

`ExpensePage.tsx` 첫 진입 시:
- 헤더, 요약, 탭이 차례로 fade-in (60ms 간격)
- framer-motion 활용 — AnimatedWidgetCard 패턴 재사용 또는 ExpensePage 자체에 적용

## 구현 전략

### 파일 구조

#### Create
- `features/expense/components/ExpensePageHeader.tsx` — 페이지 헤더
- `features/expense/components/ExpenseSummary.tsx` — 요약 카드 그룹 (순수익+수입+지출+목표진행률)
- `features/expense/components/ExpenseFloatingActionButton.tsx` — 모바일 FAB

#### Modify
- `app/(app)/expense/page.tsx` — header / summary props 추가
- `features/expense/components/ExpensePage.tsx` — 헤더 통합, 탭 fade, FAB 마운트
- `features/expense/components/MonthSummaryWidget.tsx` — AnimatedNumber 적용 + 색 강조 (또는 ExpenseSummary 로 통합 후 삭제 검토)
- `features/expense/components/MonthTargetWidget.tsx` — 진행률 바 통합 시 위치/표현 조정
- `features/expense/components/ExpenseMonthGrid.tsx` — 빈 상태 EmptyState 사용
- `features/expense/components/SubscriptionList.tsx` — 빈 상태 EmptyState
- `features/expense/components/RecurringIncomeList.tsx` — 빈 상태 EmptyState
- `features/expense/components/BudgetTabContent.tsx` — 빈 상태 EmptyState

#### Reuse (이미 만든 것)
- `features/widgets/components/AnimatedNumber.tsx`
- `components/ui/empty-state.tsx`
- 캘린더 FAB 패턴 (`features/calendar/components/FloatingActionButton.tsx` 참조)

### 작업 순서

1. ExpensePageHeader (단순, 빠른 가시 효과)
2. ExpenseSummary (요약 + AnimatedNumber)
3. ExpenseFloatingActionButton
4. ExpensePage 의 탭 fade 전환 + 헤더/요약/FAB 통합
5. 빈 상태 EmptyState 적용 (4곳)
6. 진입 stagger 애니메이션
7. page.tsx 시그니처 변경 (필요 시 prop drilling)
8. 최종 회귀 + 모바일 viewport + 다크모드

### 작업 분량

| 단계 | 시간 |
|---|---|
| 1. ExpensePageHeader | 30분 |
| 2. ExpenseSummary (AnimatedNumber + 색) | 1.5시간 |
| 3. ExpenseFloatingActionButton | 30분 |
| 4. ExpensePage 탭 + 헤더 통합 | 1.5시간 |
| 5. 빈 상태 EmptyState 4곳 | 1시간 |
| 6. Stagger 애니메이션 | 30분 |
| 7. page.tsx prop drilling | 30분 |
| 8. 최종 회귀 + 모바일 | 1.5시간 |
| **합계** | **7~8.5시간** |

## 검증

### 단계마다
- `pnpm tsc --noEmit` 통과
- `/expense` 200 응답
- 브라우저 시각 확인

### 최종 체크리스트
- [ ] 페이지 헤더 "가계부" h1 (text-2xl bold)
- [ ] 월 라벨 + 네비 + 오늘 한 줄
- [ ] 순수익 큰 카드 (좌측 또는 상단), 수입/지출 작은 보조 카드
- [ ] 수입 = green 톤, 지출 = red 톤
- [ ] 모든 숫자 AnimatedNumber (0 → 실제 부드럽게)
- [ ] 월 목표 진행률 바 순수익 카드 안 또는 별도
- [ ] 4개 탭 전환 시 부드러운 fade (0.2s)
- [ ] 모바일 FAB (우측 하단 + 버튼) 보임
- [ ] 빈 상태 4곳 모두 `<EmptyState>` 사용
- [ ] 진입 시 헤더 → 요약 → 탭 stagger fade-in
- [ ] 모바일 viewport (375px) 깨짐 없음
- [ ] 다크모드 정상

### 회귀
- 거래 추가 / 수정 / 삭제 정상
- 월 목표 편집 정상
- 정기 결제 / 수입 / 예산 CRUD 정상
- 카테고리 칩 클릭 정상

## 위험 (Known unknowns)

- 기존 MonthSummaryWidget 가 다른 곳에서 import 되는지 확인 필요 (홈 위젯 MonthSummaryWidget 과 같은 이름! 분리 필요)
  - 홈은 `features/widgets/components/MonthSummaryWidget.tsx`
  - 가계부는 `features/expense/components/MonthSummaryWidget.tsx`
  - → 별도 파일이라 충돌 X
- 탭 전환 fade 가 too aggressive 면 사용자 피로 → duration 0.2s 짧게 유지
- MonthTargetWidget 의 inline 편집 UX 유지 — 진행률 바로 시각화 추가만, 편집 기능은 그대로

## 미정 (별도 결정 필요)

- 차트/그래프 — v2 (데이터 쌓인 후)
- 영수증 첨부 — 별도 작업
- 카테고리 색 픽커 개선 — 별도 작업
