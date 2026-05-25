# 알림 시스템 디자인

> 작성일: 2026-05-25 (브레인스토밍 결과 합의)

## 목적

게시판 새 글/댓글/좋아요, 공유 캘린더 초대, 오늘·내일 일정/구독 결제 등을
**헤더의 종 아이콘 + 드롭다운 알림 센터** 로 한 곳에서 확인. PWA push 는
v1 제외, 인앱 only.

## 합의된 결정

| 항목 | 결정 |
| --- | --- |
| 알림 종류 (6) | 일정 N분 전(A) · 구독 결제일(B) · 게시판 새 글(C) · 내 글에 댓글(D) · 공유 캘린더 초대(E) · 좋아요(F) |
| 트리거 — C/D/E/F | DB trigger 함수가 INSERT 시점에 `notifications` 행 생성 (실시간) |
| 트리거 — A/B | cron 없이, 진입 시(`(app)/layout`) `seedDailyNotifications()` 가 dedupe key 로 하루 1번 묶음 알림 |
| 도착 형식 | 헤더 우측 **종 아이콘 + unread badge** → 클릭 시 DropdownMenu 안 최근 10개 |
| 읽음 처리 | `read_at` timestamp. 항목 클릭 시 자동, "모두 읽음" 버튼 |
| 보관 | 무제한 (사용자가 삭제). 자동 삭제 cron 은 v2 |
| 클릭 → 이동 | 알림마다 `link` 컬럼 — 관련 페이지로 navigate |
| Realtime | postgres_changes channel — 새 알림 시 router.refresh (toast 는 v2) |

## 라우트 / 파일 구조

```
features/notifications/
  server/
    queries.ts                  # getRecentNotifications, getUnreadCount
    actions.ts                  # markAsRead, markAllAsRead, deleteNotification,
                                #   seedDailyNotifications
  components/
    NotificationsBell.tsx       # 헤더 종 + badge + DropdownMenu (client)
    NotificationItem.tsx        # 한 알림 행

components/layout/header.tsx (modify)
  # 종 아이콘 추가 (테마 토글 옆). unreadCount prop drilling 동일 패턴
app/(app)/layout.tsx (modify)
  # getUnreadNotificationCount + seedDailyNotifications 호출

supabase/migrations/
  20260525150000_notifications.sql   # notifications 테이블 + RLS + 4 trigger 함수
```

## DB 마이그레이션

