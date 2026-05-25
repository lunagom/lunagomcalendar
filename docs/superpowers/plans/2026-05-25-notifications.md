# 알림 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 게시판/공유/일정/구독의 알림을 헤더 종 아이콘 + 드롭다운으로 한 곳에서 본다.

**Architecture:** `notifications` 테이블 + 4개 DB trigger (게시판 글/댓글/초대/좋아요) — security definer 함수가 RLS 우회로 자동 insert. 일정/구독은 진입 시 `seedDailyNotifications()` 가 dedupe key 로 하루 1번 묶음 알림. UI는 헤더 종 + DropdownMenu, Realtime 으로 새 알림 push.

**Tech Stack:** Next.js 14 App Router · Supabase Postgres+RLS+Realtime · shadcn DropdownMenu · zustand 영향 없음

---

## File Structure

**Create:**
- `supabase/migrations/20260525150000_notifications.sql`
- `features/notifications/server/queries.ts`
- `features/notifications/server/actions.ts`
- `features/notifications/components/NotificationsBell.tsx`
- `features/notifications/components/NotificationItem.tsx`
- `features/notifications/components/RealtimeNotificationsListener.tsx`

**Modify:**
- `app/(app)/layout.tsx` — `getUnreadNotificationCount`, `getRecentNotifications`, `seedDailyNotifications` 호출 + AppShell prop
- `components/layout/app-shell.tsx` — notifications prop → Header
- `components/layout/header.tsx` — NotificationsBell 마운트
- `types/database.ts` — notifications 테이블 수동 추가

---

### Task 1: DB 마이그레이션 (사용자 SQL editor 적용)

**Files:**
- Create: `supabase/migrations/20260525150000_notifications.sql`

- [ ] **Step 1: 파일 작성** — spec 의 SQL 그대로 (notifications 테이블 + 인덱스 + RLS + 4 trigger 함수 + 4 트리거)

- [ ] **Step 2: 사용자 SQL editor 적용**

대시보드: https://supabase.com/dashboard/project/rkqtcuaifhwyyzbavhio/sql

- [ ] **Step 3: types/database.ts 에 notifications Row/Insert/Update 수동 추가**

```ts
notifications: {
  Row: {
    id: string
    user_id: string
    type: string
    title: string
    body: string | null
    link: string | null
    dedupe_key: string | null
    created_at: string
    read_at: string | null
  }
  Insert: {
    id?: string
    user_id: string
    type: string
    title: string
    body?: string | null
    link?: string | null
    dedupe_key?: string | null
    created_at?: string
    read_at?: string | null
  }
  Update: {
    id?: string
    user_id?: string
    type?: string
    title?: string
    body?: string | null
    link?: string | null
    dedupe_key?: string | null
    created_at?: string
    read_at?: string | null
  }
  Relationships: []
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260525150000_notifications.sql types/database.ts
git commit -m "migration: notifications + 4 trigger 함수"
```

---

### Task 2: queries.ts

**Files:**
- Create: `features/notifications/server/queries.ts`

