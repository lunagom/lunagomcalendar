# Stage 3 Plan A — 단일 사용자 캘린더 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인한 사용자가 월간 캘린더에서 일정·할 일·다중 캘린더·한국 특화(음력·공휴일·24절기)·이모지를 모두 다루는 완성된 1인용 캘린더 앱을 만든다. 드래그앤드롭 일정 이동 포함.

**Architecture:** Next.js 14 App Router. 읽기는 RSC가 Supabase에서 직접 페치(SSR), 쓰기는 Server Actions, 화면 갱신은 `useOptimistic`. UI 상태(현재 월·캘린더 보이기 토글)는 Zustand. 캘린더 그리드는 FullCalendar(월간 `dayGrid` + 일간 `timeGrid` + `interaction` 플러그인).

**Tech Stack:** Next.js 14.2, TypeScript strict, Tailwind, shadcn/ui, Zustand, Supabase SSR, FullCalendar 6, korean-lunar-calendar, emoji-mart, sonner, Vitest.

---

## File Structure

새로 만들거나 수정할 파일 — 이 계획 안에서 어디서 어떤 책임을 지는지.

### 새로 만들 파일

```
supabase/migrations/
  20260523120000_tasks_table.sql          신규 tasks 테이블 + RLS + 인덱스
  20260523120100_events_emoji.sql         events.emoji 컬럼

vitest.config.ts                           Vitest 설정
vitest.setup.ts                            testing-library matcher 등록

lib/
  colors.ts                                12색 상수 + getTextColor()
  lunar.ts                                 양력↔음력 + isLunarFirstDay
  fullcalendar/
    locale-ko.ts                           한국어 로케일 + 토요/일요 색
  emoji/
    init.ts                                emoji-mart 데이터/i18n 초기화

features/calendar/
  server/
    queries.ts                             getEventsForMonth, getCalendars 등
    actions.ts                             createEvent, updateEvent, deleteEvent, moveEvent
  store/
    calendar-ui.ts                         Zustand: 현재 월, 보이기 토글, 모달 상태
  components/
    CalendarShell.tsx                      헤더 + 그리드 컨테이너
    MonthGrid.tsx                          FullCalendar 월간 wrapper
    DayView.tsx                            FullCalendar 일간 wrapper
    DayCell.tsx                            월 셀 커스텀 콘텐츠
    EventBar.tsx                           일정 막대 1개
    HolidayBadge.tsx                       공휴일/24절기 배지
    EventModal.tsx                         생성/수정 폼
    EventDetailDialog.tsx                  상세 + 수정/삭제 진입
    DeleteConfirmDialog.tsx                AlertDialog 래퍼
    CalendarPickerDropdown.tsx             "📋 캘린더 ▾"
    NewCalendarDialog.tsx                  새 캘린더 (이름 + 12색)
    CalendarSettingsDialog.tsx             기존 캘린더 수정/삭제
    EmojiPicker.tsx                        emoji-mart 래퍼
    MonthNavigation.tsx                    키보드 + 스와이프 + 슬라이드

features/todos/
  server/
    queries.ts                             오늘 + 밀린
    actions.ts                             createTodo, toggleTodo, deleteTodo, moveTodo
  components/
    TodosPage.tsx                          /todos 본체
    TodoSection.tsx                        그룹 라벨 + 리스트
    TodoItem.tsx                           체크박스 + 텍스트 + 밀림 배지
    QuickAddInput.tsx                      인라인 추가

app/(app)/
  day/page.tsx                             일간 뷰 페이지
  todos/page.tsx                           오늘의 할 일 페이지

components/ui/
  alert-dialog.tsx                         shadcn add 로 생성
  popover.tsx                              shadcn add 로 생성
  checkbox.tsx                             shadcn add 로 생성
  sonner.tsx                               shadcn add 로 생성 (Toaster)
```

### 수정할 파일

```
app/(app)/calendar/page.tsx                placeholder → CalendarShell 렌더
app/layout.tsx                             <Toaster /> 추가
lib/nav.ts                                 "하루", "오늘의 할 일" 메뉴 추가
lib/holidays/index.ts                      get24SolarTerm, isPublicHoliday 추가
package.json                               새 의존성 + test 스크립트
types/database.ts                          마이그레이션 후 db:types 로 재생성
```

---

## Phase 1: 셋업

### Task 1: Vitest 테스트 프레임워크 설치

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: 의존성 설치**

```bash
cd C:\dev\lunabear-calendar
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom @types/node
```

- [ ] **Step 2: `vitest.config.ts` 작성**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/**/*.test.ts", "lib/**/*.test.tsx", "features/**/*.test.ts", "features/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

설치도 같이:
```bash
pnpm add -D @vitejs/plugin-react
```

- [ ] **Step 3: `vitest.setup.ts` 작성**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: `package.json` 스크립트 추가**

`scripts` 객체에 추가:
```json
"test": "vitest",
"test:run": "vitest run",
"test:ui": "vitest --ui"
```

- [ ] **Step 5: smoke 테스트로 확인**

임시 파일 `lib/_smoke.test.ts` 만들고:
```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => {
  it("works", () => expect(1 + 1).toBe(2));
});
```

`pnpm test:run` 실행. PASS 확인.

- [ ] **Step 6: smoke 파일 삭제 + 커밋**

```bash
rm lib/_smoke.test.ts
git add package.json pnpm-lock.yaml vitest.config.ts vitest.setup.ts
git commit -m "chore: Vitest 테스트 프레임워크 셋업"
```

### Task 2: Plan A 의존성 일괄 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 캘린더·이모지·음력·토스트 설치**

```bash
pnpm add @fullcalendar/react@^6.1 @fullcalendar/daygrid@^6.1 @fullcalendar/timegrid@^6.1 @fullcalendar/interaction@^6.1 @fullcalendar/core@^6.1
pnpm add korean-lunar-calendar@^0.4.0
pnpm add @emoji-mart/data@^1.2 @emoji-mart/react@^1.1 emoji-mart@^5.6
pnpm add sonner@^1.7
pnpm add date-fns@^3.6
```

- [ ] **Step 2: 설치 확인 + 빌드 무결성 확인**

```bash
pnpm typecheck
```
Expected: 새 의존성 타입 에러 없음 (실패하면 `pnpm install` 재실행).

- [ ] **Step 3: 커밋**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: 3단계 Plan A 의존성 설치 (FullCalendar + emoji-mart + korean-lunar-calendar + sonner + date-fns)"
```

### Task 3: shadcn 컴포넌트 추가 (alert-dialog, popover, checkbox, sonner)

**Files:**
- Create: `components/ui/alert-dialog.tsx`
- Create: `components/ui/popover.tsx`
- Create: `components/ui/checkbox.tsx`
- Create: `components/ui/sonner.tsx`

- [ ] **Step 1: shadcn add 실행 (개별)**

```bash
pnpm dlx shadcn@latest add alert-dialog popover checkbox sonner
```
프롬프트가 뜨면 기본값 그대로 (덮어쓰기 안 함, New York 스타일 유지).

- [ ] **Step 2: 파일 생성 확인**

```bash
ls components/ui/
```
Expected: `alert-dialog.tsx`, `popover.tsx`, `checkbox.tsx`, `sonner.tsx` 추가됨.

- [ ] **Step 3: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 4: 커밋**

```bash
git add components/ui/
git commit -m "chore: shadcn 컴포넌트 추가 (alert-dialog, popover, checkbox, sonner)"
```

### Task 4: 루트 layout 에 Toaster 등록

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Toaster import + 추가**

`app/layout.tsx` 의 `<body>` 안 마지막에 `<Toaster />` 추가:
```tsx
import { Toaster } from "@/components/ui/sonner";

// ... 기존 layout 컴포넌트 안 return:
<body>
  {/* ... 기존 children ... */}
  <Toaster richColors position="top-center" />
</body>
```

- [ ] **Step 2: dev 서버로 확인**

```bash
pnpm dev
```
브라우저로 http://localhost:3000 접속. 콘솔에 에러 없는지 확인. 종료(Ctrl+C).

- [ ] **Step 3: 커밋**

```bash
git add app/layout.tsx
git commit -m "feat: 루트 layout 에 sonner Toaster 등록"
```

---

## Phase 2: 데이터베이스 & 타입

### Task 5: tasks 테이블 마이그레이션 작성 + 적용

**Files:**
- Create: `supabase/migrations/20260523120000_tasks_table.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- supabase/migrations/20260523120000_tasks_table.sql
-- =====================================================
-- tasks: 개인 할 일 (공유 캘린더 무관, 항상 user 소유)
-- =====================================================

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  scheduled_date date not null,
  completed_at timestamptz,
  emoji text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_date_idx on public.tasks (user_id, scheduled_date);
create index tasks_open_idx on public.tasks (user_id, scheduled_date)
  where completed_at is null;

-- updated_at 자동 갱신 (1단계 마이그레이션의 set_updated_at 함수 재사용)
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- RLS
alter table public.tasks enable row level security;

create policy tasks_select_own on public.tasks
  for select using (user_id = (select auth.uid()));

create policy tasks_insert_own on public.tasks
  for insert with check (user_id = (select auth.uid()));

create policy tasks_update_own on public.tasks
  for update using (user_id = (select auth.uid()));

create policy tasks_delete_own on public.tasks
  for delete using (user_id = (select auth.uid()));