```sql
-- ============================================================================
-- notifications 테이블 + RLS + 4 trigger 함수
-- ============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'event_summary',    -- 진입 시 묶음: "오늘 일정 N개"
    'subscription_due', -- 진입 시 묶음: "내일 구독 결제"
    'board_new_post',
    'board_new_comment',
    'calendar_invite',
    'board_like'
  )),
  title text not null,
  body text,
  /** 클릭 시 이동할 URL. null 이면 단순 표시. */
  link text,
  /** 중복 방지용. 같은 (user_id, dedupe_key) 행은 한 번만. */
  dedupe_key text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create unique index notifications_user_dedupe_uniq
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.notifications enable row level security;
create policy "notifications_select_own"
  on public.notifications for select using (auth.uid() = user_id);
-- INSERT 는 trigger(security definer) + server action 의 admin client 가 처리
create policy "notifications_insert_own"
  on public.notifications for insert with check (auth.uid() = user_id);
create policy "notifications_update_own"
  on public.notifications for update using (auth.uid() = user_id);
create policy "notifications_delete_own"
  on public.notifications for delete using (auth.uid() = user_id);

-- ============================================================================
-- Trigger 함수들 — security definer 라 user RLS 우회. INSERT 시 자동.
-- ON CONFLICT DO NOTHING 으로 dedupe.
-- ============================================================================

-- 게시판 새 글 — 같은 캘린더의 멤버(owner + accepted) 전원, 작성자 제외
create or replace function public.notify_board_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calendar_name text;
  v_author_nickname text;
begin
  select name into v_calendar_name from public.calendars where id = new.calendar_id;
  select nickname into v_author_nickname from public.profiles where id = new.author_id;

  -- owner
  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  select c.user_id, 'board_new_post',
         coalesce(v_author_nickname, '누군가') || ' · ' || v_calendar_name,
         '"' || new.title || '"',
         '/board?cal=' || new.calendar_id,
         'board_new_post:' || new.id::text || ':' || c.user_id::text
  from public.calendars c
  where c.id = new.calendar_id and c.user_id <> new.author_id
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  -- accepted members
  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  select sc.member_id, 'board_new_post',
         coalesce(v_author_nickname, '누군가') || ' · ' || v_calendar_name,
         '"' || new.title || '"',
         '/board?cal=' || new.calendar_id,
         'board_new_post:' || new.id::text || ':' || sc.member_id::text
  from public.shared_calendars sc
  where sc.calendar_id = new.calendar_id
    and sc.status = 'accepted'
    and sc.member_id <> new.author_id
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  return new;
end;
$$;

create trigger board_posts_notify
  after insert on public.board_posts
  for each row execute function public.notify_board_new_post();

-- 내 글에 댓글 — 부모 글 작성자에게 (본인 제외)
create or replace function public.notify_board_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_author uuid;
  v_post_title text;
  v_post_calendar uuid;
  v_commenter_nickname text;
begin
  select author_id, title, calendar_id
    into v_post_author, v_post_title, v_post_calendar
    from public.board_posts where id = new.post_id;
  if v_post_author is null or v_post_author = new.author_id then
    return new;
  end if;
  select nickname into v_commenter_nickname from public.profiles where id = new.author_id;

  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  values (
    v_post_author, 'board_new_comment',
    coalesce(v_commenter_nickname, '누군가') || ' 가 댓글',
    '"' || left(new.body, 60) || case when length(new.body) > 60 then '...' else '' end || '"',
    '/board?cal=' || v_post_calendar,
    'board_new_comment:' || new.id::text
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return new;
end;
$$;

create trigger board_comments_notify
  after insert on public.board_comments
  for each row execute function public.notify_board_new_comment();

-- 공유 캘린더 초대 — pending 시 member_id 에게
create or replace function public.notify_calendar_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calendar_name text;
  v_owner_nickname text;
begin
  if new.status <> 'pending' then return new; end if;
  select name into v_calendar_name from public.calendars where id = new.calendar_id;
  select nickname into v_owner_nickname from public.profiles where id = new.owner_id;

  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  values (
    new.member_id, 'calendar_invite',
    '새 캘린더 초대',
    coalesce(v_owner_nickname, '누군가') || ' 가 "' || v_calendar_name || '" 에 초대했어요',
    '/social',
    'calendar_invite:' || new.id::text
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return new;
end;
$$;

create trigger shared_calendars_invite_notify
  after insert on public.shared_calendars
  for each row execute function public.notify_calendar_invite();

-- 좋아요 — target 의 author 에게 (본인 제외)
create or replace function public.notify_board_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_author uuid;
  v_target_calendar uuid;
  v_target_title text;
  v_liker_nickname text;
begin
  if new.target_type = 'post' then
    select author_id, calendar_id, title
      into v_target_author, v_target_calendar, v_target_title
      from public.board_posts where id = new.target_id;
  else
    select bp.author_id, bp.calendar_id, '"' || left(bc.body, 40) || '"'
      into v_target_author, v_target_calendar, v_target_title
      from public.board_comments bc
      join public.board_posts bp on bp.id = bc.post_id
      where bc.id = new.target_id;
  end if;
  if v_target_author is null or v_target_author = new.user_id then
    return new;
  end if;
  select nickname into v_liker_nickname from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  values (
    v_target_author, 'board_like',
    coalesce(v_liker_nickname, '누군가') || ' 가 좋아요',
    v_target_title,
    '/board?cal=' || v_target_calendar,
    'board_like:' || new.target_type || ':' || new.target_id::text || ':' || new.user_id::text
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return new;
end;
$$;

create trigger board_likes_notify
  after insert on public.board_likes
  for each row execute function public.notify_board_like();
```

