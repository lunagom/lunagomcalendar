# 디자인 시스템 미니멀 강화 — Spec

**작성일**: 2026-05-28
**주제**: 공통 디자인 시스템 정리 — Linear/Notion 스타일 미니멀 강화

## Context

prod 배포(`lunabear-calendar.vercel.app`)된 앱이 전반적으로 다음 6개 영역(홈/캘린더/할 일/가계부/게시판/공유/설정)에 걸쳐 일관성 있게 정돈되어 있지만, 디자인 톤은 평이하고 페이지마다 카드/보더/그림자 사용이 미묘하게 달라 다소 시끄러움.

사용자는 "전체적인 UX 개선" 을 원하며 4가지 디자인 톤 중 **미니멀 강화 (Linear/Notion 스타일)** 방향을 선택. 마스코트(루나곰) 는 사이드바 등 기존 위치 유지하되, 빈 상태 등에 신규 등장은 하지 않음 (별도 결정).

본 spec 은 디자인 시스템 (토큰 + 공통 컴포넌트 + 페이지 패턴) 의 미니멀 강화만 다룸. 페이지별 깊은 UX 개선 (홈/캘린더/할 일/가계부/...) 은 별도 sub-project 로 후속 진행.

## Scope (in)

- 디자인 토큰 (color, typography, spacing, radius)
- shadcn 공용 컴포넌트 (button/dialog/dropdown-menu/card + 신규 skeleton/empty-state)
- 페이지 헤더 통일 (h1 크기, padding)
- 카드/보더/그림자/옅은 액센트 인벤토리 + 정리
- 아이콘 stroke-width 통일
- 빈 상태 패턴 통일

## Scope (out)

- 페이지별 정보 구조 변경 (별도 sub-project)
- 마스코트 활용처 추가 (사용자 결정으로 보류)
- 새로운 기능 추가
- 데이터 모델 변경

## 디자인

### 1. 토큰 변경

