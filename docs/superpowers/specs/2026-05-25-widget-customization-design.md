# 위젯 메인 화면 디자인

> 작성일: 2026-05-25 (브레인스토밍 결과 합의)

## 목적

로그인 직후 사용자가 가장 자주 보는 정보(오늘 일정·다음 일주일·이번 달 지출·할 일 등)를
**한 화면에 모은 메인 위젯 페이지**를 만든다. 기존 `/calendar` 가 첫 화면이었던
흐름을 위젯 페이지로 바꾼다.

## 합의된 결정

| 항목 | 결정 |
| --- | --- |
| 위치 | 새 페이지 — 메인 화면(root `/`) |
| 위젯 6개 | 오늘 일정 / 다가오는 7일 / 이번 달 지출+월 목표 / 카테고리별 지출 / 오늘 할 일 / 받은 초대 |
| 커스터마이징 범위 | 보임/숨김 만 (순서·크기 변경 없음, 최소 안) |
| 저장 위치 | DB (`profiles.widget_visibility jsonb`) — 디바이스 간 동기 |
| 데스크탑 레이아웃 | 2 컬럼 grid |
| 모바일 레이아웃 | 1 컬럼 stack |
| 토글 UI 위치 | `/settings` 의 새 "메인 위젯" 섹션 (6 체크박스) |
| 사이드바 nav | 첫 항목에 "홈(/)" 추가, 기존 메뉴 유지 |
| 모바일 탭바 | **홈 / 할 일 / 가계부 / 더보기** (4개, 캘린더는 더보기 드로어에서 진입) |

## 라우트 / 파일 구조

```
app/(app)/
  page.tsx                   # 신규 — 메인 위젯 페이지 (root /)
  settings/page.tsx          # 수정 — "메인 위젯" 섹션 추가
  ...

features/widgets/            # 신규 도메인
  lib/
    items.ts                 # 위젯 메타 (key, label, icon) 단일 정의
  server/
    queries.ts               # 각 위젯의 데이터 fetch 함수
    actions.ts               # updateWidgetVisibility(hidden: string[])
  components/
    TodayEventsWidget.tsx
    UpcomingEventsWidget.tsx
    MonthExpenseWidget.tsx
    CategoryExpenseWidget.tsx
    TodayTodosWidget.tsx
    IncomingInvitesWidget.tsx
    WidgetCard.tsx           # 공통 카드 wrapper (border, padding, 제목, 에러 처리)

features/settings/
  components/
    SettingsClient.tsx       # 수정 — "메인 위젯" 섹션 + 체크박스

lib/nav.ts                   # 수정 — navItems/mobileTabItems 업데이트

supabase/migrations/
  2026-05-25...._profiles_widget_visibility.sql   # 신규
```

## DB 마이그레이션

```sql
alter table public.profiles
  add column widget_visibility jsonb;

-- 의미: hidden 된 위젯 key 의 배열. null/[] 이면 모두 보임.
-- 예: ["upcoming", "category"]  → 다가오는 일정·카테고리 두 위젯 숨김
-- RLS: profiles 의 기존 정책 (본인만 select/update) 그대로 적용 — 추가 정책 불필요
```

## 위젯 메타 (`features/widgets/lib/items.ts`)

```ts
import type { LucideIcon } from "lucide-react";
import { Calendar, CalendarDays, Wallet, BarChart3, CheckSquare, Users } from "lucide-react";

export type WidgetKey =
  | "today_events"
  | "upcoming"
  | "month_expense"
  | "category"
  | "today_todos"
  | "invites";

export type WidgetMeta = {
  key: WidgetKey;
  label: string;       // 설정 화면의 라벨
  icon: LucideIcon;
};

export const WIDGET_ITEMS: WidgetMeta[] = [
  { key: "today_events",  label: "오늘의 일정",     icon: Calendar },
  { key: "upcoming",      label: "다가오는 일정",   icon: CalendarDays },
  { key: "month_expense", label: "이번 달 지출",    icon: Wallet },
  { key: "category",      label: "카테고리별 지출", icon: BarChart3 },
  { key: "today_todos",   label: "오늘 할 일",      icon: CheckSquare },
  { key: "invites",       label: "받은 초대",       icon: Users },
];
```

이 한 곳을 단일 진실원으로 — 페이지 렌더 / 설정 체크박스 모두 여기서 읽음.

## 메인 페이지 (`app/(app)/page.tsx`) 동작

1. server 측 fetch 동시 진행 (Promise.all):
   - `profile.widget_visibility` (없으면 빈 배열로 간주)
   - 각 위젯의 데이터 (6개의 server query) — visible 여부와 무관하게 모두 fetch (캐싱·revalidate 단순화)
2. `WIDGET_ITEMS` 순서대로 visible 만 렌더
3. 모두 hidden 인 경우 — 가운데에 "설정에서 위젯을 켜보세요" 링크 (→ /settings)

### Layout

```tsx
<div className="container mx-auto max-w-5xl p-4">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {/* visible widget cards */}
  </div>
</div>
```

