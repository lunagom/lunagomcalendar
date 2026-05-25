# 공유 게시판 디자인

> 작성일: 2026-05-25 (브레인스토밍 결과 합의)

## 목적

공유 캘린더 멤버끼리 **글/댓글/좋아요로 의논·공지·기록**을 주고받는 게시판.
가족·커플 등 일정 의논이 잦은 그룹의 컨텍스트에 자연스러운 별도 페이지(`/board`)
형태로 제공한다.

## 합의된 결정

| 항목 | 결정 |
| --- | --- |
| 진입 위치 | 별도 `/board` 페이지 (일급 기능). 사이드바 nav 에 항목 추가 |
| 형식 | 게시판 식 (제목 + 본문 + 댓글 + 좋아요). chat 식 아님 |
| 글 쓰기 권한 | **수락한 멤버 모두** (캘린더 view/edit 권한 무관) |
| 좋아요 | 포함 — 글·댓글 둘 다 가능 |
| 알림 | 사이드바 "게시판" 항목 옆 **안 본 글 카운트 badge** (단순). Realtime/토스트 v1 미루기 |
| 첨부 | 없음 (v1 제외) |
| 정렬 | 글 — 최신순. 댓글 — 오래된 순 |
| 글/댓글 수정·삭제 | 작성자 본인만 |
| 모바일 탭바 | 변경 없음 (홈/할일/가계부/더보기). 게시판은 더보기 드로어 안 사이드바 nav 에서 진입 |

## 라우트 / 파일 구조

```
app/(app)/board/
  page.tsx                # server fetch + BoardClient

features/board/
  server/
    queries.ts            # getCalendarsWithBoardAccess, getPostsForCalendar,
                          # getPostDetail, getUnreadCount, getLikesForPosts
    actions.ts            # createPost, updatePost, deletePost,
                          # createComment, deleteComment,
                          # toggleLike, markBoardRead
  components/
    BoardClient.tsx       # 캘린더 탭 + 글 목록 + 새 글 폼 트리거
    PostCard.tsx          # 목록의 글 카드
    PostDetailDialog.tsx  # 글 본문 + 댓글 + 좋아요
    NewPostDialog.tsx     # 글 작성 폼
    CommentList.tsx       # 댓글 리스트 + 작성 폼
    LikeButton.tsx        # 글/댓글 공통 좋아요 토글

components/layout/
  sidebar.tsx (modify)    # navItems 의 게시판 항목에 unread badge 표시
app/(app)/layout.tsx (modify)  # unread count fetch + SidebarBody 에 전달

lib/nav.ts (modify)       # navItems 에 /board 추가

supabase/migrations/
  2026-05-25..._board_tables.sql   # board_posts/comments/likes/reads + RLS
```

## DB 마이그레이션