#### Color (globals.css)
**유지**:
- `--primary: 231 100% 68%` (#5B6CFF)
- 다크/라이트 토큰 구조 전체

**조정**:
| 토큰 | 변경 전 | 변경 후 | 이유 |
|---|---|---|---|
| `--muted-foreground` (light) | `0 0% 45%` | `0 0% 35%` | 콘트라스트 ↑ 가독성 |
| `--muted-foreground` (dark) | `0 0% 64%` | `0 0% 58%` | 동일 |
| `--border` (light) | `0 0% 91%` | `0 0% 94%` | 더 옅게 (사용 줄이는 대신) |

**사용 제한 (코드 인벤토리 단계)**:
- `bg-primary/5`, `bg-accent` 의 옅은 액센트 — 의미 있는 곳(오늘 강조, active state)만 유지, 그 외 제거
- `ring-primary/20` 같은 옅은 링 — 동일 원칙

#### Typography
- 본문 15px / line-height 1.55 / Pretendard — **유지**
- 헤딩 위계 강화:
  - **h1 페이지 제목**: `text-xl` → `text-2xl font-bold`
  - **h2 섹션 제목**: `text-base font-medium` → `text-lg font-semibold`
  - **eyebrow 라벨**: `text-xs uppercase tracking-wide` — 유지
- font-feature-settings (`ss03`, `cv11`, `tnum`) — 유지

#### Spacing
- 페이지 wrapper:
  - 모바일: `px-4 py-6` 유지
  - 데스크탑: `md:px-6 md:py-8` 추가
- 섹션 간격: `space-y-4` 를 기본으로 쓰던 곳들 → `space-y-6`
- 컴포넌트 내부 gap: `gap-2`(tight) / `gap-3`(default) / `gap-4`(loose) 만 사용

#### Radius
- `--radius: 0.5rem` (8px) 유지
- 적용처 줄임 (카드 인벤토리 단계)

### 2. 공용 컴포넌트 (components/ui/)

#### button.tsx
- variant `secondary` 제거 (default 와 차이 미미)
- variant `default`, `outline`, `ghost`, `destructive`, `link` 유지
- size `sm`, `default`, `icon` 만 사용 (lg 거의 안 쓰임)
- 그림자(`shadow-sm` 등) 제거

#### dialog.tsx
- `DialogContent` 의 `shadow-lg` → 없음 (보더만)
- 오버레이 (`DialogOverlay`) 는 유지

#### dropdown-menu.tsx
- `DropdownMenuContent` 의 `shadow-md` → 없음 (보더만)
- `DropdownMenuSubContent` 의 `shadow-lg` → 없음

#### card.tsx
- `Card` 의 `shadow-sm` 제거
- 보더만으로 구분

#### 신규: skeleton.tsx
shadcn 표준 skeleton 추가 — 페이지 내 부분 로딩에 사용.

```tsx
<div className="animate-pulse rounded-md bg-muted" />
```

#### 신규: empty-state.tsx
빈 상태 통일 컴포넌트:

```tsx
<EmptyState
  message="할 일이 없어요"
  action={{ label: "추가하기", onClick: ... }}  // optional
/>
```

레이아웃:
```
flex flex-col items-center justify-center py-12 text-center
├─ <p className="text-sm text-muted-foreground mb-4">{message}</p>
└─ <Button variant="outline" size="sm">{action.label}</Button>
```

### 3. 페이지 헤더 통일

모든 페이지 진입점의 h1:
- 클래스: `text-2xl font-bold`
- 그 아래 1줄 부제목: `text-sm text-muted-foreground`

적용 페이지:
- `app/(app)/page.tsx` (홈)
- `features/calendar/components/MonthGrid.tsx` (캘린더 헤더 영역)
- `features/todos/components/WeekNavigation.tsx` (할 일)
- `features/expense/components/...` (가계부)
- `features/board/components/...` (게시판)
- `features/social/components/...` (공유)
- `features/settings/components/...` (설정)

### 4. 카드/보더/그림자 인벤토리 + 정리

각 파일에서 검색:
- `rounded-lg border` → 의미 있는 곳만 유지 (DayColumn 모바일 카드, 가계부 카테고리 컨테이너 등). 단순 그룹핑 용도는 `divide-y` / 빈 공간으로 교체
- `bg-primary/5`, `bg-muted/40`, `bg-accent` → 오늘/active 표시만 유지
- `shadow-sm`, `shadow-md`, `shadow-lg` → 0개 또는 의도된 곳만 (드롭다운 메뉴 등)

작업 방식:
- `grep` 으로 사용처 전체 리스트업
- 한 파일씩 검토하면서 의도 확인
- 의미 없는 사용은 제거

### 5. 아이콘 통일

- lucide-react `strokeWidth={1.8}` 통일 (현재 mixed 1.5~2.5)
- size: `h-3.5 w-3.5` (small) / `h-4 w-4` (default) / `h-5 w-5` (large)

작업 방식:
- 페이지마다 lucide import 사용처 검토
- 명시 안 된 곳은 props 추가, 다른 값인 곳은 1.8 로 통일

### 6. 빈 상태 통일

기존 페이지의 빈 상태 메시지 (`"할 일 없음"`, `"지출 없음"` 등) 를 `<EmptyState>` 로 교체.

## 작업 순서 + 분량

| 단계 | 작업 | 시간 |
|---|---|---|
| 1 | 토큰 (globals.css) | 30분 |
| 2 | 공용 컴포넌트 (button, dialog, dropdown, card, skeleton, empty-state) | 1~2시간 |
| 3 | 레이아웃 셸 (app/(app)/layout.tsx, sidebar, header) | 30분 |
| 4 | 페이지 헤더 통일 (7개 페이지) | 1~2시간 |
| 5 | 카드/보더 인벤토리 + 정리 | 2~3시간 |
| 6 | 아이콘 stroke-width 통일 | 1시간 |
| 7 | 빈 상태 통일 | 1시간 |
| **합계** | | **7~10시간 (1.5~2일)** |

## 검증

### 단계마다
- `pnpm tsc --noEmit` (타입 안전성)
- `pnpm lint` (스타일 일관성)
- dev 서버에서 변경 페이지 200 응답 + 시각 확인

### 최종 체크리스트
- [ ] 모든 페이지 h1 = `text-2xl font-bold`
- [ ] muted-foreground 콘트라스트 의도대로 (가독성)
- [ ] `shadow-` 사용처 grep 결과 = 0 (또는 의도된 1~2곳)
- [ ] `bg-primary/5` 사용처 = 오늘/active 표시만
- [ ] 모든 lucide 아이콘 strokeWidth=1.8
- [ ] 빈 상태 모두 `<EmptyState>` 사용
- [ ] 모바일 viewport (Chrome DevTools iPhone 14) 손상 없음
- [ ] 다크모드 토글 시 콘트라스트 유효
- [ ] FullCalendar 내부 스타일 (theme.css) 도 통일성 확인

### 회귀 확인
- 7개 페이지 라이트모드 클릭/탐색
- 동일 페이지 다크모드 토글
- 모달/드롭다운/할 일 추가/일정 추가 등 인터랙션 동작

## 위험 (Known unknowns)

- FullCalendar (`lib/fullcalendar/theme.css`) 의 내부 스타일이 새 토큰과 충돌 가능 → 점검 필요
- shadcn 의 보더/그림자 제거 시 일부 페이지에서 너무 평평해질 수 있음 → 페이지별 시각 확인 필수
- 사용자 데이터에는 영향 없음 (순수 시각 변경)

## 미정 (별도 결정 필요)

- 페이지별 정보 구조 / 카피 변경은 본 spec 범위 밖
- 빈 상태에 루나곰 마스코트 등장은 사용자 결정으로 보류
- 마이크로 인터랙션 (페이지 전환 애니메이션 등) 은 후속 작업
