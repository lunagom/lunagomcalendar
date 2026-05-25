# 루나곰 캘린더

> 내 일정, 내 돈, 내 사람들 — **한 화면에서.**

한국인의 일정·돈·관계를 한 화면에서 관리하는 통합 캘린더 + 라이트 가계부.

## 기술 스택

- **Next.js 14** (App Router) + **TypeScript** (strict)
- **Supabase** (Postgres + Auth + RLS, `@supabase/ssr`)
- **Tailwind CSS** + **shadcn/ui** (New York · CSS variables)
- **FullCalendar** (`@fullcalendar/react`) — 월간/일간 뷰
- 상태관리: **Zustand**
- 폼: **react-hook-form** + **zod**
- 아이콘: **lucide-react**
- 폰트: **Pretendard Variable** (한글 가독성)
- 테마: **next-themes** (다크 우선)
- 패키지 매니저: **pnpm**

## 개발

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint
pnpm build
```

### 환경 변수 (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (서버 액션용)

## 폴더 구조

```
app/
  (auth)/login, signup        # 이메일 + 카카오/구글 OAuth
  (app)/                      # 로그인 사용자 영역
    calendar/  day/  todos/   # 캘린더 · 하루 뷰 · 할 일
    expense/                  # 가계부 (월간/구독/예산 탭)
    social/  settings/        # placeholder
  layout.tsx, globals.css

components/
  ui/                         # shadcn/ui (button, sheet, dialog, ...)
  layout/                     # AppShell, Header, Sidebar(+SidebarBody),
                              # MobileTabbar, MobileDrawerStore

features/                     # 도메인별 모듈
  calendar/
    components/               # MonthGrid, DayView, DayCell, EventBar,
                              # CalendarHeaderBar, WeekMultiDayLayer,
                              # EventModal, EventDetailDialog, ...
    lib/                      # multi-day(주별 segment + slot)
    server/                   # queries, actions
    store/                    # calendar-ui (zustand)
  expense/
    components/               # ExpensePage, ExpenseMonthGrid, MonthTargetWidget,
                              # CategoryTotalsBar, Subscription*, Budget*, ...
    server/  lib/             # 자연어 파서, 구독 결제일 계산
  todos/                      # 할 일 (오늘/밀린/포커스)

lib/
  supabase/                   # SSR 클라이언트
  fullcalendar/               # locale-ko, theme.css
  hooks/                      # use-media-query
  lunar.ts, holidays.ts, colors.ts, nav.ts, utils.ts

types/
  database.ts                 # Supabase 자동 생성 타입

supabase/migrations/          # 스키마 + RLS
docs/                         # PROJECT.md(기획), 스테이지 plan/spec
```

## 디자인 토큰

| 토큰 | Light | Dark |
| --- | --- | --- |
| `--primary` | `#5B6CFF` (231 100% 68%) | `#5B6CFF` (231 100% 70%) |
| `--background` | `#FAFAFA` | `#0A0A0A` |
| `--card` | `#FFFFFF` | `#171717` |
| `--radius` | 8px (`rounded-lg`) · 12px (`rounded-xl` 카드) | 동일 |

## 진행 현황

### Stage 1 — 셋업
- Next.js 14 + TS strict + Tailwind + shadcn/ui (New York)
- Pretendard Variable, 다크 우선 테마
- AppShell (사이드바 + 헤더 + 모바일 탭바)

### Stage 2 — DB + 인증
- Supabase Postgres + RLS, `@supabase/ssr` 미들웨어
- 이메일 / 카카오 / 구글 OAuth
- `events`, `tasks`, `calendars`, `expenses`, `subscriptions`, `budgets`, `monthly_targets` 등 스키마 + 자동 생성 타입

### Stage 3 Plan A — 단일 사용자 캘린더
- 월간/일간 뷰 (FullCalendar)
- 일정 CRUD + DnD (`MonthGrid` 의 셀 portal 패턴)
- **멀티데이 이벤트 연속 막대** — 주 단위 `WeekMultiDayLayer` 가 absolute 로 셀들을 가로지름 (GoogleCalendar 패턴)
- 할 일 + 자동 이월, 포커스 모드
- 한국 특화: 음력 1일 / 24절기 / 공휴일
- 이모지 (emoji-mart) + 다중 캘린더(12색)

### Stage 4 — 가계부
- 월간 그리드 + DayDetail bottom sheet
- 자연어 파서 (지출 입력)
- 구독 트래커 (활성 구독료 자동 합산)
- 카테고리별 예산 / 월 목표 위젯
- 캘린더 셀에 그날 지출 합계 표시 (토글)

### Stage 5 — 모바일 반응형 점검 (375 / 414 / 768)
- 사이드바 모바일 드로어 (햄버거 + Sheet) + 하단 탭바 4개로 정리
- 캘린더 헤더 자체 컴포넌트화 (`CalendarHeaderBar`) — FC 자체 toolbar 비활성
- 가계부 헤더 모바일 2행 분할 (월 목표 위젯 폭 확보)
- DayDetail 모바일 bottom sheet
- 이벤트 칩 컴팩트 + 셀 min-height 모바일 5rem

## 다음 단계

- **Stage 3 Plan B** — 공유 캘린더 (초대 · 권한 · Supabase Realtime 동기화)
- **/settings** 페이지 구현 (계정 · 테마 · 연결된 캘린더)
- **/social** 페이지 구현
- 점검 못 한 항목: ExpenseModal 자체 모바일, 다크/라이트 양쪽, landscape

## 개발 환경 메모

- Windows 환경에서 dev 서버가 `.next/static/chunks/*.js` 잠금 (errno -4094) 에 자주 걸림 — 안티바이러스 (알약/Defender) 가 새로 쓴 chunk 파일을 잠시 잡는 패턴. 회피책으로 **Turbopack** (`pnpm next dev --turbo`) 사용 권장.
- 좀비 dev 서버 정리: `Get-Process node | Stop-Process -Force`