```sql
-- ============================================================================
-- 공유 게시판 — 4 테이블 + RLS
-- ============================================================================

create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index board_posts_calendar_created_idx
  on public.board_posts (calendar_id, created_at desc);

create trigger board_posts_set_updated_at
  before update on public.board_posts
  for each row execute function public.set_updated_at();

create table public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index board_comments_post_created_idx
  on public.board_comments (post_id, created_at);

-- 한 테이블로 글/댓글 좋아요 통합 (target_type 으로 구분)
create table public.board_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
create index board_likes_target_idx
  on public.board_likes (target_type, target_id);

-- 사용자별 캘린더 게시판 마지막 본 시각 (badge unread 카운트용)
create table public.board_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, calendar_id)
);

alter table public.board_posts    enable row level security;
alter table public.board_comments enable row level security;
alter table public.board_likes    enable row level security;
alter table public.board_reads    enable row level security;

-- board_posts: calendar 멤버(owner 포함)만 select/insert,
--              update/delete 는 작성자 본인만
create policy "board_posts_select_member"
  on public.board_posts for select using (
    exists (select 1 from public.calendars c
            where c.id = calendar_id and c.user_id = auth.uid())
    or public.has_calendar_membership(calendar_id, auth.uid())
  );
create policy "board_posts_insert_member"
  on public.board_posts for insert with check (
    auth.uid() = author_id and (
      exists (select 1 from public.calendars c
              where c.id = calendar_id and c.user_id = auth.uid())
      or public.has_calendar_membership(calendar_id, auth.uid())
    )
  );
create policy "board_posts_update_own"
  on public.board_posts for update using (auth.uid() = author_id);
create policy "board_posts_delete_own"
  on public.board_posts for delete using (auth.uid() = author_id);

-- board_comments: 부모 post 의 calendar 멤버만 select/insert,
--                 update/delete 는 작성자 본인만
create policy "board_comments_select_member"
  on public.board_comments for select using (
    exists (
      select 1 from public.board_posts p
      where p.id = post_id
        and (
          exists (select 1 from public.calendars c
                  where c.id = p.calendar_id and c.user_id = auth.uid())
          or public.has_calendar_membership(p.calendar_id, auth.uid())
        )
    )
  );
create policy "board_comments_insert_member"
  on public.board_comments for insert with check (
    auth.uid() = author_id and exists (
      select 1 from public.board_posts p
      where p.id = post_id
        and (
          exists (select 1 from public.calendars c
                  where c.id = p.calendar_id and c.user_id = auth.uid())
          or public.has_calendar_membership(p.calendar_id, auth.uid())
        )
    )
  );
create policy "board_comments_update_own"
  on public.board_comments for update using (auth.uid() = author_id);
create policy "board_comments_delete_own"
  on public.board_comments for delete using (auth.uid() = author_id);

-- board_likes: 본인 row 만 (insert/delete/select)
create policy "board_likes_all_own"
  on public.board_likes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- board_reads: 본인 row 만 (upsert)
create policy "board_reads_all_own"
  on public.board_reads for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## `/board` 페이지 흐름

1. server fetch (`Promise.all`):
   - 멤버인 모든 캘린더 (`getCalendars()` 그대로 — 소유 + accepted 공유)
   - URL `?cal=<id>` 의 캘린더(없으면 첫 캘린더) 의 글 목록
   - 글들의 댓글 카운트 + 좋아요 카운트 + 내 좋아요 여부
   - 사용자의 last_read_at (해당 캘린더)
2. BoardClient 가 캘린더 탭 + 글 목록 렌더
3. mount 시 `markBoardRead(currentCalendarId)` 호출 — `board_reads` upsert (last_read_at = now)
4. "새 글" 클릭 → NewPostDialog (제목 + 본문) → createPost
5. 글 클릭 → PostDetailDialog (본문 + 댓글 리스트 + 댓글 폼 + 좋아요)

## 컴포넌트 개요

**BoardClient (client)**
- props: `calendars`, `currentCalendarId`, `posts`, `currentUserId`
- 캘린더 탭 — 변경 시 `router.push(\`/board?cal=\${id}\`)`
- 글 목록 + "+ 새 글" 버튼
- mount useEffect 에서 `markBoardRead` 호출
- 글 클릭 시 PostDetailDialog 오픈 (state)

**PostCard**
- 제목, 본문 truncate (3줄), 작성자 닉네임 + 상대 시각, 댓글 수, 좋아요 (LikeButton)
- 본인 글이면 "수정 / 삭제" 메뉴 (DropdownMenu)

**PostDetailDialog**
- 본문 전체, 작성자, 시각
- 좋아요 큰 버튼
- 댓글 리스트 (CommentList)
- 댓글 입력 + 작성 버튼

**LikeButton (client)**
- props: `targetType`, `targetId`, `count`, `liked`
- 토글 → `toggleLike` action → optimistic update + `router.refresh()`

**NewPostDialog / 글 수정**
- 제목 (input, max 200), 본문 (textarea, max 4000)
- 저장 → action

## 사이드바 unread badge

`app/(app)/layout.tsx` 변경:
```ts
// 기존 calendars fetch 옆에
const unreadBoardCount = await getUnreadBoardCount();
return (
  <AppShell ... unreadBoardCount={unreadBoardCount}>
    {children}
  </AppShell>
);
```

`getUnreadBoardCount()` server query:
```ts
// 멤버인 모든 캘린더의 board_posts 중 last_read_at 이후 글의 합산
// + last_read_at 없는 캘린더는 모든 글이 unread
```

`Sidebar` / `SidebarBody` / `MobileTabbar` 가 prop 으로 받음. nav 의 "/board" 항목 옆에 작은 badge (1+ 일 때만 표시). 99+ 는 "99+".

## 빈 상태

- 공유 캘린더 없음 — "공유 캘린더가 없어요. 캘린더 설정에서 멤버를 초대해보세요" + /settings 링크
- 현재 캘린더에 글 없음 — "아직 글이 없어요. 새 글로 멤버와 대화 시작" + 큰 아이콘
- 모든 멤버 캘린더에 글 없음 + 캘린더는 있음 — 글 없음 안내만

## 에러 처리

- 글/댓글 fetch 실패 시 server component 안에서 catch + "불러오지 못했어요"
- action 실패 시 toast.error
- 캘린더 권한 없는 ID 직접 입력 시 — RLS 가 자동 차단, 빈 글 목록

## YAGNI 로 제외한 것
- 사진/파일 첨부
- 멘션 (@닉네임)
- Realtime 새 글 push (페이지 진입/새로고침으로 갱신)
- 글 검색
- 글 카테고리/태그
- 좋아요 한 사람 목록

후속에 사용자 피드백 받고 추가 결정.

## 작업 양 추정
- DB 마이그레이션 적용: 5분 (사용자)
- queries/actions: 60분
- 컴포넌트 (BoardClient + PostCard + PostDetailDialog + NewPostDialog + LikeButton + CommentList): 90분
- 사이드바 badge: 30분
- 페이지 + nav: 20분
- 검증/회귀 fix: 30분

총 **3시간 ~ 4시간** 예상.
