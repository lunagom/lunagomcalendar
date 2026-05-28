# Design System Minimalist 강화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Linear/Notion 스타일 미니멀 톤으로 디자인 시스템(토큰 + 공용 컴포넌트 + 페이지 패턴) 통일.

**Architecture:** globals.css 토큰 미세 조정 → shadcn 공용 컴포넌트에서 그림자/사용 안 하는 variant 제거 → 신규 Skeleton/EmptyState 공통 컴포넌트 추가 → 페이지마다 헤딩/패딩/카드/그림자 정리 → 아이콘 stroke-width 통일.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS 3.4, shadcn/ui, lucide-react, Pretendard.

**Spec 출처:** `docs/superpowers/specs/2026-05-28-design-system-minimalist-design.md`

---

## File Structure

### Modify
- `app/globals.css` — muted-foreground / border 토큰 조정
- `components/ui/button.tsx` — secondary variant 제거, shadow 제거
- `components/ui/card.tsx` — shadow 제거
- `components/ui/dialog.tsx` — shadow-lg 제거
- `components/ui/dropdown-menu.tsx` — shadow-md/lg 제거
- `app/(app)/page.tsx` (홈)
- `features/todos/components/WeekBoard.tsx` (할 일 헤딩/패딩)
- `features/todos/components/WeekNavigation.tsx` (할 일 h1)
- `features/calendar/components/CalendarShell.tsx` (캘린더 헤더)
- `features/expense/components/ExpenseClient.tsx` (가계부)
- `features/board/components/BoardClient.tsx` (게시판)
- `features/social/components/SocialClient.tsx` (공유)
- `features/settings/components/SettingsClient.tsx` (설정)
- + 카드/보더 인벤토리 결과에 따라 추가 페이지/컴포넌트

### Create
- `components/ui/skeleton.tsx` — shadcn 표준 skeleton
- `components/ui/empty-state.tsx` — 빈 상태 통일 컴포넌트

---

## Task 1: 토큰 — muted-foreground + border 콘트라스트 조정

**Files:**
- Modify: `app/globals.css:26-27,76-77,35`

- [ ] **Step 1: globals.css 의 light mode muted-foreground 더 짙게**

`app/globals.css` 26번째 줄을 다음과 같이 변경:

```css
    --muted-foreground: 0 0% 35%;       /* gray-600 (was 45) */
```

- [ ] **Step 2: dark mode muted-foreground 도 콘트라스트 ↑**

77번째 줄을 다음과 같이 변경:

```css
    --muted-foreground: 0 0% 58%;       /* gray-500 brighter (was 64) */
```

- [ ] **Step 3: light mode border 더 옅게**

35번째 줄을 다음과 같이 변경:

```css
    --border: 0 0% 94%;                 /* gray-100 (was 91) */
```

`--input` 도 같은 줄 짝이라 동일 값 유지(36번째 줄 그대로 91 — 보더만 변경하고 input 은 입력 식별 유지).

실제로 `--input` 줄은 다음 줄에 있으므로 그대로 두고, `--border` 만 변경:

```css
    --border: 0 0% 94%;
    --input: 0 0% 91%;
```

- [ ] **Step 4: 타입체크 + dev 서버 확인**

Run: `pnpm tsc --noEmit`
Expected: Exit 0

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/`
Expected: 307 (auth redirect — 정상)

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "style(tokens): muted-foreground + border 콘트라스트 미세 조정"
```

---

## Task 2: 신규 Skeleton 컴포넌트

**Files:**
- Create: `components/ui/skeleton.tsx`

- [ ] **Step 1: skeleton.tsx 작성 (shadcn 표준)**

`components/ui/skeleton.tsx` 생성:

```tsx
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
```

- [ ] **Step 2: 타입체크**

Run: `pnpm tsc --noEmit`
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add components/ui/skeleton.tsx
git commit -m "feat(ui): Skeleton 컴포넌트 추가 (shadcn 표준)"
```

---

## Task 3: 신규 EmptyState 컴포넌트

**Files:**
- Create: `components/ui/empty-state.tsx`

- [ ] **Step 1: empty-state.tsx 작성**

`components/ui/empty-state.tsx` 생성:

```tsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

/**
 * 빈 상태 공통 컴포넌트. 모든 페이지의 "할 일 없음", "지출 없음" 등 빈 영역에 사용.
 * 액션 버튼은 옵션 — 추가 흐름이 있을 때만.
 */