핵심 함수 시그니처 + 구현:

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getRecentNotifications(limit = 10): Promise<NotificationRow[]> {
  try {
    const supabase = createClient();
    const me = await currentUserId();
    if (!me) return [];
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", me)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const supabase = createClient();
    const me = await currentUserId();
    if (!me) return 0;
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", me)
      .is("read_at", null);
    if (error) throw error;
    return count ?? 0;
  } catch {
    return 0;
  }
}
```

---

### Task 3: actions.ts

**Files:**
- Create: `features/notifications/server/actions.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getUserId(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

export async function markAsRead(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function markAllAsRead(): Promise<ActionResult> {
  const userId = await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

/**
 * 진입 시 호출. 하루 1번 묶음 알림 생성 (dedupe key 로 중복 자동 차단).
 * - event_summary:<today_iso> — 오늘/내일 일정 카운트
 * - subscription_due:<today_iso> — 오늘/내일 구독 결제 카운트
 * 실패 시 silent — layout 안 죽게.
 */
export async function seedDailyNotifications(): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(tomorrow.getDate() + 1);

    // 오늘+내일 일정 (RLS 가 멤버 캘린더만 필터)
    const eventsStart = new Date(today);
    eventsStart.setHours(0, 0, 0, 0);
    const { count: eventCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("start_at", eventsStart.toISOString())
      .lt("start_at", dayAfter.toISOString());

    if ((eventCount ?? 0) > 0) {
      await supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          type: "event_summary",
          title: `오늘·내일 일정 ${eventCount}개`,
          body: "캘린더에서 자세히 보기",
          link: "/calendar",
          dedupe_key: `event_summary:${todayIso}`,
        });
      // unique index 가 중복 차단 — duplicate 면 error 나오지만 silent OK
    }

    // 오늘/내일 결제 (billing_day 매치, is_active)
    const todayDay = today.getDate();
    const tomorrowDay = tomorrow.getDate();
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("id, name, amount, billing_day")
      .eq("is_active", true)
      .in("billing_day", [todayDay, tomorrowDay]);

    if (subs && subs.length > 0) {
      const total = subs.reduce((s, x) => s + x.amount, 0);
      await supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          type: "subscription_due",
          title: `오늘·내일 구독 결제 ${subs.length}건`,
          body: `${total.toLocaleString("ko-KR")}원 — ${subs[0].name}${subs.length > 1 ? " 외" : ""}`,
          link: "/expense",
          dedupe_key: `subscription_due:${todayIso}`,
        });
    }
  } catch {
    // silent
  }
}
```

- [ ] **tsc + commit (Task 2 와 묶음)**

```bash
pnpm tsc --noEmit
git add features/notifications/server/
git commit -m "feat(notifications): server queries + actions + seedDaily"
```

---

### Task 4: NotificationItem 컴포넌트

**Files:**
- Create: `features/notifications/components/NotificationItem.tsx`

```tsx
"use client";

import {
  Bell,
  Calendar,
  CreditCard,
  Heart,
  MessageSquare,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { NotificationRow } from "../server/queries";

const ICON_MAP: Record<string, LucideIcon> = {
  event_summary: Calendar,
  subscription_due: CreditCard,
  board_new_post: MessageSquare,
  board_new_comment: MessageSquare,
  calendar_invite: Users,
  board_like: Heart,
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

type Props = {
  item: NotificationRow;
  onClick: () => void;
};

export function NotificationItem({ item, onClick }: Props) {
  const Icon = ICON_MAP[item.type] ?? Bell;
  const unread = !item.read_at;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-muted/60 ${unread ? "bg-primary/5" : ""}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-medium">{item.title}</p>
          {unread && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          )}
        </div>
        {item.body && (
          <p className="truncate text-xs text-muted-foreground">{item.body}</p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {relativeTime(item.created_at)}
        </p>
      </div>
    </button>
  );
}
```

---

### Task 5: NotificationsBell 컴포넌트

**Files:**
- Create: `features/notifications/components/NotificationsBell.tsx`

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationItem } from "./NotificationItem";
import { markAllAsRead, markAsRead } from "../server/actions";
import type { NotificationRow } from "../server/queries";

type Props = {
  items: NotificationRow[];
  unreadCount: number;
};

export function NotificationsBell({ items, unreadCount }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleClick = (item: NotificationRow) => {
    startTransition(async () => {
      if (!item.read_at) await markAsRead(item.id);
      if (item.link) router.push(item.link);
      router.refresh();
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllAsRead();
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="알림"
          className="relative h-9 w-9"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">알림</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-xs text-primary hover:underline"
            >
              모두 읽음
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            새 알림이 없어요
          </p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {items.map((n) => (
              <NotificationItem key={n.id} item={n} onClick={() => handleClick(n)} />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

### Task 6: RealtimeNotificationsListener

**Files:**
- Create: `features/notifications/components/RealtimeNotificationsListener.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * notifications 테이블 postgres_changes 채널.
 * INSERT/UPDATE/DELETE 시 router.refresh — 종 아이콘 + 드롭다운 자동 갱신.
 * RealtimeEventsListener 와 같은 패턴.
 */
export function RealtimeNotificationsListener() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);
  return null;
}
```

---

### Task 7: Layout / AppShell / Header 통합

**Files:**
- Modify: `app/(app)/layout.tsx`
- Modify: `components/layout/app-shell.tsx`
- Modify: `components/layout/header.tsx`

- [ ] **Step 1: layout.tsx — fetch + seed**

```tsx
// app/(app)/layout.tsx 의 변경
import {
  getRecentNotifications,
  getUnreadNotificationCount,
} from "@/features/notifications/server/queries";
import { seedDailyNotifications } from "@/features/notifications/server/actions";

