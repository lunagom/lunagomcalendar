# 홈페이지 폴리시 강화 — Spec

**작성일**: 2026-05-28
**주제**: 홈페이지 (`app/(app)/page.tsx`) 전반적 UX 향상 — 애니메이션 + 정보 위계 + 마이크로 인터랙션

## Context

직전에 디자인 시스템 미니멀 강화가 prod 반영됨. 다음 단계로 페이지별 깊은 UX 개선 시작. 첫 대상은 **홈** — 사용자가 앱 열자마자 만나는 페이지.

현재 홈은 5개 위젯 (오늘의 일정 / 다가오는 7일 / 이번 달 요약 / 오늘 할 일 / 받은 초대) 를 균일한 카드 그리드로 나열. 모든 위젯이 같은 무게라 위계 부족, 페이지 인사말/현재 상태 표시 없음, 애니메이션 전무.

사용자가 원하는 톤: "애니메이션 자연스럽게 + 프로페셔널한 앱처럼 + 다양한 기능 최적화" — 최대치 폴리시 선택.

## Scope (in)

- 페이지 진입 시 위젯 stagger fade-in 애니메이션
- 카드 hover 시 살짝 들림 + 그림자
- 페이지 상단 인사말 ("안녕하세요, [닉네임]님" + 오늘 날짜)
- 빠른 액션 CTA (`+ 일정`, `+ 할 일`, `+ 지출`)
- 미니 week strip (오늘 + 다음 6일)
- 위젯 그룹핑/위계 — 오늘 강조, 이번 주 보통, 월 요약 작게
- 숫자 counter 애니메이션 (월 요약 위젯)
- 토스트/모달 진입 슬라이드 부드럽게
- Skeleton 로딩 상태 (앞에서 만든 Skeleton 컴포넌트 활용)

## Scope (out)

- 다른 페이지 (캘린더/할 일/가계부 등)
- 위젯 기능 자체 변경 (어떤 데이터를 보여주냐는 그대로)
- 데이터 모델 변경
- 알림/notification 시스템

## 디자인

### 1. 페이지 레이아웃 재구성

```
┌─────────────────────────────────────┐
│ OO님 오늘도 좋은 하루 되세요!🐻       │  ← 인사말 (고정 톤)
│ 5월 28일 목요일                      │
├─────────────────────────────────────┤
│ [+ 일정] [+ 할 일] [+ 지출]          │  ← Quick actions
├─────────────────────────────────────┤
│ ◯ ◯ ● ◯ ◯ ◯ ◯                    │  ← Mini week strip
│ 월 화 수 목 금 토 일                 │
├─────────────────────────────────────┤
│ ┌────────────────┐  ┌──────────┐   │
│ │ 📅 오늘의 일정  │  │ 🔁 다가오는│   │
│ │   (large)      │  │   7일      │   │
│ └────────────────┘  └──────────┘   │
│ ┌────────────────┐  ┌──────────┐   │
│ │ ☑ 오늘 할 일   │  │ 💰 이번달  │   │
│ └────────────────┘  └──────────┘   │
│ ┌────────────────┐                  │
│ │ 👥 받은 초대    │                  │
│ └────────────────┘                  │
└─────────────────────────────────────┘
```

### 2. 인사말 (PageGreeting 신규)

`features/widgets/components/PageGreeting.tsx` 신규.

- **메인 인사**: `"[닉네임]님 오늘도 좋은 하루 되세요!🐻"`
  - 닉네임 없으면 이메일 prefix (`@` 앞부분)
  - 곰 이모지 마지막에 — 마스코트 연결
- **부제**: 오늘 날짜 — `"5월 28일 목요일"`
- Server component (사용자 닉네임만 fetch — `(app)/layout.tsx` 에서 이미 가져오는 user 객체 활용)
- 시간대 분기 X — 톤 일관 유지

### 3. 빠른 액션 (QuickActions 신규)

`features/widgets/components/QuickActions.tsx` 신규.

3개 인라인 버튼:
- `+ 일정` — EventModal 오픈 (오늘 날짜 prefill)
- `+ 할 일` — 작은 inline input 또는 /todos 로
- `+ 지출` — ExpenseModal 오픈

Client component. Modal state는 client side.

### 4. 미니 Week Strip (MiniWeekStrip 신규)

`features/widgets/components/MiniWeekStrip.tsx` 신규.

7개 셀:
- 요일 라벨 (월/화/수/목/금/토/일)
- 날짜 숫자
- 일정 있으면 dot
- 할 일 있으면 다른 색 dot
- 오늘 표시 강조 (border or bg-primary)
- 셀 클릭 → `/calendar?date=YYYY-MM-DD`

Server component (이번 주 일정 + 할 일 fetch).

### 5. 위젯 그룹핑 + 사이즈 차별화

`WidgetCard` 의 `spanTwo` 활용 + 새 prop `size?: 'sm' | 'md' | 'lg'`:
- 오늘의 일정: `lg` (col-span-2 + 더 큰 패딩)
- 다가오는 7일, 오늘 할 일: `md` (기본)
- 이번 달 요약, 받은 초대: `md` (기본)

### 6. 애니메이션

**라이브러리**: `framer-motion` 도입 (`pnpm add framer-motion`)

**효과**:

a. **Stagger entrance** — 페이지 로드 시 위젯이 위에서 아래로 1개씩 100ms 간격 fade-in + slide-up:
```tsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
>
```

b. **Card hover lift** — `WidgetCard` 에 hover 시 살짝 들림:
```tsx
className="... hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
```

c. **Number counter** — `MonthSummaryWidget` 의 금액이 0 → 실제 값으로 부드럽게 카운트업 (300ms):
- `useEffect` + requestAnimationFrame 또는 framer-motion `useMotionValue`

d. **Today highlight pulse** — Mini week strip 의 오늘 셀이 첫 진입 시 한 번 부드럽게 펄스 (1초)

### 7. 마이크로 인터랙션

- **Toast** — `sonner` 토스트의 진입 애니메이션 조정 (slide-up + fade)
- **Modal** — Dialog/Sheet 의 진입 transition 부드럽게 (이미 shadcn 기본 사용 — 그대로 유지)
- **Quick action click** — 버튼 클릭 시 `active:scale-[0.98]`

### 8. Loading state

홈은 서버 컴포넌트라 SSR. 추가 loading은 `app/(app)/loading.tsx` (이미 있음) 가 처리.

단, 클라이언트에서 갱신 (예: 위젯 dynamic refresh 시) → `Skeleton` 컴포넌트 활용 가능. 본 spec 범위 outside (위젯 fetch 패턴 변경 안 함).

## 구현 전략

### 파일 구조

#### 신규
- `features/widgets/components/PageGreeting.tsx` — 인사말
- `features/widgets/components/QuickActions.tsx` — 빠른 액션 3개
- `features/widgets/components/MiniWeekStrip.tsx` — 주간 strip
- `features/widgets/components/AnimatedWidgetCard.tsx` — WidgetCard 의 framer-motion 래퍼
- `features/widgets/components/AnimatedNumber.tsx` — 숫자 counter
- `features/widgets/server/week-strip-queries.ts` — week strip data fetch

#### 수정
- `app/(app)/page.tsx` — 레이아웃 재구성 (인사말 + quick actions + strip + 위젯 그룹)
- `features/widgets/components/WidgetCard.tsx` — hover lift 추가
- `features/widgets/components/MonthSummaryWidget.tsx` — AnimatedNumber 활용

#### 의존성 추가
- `framer-motion` (pnpm add framer-motion)

### 작업 순서

1. framer-motion 설치
2. AnimatedWidgetCard (모든 후속 작업의 기반)
3. PageGreeting (단순, 빠른 가시 효과)
4. QuickActions
5. MiniWeekStrip (가장 복잡, 시간 많이 듦)
6. AnimatedNumber + MonthSummaryWidget 적용
7. Hover lift + 마이크로 인터랙션
8. 페이지 레이아웃 통합 (page.tsx)
9. 최종 시각 회귀 + 모바일 확인

### 작업 분량

| 단계 | 시간 |
|---|---|
| 1. framer-motion 설치 + AnimatedWidgetCard | 30분 |
| 2. PageGreeting | 30분 |
| 3. QuickActions | 1시간 |
| 4. MiniWeekStrip | 2시간 |
| 5. AnimatedNumber + 적용 | 1시간 |
| 6. Hover lift + 마이크로 인터랙션 | 30분 |
| 7. page.tsx 통합 | 1시간 |
| 8. 최종 회귀 + 모바일 viewport | 1시간 |
| **합계** | **7~8시간** |

## 검증

### 단계마다
- `pnpm tsc --noEmit` 통과
- `pnpm lint` 통과
- 홈 페이지 200 응답
- 브라우저에서 새 컴포넌트 시각 확인

### 최종 체크리스트
- [ ] 페이지 진입 시 위젯 1개씩 부드럽게 등장
- [ ] 카드 hover 시 살짝 들림 (데스크탑)
- [ ] 인사말이 "[닉네임]님 오늘도 좋은 하루 되세요!🐻" 형식
- [ ] 닉네임 또는 이메일 prefix 가 인사말에 나옴
- [ ] Quick actions 3개 모두 작동 (모달 오픈 / 라우팅)
- [ ] Mini week strip 오늘 강조 + dot 표시 + 클릭 시 캘린더 이동
- [ ] 월 요약의 금액이 0에서 실제값으로 counter up
- [ ] 모바일 viewport (375px) 에서 깨짐 없음
- [ ] 다크모드 정상
- [ ] 애니메이션이 모바일에서 자연스러움

### 회귀
- 위젯 5개 모두 데이터 동일하게 표시 (기능 보존)
- 위젯 설정 (숨김/표시 토글) 정상 작동
- Quick action 모달 닫기 / 페이지 이동 정상

## 위험 (Known unknowns)

- framer-motion 번들 크기 (~50KB gzipped) — 허용
- 애니메이션이 저성능 기기에서 jank 가능 → `prefers-reduced-motion` 미디어 쿼리 존중
- Mini week strip 의 dot 표시 — 일정/할 일 데이터 fetch가 layout 단계가 아닌 page 단계라 매번 쿼리. 가벼우니 OK
- 위젯 그룹핑 변경 — 사용자의 widget_visibility 설정이 이상하게 동작할 가능성 → 기존 normalizeHidden 로직 보존