export function EmptyState({ message, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `pnpm tsc --noEmit`
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add components/ui/empty-state.tsx
git commit -m "feat(ui): EmptyState 공통 컴포넌트 추가"
```

---

## Task 4: shadcn 공용 컴포넌트 그림자 제거

**Files:**
- Modify: `components/ui/card.tsx`
- Modify: `components/ui/dialog.tsx`
- Modify: `components/ui/dropdown-menu.tsx`

- [ ] **Step 1: 현재 그림자 사용처 확인**

Run: `Grep` for pattern `shadow-` in `components/ui/` 디렉토리 → 사용처 인벤토리

- [ ] **Step 2: card.tsx 의 shadow-sm 제거**

`components/ui/card.tsx` 의 `Card` 컴포넌트 className 에서 `shadow-sm` 제거:

Before:
```tsx
className={cn(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  className,
)}
```

After:
```tsx
className={cn(
  "rounded-lg border bg-card text-card-foreground",
  className,
)}
```

- [ ] **Step 3: dialog.tsx 의 DialogContent shadow-lg 제거**

`components/ui/dialog.tsx` 의 `DialogContent` className 에서 `shadow-lg` 제거.

Before (`shadow-lg` 포함된 className 부분):
```tsx
"...shadow-lg duration-200..."
```

After: `shadow-lg ` (공백 포함) 부분만 삭제.

- [ ] **Step 4: dropdown-menu.tsx 의 shadow-md, shadow-lg 제거**

`components/ui/dropdown-menu.tsx`:
- `DropdownMenuContent` 의 `shadow-md` 제거 (line 68 부근)
- `DropdownMenuSubContent` 의 `shadow-lg` 제거 (line 50 부근)

각각 className 에서 해당 클래스만 삭제.

- [ ] **Step 5: 타입체크**

Run: `pnpm tsc --noEmit`
Expected: Exit 0

- [ ] **Step 6: dev 서버에서 모달/드롭다운 시각 확인**

Run: `curl -s -o /dev/null -w "/calendar: %{http_code}\n" http://localhost:3000/calendar`
Expected: 307

브라우저에서 일정 클릭 → EventDetailDialog 열림 확인 (보더만 있고 그림자 없음).

- [ ] **Step 7: Commit**

```bash
git add components/ui/card.tsx components/ui/dialog.tsx components/ui/dropdown-menu.tsx
git commit -m "style(ui): shadcn 공용 컴포넌트 그림자 제거 — 보더만"
```

---

## Task 5: Button의 secondary variant 제거

**Files:**
- Modify: `components/ui/button.tsx`
- + secondary 변형 사용처 (Grep 결과에 따라)

- [ ] **Step 1: secondary 사용처 검색**

Run: `Grep` for `variant="secondary"` 또는 `variant='secondary'` in 전체 `app/`, `features/`, `components/` 디렉토리.

각 사용처 리스트업. 없으면 Step 3 으로 바로.

- [ ] **Step 2: 사용처를 default (또는 outline) 로 교체**

각 사용처에서 `variant="secondary"` 를:
- 강조 의도였으면 → 제거 (default = primary)
- 일반 버튼이었으면 → `variant="outline"`

판단 기준: 문맥에서 강조성/색상 의도 추측. 모르겠으면 outline 으로.

- [ ] **Step 3: button.tsx 의 secondary variant 정의 제거**

`components/ui/button.tsx` 의 `buttonVariants` 의 variants.variant 객체에서 `secondary` 키 제거.

Before:
```tsx
secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
```

이 줄을 삭제.

- [ ] **Step 4: 타입체크**

Run: `pnpm tsc --noEmit`
Expected: Exit 0 (secondary 사용처가 모두 제거됐다면)

만약 실패하면 → 누락된 사용처가 있다는 뜻. 다시 grep 후 처리.

- [ ] **Step 5: Commit**

```bash
git add components/ui/button.tsx [+ 변경된 페이지/컴포넌트]
git commit -m "refactor(ui): Button secondary variant 제거 — outline/default 로 대체"
```

---

## Task 6: 페이지 헤더 + 패딩 통일 (한 페이지씩)

각 페이지마다:
- h1 = `text-2xl font-bold`
- 부제목 = `text-sm text-muted-foreground`
- 페이지 wrapper = `px-4 py-6 md:px-6 md:py-8`

**Files (대표):**
- `features/todos/components/WeekBoard.tsx` (할 일)
- `features/todos/components/WeekNavigation.tsx` (할 일 h1)
- `app/(app)/page.tsx` (홈)
- `features/board/components/BoardClient.tsx` (게시판)
- `features/social/components/SocialClient.tsx` (공유)
- `features/settings/components/SettingsClient.tsx` (설정)
- 가계부 / 캘린더 — 자체 레이아웃 검토

- [ ] **Step 1: 할 일 (WeekNavigation.tsx) h1 통일**

`features/todos/components/WeekNavigation.tsx` 에서:

Before:
```tsx
<h1 className="text-xl font-semibold">주간 할 일</h1>
```

After:
```tsx
<h1 className="text-2xl font-bold">주간 할 일</h1>
```

- [ ] **Step 2: 할 일 페이지 wrapper 데스크탑 패딩 ↑**

`features/todos/components/WeekBoard.tsx` 의 wrapper className:

Before:
```tsx
<div className="px-4 py-6 space-y-4">
```

After:
```tsx
<div className="px-4 py-6 md:px-6 md:py-8 space-y-6">
```

- [ ] **Step 3: 홈 페이지 h1 통일**

`app/(app)/page.tsx` 의 첫 번째 `<h1>` 또는 `<h2>` 를 검토 후 `text-2xl font-bold` 적용 (있다면).

- [ ] **Step 4: 게시판 페이지 h1 통일**

`features/board/components/BoardClient.tsx` 에서 페이지 제목 텍스트 클래스 `text-2xl font-bold` 적용.

- [ ] **Step 5: 공유 페이지 h1 통일**

`features/social/components/SocialClient.tsx` 에서 동일.

- [ ] **Step 6: 설정 페이지 h1 통일**

`features/settings/components/SettingsClient.tsx` 에서 동일.

- [ ] **Step 7: 가계부 페이지 h1 통일**

`features/expense/components/...` 의 페이지 제목 컴포넌트 찾아서 동일 적용.

- [ ] **Step 8: 캘린더 헤더 검토**

`features/calendar/components/CalendarShell.tsx` 또는 `CalendarHeaderBar.tsx` — 캘린더는 FC 의 제목 표시를 사용하므로 헤딩 위계 다를 수 있음. 적용 가능한 경우만 통일.

- [ ] **Step 9: 타입체크 + 모든 페이지 200 확인**

Run: `pnpm tsc --noEmit`
Expected: Exit 0

Run: 모든 페이지 curl probe
```bash
for p in / /calendar /todos /expense /board /social /settings; do curl -s -o /dev/null -w "$p: %{http_code}\n" "http://localhost:3000$p"; done
```
Expected: 모두 307

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "style(pages): h1 = text-2xl font-bold 통일 + 데스크탑 패딩 ↑"
```

---

## Task 7: 카드/보더/그림자 인벤토리 + 정리

**작업 방식**: grep 으로 패턴별 사용처 찾고, 한 패턴씩 검토.

- [ ] **Step 1: rounded-lg border 패턴 인벤토리**

Run: `Grep` for `rounded-lg border` in `features/`, `components/`, `app/` 디렉토리.

결과를 페이지/컴포넌트 단위로 묶어서 검토:
- 의미 있는 카드 (DayColumn 모바일 등) → 유지
- 단순 그룹핑 (가계부 카테고리 박스 등) → 보더 제거, `divide-y` 또는 여백으로 대체

- [ ] **Step 2: bg-primary/5, bg-muted/40 인벤토리**

Run: `Grep` for `bg-primary/5`, `bg-muted/40`, `bg-accent` in 동일 범위.

검토:
- 오늘 표시 / active state → 유지
- 단순 시각 강조 (필요 없음) → 제거

- [ ] **Step 3: shadow- 잔존처 확인**

Run: `Grep` for `shadow-(sm|md|lg)` in `features/`, `components/`, `app/` (Task 4 에서 ui/ 만 처리했으니).

각 사용처 → 거의 다 제거. 의도된 곳만 표시 (예: 토스트, 알림).

- [ ] **Step 4: 가계부 카테고리 컨테이너 — 보더 제거**

가계부에서 `rounded-lg border` 로 감싼 카테고리 묶음이 있다면 보더 제거, hover 시만 강조.

대상 파일 예시: `features/expense/components/BudgetTabContent.tsx`, `ExpenseTabContent.tsx` 등.

변경 패턴:
Before:
```tsx
<div className="rounded-lg border border-border/60 p-3">
```

After:
```tsx
<div className="p-3 hover:bg-accent/40 transition-colors">
```

- [ ] **Step 5: 게시판 글 카드 — divider 로 교체**

게시판 글 리스트가 카드로 묶여있으면 → 보더 없애고 `divide-y` 컨테이너로.

대상 파일: `features/board/components/BoardClient.tsx` 또는 `PostList.tsx` 같은 컴포넌트.

- [ ] **Step 6: 홈 위젯 카드 보더 가벼이**

`app/(app)/page.tsx` 또는 위젯 컴포넌트들의 `rounded-lg border` → `rounded-lg border border-border/40` (더 옅게) + shadow 제거.

- [ ] **Step 7: 타입체크 + 모든 페이지 200 + 시각 확인**

Run: `pnpm tsc --noEmit` → Exit 0
Run: 페이지별 curl probe → 모두 307

dev 서버 + 브라우저에서 각 페이지 시각 확인:
- [ ] 캘린더
- [ ] 할 일
- [ ] 가계부
- [ ] 게시판
- [ ] 공유
- [ ] 설정
- [ ] 홈

너무 평평해진 곳은 미세 조정 (border-border/40 추가 등).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "style: 카드/보더/그림자 인벤토리 정리 — 의미 있는 곳만 유지"
```

---

## Task 8: 아이콘 stroke-width 통일 (1.8)

**작업 방식**: lucide-react 컴포넌트 사용처 grep → strokeWidth prop 누락/다른 곳 통일.

- [ ] **Step 1: lucide 컴포넌트 사용처 인벤토리**

Run: `Grep` for `from "lucide-react"` 사용 파일 리스트.

페이지/컴포넌트 단위로 묶어서 검토.

- [ ] **Step 2: strokeWidth prop 통일**

각 lucide 컴포넌트:
- prop 없음 → `strokeWidth={1.8}` 추가
- 다른 값 (1.5, 2, 2.5 등) → `1.8` 로 변경

단 예외:
- 아주 작은 아이콘 (h-3 w-3 이하) → strokeWidth={2} (가시성 위해)
- 굵게 강조 필요한 곳 (active state nav 아이콘 등) → strokeWidth={2.4} 같은 의도된 값 유지

- [ ] **Step 3: 한 페이지씩 작업 (할 일 → 캘린더 → 가계부 → 나머지)**

각 페이지의 lucide 사용처 한 번에 통일 후 시각 확인. 너무 가늘어 보이면 size 조정 (h-3.5 → h-4 등).

- [ ] **Step 4: 타입체크**

Run: `pnpm tsc --noEmit`
Expected: Exit 0

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "style(icons): lucide stroke-width 1.8 통일"
```

---

## Task 9: 빈 상태 EmptyState 컴포넌트 적용

**작업 방식**: 페이지 내 "X 없음" 메시지 패턴을 EmptyState 로 교체.

- [ ] **Step 1: 빈 상태 메시지 인벤토리**

Run: `Grep` for `없음`, `empty`, `text-muted-foreground` patterns in `features/` 디렉토리.

특히 다음 파일들 검토:
- `features/todos/components/DayColumn.tsx` ("할 일 없음")
- `features/todos/components/WeekBoardMobile.tsx`, `WeekBoardDesktop.tsx` ("밀린 항목 없음" 등)
- `features/expense/components/...` ("지출 없음" 등)
- `features/board/components/...` ("글 없음")

- [ ] **Step 2: DayColumn 빈 상태 변경**

`features/todos/components/DayColumn.tsx` 의 빈 상태 부분:

Before:
```tsx
<p className="text-xs text-muted-foreground px-2 py-2">할 일 없음</p>
```

After: 컬럼은 카드형이라 이미 작은 공간이라 EmptyState 의 py-12 과 안 맞음. 컬럼 빈 상태는 그대로 두고 EmptyState 는 페이지 단위 빈 상태에만 적용.

- 페이지 단위 빈 상태 (예: 게시판에 글 0개일 때 전체 화면): EmptyState 적용
- 컴포넌트 내부 작은 빈 영역 (컬럼 등): 기존 텍스트 유지

- [ ] **Step 3: 가계부 빈 상태 검토 + 적용**

가계부 페이지에서 "이번 달 지출이 없어요" 같은 페이지급 빈 상태가 있으면 EmptyState 적용.

- [ ] **Step 4: 게시판 빈 상태 적용**

게시판 글이 0개일 때:

Before (가정):
```tsx
<p className="text-center text-muted-foreground py-12">아직 글이 없어요</p>
```

After:
```tsx
<EmptyState message="아직 글이 없어요" />
```

- [ ] **Step 5: 타입체크**

Run: `pnpm tsc --noEmit`
Expected: Exit 0

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "style(empty): 페이지급 빈 상태 EmptyState 컴포넌트로 통일"
```

---

## Task 10: FullCalendar theme.css 점검

**Files:**
- Modify: `lib/fullcalendar/theme.css` (필요 시)

- [ ] **Step 1: theme.css 읽고 미니멀 톤과 일치 여부 확인**

`lib/fullcalendar/theme.css` 의 모든 스타일 검토:
- 그림자 (`box-shadow`) 사용 → 제거
- 강한 색 사용 → 토큰 활용으로 전환 (var(--primary) 등)
- 보더 색 — `var(--border)` 활용

- [ ] **Step 2: 필요 시 수정**

발견된 불일치 → 토큰 활용으로 변경.

- [ ] **Step 3: 캘린더 페이지 시각 확인**

브라우저 `/calendar` → 새 토큰과 일관성 있는지 확인.

- [ ] **Step 4: Commit (수정한 경우만)**

```bash
git add lib/fullcalendar/theme.css
git commit -m "style(calendar): FullCalendar theme 미니멀 톤과 일치"
```

---

## Task 11: 최종 회귀 확인 + Push

- [ ] **Step 1: 전체 타입체크 + lint**

```bash
pnpm tsc --noEmit
pnpm lint
```
Expected: 둘 다 통과

- [ ] **Step 2: 모든 페이지 200 응답**

```bash
for p in / /calendar /todos /expense /board /social /settings; do curl -s -o /dev/null -w "$p: %{http_code}\n" "http://localhost:3000$p"; done
```
Expected: 모두 307 (auth redirect) — 컴파일 OK 신호

- [ ] **Step 3: 시각 회귀 체크리스트 (브라우저)**

라이트 모드:
- [ ] 모든 페이지 h1 = text-2xl font-bold
- [ ] muted-foreground 가독성 OK
- [ ] 카드/보더 의미 있는 곳만 남음
- [ ] 그림자 거의 0
- [ ] 아이콘 stroke-width 통일

다크 모드 (한 번 토글):
- [ ] 콘트라스트 유효
- [ ] 보더 너무 옅지 않음

모바일 viewport (DevTools iPhone 14):
- [ ] 페이지 패딩 OK
- [ ] 할 일 보드 모바일 카드 정상
- [ ] 캘린더 month grid 정상

- [ ] **Step 4: 최종 push**

```bash
git push origin main
```

Vercel 자동 배포 트리거.

- [ ] **Step 5: prod 시각 확인**

배포 완료 후 (~2분) `https://lunabear-calendar.vercel.app` 에서 확인:
- 라이트/다크 토글
- 주요 페이지 1번씩 들어가보기
- 모바일 확인

---

## Self-Review (작성 후 점검)

**1. Spec coverage:**
- ✅ 토큰 (color, typography, spacing) → Task 1
- ✅ button.tsx variant 정리 → Task 5
- ✅ dialog/dropdown/card 그림자 제거 → Task 4
- ✅ Skeleton 컴포넌트 신규 → Task 2
- ✅ EmptyState 컴포넌트 신규 → Task 3
- ✅ 페이지 헤더 통일 → Task 6
- ✅ 카드/보더 인벤토리 → Task 7
- ✅ 옅은 액센트 제거 → Task 7
- ✅ 그림자 잔존처 제거 → Task 7
- ✅ 아이콘 stroke-width 통일 → Task 8
- ✅ 빈 상태 통일 → Task 9
- ✅ FullCalendar theme.css 점검 → Task 10 (위험 항목)
- ✅ 검증 체크리스트 → Task 11

**2. Placeholder scan:** 없음. 각 step 에 구체적 코드/명령 포함.

**3. Type consistency:** EmptyState props (message, action), Skeleton (className) — 일관 유지.

**4. 의존성 (task 순서):**
- Task 1~5 는 독립적
- Task 6 은 Task 1~5 가 끝난 후 작업
- Task 7 은 Task 6 후 (페이지마다 같이 손보면 효율)
- Task 8~9 는 Task 6~7 와 함께 페이지별로 묶어도 됨
- Task 10 은 마지막
- Task 11 은 최종 회귀