// ...
const [calendars, unreadBoardCount, recentNotifications, unreadNotificationCount] =
  await Promise.all([
    getCalendars(),
    getUnreadBoardCount(),
    getRecentNotifications(10),
    getUnreadNotificationCount(),
  ]);

// seed 는 fire-and-forget (await 안 하면 page render 안 막음)
void seedDailyNotifications();

return (
  <AppShell
    user={...}
    calendars={calendars}
    unreadBoardCount={unreadBoardCount}
    recentNotifications={recentNotifications}
    unreadNotificationCount={unreadNotificationCount}
  >
    {children}
  </AppShell>
);
```

- [ ] **Step 2: app-shell.tsx — props 추가 + RealtimeNotificationsListener mount**

```tsx
import { RealtimeNotificationsListener } from "@/features/notifications/components/RealtimeNotificationsListener";
import type { NotificationRow } from "@/features/notifications/server/queries";

export function AppShell({
  user, calendars, unreadBoardCount,
  recentNotifications, unreadNotificationCount,
  children,
}: {
  user: AppShellUser;
  calendars: CalendarRow[];
  unreadBoardCount: number;
  recentNotifications: NotificationRow[];
  unreadNotificationCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar user={user} calendars={calendars} unreadBoardCount={unreadBoardCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          calendars={calendars}
          unreadBoardCount={unreadBoardCount}
          recentNotifications={recentNotifications}
          unreadNotificationCount={unreadNotificationCount}
        />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
      </div>
      <MobileTabbar />
      <RealtimeEventsListener />
      <RealtimeNotificationsListener />
    </div>
  );
}
```

- [ ] **Step 3: header.tsx — NotificationsBell mount (ThemeToggle 옆)**

```tsx
import { NotificationsBell } from "@/features/notifications/components/NotificationsBell";
import type { NotificationRow } from "@/features/notifications/server/queries";

export function Header({
  user, calendars, unreadBoardCount,
  recentNotifications, unreadNotificationCount,
}: {
  user: AppShellUser;
  calendars: CalendarRow[];
  unreadBoardCount: number;
  recentNotifications: NotificationRow[];
  unreadNotificationCount: number;
}) {
  // ... 기존 코드
  return (
    <header ...>
      {/* ... 햄버거, 로고, 검색 ... */}
      <div className="ml-auto flex items-center gap-1.5">
        <NotificationsBell
          items={recentNotifications}
          unreadCount={unreadNotificationCount}
        />
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: tsc + commit**

```bash
pnpm tsc --noEmit
git add app/\(app\)/layout.tsx components/layout/ features/notifications/components/
git commit -m "feat(notifications): 헤더 종 + 드롭다운 + Realtime"
```

---

### Task 8: 사용자 시각 확인

체크리스트:
- 사용자가 마이그레이션 SQL 적용
- 다른 멤버 계정으로 게시판에 새 글 → 내 계정 헤더 종에 badge 자동 (Realtime)
- 종 클릭 → 드롭다운 — 글 알림 표시
- 알림 클릭 → /board?cal=X 로 이동 + read 처리
- "모두 읽음" → badge 사라짐
- 진입 시 (첫 로드) — 오늘·내일 일정/구독 카운트 알림 1번씩 (같은 날 재진입 시 중복 X)

---

## Self-Review

**Spec coverage:** notifications 테이블 + 4 trigger + UI + seed + Realtime + Layout 통합 모두 Task 매핑됨.

**Placeholder scan:** 없음 — 모든 코드 명시. layout.tsx 의 import / Promise.all 도 구체.

**Type consistency:** `NotificationRow` 타입 queries.ts 에서 정의, 컴포넌트들이 import. `recentNotifications: NotificationRow[]`, `unreadNotificationCount: number` 일관.

**한 번에 진행 흐름:** commit 분리 — (1) migration, (2) server, (3) UI+layout 통합 = 3 commit. 사용자 검증은 Task 8 한 번.