## seedDailyNotifications() 서버 액션

진입 시(`(app)/layout`) 호출. 하루 한 번만 묶음 알림 생성.

```ts
// features/notifications/server/actions.ts (요약)
export async function seedDailyNotifications(): Promise<void> {
  const today = todayIso();
  // 1. 오늘+내일 일정 카운트 → 0보다 크면 notification insert (dedupe: event_summary:YYYY-MM-DD)
  // 2. 오늘+내일 구독 결제 카운트 → 마찬가지 (dedupe: subscription_due:YYYY-MM-DD)
  // unique index 로 같은 dedupe_key 의 중복 insert 자동 차단
}
```

조회 query:
- 오늘 시작/종료 안 events (멤버 캘린더, RLS 자동 필터)
- 활성 구독의 billing_day == 오늘/내일 day
실패 시 try/catch — silent (layout 안 죽게).

## NotificationsBell 컴포넌트

헤더 우측 (`ThemeToggle` 옆):

```tsx
// features/notifications/components/NotificationsBell.tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-80">
    <div className="flex items-center justify-between px-2 py-1.5">
      <span className="text-sm font-semibold">알림</span>
      {unreadCount > 0 && (
        <button onClick={handleMarkAll} className="text-xs text-primary">
          모두 읽음
        </button>
      )}
    </div>
    <DropdownMenuSeparator />
    {items.length === 0 ? (
      <p className="px-2 py-6 text-center text-sm text-muted-foreground">
        새 알림 없음
      </p>
    ) : (
      items.map((n) => <NotificationItem key={n.id} item={n} onClick={...} />)
    )}
  </DropdownMenuContent>
</DropdownMenu>
```

prop drilling (위젯/게시판 badge 와 같은 패턴):
- `app/(app)/layout.tsx` → AppShell 의 `unreadNotificationCount` + 최근 10개
- AppShell → Header → NotificationsBell

### NotificationItem
- 아이콘 (type 별 lucide 매핑)
- 제목 / body (한 줄 truncate)
- 상대 시각 ("5분 전")
- 안 읽음 dot (primary 색)
- 클릭 → markAsRead + router.push(link)

## Realtime

`RealtimeEventsListener` 와 동일 패턴 — `RealtimeNotificationsListener`. notifications 채널 subscribe → INSERT 이벤트 시 router.refresh. 토스트는 v2.

## 회귀 / 영향

- `(app)/layout` 의 fetch 가 늘어남 (`getUnreadNotificationCount` + `seedDailyNotifications` + 최근 10개) — `Promise.all` 로 병렬
- 게시판/공유 캘린더의 trigger 가 자동 알림 생성 → existing 인 흐름에 자동 추가 (영향 X, 부가)

## 에러 처리

- trigger 함수 fail 시 — 부모 INSERT 도 rollback 되지 않게 `exception when others then return new` (silent)
- seedDailyNotifications fail 시 — layout try/catch, 0 반환
- 알림 fetch 실패 시 — 종 아이콘만 표시 (count 0)

## YAGNI 로 제외
- PWA push (메모리 결정)
- 토스트 (드롭다운 안 카운트로 충분, v2)
- 알림 분류 탭 (전체/안 읽음 등)
- 30일 자동 삭제 cron
- 알림 설정 (종류별 on/off) — 후속

## 작업 양 추정
- DB 마이그레이션 적용: 5분
- queries/actions: 60분
- NotificationsBell + Item: 60분
- Header/Layout prop drilling: 30분
- seedDailyNotifications 로직: 30분
- RealtimeNotificationsListener: 20분
- 검증: 30분

총 **3시간** 예상.