```

- [ ] **Step 2: 원격 DB에 적용**

별도 PowerShell 창에서 (대화형 — DB 비밀번호 필요할 수 있음):
```powershell
cd C:\dev\lunabear-calendar
pnpm supabase db push
```
출력에 `Applying migration 20260523120000_tasks_table.sql` 보이면 성공.

- [ ] **Step 3: 적용 확인**

```powershell
pnpm supabase migration list
```
`Local` 과 `Remote` 두 컬럼이 같은 timestamp 까지 표시되면 OK.

- [ ] **Step 4: 커밋 (DB types 재생성은 다음 Task에서 합쳐서)**

```bash
git add supabase/migrations/20260523120000_tasks_table.sql
git commit -m "feat(db): tasks 테이블 + RLS 추가"
```

### Task 6: events.emoji 컬럼 마이그레이션 + 타입 재생성

**Files:**
- Create: `supabase/migrations/20260523120100_events_emoji.sql`
- Modify: `types/database.ts` (재생성)

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- supabase/migrations/20260523120100_events_emoji.sql
alter table public.events add column emoji text;
```

- [ ] **Step 2: 적용**

별도 PowerShell 창에서:
```powershell
cd C:\dev\lunabear-calendar
pnpm supabase db push
```
`Applying migration 20260523120100_events_emoji.sql` 확인.

- [ ] **Step 3: TypeScript 타입 재생성**

```powershell
pnpm db:types
```

- [ ] **Step 4: 타입 변경 확인**

```bash
grep -n "tasks" types/database.ts | head -10
grep -n "emoji" types/database.ts | head -10
```
Expected: `tasks` 테이블 정의 + `events.emoji` 컬럼이 보임.

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/20260523120100_events_emoji.sql types/database.ts
git commit -m "feat(db): events.emoji 컬럼 + 타입 재생성"
```

---

## Phase 3: 유틸리티 라이브러리 (TDD)

### Task 7: `lib/colors.ts` — 12색 상수 + 자동 텍스트 색

**Files:**
- Create: `lib/colors.ts`
- Create: `lib/colors.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// lib/colors.test.ts
import { describe, it, expect } from "vitest";
import { PRESETS, getTextColor } from "./colors";