## 위젯 컴포넌트 패턴

각 위젯은 **server component** (인터랙티브 요소 없거나 최소). 공통 wrapper `WidgetCard` 가
border / padding / 제목 / 본문 / 에러 fallback 을 담당.

```tsx
// WidgetCard.tsx (개념)
<section className="rounded-lg border p-4">
  <header className="mb-3 flex items-center gap-2">
    <Icon className="h-4 w-4 text-muted-foreground" />
    <h3 className="text-sm font-semibold">{title}</h3>
    {trailing && <span className="ml-auto text-xs text-muted-foreground">{trailing}</span>}
  </header>
  <div>{children}</div>
</section>
```

### 위젯별 내용 (요약)

| 위젯 | server fetch | 본문 |
| --- | --- | --- |
| 오늘 일정 | `getEventsForDay(todayIso)` | "X개" + 다음 일정 시간/제목 3개 |
| 다가오는 7일 | 다음 7일 events 별도 query | 날짜별 리스트 (요일·제목·캘린더 색) |
| 이번 달 지출+목표 | expenses 합계 + `monthly_targets` | 실제/목표 + 진행률 바 |
| 카테고리별 지출 | expenses 합계 by category | 카테고리당 미니 막대 + 금액 (상위 5개) |
| 오늘 할 일 | `getTasksForDay(todayIso) + 밀린` | 체크박스 mini list (≤ 5) |
| 받은 초대 | `getMyIncomingInvites()` | 0건이면 "받은 초대 없음", 있으면 리스트 + 수락/거절 (또는 /social 링크) |

## 보임/숨김 토글 (`/settings`)

`SettingsClient` 에 "메인 위젯" 섹션 추가 — 6개 체크박스. 토글 시:

```ts
const handleToggle = (key: WidgetKey) => {
  const next = hidden.includes(key)
    ? hidden.filter((k) => k !== key)
    : [...hidden, key];
  startTransition(async () => {
    const r = await updateWidgetVisibility(next);
    if (!r.ok) toast.error(r.error);
    else { setHidden(next); router.refresh(); }
  });
};
```

서버 액션 `updateWidgetVisibility(hidden: string[])`:
- profiles.widget_visibility 업데이트
- `revalidatePath("/", "layout")` + `revalidatePath("/settings")`

## 사이드바 / 탭바 변경

`lib/nav.ts`:

```ts
export const navItems: NavItem[] = [
  { href: "/",         label: "홈",        icon: Home },          // 신규
  { href: "/calendar", label: "캘린더",     icon: Calendar },
  { href: "/todos",    label: "오늘의 할 일", icon: CheckSquare },
  { href: "/expense",  label: "가계부",     icon: Wallet },
  { href: "/social",   label: "공유",       icon: Users },
  { href: "/settings", label: "설정",       icon: Settings },
];

export const mobileTabItems: MobileTabItem[] = [
  { kind: "link",  href: "/",        label: "홈",     icon: Home },
  { kind: "link",  href: "/todos",   label: "할 일",  icon: CheckSquare },
  { kind: "link",  href: "/expense", label: "가계부", icon: Wallet },
  { kind: "more",  label: "더보기",  icon: MoreHorizontal },
];
```

캘린더는 모바일 탭바에서 빠지지만 **더보기 드로어의 사이드바 nav 에서 진입** (사이드바는 6개 유지).

## 회귀 영향 / 마이그레이션 체크

- 기존 `app/(app)/page.tsx` 가 있는지 확인 — 있으면 root redirect 코드일 가능성. 위젯 페이지로 교체.
- middleware 가 root `/` 처리하는 패턴 (예: 로그인 후 `/calendar` 로 redirect) 점검 — 위젯 페이지로 변경 필요.
- 모바일 탭바의 "캘린더" 사라지므로 캘린더 사용자가 헤맬 수 있음 — 더보기 드로어 사이드바 nav 첫 줄에 위치하니 1 탭이면 진입.

## 에러 처리

- 위젯 server query 실패 시 widget 안에서 catch → "데이터를 불러오지 못했어요" + 작은 retry 링크 (또는 단순 fallback). 전체 페이지 죽지 X.
- 마이그레이션 적용 전이라 `widget_visibility` 컬럼이 없으면 select 에러 — 코드에서 `profile?.widget_visibility ?? []` 안전 fallback.

## 테스트

기존 패턴 — 핵심 로직(예: `WIDGET_ITEMS` 순서, hidden 필터링) 만 단위 테스트.
UI 검증은 사용자 시각.

## 작업 양 추정

- DB 마이그레이션: 5분 (사용자가 supabase SQL editor 또는 CLI 적용)
- 위젯 인프라(items / WidgetCard / 페이지 골격): 30분
- 위젯 6개: 각 10~15분 × 6 = 60~90분
- /settings 섹션: 20분
- nav/탭바 변경: 10분
- 검증/회귀 fix: 30분

총 **2시간 ~ 3시간** 예상.