describe("PRESETS", () => {
  it("12개 색을 제공한다", () => {
    expect(PRESETS).toHaveLength(12);
  });
  it("모두 #RRGGBB 형식이다", () => {
    for (const c of PRESETS) expect(c).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

describe("getTextColor", () => {
  it("밝은 색에는 검정", () => {
    expect(getTextColor("#F8D87B")).toBe("#222");
    expect(getTextColor("#FFFFFF")).toBe("#222");
    expect(getTextColor("#EBD8DD")).toBe("#222");
  });
  it("어두운 색에는 흰색", () => {
    expect(getTextColor("#7A7A7A")).toBe("#fff");
    expect(getTextColor("#000000")).toBe("#fff");
    expect(getTextColor("#7E94A2")).toBe("#fff");
  });
  it("3자리 hex 도 처리한다", () => {
    expect(getTextColor("#fff")).toBe("#222");
    expect(getTextColor("#000")).toBe("#fff");
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
pnpm test:run lib/colors.test.ts
```
Expected: FAIL — `Cannot find module './colors'`.

- [ ] **Step 3: 구현 작성**

```ts
// lib/colors.ts

/**
 * 캘린더 카테고리 색 12개 — design-refs/KakaoTalk_20260523_142440216.jpg 에서 추출.
 * dusty / muted 톤. 사용자가 새 캘린더 만들 때 이 중에서 선택.
 */
export const PRESETS = [
  // 핑크 계열
  "#EBD8DD",
  "#E8D2DC",
  "#E8B8CB",
  "#C49AA8",
  // 베이지 계열
  "#F4E8D8",
  "#E2D5C8",
  "#C5B5A8",
  "#A8917F",
  // 블루 계열
  "#DCE5EA",
  "#BDD3E0",
  "#7E94A2",
  "#7A7A7A",
] as const;

export type CalendarColor = (typeof PRESETS)[number];

/** 회원가입 시 자동 생성되는 기본 캘린더 색. */
export const DEFAULT_CALENDAR_COLOR: CalendarColor = "#BDD3E0";

/**
 * 배경 hex 색이 주어지면 검정/흰색 텍스트 중 가독성 좋은 쪽 반환.
 * YIQ 공식 (0.299·R + 0.587·G + 0.114·B) 사용, 임계값 0.6.
 */
export function getTextColor(hex: string): "#fff" | "#222" {
  const [r, g, b] = parseHex(hex);
  const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return brightness >= 0.6 ? "#222" : "#fff";
}

function parseHex(hex: string): [number, number, number] {
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}
```

- [ ] **Step 4: 테스트 실행 → PASS 확인**

```bash
pnpm test:run lib/colors.test.ts
```
Expected: PASS (6+ assertions).

- [ ] **Step 5: 커밋**

```bash
git add lib/colors.ts lib/colors.test.ts
git commit -m "feat(colors): 12색 PRESETS + getTextColor (자동 대비) + 테스트"
```

### Task 8: `lib/lunar.ts` — 음력 변환 + isLunarFirstDay

**Files:**
- Create: `lib/lunar.ts`
- Create: `lib/lunar.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// lib/lunar.test.ts
import { describe, it, expect } from "vitest";
import { toLunar, isLunarFirstDay, nextSolarDateOfLunar } from "./lunar";

describe("toLunar", () => {
  it("2026-02-17 (양력) → 음력 2026-01-01", () => {
    const r = toLunar(new Date(2026, 1, 17));
    expect(r.year).toBe(2026);
    expect(r.month).toBe(1);
    expect(r.day).toBe(1);
  });
  it("2026-05-23 (양력) → 음력 2026-04-07", () => {
    const r = toLunar(new Date(2026, 4, 23));
    expect(r.month).toBe(4);
    expect(r.day).toBe(7);
  });
});

describe("isLunarFirstDay", () => {
  it("음력 1일이 되는 날에는 true", () => {
    expect(isLunarFirstDay(new Date(2026, 1, 17))).toBe(true); // 음 1/1
    expect(isLunarFirstDay(new Date(2026, 2, 19))).toBe(true); // 음 2/1
  });
  it("그 외 날에는 false", () => {
    expect(isLunarFirstDay(new Date(2026, 4, 23))).toBe(false);
    expect(isLunarFirstDay(new Date(2026, 0, 1))).toBe(false); // 양력 1/1
  });
});

describe("nextSolarDateOfLunar", () => {
  it("음력 4/7 의 다음(또는 같은 해) 양력 날짜를 계산", () => {
    const r = nextSolarDateOfLunar(4, 7, 2026);
    expect(r.getFullYear()).toBe(2026);
    expect(r.getMonth()).toBe(4); // 5월 (0-based)
    expect(r.getDate()).toBe(23);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
pnpm test:run lib/lunar.test.ts
```
Expected: FAIL — `Cannot find module './lunar'`.

- [ ] **Step 3: 구현 작성**

```ts
// lib/lunar.ts
import KoreanLunarCalendar from "korean-lunar-calendar";

export type LunarDate = {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
};

/** 양력 Date → 음력. */
export function toLunar(date: Date): LunarDate {
  const cal = new KoreanLunarCalendar();
  cal.setSolarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const lunar = cal.getLunarCalendar();
  return {
    year: lunar.year,
    month: lunar.month,
    day: lunar.day,
    isLeapMonth: Boolean(lunar.intercalation),
  };
}

/** 양력 Date가 음력 1일(=음력 월이 시작하는 날)인지. */
export function isLunarFirstDay(date: Date): boolean {
  return toLunar(date).day === 1;
}

/**
 * 음력 (month, day) 의 fromYear 시점 이후 양력 Date를 반환.
 * 음력 일정 (생일·제사) 의 매년 표시용.
 */
export function nextSolarDateOfLunar(
  lunarMonth: number,
  lunarDay: number,
  fromYear: number,
): Date {
  const cal = new KoreanLunarCalendar();
  cal.setLunarDate(fromYear, lunarMonth, lunarDay, false);
  const s = cal.getSolarCalendar();
  return new Date(s.year, s.month - 1, s.day);
}
```

- [ ] **Step 4: 테스트 실행 → PASS 확인**

```bash
pnpm test:run lib/lunar.test.ts
```
Expected: PASS (6+ assertions).

- [ ] **Step 5: 커밋**

```bash
git add lib/lunar.ts lib/lunar.test.ts
git commit -m "feat(lunar): 양력↔음력 변환 + isLunarFirstDay + nextSolarDateOfLunar + 테스트"
```

### Task 9: `lib/holidays/index.ts` 확장 — get24SolarTerm, isPublicHoliday

**Files:**
- Modify: `lib/holidays/index.ts`
- Create: `lib/holidays/index.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// lib/holidays/index.test.ts
import { describe, it, expect } from "vitest";
import {
  findHoliday,
  isPublicHoliday,
  get24SolarTerm,
} from "./index";

describe("findHoliday", () => {
  it("2026-05-05 → 어린이날", () => {
    expect(findHoliday("2026-05-05")?.name).toBe("어린이날");
  });
  it("정의 안 된 날 → undefined", () => {
    expect(findHoliday("2026-05-06")).toBeUndefined();
  });
});

describe("isPublicHoliday", () => {
  it("법정 공휴일 true", () => {
    expect(isPublicHoliday("2026-05-05")).toBe(true);
    expect(isPublicHoliday("2026-09-25")).toBe(true); // 추석
  });
  it("24절기는 false (정보성)", () => {
    expect(isPublicHoliday("2026-02-04")).toBe(false); // 입춘
  });
  it("아무 것도 아닌 날도 false", () => {
    expect(isPublicHoliday("2026-05-06")).toBe(false);
  });
});

describe("get24SolarTerm", () => {
  it("입춘 (2026-02-04)", () => {
    expect(get24SolarTerm("2026-02-04")).toBe("입춘");
  });
  it("공휴일과 겹치는 날 (어린이날·입하 2026-05-05) 에도 절기명 반환", () => {
    // 데이터 자체엔 둘 다 있으므로, 호출자가 우선순위 적용
    expect(get24SolarTerm("2026-05-05")).toBe("입하");
  });
  it("절기 아닌 날 → null", () => {
    expect(get24SolarTerm("2026-05-06")).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
pnpm test:run lib/holidays/index.test.ts
```
Expected: FAIL — `isPublicHoliday`, `get24SolarTerm` 미정의.

- [ ] **Step 3: `lib/holidays/index.ts` 확장**

기존 코드 유지 + 아래 export 추가 (파일 끝):

```ts
/** YYYY-MM-DD 가 법정 공휴일인지 (24절기는 false). */
export function isPublicHoliday(isoDate: string): boolean {
  const h = findHoliday(isoDate);
  return Boolean(h?.isPublicHoliday);
}

/** YYYY-MM-DD 의 24절기 이름. 절기 아니면 null. */
export function get24SolarTerm(isoDate: string): string | null {
  const year = Number(isoDate.slice(0, 4));
  // 같은 날짜에 공휴일 + 절기가 있을 수 있어서, isPublicHoliday=false 행만 찾는다.
  const match = getHolidays(year).find(
    (h) => h.date === isoDate && !h.isPublicHoliday,
  );
  return match?.name ?? null;
}
```

- [ ] **Step 4: 테스트 실행 → PASS 확인**

```bash
pnpm test:run lib/holidays/index.test.ts
```
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add lib/holidays/index.ts lib/holidays/index.test.ts
git commit -m "feat(holidays): isPublicHoliday + get24SolarTerm + 테스트"
```

---

## Phase 4: Server Layer (queries + actions)

### Task 10: 이벤트 쿼리 — `features/calendar/server/queries.ts`

**Files:**
- Create: `features/calendar/server/queries.ts`

- [ ] **Step 1: 작성**

```ts
// features/calendar/server/queries.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type CalendarRow = Database["public"]["Tables"]["calendars"]["Row"];

/**
 * 특정 월의 일정 fetch.
 * monthString: "YYYY-MM"
 * 월 그리드는 앞뒤 다른 달의 일부도 보여주므로, 6주(42일) 범위로 확장.
 */
export async function getEventsForMonth(monthString: string): Promise<EventRow[]> {
  const supabase = createClient();
  const [yearStr, monthStr] = monthString.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1; // 0-based

  // 월의 첫날 + 그 주의 일요일까지 뒤로
  const firstOfMonth = new Date(year, monthIdx, 1);
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - firstOfMonth.getDay()); // 일요일 시작

  // 6주 후 (42일)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 42);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("start_at", startDate.toISOString())
    .lt("start_at", endDate.toISOString())
    .order("start_at");

  if (error) throw error;
  return data ?? [];
}

/** 특정 날짜 (단일 일) 의 이벤트. 일간 뷰용. */
export async function getEventsForDay(dateString: string): Promise<EventRow[]> {
  const supabase = createClient();
  const start = new Date(dateString + "T00:00:00");
  const end = new Date(dateString + "T23:59:59.999");

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("start_at", start.toISOString())
    .lte("start_at", end.toISOString())
    .order("start_at");

  if (error) throw error;
  return data ?? [];
}

/** 현재 사용자의 모든 캘린더. */
export async function getCalendars(): Promise<CalendarRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("calendars")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/server/queries.ts
git commit -m "feat(calendar): RSC용 이벤트/캘린더 쿼리 추가"
```

### Task 11: 이벤트 Server Actions — `features/calendar/server/actions.ts`

**Files:**
- Create: `features/calendar/server/actions.ts`

- [ ] **Step 1: 작성**

```ts
// features/calendar/server/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const eventInputSchema = z.object({
  title: z.string().min(1).max(200),
  calendar_id: z.string().uuid(),
  start_at: z.string(), // ISO
  end_at: z.string(),
  is_all_day: z.boolean().default(false),
  location: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  emoji: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  is_lunar: z.boolean().default(false),
  lunar_month: z.number().int().min(1).max(12).nullable().optional(),
  lunar_day: z.number().int().min(1).max(30).nullable().optional(),
});

export type EventInput = z.infer<typeof eventInputSchema>;

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

export async function createEvent(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed.data, user_id: userId })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  revalidatePath("/day");
  return { ok: true, data: { id: data.id } };
}

export async function updateEvent(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = eventInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  revalidatePath("/day");
  return { ok: true, data: undefined };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  revalidatePath("/day");
  return { ok: true, data: undefined };
}

/** 드래그앤드롭으로 일정 시간 이동. */
export async function moveEvent(
  id: string,
  newStart: string,
  newEnd: string,
): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update({ start_at: newStart, end_at: newEnd })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  revalidatePath("/day");
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: 의존성 확인 — zod 이미 있음**

```bash
grep '"zod"' package.json
```
Expected: 출력에 zod 있음 (1단계에 폼 검증용으로 설치). 없으면:
```bash
pnpm add zod
```

- [ ] **Step 3: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 4: 커밋**

```bash
git add features/calendar/server/actions.ts
git commit -m "feat(calendar): 이벤트 Server Actions (create/update/delete/move)"
```

### Task 12: 캘린더 Server Actions — calendars 생성/수정/삭제

**Files:**
- Modify: `features/calendar/server/actions.ts`

- [ ] **Step 1: 파일 끝에 calendar action 추가**

```ts
// === Calendar Actions ===

const calendarInputSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export async function createCalendar(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = calendarInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("calendars")
    .insert({ ...parsed.data, user_id: userId, is_default: false })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  return { ok: true, data: { id: data.id } };
}

export async function updateCalendar(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = calendarInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("calendars")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  return { ok: true, data: undefined };
}

export async function deleteCalendar(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();

  // 기본 캘린더는 삭제 금지
  const { data: cal } = await supabase
    .from("calendars")
    .select("is_default")
    .eq("id", id)
    .single();
  if (cal?.is_default) return { ok: false, error: "기본 캘린더는 삭제할 수 없습니다" };

  const { error } = await supabase.from("calendars").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/server/actions.ts
git commit -m "feat(calendar): 캘린더 CRUD Server Actions"
```

### Task 13: 할 일 쿼리 — `features/todos/server/queries.ts`

**Files:**
- Create: `features/todos/server/queries.ts`

- [ ] **Step 1: 작성**

```ts
// features/todos/server/queries.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

/** 특정 날짜의 할 일 (이 날 scheduled). */
export async function getTodosForDate(dateString: string): Promise<TaskRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("scheduled_date", dateString)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

/** 오늘 이전 + 미완료 = 밀린 항목. 오래된 순. */
export async function getOverdueTodos(todayString: string): Promise<TaskRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .lt("scheduled_date", todayString)
    .is("completed_at", null)
    .order("scheduled_date");
  if (error) throw error;
  return data ?? [];
}

/** 월 그리드 셀들에 분배할 용도. 6주 범위 모든 task. */
export async function getTodosForMonth(monthString: string): Promise<TaskRow[]> {
  const supabase = createClient();
  const [yearStr, monthStr] = monthString.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;

  const firstOfMonth = new Date(year, monthIdx, 1);
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 42);

  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .gte("scheduled_date", toIso(startDate))
    .lt("scheduled_date", toIso(endDate))
    .order("scheduled_date");
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/todos/server/queries.ts
git commit -m "feat(todos): RSC용 할 일 쿼리 (date/overdue/month)"
```

### Task 14: 할 일 Server Actions — `features/todos/server/actions.ts`

**Files:**
- Create: `features/todos/server/actions.ts`

- [ ] **Step 1: 작성**

```ts
// features/todos/server/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const taskInputSchema = z.object({
  title: z.string().min(1).max(200),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  emoji: z.string().nullable().optional(),
});

export type TaskInput = z.infer<typeof taskInputSchema>;
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

export async function createTodo(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...parsed.data, user_id: userId })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/todos");
  return { ok: true, data: { id: data.id } };
}

export async function toggleTodo(
  id: string,
  completed: boolean,
): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/todos");
  return { ok: true, data: undefined };
}

export async function deleteTodo(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/todos");
  return { ok: true, data: undefined };
}

/** 다른 날짜로 이동 (밀린 항목의 "다른 날로 옮기기"). */
export async function moveTodo(
  id: string,
  newDate: string,
): Promise<ActionResult> {
  const parsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(newDate);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 날짜" };

  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ scheduled_date: newDate })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/todos");
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/todos/server/actions.ts
git commit -m "feat(todos): Server Actions (create/toggle/delete/move)"
```

---

## Phase 5: UI 컴포넌트

### Task 15: Zustand 스토어 — `features/calendar/store/calendar-ui.ts`

**Files:**
- Create: `features/calendar/store/calendar-ui.ts`

- [ ] **Step 1: 작성**

```ts
// features/calendar/store/calendar-ui.ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type CalendarUIState = {
  /** 보기 숨길 캘린더 id 모음 — persist. */
  hiddenCalendarIds: string[];
  toggleCalendarHidden: (id: string) => void;
  isHidden: (id: string) => boolean;
};

export const useCalendarUIStore = create<CalendarUIState>()(
  persist(
    (set, get) => ({
      hiddenCalendarIds: [],
      toggleCalendarHidden: (id) =>
        set((s) => ({
          hiddenCalendarIds: s.hiddenCalendarIds.includes(id)
            ? s.hiddenCalendarIds.filter((x) => x !== id)
            : [...s.hiddenCalendarIds, id],
        })),
      isHidden: (id) => get().hiddenCalendarIds.includes(id),
    }),
    { name: "lunabear-calendar-ui" },
  ),
);
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/store/calendar-ui.ts
git commit -m "feat(calendar): Zustand UI 스토어 (캘린더 보이기 토글 persist)"
```

### Task 16: HolidayBadge 컴포넌트

**Files:**
- Create: `features/calendar/components/HolidayBadge.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/calendar/components/HolidayBadge.tsx
"use client";
import { findHoliday, get24SolarTerm } from "@/lib/holidays";

type Props = { isoDate: string };

/**
 * 윗줄 우측 알약 배지 — 공휴일 우선, 없으면 24절기, 둘 다 없으면 null.
 */
export function HolidayBadge({ isoDate }: Props) {
  const holiday = findHoliday(isoDate);
  if (holiday?.isPublicHoliday) {
    return (
      <span className="px-1.5 py-px rounded-full text-[10px] bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
        {holiday.name}
      </span>
    );
  }
  const term = get24SolarTerm(isoDate);
  if (term) {
    return (
      <span className="px-1.5 py-px rounded-full text-[10px] bg-muted text-muted-foreground">
        {term}
      </span>
    );
  }
  return null;
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/components/HolidayBadge.tsx
git commit -m "feat(calendar): HolidayBadge — 공휴일 우선, 24절기 fallback"
```

### Task 17: EventBar 컴포넌트

**Files:**
- Create: `features/calendar/components/EventBar.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/calendar/components/EventBar.tsx
"use client";
import { getTextColor } from "@/lib/colors";

type Props = {
  title: string;
  emoji?: string | null;
  color: string; // hex
  onClick?: () => void;
};

export function EventBar({ title, emoji, color, onClick }: Props) {
  const textColor = getTextColor(color);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate hover:opacity-80 transition"
      style={{ backgroundColor: color, color: textColor }}
    >
      {emoji ? `${emoji} ` : ""}
      {title}
    </button>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/components/EventBar.tsx
git commit -m "feat(calendar): EventBar — 자동 대비 텍스트 + 이모지 prefix"
```

### Task 18: DeleteConfirmDialog 컴포넌트

**Files:**
- Create: `features/calendar/components/DeleteConfirmDialog.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/calendar/components/DeleteConfirmDialog.tsx
"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
};

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "정말 삭제할까요?",
  description = "이 작업은 되돌릴 수 없습니다.",
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/components/DeleteConfirmDialog.tsx
git commit -m "feat(calendar): DeleteConfirmDialog (shadcn AlertDialog 래퍼)"
```

### Task 19: EmojiPicker 컴포넌트

**Files:**
- Create: `lib/emoji/init.ts`
- Create: `features/calendar/components/EmojiPicker.tsx`

- [ ] **Step 1: emoji-mart 데이터 초기화 헬퍼**

```ts
// lib/emoji/init.ts
import data from "@emoji-mart/data";
import { init } from "emoji-mart";

let initialized = false;
export function ensureEmojiInit() {
  if (!initialized) {
    init({ data });
    initialized = true;
  }
}
```

- [ ] **Step 2: 픽커 컴포넌트**

```tsx
// features/calendar/components/EmojiPicker.tsx
"use client";
import { useEffect } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ensureEmojiInit } from "@/lib/emoji/init";

type Props = {
  value: string | null;
  onChange: (emoji: string | null) => void;
};

export function EmojiPicker({ value, onChange }: Props) {
  useEffect(() => {
    ensureEmojiInit();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            {value ? value : "+ 이모지"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto border-0">
          <Picker
            data={data}
            locale="ko"
            onEmojiSelect={(e: { native: string }) => onChange(e.native)}
            previewPosition="none"
            skinTonePosition="none"
            theme="auto"
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
        >
          비우기
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 4: 커밋**

```bash
git add lib/emoji/ features/calendar/components/EmojiPicker.tsx
git commit -m "feat(calendar): EmojiPicker (emoji-mart 한국어 로케일)"
```

### Task 20: EventModal — 일정 생성/수정 폼

**Files:**
- Create: `features/calendar/components/EventModal.tsx`

- [ ] **Step 1: 작성 (긴 파일)**

```tsx
// features/calendar/components/EventModal.tsx
"use client";
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { EmojiPicker } from "./EmojiPicker";
import { PRESETS, getTextColor } from "@/lib/colors";
import { toLunar } from "@/lib/lunar";
import { createEvent, updateEvent } from "../server/actions";
import type { CalendarRow, EventRow } from "../server/queries";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  calendars: CalendarRow[];
  /** 수정 모드일 때 채워짐. */
  initial?: EventRow | null;
  /** 빈 셀 클릭 시 프리필 날짜 (YYYY-MM-DD). */
  defaultDate?: string;
};

export function EventModal({
  open,
  onOpenChange,
  calendars,
  initial,
  defaultDate,
}: Props) {
  const defaultCal = calendars.find((c) => c.is_default) ?? calendars[0];
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [emoji, setEmoji] = useState<string | null>(initial?.emoji ?? null);
  const [calendarId, setCalendarId] = useState(
    initial?.calendar_id ?? defaultCal?.id ?? "",
  );
  const [color, setColor] = useState<string>(
    initial?.color ?? defaultCal?.color ?? PRESETS[9],
  );
  const [isAllDay, setIsAllDay] = useState(initial?.is_all_day ?? true);
  const [startAt, setStartAt] = useState(
    initial?.start_at?.slice(0, 16) ??
      (defaultDate ? `${defaultDate}T09:00` : ""),
  );
  const [endAt, setEndAt] = useState(
    initial?.end_at?.slice(0, 16) ??
      (defaultDate ? `${defaultDate}T10:00` : ""),
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [isLunar, setIsLunar] = useState(initial?.is_lunar ?? false);

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("제목을 입력하세요");
      return;
    }

    // 음력 토글 ON 시 lunar_month/day 계산
    let lunar_month: number | null = null;
    let lunar_day: number | null = null;
    if (isLunar && startAt) {
      const l = toLunar(new Date(startAt));
      lunar_month = l.month;
      lunar_day = l.day;
    }

    const payload = {
      title: title.trim(),
      calendar_id: calendarId,
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt || startAt).toISOString(),
      is_all_day: isAllDay,
      location: location.trim() || null,
      memo: memo.trim() || null,
      emoji,
      color,
      is_lunar: isLunar,
      lunar_month,
      lunar_day,
    };

    startTransition(async () => {
      const result = initial
        ? await updateEvent(initial.id, payload)
        : await createEvent(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(initial ? "수정되었습니다" : "일정이 추가되었습니다");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "일정 수정" : "일정 추가"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 친구 만남"
            />
          </div>

          <div>
            <Label>이모지</Label>
            <EmojiPicker value={emoji} onChange={setEmoji} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="all-day"
              checked={isAllDay}
              onCheckedChange={(v) => setIsAllDay(Boolean(v))}
            />
            <Label htmlFor="all-day">종일</Label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="start">시작</Label>
              <Input
                id="start"
                type={isAllDay ? "date" : "datetime-local"}
                value={isAllDay ? startAt.slice(0, 10) : startAt}
                onChange={(e) =>
                  setStartAt(isAllDay ? `${e.target.value}T00:00` : e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="end">종료</Label>
              <Input
                id="end"
                type={isAllDay ? "date" : "datetime-local"}
                value={isAllDay ? endAt.slice(0, 10) : endAt}
                onChange={(e) =>
                  setEndAt(isAllDay ? `${e.target.value}T23:59` : e.target.value)
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="calendar">캘린더</Label>
            <select
              id="calendar"
              value={calendarId}
              onChange={(e) => {
                setCalendarId(e.target.value);
                const cal = calendars.find((c) => c.id === e.target.value);
                if (cal) setColor(cal.color);
              }}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>색상</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-md border-2 ${
                    color === c ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <div
              className="mt-2 inline-block px-2 py-1 rounded text-xs"
              style={{ backgroundColor: color, color: getTextColor(color) }}
            >
              미리보기: {emoji ? `${emoji} ` : ""}
              {title || "(제목 없음)"}
            </div>
          </div>

          <div>
            <Label htmlFor="location">장소</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="선택사항"
            />
          </div>

          <div>
            <Label htmlFor="memo">메모</Label>
            <textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="선택사항"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is-lunar"
              checked={isLunar}
              onCheckedChange={(v) => setIsLunar(Boolean(v))}
            />
            <Label htmlFor="is-lunar">
              음력 일정 (매년 같은 음력 날짜에 반복)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/components/EventModal.tsx
git commit -m "feat(calendar): EventModal — 생성/수정 폼 (이모지 + 음력 + 12색)"
```

### Task 21: EventDetailDialog — 상세 + 수정/삭제 진입

**Files:**
- Create: `features/calendar/components/EventDetailDialog.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/calendar/components/EventDetailDialog.tsx
"use client";
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { EventModal } from "./EventModal";
import { deleteEvent } from "../server/actions";
import type { CalendarRow, EventRow } from "../server/queries";

type Props = {
  event: EventRow | null;
  calendars: CalendarRow[];
  onClose: () => void;
};

export function EventDetailDialog({ event, calendars, onClose }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!event) return null;

  const cal = calendars.find((c) => c.id === event.calendar_id);
  const open = !editing && !confirming;

  const handleDelete = () => {
    startTransition(async () => {
      const r = await deleteEvent(event.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("삭제되었습니다");
      setConfirming(false);
      onClose();
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return event.is_all_day
      ? d.toLocaleDateString("ko-KR")
      : d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {event.emoji ? `${event.emoji} ` : ""}
              {event.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">시작</span>{" "}
              {formatDate(event.start_at)}
            </div>
            <div>
              <span className="text-muted-foreground">종료</span>{" "}
              {formatDate(event.end_at)}
            </div>
            <div>
              <span className="text-muted-foreground">캘린더</span>{" "}
              <span
                className="inline-block w-2 h-2 rounded-full align-middle"
                style={{ backgroundColor: cal?.color }}
              />{" "}
              {cal?.name ?? "(삭제됨)"}
            </div>
            {event.location && (
              <div>
                <span className="text-muted-foreground">장소</span>{" "}
                {event.location}
              </div>
            )}
            {event.memo && (
              <div className="mt-2 whitespace-pre-wrap text-foreground/80">
                {event.memo}
              </div>
            )}
            {event.is_lunar && (
              <div className="text-xs text-muted-foreground mt-2">
                ☾ 음력 {event.lunar_month}월 {event.lunar_day}일 (매년 반복)
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(true)}>
              수정
            </Button>
            <Button
              variant="destructive"
              onClick={() => setConfirming(true)}
              disabled={pending}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && (
        <EventModal
          open={editing}
          onOpenChange={(v) => {
            setEditing(v);
            if (!v) onClose();
          }}
          calendars={calendars}
          initial={event}
        />
      )}

      <DeleteConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={handleDelete}
        title="일정을 삭제할까요?"
        description={`"${event.title}" 이 영구 삭제됩니다.`}
      />
    </>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/components/EventDetailDialog.tsx
git commit -m "feat(calendar): EventDetailDialog — 상세 + 수정/삭제 진입"
```

### Task 22: NewCalendarDialog

**Files:**
- Create: `features/calendar/components/NewCalendarDialog.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/calendar/components/NewCalendarDialog.tsx
"use client";
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PRESETS, DEFAULT_CALENDAR_COLOR } from "@/lib/colors";
import { createCalendar } from "../server/actions";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function NewCalendarDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_CALENDAR_COLOR);
  const [pending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("이름을 입력하세요");
      return;
    }
    startTransition(async () => {
      const r = await createCalendar({ name: name.trim(), color });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("캘린더가 추가되었습니다");
      setName("");
      setColor(DEFAULT_CALENDAR_COLOR);
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>새 캘린더</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cal-name">이름 *</Label>
            <Input
              id="cal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 가족 일정"
              maxLength={50}
            />
          </div>
          <div>
            <Label>색상</Label>
            <div className="grid grid-cols-6 gap-2">
              {PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-md border-2 ${
                    color === c ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "추가 중..." : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/components/NewCalendarDialog.tsx
git commit -m "feat(calendar): NewCalendarDialog (이름 + 12색)"
```

### Task 23: CalendarSettingsDialog (수정/삭제)

**Files:**
- Create: `features/calendar/components/CalendarSettingsDialog.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/calendar/components/CalendarSettingsDialog.tsx
"use client";
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PRESETS } from "@/lib/colors";
import { updateCalendar, deleteCalendar } from "../server/actions";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import type { CalendarRow } from "../server/queries";

type Props = {
  calendar: CalendarRow | null;
  onClose: () => void;
};

export function CalendarSettingsDialog({ calendar, onClose }: Props) {
  const [name, setName] = useState(calendar?.name ?? "");
  const [color, setColor] = useState(calendar?.color ?? PRESETS[9]);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!calendar) return null;

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("이름을 입력하세요");
      return;
    }
    startTransition(async () => {
      const r = await updateCalendar(calendar.id, { name: name.trim(), color });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("수정되었습니다");
      onClose();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const r = await deleteCalendar(calendar.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("삭제되었습니다");
      setConfirming(false);
      onClose();
    });
  };

  return (
    <>
      <Dialog open={!confirming} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>캘린더 설정</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cal-name">이름</Label>
              <Input
                id="cal-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div>
              <Label>색상</Label>
              <div className="grid grid-cols-6 gap-2">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-9 h-9 rounded-md border-2 ${
                      color === c ? "border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="justify-between">
            <Button
              variant="destructive"
              onClick={() => setConfirming(true)}
              disabled={pending || calendar.is_default}
              title={calendar.is_default ? "기본 캘린더는 삭제 불가" : ""}
            >
              삭제
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={pending}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={pending}>
                저장
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={handleDelete}
        title="캘린더 삭제"
        description={`"${calendar.name}" 와 그 안의 모든 일정이 함께 삭제됩니다.`}
      />
    </>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/components/CalendarSettingsDialog.tsx
git commit -m "feat(calendar): CalendarSettingsDialog (수정/삭제, 기본 캘린더는 삭제 잠금)"
```

### Task 24: CalendarPickerDropdown

**Files:**
- Create: `features/calendar/components/CalendarPickerDropdown.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/calendar/components/CalendarPickerDropdown.tsx
"use client";
import { useState } from "react";
import { ChevronDown, Eye, EyeOff, Settings as SettingsIcon, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { NewCalendarDialog } from "./NewCalendarDialog";
import { CalendarSettingsDialog } from "./CalendarSettingsDialog";
import { useCalendarUIStore } from "../store/calendar-ui";
import type { CalendarRow } from "../server/queries";

type Props = { calendars: CalendarRow[] };

export function CalendarPickerDropdown({ calendars }: Props) {
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<CalendarRow | null>(null);
  const hidden = useCalendarUIStore((s) => s.hiddenCalendarIds);
  const toggle = useCalendarUIStore((s) => s.toggleCalendarHidden);

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            📋 캘린더 <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            내 캘린더
          </div>
          <div className="flex flex-col gap-1">
            {calendars.map((cal) => {
              const isHidden = hidden.includes(cal.id);
              return (
                <div
                  key={cal.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent group"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cal.color }}
                  />
                  <span className={`flex-1 text-sm ${isHidden ? "opacity-50" : ""}`}>
                    {cal.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(cal.id)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={isHidden ? "보이기" : "숨기기"}
                  >
                    {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(cal)}
                    className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                    aria-label="설정"
                  >
                    <SettingsIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setOpenNew(true)}
            className="mt-2 w-full text-left px-2 py-1.5 rounded text-sm text-muted-foreground hover:bg-accent flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            새 캘린더
          </button>
        </PopoverContent>
      </Popover>

      <NewCalendarDialog open={openNew} onOpenChange={setOpenNew} />
      <CalendarSettingsDialog
        calendar={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/components/CalendarPickerDropdown.tsx
git commit -m "feat(calendar): CalendarPickerDropdown — 캘린더 목록 + 보이기 토글 + 추가/설정"
```

### Task 25: FullCalendar 로케일/테마 셋업

**Files:**
- Create: `lib/fullcalendar/locale-ko.ts`
- Create: `lib/fullcalendar/theme.css`

- [ ] **Step 1: 한국어 로케일 + 옵션**

```ts
// lib/fullcalendar/locale-ko.ts
import koLocale from "@fullcalendar/core/locales/ko";

export const FC_KO = {
  ...koLocale,
  buttonText: { ...koLocale.buttonText, today: "오늘" },
};

/** FullCalendar 공통 옵션. */
export const FC_COMMON = {
  locale: FC_KO,
  firstDay: 0, // 일요일 시작
  weekends: true,
  height: "100%" as const,
  dayMaxEvents: 3,
  moreLinkContent: (arg: { num: number }) => `+ ${arg.num}개 더`,
};
```

- [ ] **Step 2: 테마 CSS 토큰 오버라이드**

```css
/* lib/fullcalendar/theme.css */
.fc {
  --fc-border-color: hsl(var(--border));
  --fc-page-bg-color: transparent;
  --fc-today-bg-color: hsl(var(--accent) / 0.4);
  --fc-neutral-bg-color: transparent;
  font-family: inherit;
}

.fc .fc-toolbar.fc-header-toolbar {
  margin-bottom: 0.75rem;
}

/* 요일 헤더 */
.fc .fc-col-header-cell-cushion {
  padding: 0.5rem 0.25rem;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}
.fc .fc-day-sun .fc-col-header-cell-cushion {
  color: #d92d20;
}
.fc .fc-day-sat .fc-col-header-cell-cushion {
  color: #5b6cff;
}

/* 다른 달 셀 흐리게 */
.fc .fc-day-other {
  opacity: 0.4;
}

/* 일요일·토요일 본문 날짜 색 (커스텀 dayCellContent 에서 처리하지만 보강) */
.fc .fc-daygrid-day-number {
  padding: 0.25rem;
}

/* 월 전환 시 살짝 fade + slide-in (실제로 작동하는 형태) */
.fc-view-harness > .fc-view {
  animation: fc-month-in 0.18s ease-out;
}
@keyframes fc-month-in {
  from { opacity: 0; transform: translateX(6px); }
  to { opacity: 1; transform: translateX(0); }
}
```

- [ ] **Step 3: globals.css 에 import**

`app/globals.css` 의 맨 위(다른 import 다음)에 추가:
```css
@import "../lib/fullcalendar/theme.css";
```

- [ ] **Step 4: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add lib/fullcalendar/ app/globals.css
git commit -m "feat(calendar): FullCalendar 한국어 로케일 + 테마 CSS"
```

### Task 26: DayCell 컴포넌트 (월간 그리드 셀)

**Files:**
- Create: `features/calendar/components/DayCell.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/calendar/components/DayCell.tsx
"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { EventBar } from "./EventBar";
import { HolidayBadge } from "./HolidayBadge";
import { isLunarFirstDay, toLunar } from "@/lib/lunar";
import { isPublicHoliday } from "@/lib/holidays";
import { toggleTodo } from "@/features/todos/server/actions";
import type { EventRow, CalendarRow } from "../server/queries";
import type { TaskRow } from "@/features/todos/server/queries";

type Props = {
  date: Date;
  isCurrentMonth: boolean;
  events: EventRow[];
  todos: TaskRow[];
  calendars: CalendarRow[];
  onEventClick: (e: EventRow) => void;
  onEmptyClick: () => void;
};

export function DayCell({
  date,
  isCurrentMonth,
  events,
  todos,
  calendars,
  onEventClick,
  onEmptyClick,
}: Props) {
  const isoDate = date.toISOString().slice(0, 10);
  const day = date.getDay();
  const lunar = isLunarFirstDay(date) ? toLunar(date) : null;
  const dayNumberColor =
    !isCurrentMonth
      ? "text-muted-foreground/50"
      : isPublicHoliday(isoDate) || day === 0
      ? "text-red-600 dark:text-red-400"
      : day === 6
      ? "text-[#5b6cff]"
      : "text-foreground";

  const calColor = (id: string) => calendars.find((c) => c.id === id)?.color ?? "#888";
  const shownEvents = events.slice(0, 3);
  const moreCount = Math.max(0, events.length - 3);
  const shownTodos = todos.slice(0, 2);
  const moreTodoCount = Math.max(0, todos.length - 2);

  return (
    <div
      className="h-full flex flex-col p-1.5 cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onEmptyClick();
      }}
    >
      {/* 윗줄: 날짜 + 음력 + 배지 */}
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className={`text-sm font-semibold ${dayNumberColor}`}>
          {date.getDate()}
        </span>
        {lunar && (
          <span className="text-[10px] text-muted-foreground">
            ·음 {lunar.month}/1
          </span>
        )}
        <span className="ml-auto">
          <HolidayBadge isoDate={isoDate} />
        </span>
      </div>

      {/* 이벤트 막대 */}
      <div className="flex flex-col gap-0.5">
        {shownEvents.map((ev) => (
          <EventBar
            key={ev.id}
            title={ev.title}
            emoji={ev.emoji}
            color={ev.color ?? calColor(ev.calendar_id)}
            onClick={() => onEventClick(ev)}
          />
        ))}
        {moreCount > 0 && (
          <span className="text-[10px] text-muted-foreground px-1">
            + {moreCount}개 더
          </span>
        )}
      </div>

      {/* 할 일 (점선 구분) */}
      {(shownTodos.length > 0 || moreTodoCount > 0) && (
        <div className="mt-auto pt-1.5 border-t border-dashed border-border flex flex-col gap-0.5">
          {shownTodos.map((t) => (
            <TodoMiniRow key={t.id} todo={t} />
          ))}
          {moreTodoCount > 0 && (
            <span className="text-[10px] text-muted-foreground px-1">
              + {moreTodoCount}개
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function TodoMiniRow({ todo }: { todo: TaskRow }) {
  const done = !!todo.completed_at;
  return (
    <div className="flex items-center gap-1.5 px-1">
      <Checkbox
        checked={done}
        onCheckedChange={(v) => void toggleTodo(todo.id, Boolean(v))}
        className="h-3 w-3"
      />
      <span
        className={`text-[11px] truncate ${
          done ? "line-through text-muted-foreground" : ""
        }`}
      >
        {todo.emoji ? `${todo.emoji} ` : ""}
        {todo.title}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/components/DayCell.tsx
git commit -m "feat(calendar): DayCell — 날짜+음력1일+배지+일정막대+할일 통합"
```

### Task 27: MonthNavigation — 키보드/스와이프

**Files:**
- Create: `features/calendar/components/MonthNavigation.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/calendar/components/MonthNavigation.tsx
"use client";
import { useEffect, useRef } from "react";

type Props = {
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  /** ref 로 받는 그리드 컨테이너 — 스와이프 감지 영역. */
  targetRef: React.RefObject<HTMLElement>;
};

export function MonthNavigation({ onPrev, onNext, onToday, targetRef }: Props) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  // 키보드
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        onToday();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onPrev, onNext, onToday]);

  // 스와이프
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (startX.current == null || startY.current == null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (Math.abs(dx) > 50 && Math.abs(dy) < 30) {
        if (dx > 0) onPrev();
        else onNext();
      }
      startX.current = null;
      startY.current = null;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onPrev, onNext, targetRef]);

  return null; // 입력 핸들러만 등록
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/components/MonthNavigation.tsx
git commit -m "feat(calendar): MonthNavigation — 키보드 + 스와이프 핸들러"
```

### Task 28: MonthGrid — FullCalendar 월간 wrapper

**Files:**
- Create: `features/calendar/components/MonthGrid.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/calendar/components/MonthGrid.tsx
"use client";
import { useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import type { default as FullCalendarInst } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput, DateSelectArg, EventDropArg, EventClickArg } from "@fullcalendar/core";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { FC_COMMON } from "@/lib/fullcalendar/locale-ko";
import { DayCell } from "./DayCell";
import { MonthNavigation } from "./MonthNavigation";
import { EventModal } from "./EventModal";
import { EventDetailDialog } from "./EventDetailDialog";
import { moveEvent } from "../server/actions";
import { useCalendarUIStore } from "../store/calendar-ui";
import type { CalendarRow, EventRow } from "../server/queries";
import type { TaskRow } from "@/features/todos/server/queries";

type Props = {
  calendars: CalendarRow[];
  events: EventRow[];
  todos: TaskRow[];
  initialMonth: string; // YYYY-MM
};

export function MonthGrid({ calendars, events, todos, initialMonth }: Props) {
  const router = useRouter();
  const fcRef = useRef<FullCalendarInst | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenIds = useCalendarUIStore((s) => s.hiddenCalendarIds);

  const [createOpenForDate, setCreateOpenForDate] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventRow | null>(null);

  const visibleEvents = useMemo(
    () => events.filter((e) => !hiddenIds.includes(e.calendar_id)),
    [events, hiddenIds],
  );

  const fcEvents: EventInput[] = useMemo(
    () =>
      visibleEvents.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start_at,
        end: e.end_at,
        allDay: e.is_all_day,
        extendedProps: { rawEvent: e },
      })),
    [visibleEvents],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of visibleEvents) {
      const key = e.start_at.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [visibleEvents]);

  const todosByDate = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const t of todos) {
      const arr = map.get(t.scheduled_date) ?? [];
      arr.push(t);
      map.set(t.scheduled_date, arr);
    }
    return map;
  }, [todos]);

  const navigate = (delta: -1 | 1 | 0) => {
    const api = fcRef.current?.getApi();
    if (!api) return;
    if (delta === 0) api.today();
    else if (delta < 0) api.prev();
    else api.next();
    const d = api.getDate();
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/calendar?month=${m}`);
  };

  const handleDateClick = (info: DateSelectArg) => {
    const isoDate = info.startStr.slice(0, 10);
    setCreateOpenForDate(isoDate);
  };

  const handleEventClick = (info: EventClickArg) => {
    const ev = info.event.extendedProps.rawEvent as EventRow;
    setDetailEvent(ev);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const ev = info.event.extendedProps.rawEvent as EventRow;
    const newStart = info.event.start?.toISOString();
    const newEnd = (info.event.end ?? info.event.start)?.toISOString();
    if (!newStart || !newEnd) {
      info.revert();
      return;
    }
    const r = await moveEvent(ev.id, newStart, newEnd);
    if (!r.ok) {
      toast.error(r.error);
      info.revert();
    } else {
      toast.success("이동되었습니다");
    }
  };

  return (
    <div ref={containerRef} className="h-full">
      <MonthNavigation
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onToday={() => navigate(0)}
        targetRef={containerRef}
      />
      <FullCalendar
        ref={fcRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={`${initialMonth}-01`}
        editable
        selectable
        select={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        events={fcEvents}
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        dayCellContent={(arg) => <DayCellPortalSlot id={arg.date.toISOString().slice(0, 10)} />}
        {...FC_COMMON}
      />
      {/* DayCell 들을 portal 로 그린다 (각 셀의 .fc-daygrid-day-frame 안) */}
      <DayCellRenderer
        calendars={calendars}
        eventsByDate={eventsByDate}
        todosByDate={todosByDate}
        onEventClick={setDetailEvent}
        onEmptyClick={setCreateOpenForDate}
      />

      {createOpenForDate && (
        <EventModal
          open
          onOpenChange={(v) => !v && setCreateOpenForDate(null)}
          calendars={calendars}
          defaultDate={createOpenForDate}
        />
      )}
      {detailEvent && (
        <EventDetailDialog
          event={detailEvent}
          calendars={calendars}
          onClose={() => setDetailEvent(null)}
        />
      )}
    </div>
  );
}

function DayCellPortalSlot({ id }: { id: string }) {
  return <div data-cell-id={id} className="absolute inset-0" />;
}

function DayCellRenderer({
  calendars,
  eventsByDate,
  todosByDate,
  onEventClick,
  onEmptyClick,
}: {
  calendars: CalendarRow[];
  eventsByDate: Map<string, EventRow[]>;
  todosByDate: Map<string, TaskRow[]>;
  onEventClick: (e: EventRow) => void;
  onEmptyClick: (date: string) => void;
}) {
  // SSR 호환을 위해 클라이언트 마운트 후 portal
  if (typeof document === "undefined") return null;
  const slots = Array.from(document.querySelectorAll<HTMLElement>("[data-cell-id]"));
  return (
    <>
      {slots.map((el) => {
        const isoDate = el.dataset.cellId!;
        const date = new Date(isoDate);
        const cellMonth = (date.getMonth());
        // currentMonth 판정: 부모 FullCalendar 의 viewed month 와 비교 — 간단화: title 에서 추출
        const titleEl = document.querySelector(".fc-toolbar-title");
        const titleStr = titleEl?.textContent ?? "";
        const viewedMonth = parseInt(titleStr.match(/(\d{1,2})월/)?.[1] ?? "0", 10) - 1;
        const isCurrentMonth = viewedMonth === cellMonth;
        return createPortal(
          <DayCell
            date={date}
            isCurrentMonth={isCurrentMonth}
            events={eventsByDate.get(isoDate) ?? []}
            todos={todosByDate.get(isoDate) ?? []}
            calendars={calendars}
            onEventClick={onEventClick}
            onEmptyClick={() => onEmptyClick(isoDate)}
          />,
          el,
        );
      })}
    </>
  );
}
```

> **Note:** FullCalendar의 `dayCellContent` 와 React portal 조합은 살짝 까다롭다. 위 구현은 portal slot 을 빈 div 로 두고 클라이언트에서 다시 채우는 패턴. 실제 동작에서 layout shift / blink 가 보이면, `dayCellDidMount` 콜백으로 root.render 호출하는 방식으로 변경 (개선 사항으로 메모).

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/components/MonthGrid.tsx
git commit -m "feat(calendar): MonthGrid — FullCalendar 월간 + DnD + 커스텀 DayCell portal"
```

### Task 29: DayView — 일간 timeGrid wrapper

**Files:**
- Create: `features/calendar/components/DayView.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/calendar/components/DayView.tsx
"use client";
import { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import type { default as FullCalendarInst } from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput, EventDropArg } from "@fullcalendar/core";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FC_COMMON } from "@/lib/fullcalendar/locale-ko";
import { moveEvent } from "../server/actions";
import { getTextColor } from "@/lib/colors";
import { EventDetailDialog } from "./EventDetailDialog";
import { useState } from "react";
import type { CalendarRow, EventRow } from "../server/queries";

type Props = {
  calendars: CalendarRow[];
  events: EventRow[];
  initialDate: string; // YYYY-MM-DD
};

export function DayView({ calendars, events, initialDate }: Props) {
  const router = useRouter();
  const fcRef = useRef<FullCalendarInst | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventRow | null>(null);

  const calColor = (id: string) =>
    calendars.find((c) => c.id === id)?.color ?? "#888";

  const fcEvents: EventInput[] = events.map((e) => {
    const bg = e.color ?? calColor(e.calendar_id);
    return {
      id: e.id,
      title: e.emoji ? `${e.emoji} ${e.title}` : e.title,
      start: e.start_at,
      end: e.end_at,
      allDay: e.is_all_day,
      backgroundColor: bg,
      borderColor: bg,
      textColor: getTextColor(bg),
      extendedProps: { rawEvent: e },
    };
  });

  const navigate = (delta: -1 | 1 | 0) => {
    const api = fcRef.current?.getApi();
    if (!api) return;
    if (delta === 0) api.today();
    else if (delta < 0) api.prev();
    else api.next();
    const d = api.getDate();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    router.push(`/day?date=${iso}`);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const ev = info.event.extendedProps.rawEvent as EventRow;
    const newStart = info.event.start?.toISOString();
    const newEnd = (info.event.end ?? info.event.start)?.toISOString();
    if (!newStart || !newEnd) {
      info.revert();
      return;
    }
    const r = await moveEvent(ev.id, newStart, newEnd);
    if (!r.ok) {
      toast.error(r.error);
      info.revert();
    }
  };

  return (
    <div className="h-full">
      <FullCalendar
        ref={fcRef}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridDay"
        initialDate={initialDate}
        editable
        events={fcEvents}
        eventClick={(info: EventClickArg) => {
          setDetailEvent(info.event.extendedProps.rawEvent as EventRow);
        }}
        eventDrop={handleEventDrop}
        slotMinTime="06:00:00"
        slotMaxTime="24:00:00"
        scrollTime="08:00:00"
        nowIndicator
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        {...FC_COMMON}
      />
      {detailEvent && (
        <EventDetailDialog
          event={detailEvent}
          calendars={calendars}
          onClose={() => setDetailEvent(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/components/DayView.tsx
git commit -m "feat(calendar): DayView — timeGrid + DnD"
```

### Task 30: CalendarShell — 헤더 + 그리드 컨테이너

**Files:**
- Create: `features/calendar/components/CalendarShell.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/calendar/components/CalendarShell.tsx
"use client";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import { CalendarPickerDropdown } from "./CalendarPickerDropdown";
import type { CalendarRow } from "../server/queries";

type Props = {
  calendars: CalendarRow[];
  monthLabel: string; // "2026년 5월"
  children: React.ReactNode;
};

export function CalendarShell({ calendars, monthLabel, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{monthLabel}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex rounded-md border bg-background overflow-hidden">
            <Button
              variant={pathname === "/calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => router.push("/calendar")}
              className="rounded-none"
            >
              월간
            </Button>
            <Button
              variant={pathname === "/day" ? "default" : "ghost"}
              size="sm"
              onClick={() => router.push("/day")}
              className="rounded-none"
            >
              일간
            </Button>
          </div>
          <CalendarPickerDropdown calendars={calendars} />
        </div>
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/calendar/components/CalendarShell.tsx
git commit -m "feat(calendar): CalendarShell — 헤더(월 라벨 + 뷰 토글 + 캘린더 픽커)"
```

---

## Phase 6: 캘린더 페이지 라우팅

### Task 31: `/calendar` 페이지 — placeholder 교체

**Files:**
- Modify: `app/(app)/calendar/page.tsx`

- [ ] **Step 1: 작성 (placeholder 전체 교체)**

```tsx
// app/(app)/calendar/page.tsx
import { CalendarShell } from "@/features/calendar/components/CalendarShell";
import { MonthGrid } from "@/features/calendar/components/MonthGrid";
import {
  getCalendars,
  getEventsForMonth,
} from "@/features/calendar/server/queries";
import { getTodosForMonth } from "@/features/todos/server/queries";

export const metadata = { title: "캘린더" };

type Props = { searchParams: { month?: string } };

function defaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }: Props) {
  const month = searchParams.month ?? defaultMonth();
  const [calendars, events, todos] = await Promise.all([
    getCalendars(),
    getEventsForMonth(month),
    getTodosForMonth(month),
  ]);

  const [year, monthStr] = month.split("-");
  const monthLabel = `${year}년 ${parseInt(monthStr, 10)}월`;

  return (
    <CalendarShell calendars={calendars} monthLabel={monthLabel}>
      <MonthGrid
        calendars={calendars}
        events={events}
        todos={todos}
        initialMonth={month}
      />
    </CalendarShell>
  );
}
```

- [ ] **Step 2: dev 서버 동작 확인 (수동)**

```bash
pnpm dev
```
브라우저로 http://localhost:3000/calendar 진입. 인증된 상태에서:
- 그리드가 보이는지
- 헤더에 "2026년 5월" 표시
- 콘솔에 에러 없음

스크린샷 1장 확보 (`screenshots/calendar-monthly.png` — 폴더 만들고 저장. 영구 보관 안 해도 됨).

종료(Ctrl+C).

- [ ] **Step 3: 커밋**

```bash
git add app/(app)/calendar/page.tsx
git commit -m "feat(calendar): /calendar 라우트 — 월간 뷰 RSC 데이터 페치 + MonthGrid 렌더"
```

### Task 32: `/day` 페이지 신규 생성

**Files:**
- Create: `app/(app)/day/page.tsx`

- [ ] **Step 1: 작성**

```tsx
// app/(app)/day/page.tsx
import { CalendarShell } from "@/features/calendar/components/CalendarShell";
import { DayView } from "@/features/calendar/components/DayView";
import {
  getCalendars,
  getEventsForDay,
} from "@/features/calendar/server/queries";

export const metadata = { title: "하루" };

type Props = { searchParams: { date?: string } };

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DayPage({ searchParams }: Props) {
  const date = searchParams.date ?? todayIso();
  const [calendars, events] = await Promise.all([
    getCalendars(),
    getEventsForDay(date),
  ]);

  const d = new Date(date);
  const monthLabel = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

  return (
    <CalendarShell calendars={calendars} monthLabel={monthLabel}>
      <DayView calendars={calendars} events={events} initialDate={date} />
    </CalendarShell>
  );
}
```

- [ ] **Step 2: dev 서버 동작 확인**

http://localhost:3000/day 진입. 일간 그리드 보이는지 + 콘솔 무에러 확인.

- [ ] **Step 3: 커밋**

```bash
git add app/(app)/day/page.tsx
git commit -m "feat(calendar): /day 일간 뷰 라우트"
```

---

## Phase 7: 할 일 페이지

### Task 33: TodoItem 컴포넌트

**Files:**
- Create: `features/todos/components/TodoItem.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/todos/components/TodoItem.tsx
"use client";
import { useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toggleTodo, deleteTodo, moveTodo } from "../server/actions";
import type { TaskRow } from "../server/queries";

type Props = {
  todo: TaskRow;
  /** 오늘 날짜 (YYYY-MM-DD) — 밀림 일수 계산 + 이동 기준. */
  todayIso: string;
};

export function TodoItem({ todo, todayIso }: Props) {
  const [pending, startTransition] = useTransition();
  const done = !!todo.completed_at;
  const daysOverdue = daysBetween(todo.scheduled_date, todayIso);

  const handleToggle = (v: boolean) => {
    startTransition(async () => {
      const r = await toggleTodo(todo.id, v);
      if (!r.ok) toast.error(r.error);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const r = await deleteTodo(todo.id);
      if (!r.ok) toast.error(r.error);
    });
  };

  const handleMoveToToday = () => {
    startTransition(async () => {
      const r = await moveTodo(todo.id, todayIso);
      if (!r.ok) toast.error(r.error);
      else toast.success("오늘로 이동됨");
    });
  };

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded hover:bg-accent/30 group">
      <Checkbox checked={done} onCheckedChange={(v) => handleToggle(Boolean(v))} />
      <span
        className={`flex-1 text-sm ${
          done ? "line-through text-muted-foreground" : ""
        }`}
      >
        {todo.emoji ? `${todo.emoji} ` : ""}
        {todo.title}
      </span>
      {daysOverdue > 0 && !done && (
        <span className="text-[10px] text-red-600 bg-red-50 dark:bg-red-950/40 px-1.5 py-px rounded-full">
          {daysOverdue}일 밀림
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {daysOverdue > 0 && (
            <DropdownMenuItem onSelect={handleMoveToToday} disabled={pending}>
              오늘로 이동
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={handleDelete} disabled={pending} className="text-red-600">
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso);
  const b = new Date(toIso);
  const diff = (b.getTime() - a.getTime()) / 86400000;
  return Math.round(diff);
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/todos/components/TodoItem.tsx
git commit -m "feat(todos): TodoItem — 체크 + 밀림 배지 + 더보기(이동/삭제)"
```

### Task 34: QuickAddInput

**Files:**
- Create: `features/todos/components/QuickAddInput.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/todos/components/QuickAddInput.tsx
"use client";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createTodo } from "../server/actions";

type Props = { date: string };

export function QuickAddInput({ date }: Props) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const r = await createTodo({
        title: title.trim(),
        scheduled_date: date,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setTitle("");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2">
      <Plus className="h-4 w-4 text-muted-foreground" />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="할 일 추가"
        disabled={pending}
        className="border-0 focus-visible:ring-0 px-0"
      />
    </form>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/todos/components/QuickAddInput.tsx
git commit -m "feat(todos): QuickAddInput — 인라인 추가 (Enter 제출)"
```

### Task 35: TodoSection

**Files:**
- Create: `features/todos/components/TodoSection.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/todos/components/TodoSection.tsx
import { TodoItem } from "./TodoItem";
import type { TaskRow } from "../server/queries";

type Props = {
  label: string;
  todos: TaskRow[];
  todayIso: string;
  variant?: "overdue" | "today";
};

export function TodoSection({ label, todos, todayIso, variant = "today" }: Props) {
  return (
    <section className="space-y-1">
      <div
        className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
          variant === "overdue" ? "text-red-600" : "text-muted-foreground"
        }`}
      >
        {label} · {todos.length}개
      </div>
      <div
        className={`rounded-lg ${
          variant === "overdue" ? "bg-red-50/40 dark:bg-red-950/20" : ""
        }`}
      >
        {todos.map((t) => (
          <TodoItem key={t.id} todo={t} todayIso={todayIso} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/todos/components/TodoSection.tsx
git commit -m "feat(todos): TodoSection — 라벨 + 리스트 + overdue 색상 분기"
```

### Task 36: TodosPage

**Files:**
- Create: `features/todos/components/TodosPage.tsx`

- [ ] **Step 1: 작성**

```tsx
// features/todos/components/TodosPage.tsx
import { TodoSection } from "./TodoSection";
import { QuickAddInput } from "./QuickAddInput";
import type { TaskRow } from "../server/queries";

type Props = {
  todayIso: string;
  todayTodos: TaskRow[];
  overdueTodos: TaskRow[];
};

export function TodosPage({ todayIso, todayTodos, overdueTodos }: Props) {
  const isEmpty = todayTodos.length === 0 && overdueTodos.length === 0;
  const todayLabel = new Date(todayIso).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">오늘의 할 일</h1>
        <p className="text-sm text-muted-foreground">{todayLabel}</p>
      </header>

      {isEmpty ? (
        <p className="text-sm text-muted-foreground py-6">
          오늘 할 일이 없어요. 천천히 하세요.
        </p>
      ) : (
        <>
          {overdueTodos.length > 0 && (
            <TodoSection
              label="밀린 항목"
              todos={overdueTodos}
              todayIso={todayIso}
              variant="overdue"
            />
          )}
          {todayTodos.length > 0 && (
            <TodoSection label="오늘" todos={todayTodos} todayIso={todayIso} />
          )}
        </>
      )}

      <QuickAddInput date={todayIso} />
    </div>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/todos/components/TodosPage.tsx
git commit -m "feat(todos): TodosPage — 포커스 모드 (밀린 → 오늘 → 추가)"
```

### Task 37: `/todos` 라우트

**Files:**
- Create: `app/(app)/todos/page.tsx`

- [ ] **Step 1: 작성**

```tsx
// app/(app)/todos/page.tsx
import { TodosPage } from "@/features/todos/components/TodosPage";
import {
  getOverdueTodos,
  getTodosForDate,
} from "@/features/todos/server/queries";

export const metadata = { title: "오늘의 할 일" };

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function TodosRoute() {
  const today = todayIso();
  const [todayTodos, overdueTodos] = await Promise.all([
    getTodosForDate(today),
    getOverdueTodos(today),
  ]);
  return (
    <TodosPage
      todayIso={today}
      todayTodos={todayTodos}
      overdueTodos={overdueTodos}
    />
  );
}
```

- [ ] **Step 2: dev 서버 확인**

http://localhost:3000/todos 진입. 빈 상태 + 추가 입력 동작.

- [ ] **Step 3: 커밋**

```bash
git add app/(app)/todos/page.tsx
git commit -m "feat(todos): /todos 라우트"
```

---

## Phase 8: 글로벌 nav 업데이트 + 최종 wiring

### Task 38: `lib/nav.ts` 에 "하루", "오늘의 할 일" 메뉴 추가

**Files:**
- Modify: `lib/nav.ts`

- [ ] **Step 1: 전체 교체**

```ts
// lib/nav.ts
import {
  Calendar,
  CalendarDays,
  CheckSquare,
  Wallet,
  Users,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/calendar", label: "캘린더", icon: Calendar },
  { href: "/day", label: "하루", icon: CalendarDays },
  { href: "/todos", label: "오늘의 할 일", icon: CheckSquare },
  { href: "/expense", label: "가계부", icon: Wallet },
  { href: "/social", label: "공유", icon: Users },
  { href: "/settings", label: "설정", icon: Settings },
];
```

- [ ] **Step 2: dev 서버 확인 — 좌측 nav 에 새 메뉴 2개 보이는지**

http://localhost:3000 진입 → 좌측 nav 에 "하루", "오늘의 할 일" 추가됨.

- [ ] **Step 3: 커밋**

```bash
git add lib/nav.ts
git commit -m "feat(nav): 하루(일간), 오늘의 할 일 메뉴 추가"
```

### Task 39: 루트 page.tsx 가 `/calendar` 로 리다이렉트하는지 확인

**Files:**
- Read: `app/page.tsx`
- Possibly modify

- [ ] **Step 1: 현 상태 확인**

```bash
cat app/page.tsx
```

- [ ] **Step 2: 만약 placeholder 이면 redirect 로 교체**

만약 파일이 직접 placeholder UI를 그리고 있다면, 다음으로 교체:
```tsx
// app/page.tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/calendar");
}
```

- [ ] **Step 3: dev 서버 확인**

http://localhost:3000 → 자동으로 `/calendar` 로 리다이렉트.

- [ ] **Step 4: 변경 있으면 커밋**

```bash
git add app/page.tsx
git commit -m "feat: 루트 / → /calendar 리다이렉트"
```

(변경 없으면 이 task는 빈 commit 만들지 말고 skip.)

---

## Phase 9: 최종 검증

### Task 40: 수동 스모크 테스트

**Files:** N/A (수동 작업)

- [ ] **Step 1: dev 서버 띄우기**

```bash
pnpm dev
```

- [ ] **Step 2: 체크리스트 통과 확인 — 각 항목 직접 시도**

브라우저에서 로그인 → `/calendar` 진입 후 아래 항목 하나씩:

- [ ] 월간 그리드 표시. 오늘 날짜 셀에 강조 표시
- [ ] 빈 셀 클릭 → EventModal 열림 → 제목 + 시간 입력 → 저장 → 그리드에 즉시 표시
- [ ] 일정 클릭 → EventDetailDialog 열림 → 수정 → 변경 반영
- [ ] EventDetailDialog 에서 "삭제" → AlertDialog 확인 → 그리드에서 제거
- [ ] 일정을 다른 날짜로 드래그 → 위치 이동 + DB 반영 (새로고침 후 유지)
- [ ] 상단 < / > 버튼으로 월 이동
- [ ] 키보드 ← / → 로 월 이동
- [ ] 키보드 T 로 "오늘" 점프
- [ ] 모바일(개발자 도구 모바일 모드)에서 좌→우 스와이프로 이전 달
- [ ] "📋 캘린더 ▾" 드롭다운 열림 → 캘린더 목록 표시
- [ ] 캘린더 옆 눈 아이콘 클릭 → 해당 색 일정 화면에서 숨겨짐
- [ ] "새 캘린더" 클릭 → 이름 + 12색 픽커 → 추가됨
- [ ] 캘린더 행에 호버 시 톱니바퀴 → CalendarSettingsDialog → 이름/색 수정
- [ ] 기본 캘린더("내 캘린더") 의 톱니바퀴 → "삭제" 버튼 비활성화 확인
- [ ] 일정 모달의 이모지 픽커 → 이모지 선택 → 일정 막대 앞에 표시
- [ ] 음력 일정 토글 ON → 저장 → 다음 해 같은 음력 날짜에 자동 표시 (수동 확인)
- [ ] 2026-02-17 (음 1/1) 셀에 "음 1/1" 표시
- [ ] 2026-02-18 셀에 음력 표시 없음
- [ ] 2026-05-05 셀: 날짜 빨강, "어린이날" 빨강 배지
- [ ] 2026-05-21 (소만) 셀: "소만" 회색 배지
- [ ] `/day` 진입 → 일간 timeGrid 표시
- [ ] `/todos` 진입 → 빈 상태 메시지 + 추가 인풋
- [ ] 할 일 추가 → 즉시 표시
- [ ] 할 일 체크 → 회색 + 취소선
- [ ] 어제 할 일 만들고 미완료 → 오늘 `/todos` "밀린 항목" 섹션에 "1일 밀림" 배지
- [ ] DayCell 하단 점선 아래 할 일 표시 + 체크 동작
- [ ] 모바일 화면(375px)에서 그리드 + 네비 정상
- [ ] 다크 모드 토글 → 가독성 유지

- [ ] **Step 3: 발견된 버그가 있으면 해당 Task로 돌아가 수정**

(발견된 버그가 없으면 다음 단계로.)

- [ ] **Step 4: 최종 푸시**

```bash
git status   # working tree clean 확인
git push origin main
```

- [ ] **Step 5: 완료 커밋 (마커)**

```bash
git commit --allow-empty -m "chore: 3단계 Plan A 완료 — 단일 사용자 캘린더 + 할 일 + DnD"
git push origin main
```

---

## 완료 후 다음 단계

Plan A 완료 후 Plan B (공유 캘린더 + Supabase Realtime) 작성·실행으로 넘어간다. 디자인 문서의 "공유" 와 "실시간 동기화" 섹션이 Plan B 의 입력이 된다.
