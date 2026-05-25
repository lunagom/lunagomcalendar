# 공유 게시판 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공유 캘린더 멤버끼리 글/댓글/좋아요로 의논하는 별도 `/board` 페이지를 만들고, 사이드바 nav 에 안 본 글 수 badge 를 띄운다.

**Architecture:** 4 테이블 (board_posts/comments/likes/reads) + RLS (멤버만 select/insert, 작성자만 update/delete). `/board` 는 server component 가 캘린더 멤버 + 글 + 댓글 카운트 + 좋아요 fetch → BoardClient 가 캘린더 탭 + 글 목록. mount 시 markBoardRead 호출. 사이드바 unread 카운트는 (app)/layout 에서 fetch → AppShell→Header→SidebarBody, MobileTabbar 까지 prop drilling.

**Tech Stack:** Next.js 14 App Router (server components) · Supabase Postgres+RLS · Tailwind · shadcn/ui · zustand 영향 없음

---

## File Structure

**Create:**
- `supabase/migrations/20260525140000_board_tables.sql`
- `features/board/server/queries.ts`
- `features/board/server/actions.ts`
- `features/board/components/BoardClient.tsx`
- `features/board/components/PostCard.tsx`
- `features/board/components/PostDetailDialog.tsx`
- `features/board/components/NewPostDialog.tsx`
- `features/board/components/CommentList.tsx`
- `features/board/components/LikeButton.tsx`
- `app/(app)/board/page.tsx`

**Modify:**
- `lib/nav.ts` — navItems 에 `/board` 추가 ("게시판")
- `app/(app)/layout.tsx` — getUnreadBoardCount fetch + AppShell prop
- `components/layout/app-shell.tsx` — unreadBoardCount prop → Header
- `components/layout/header.tsx` — Header → SidebarBody (드로어)
- `components/layout/sidebar.tsx` — Sidebar + SidebarBody 가 unread prop 받음, 게시판 nav 항목 옆 badge
- `components/layout/mobile-tabbar.tsx` — 변경 없음 (게시판은 탭바에 없음)
- `types/database.ts` — board_* 4 테이블 수동 추가

---

### Task 1: DB 마이그레이션 (사용자 SQL editor 적용)

**Files:**
- Create: `supabase/migrations/20260525140000_board_tables.sql`

- [ ] **Step 1: 마이그레이션 파일 작성** (spec 의 SQL 그대로)

전체 SQL — `docs/superpowers/specs/2026-05-25-shared-board-design.md` 의 "DB 마이그레이션" 섹션 그대로 옮긴다. 4 테이블 + 인덱스 + 트리거 + RLS 정책 9 개.

- [ ] **Step 2: 사용자 SQL editor 또는 CLI 적용**

대시보드: https://supabase.com/dashboard/project/rkqtcuaifhwyyzbavhio/sql
또는: `pnpm exec supabase db push`

- [ ] **Step 3: types/database.ts 수동 추가**

`profiles` 다음에 4 테이블 Row/Insert/Update 추가. spec 의 컬럼 명세 그대로 (board_posts: id/calendar_id/author_id/title/body/created_at/updated_at, board_comments: id/post_id/author_id/body/created_at, board_likes: user_id/target_type/target_id/created_at, board_reads: user_id/calendar_id/last_read_at).

마이그레이션 적용 후 `pnpm db:types` 로 재생성 권장.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260525140000_board_tables.sql types/database.ts
git commit -m "migration: board_posts/comments/likes/reads + RLS"
```

---

### Task 2: queries.ts (server fetch)

**Files:**
- Create: `features/board/server/queries.ts`

- [ ] **Step 1: 함수 시그니처 + 구현**

```ts
// features/board/server/queries.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PostListItem = {
  id: string;
  calendar_id: string;
  author_id: string;
  author_nickname: string | null;
  title: string;
  body: string;
  created_at: string;
  comment_count: number;
  like_count: number;
  liked_by_me: boolean;
};

export type CommentItem = {
  id: string;
  post_id: string;
  author_id: string;
  author_nickname: string | null;
  body: string;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
};

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** 캘린더의 글 목록 (최신순). 댓글/좋아요 카운트 + 내 좋아요 여부 포함. */
export async function getPostsForCalendar(calendarId: string): Promise<PostListItem[]> {
  const supabase = createClient();
  const me = await currentUserId();
  if (!me) return [];

  const { data: posts, error } = await supabase
    .from("board_posts")
    .select("id, calendar_id, author_id, title, body, created_at")
    .eq("calendar_id", calendarId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));

  // 댓글 카운트 — group by 대신 join 후 클라이언트 집계 (Supabase 의 group by 제한)
  const { data: comments } = await supabase
    .from("board_comments")
    .select("post_id")
    .in("post_id", postIds);
  const commentCount = new Map<string, number>();
  for (const c of comments ?? []) {
    commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1);
  }

  // 좋아요 카운트 + 내 좋아요
  const { data: likes } = await supabase
    .from("board_likes")
    .select("target_id, user_id")
    .eq("target_type", "post")
    .in("target_id", postIds);
  const likeCount = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of likes ?? []) {
    likeCount.set(l.target_id, (likeCount.get(l.target_id) ?? 0) + 1);
    if (l.user_id === me) likedByMe.add(l.target_id);
  }

  // 작성자 닉네임 (profiles RLS 우회 admin)
  const admin = createAdminClient();
  const { data: profs } = await admin
    .from("profiles")
    .select("id, nickname")
    .in("id", authorIds);
  const nick = new Map<string, string | null>((profs ?? []).map((p) => [p.id, p.nickname]));

  return posts.map((p) => ({
    ...p,
    author_nickname: nick.get(p.author_id) ?? null,
    comment_count: commentCount.get(p.id) ?? 0,
    like_count: likeCount.get(p.id) ?? 0,
    liked_by_me: likedByMe.has(p.id),
  }));
}

/** 단일 글 + 댓글들 + 각 댓글 좋아요. PostDetailDialog 가 client 라 action 으로 wrap. */
export async function getPostDetail(postId: string): Promise<{
  post: PostListItem;
  comments: CommentItem[];
} | null> {
  const supabase = createClient();
  const me = await currentUserId();
  if (!me) return null;

  const { data: post } = await supabase
    .from("board_posts")
    .select("id, calendar_id, author_id, title, body, created_at")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return null;

  // 글 좋아요
  const { data: postLikes } = await supabase
    .from("board_likes")
    .select("user_id")
    .eq("target_type", "post")
    .eq("target_id", postId);
  const postLikeCount = postLikes?.length ?? 0;
  const postLikedByMe = (postLikes ?? []).some((l) => l.user_id === me);

  // 댓글
  const { data: comments } = await supabase
    .from("board_comments")
    .select("id, post_id, author_id, body, created_at")
    .eq("post_id", postId)
    .order("created_at");
  const commentIds = (comments ?? []).map((c) => c.id);

  // 댓글 좋아요
  const { data: cLikes } = commentIds.length > 0
    ? await supabase
        .from("board_likes")
        .select("target_id, user_id")
        .eq("target_type", "comment")
        .in("target_id", commentIds)
    : { data: [] };
  const cLikeCount = new Map<string, number>();
  const cLikedByMe = new Set<string>();
  for (const l of cLikes ?? []) {
    cLikeCount.set(l.target_id, (cLikeCount.get(l.target_id) ?? 0) + 1);
    if (l.user_id === me) cLikedByMe.add(l.target_id);
  }

  // 작성자 닉네임 — 글 + 댓글
  const allAuthorIds = Array.from(new Set([post.author_id, ...(comments ?? []).map((c) => c.author_id)]));
  const admin = createAdminClient();
  const { data: profs } = await admin
    .from("profiles")
    .select("id, nickname")
    .in("id", allAuthorIds);
  const nick = new Map<string, string | null>((profs ?? []).map((p) => [p.id, p.nickname]));

  return {
    post: {
      ...post,
      author_nickname: nick.get(post.author_id) ?? null,
      comment_count: comments?.length ?? 0,
      like_count: postLikeCount,
      liked_by_me: postLikedByMe,
    },
    comments: (comments ?? []).map((c) => ({
      ...c,
      author_nickname: nick.get(c.author_id) ?? null,
      like_count: cLikeCount.get(c.id) ?? 0,
      liked_by_me: cLikedByMe.has(c.id),
    })),
  };
}

/** 안 본 글 카운트 — 멤버인 모든 캘린더의 last_read_at 이후 글 합산. */
export async function getUnreadBoardCount(): Promise<number> {
  const supabase = createClient();
  const me = await currentUserId();
  if (!me) return 0;

  // 멤버인 캘린더들 — getCalendars 가 RLS 통과해서 가져옴 (소유 + accepted)
  const { data: cals } = await supabase.from("calendars").select("id");
  if (!cals || cals.length === 0) return 0;
  const calIds = cals.map((c) => c.id);

  // 내 read 시각
  const { data: reads } = await supabase
    .from("board_reads")
    .select("calendar_id, last_read_at")
    .in("calendar_id", calIds);
  const readMap = new Map((reads ?? []).map((r) => [r.calendar_id, r.last_read_at]));

  // 글 카운트 — 각 캘린더별로 read 이후
  const { data: posts } = await supabase
    .from("board_posts")
    .select("id, calendar_id, created_at, author_id")
    .in("calendar_id", calIds);
  if (!posts) return 0;

  let unread = 0;
  for (const p of posts) {
    if (p.author_id === me) continue; // 내가 쓴 글 제외
    const lastRead = readMap.get(p.calendar_id);
    if (!lastRead || new Date(p.created_at) > new Date(lastRead)) unread++;
  }
  return unread;
}
```

- [ ] **Step 2: tsc**

```bash
pnpm tsc --noEmit
```
Expected: EXIT 0

---

### Task 3: actions.ts (mutations)

**Files:**
- Create: `features/board/server/actions.ts`

- [ ] **Step 1: 작성**

```ts
// features/board/server/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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

const postSchema = z.object({
  calendar_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
});

export async function createPost(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "제목·본문을 입력해주세요" };
  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("board_posts")
    .insert({ ...parsed.data, author_id: userId })
    .select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/board");
  revalidatePath("/", "layout");
  return { ok: true, data: { id: data.id } };
}

const updatePostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
});

export async function updatePost(input: unknown): Promise<ActionResult> {
  const parsed = updatePostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "제목·본문을 입력해주세요" };
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("board_posts")
    .update({ title: parsed.data.title, body: parsed.data.body })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/board");
  return { ok: true, data: undefined };
}

export async function deletePost(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("board_posts")
    .delete().eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "삭제 권한이 없거나 이미 삭제된 글입니다" };
  revalidatePath("/board");
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

const commentSchema = z.object({
  post_id: z.string().uuid(),
  body: z.string().min(1).max(1000),
});

export async function createComment(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "댓글을 입력해주세요" };
  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("board_comments")
    .insert({ ...parsed.data, author_id: userId })
    .select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/board");
  return { ok: true, data: { id: data.id } };
}

export async function deleteComment(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("board_comments")
    .delete().eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "권한이 없거나 이미 삭제된 댓글입니다" };
  revalidatePath("/board");
  return { ok: true, data: undefined };
}

const likeSchema = z.object({
  target_type: z.enum(["post", "comment"]),
  target_id: z.string().uuid(),
});

/** 좋아요 토글 — 존재하면 delete, 없으면 insert. */
export async function toggleLike(input: unknown): Promise<ActionResult<{ liked: boolean }>> {
  const parsed = likeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "잘못된 요청" };
  const userId = await getUserId();
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("board_likes")
    .select("user_id")
    .eq("user_id", userId)
    .eq("target_type", parsed.data.target_type)
    .eq("target_id", parsed.data.target_id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("board_likes").delete()
      .eq("user_id", userId)
      .eq("target_type", parsed.data.target_type)
      .eq("target_id", parsed.data.target_id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/board");
    return { ok: true, data: { liked: false } };
  }
  const { error } = await supabase
    .from("board_likes")
    .insert({ user_id: userId, ...parsed.data });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/board");
  return { ok: true, data: { liked: true } };
}

/** 게시판 마지막 본 시각 갱신 — board_reads upsert. */
export async function markBoardRead(calendarId: string): Promise<ActionResult> {
  const userId = await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("board_reads")
    .upsert(
      { user_id: userId, calendar_id: calendarId, last_read_at: new Date().toISOString() },
      { onConflict: "user_id,calendar_id" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: tsc + commit (Task 2 와 묶음)**

```bash
pnpm tsc --noEmit
git add features/board/server/
git commit -m "feat(board): server queries + actions"
```

---

### Task 4~9: 컴포넌트 6개

각 컴포넌트는 spec 의 "컴포넌트 개요" 섹션과 함께 작성. 단순 패턴이라 implement 단계에서 spec + 아래 스켈레톤 따라.

**LikeButton** (client):
- props: `targetType ("post"|"comment")`, `targetId`, `count`, `liked`
- onClick → `startTransition(() => toggleLike(...))` → optimistic local state + router.refresh
- Heart icon (lucide) — liked 면 fill, 아니면 outline

**CommentList** (client):
- props: `postId`, `comments: CommentItem[]`, `currentUserId`
- 댓글 리스트 (created_at 순서)
- 작성 폼 (Textarea + 저장) → createComment + router.refresh
- 본인 댓글에 삭제 버튼 (Trash2) → deleteComment

**PostDetailDialog** (client, Dialog wrapper):
- props: `postId`, `open`, `onOpenChange`, `currentUserId`
- mount 시 fetch (action 으로) — getPostDetail 을 server action 으로 wrap 또는 client supabase
- 본문 + LikeButton + CommentList
- 본인 글이면 수정/삭제 (수정은 NewPostDialog 재활용, initial prop 으로)

**NewPostDialog** (client):
- props: `calendarId`, `initial?`, `open`, `onOpenChange`
- title input + body textarea
- 저장 → createPost or updatePost (initial 여부)

**PostCard** (client):
- props: `post`, `currentUserId`, `onClick`
- 제목 + body 3줄 truncate + 작성자 + 시각 + 댓글 카운트 + 좋아요
- 본인 글이면 ⋮ 메뉴

**BoardClient** (client):
- props: `calendars`, `currentCalendarId`, `posts`, `currentUserId`
- 캘린더 탭 (Tabs) — 변경 시 `router.push(\`/board?cal=\${id}\`)`
- "+ 새 글" 버튼 → NewPostDialog
- 글 목록 (PostCard) → 클릭 시 PostDetailDialog
- mount useEffect: `markBoardRead(currentCalendarId)`
- 빈 상태 (글 없음, 캘린더 없음) 분기

**Files:**
- Create: `features/board/components/{LikeButton,CommentList,PostDetailDialog,NewPostDialog,PostCard,BoardClient}.tsx`

- [ ] **Step 1: 컴포넌트 6개 작성** (spec + 위 outline 따라)
- [ ] **Step 2: tsc + commit (단일 묶음)**

---

### Task 10: /board page.tsx

**Files:**
- Create: `app/(app)/board/page.tsx`

- [ ] **Step 1: 작성**

```tsx
// app/(app)/board/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCalendars } from "@/features/calendar/server/queries";
import { getPostsForCalendar } from "@/features/board/server/queries";
import { BoardClient } from "@/features/board/components/BoardClient";

export const metadata = { title: "게시판" };

export default async function BoardPage({
  searchParams,
}: {
  searchParams: { cal?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const calendars = await getCalendars();
  if (calendars.length === 0) {
    return (
      <BoardClient
        calendars={[]}
        currentCalendarId={null}
        posts={[]}
        currentUserId={user.id}
      />
    );
  }
  const currentId = searchParams.cal && calendars.some((c) => c.id === searchParams.cal)
    ? searchParams.cal
    : calendars[0].id;
  const posts = await getPostsForCalendar(currentId);

  return (
    <BoardClient
      calendars={calendars}
      currentCalendarId={currentId}
      posts={posts}
      currentUserId={user.id}
    />
  );
}
```

---

### Task 11: lib/nav.ts 에 /board 추가

**Files:**
- Modify: `lib/nav.ts`

- [ ] **Step 1: navItems 에 추가 (캘린더 다음)**

```ts
import { Home, Calendar, CheckSquare, Wallet, Users, Settings, MessageSquare, MoreHorizontal } from "lucide-react";

export const navItems: NavItem[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/calendar", label: "캘린더", icon: Calendar },
  { href: "/todos", label: "오늘의 할 일", icon: CheckSquare },
  { href: "/expense", label: "가계부", icon: Wallet },
  { href: "/board", label: "게시판", icon: MessageSquare },
  { href: "/social", label: "공유", icon: Users },
  { href: "/settings", label: "설정", icon: Settings },
];
```

`mobileTabItems` 는 변경 없음 (게시판은 더보기 드로어에서).

---

### Task 12: 사이드바 unread badge prop drilling

**Files:**
- Modify: `app/(app)/layout.tsx`
- Modify: `components/layout/app-shell.tsx`
- Modify: `components/layout/header.tsx`
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: layout.tsx 가 unread fetch + AppShell prop**

```tsx
// app/(app)/layout.tsx
import { getUnreadBoardCount } from "@/features/board/server/queries";
// ...
const unreadBoardCount = await getUnreadBoardCount();
return (
  <AppShell user={...} calendars={...} unreadBoardCount={unreadBoardCount}>
    {children}
  </AppShell>
);
```

- [ ] **Step 2: AppShell 가 prop 받아 Header 에 전달**

```tsx
// components/layout/app-shell.tsx
export function AppShell({ user, calendars, unreadBoardCount, children }: {
  user: AppShellUser;
  calendars: CalendarRow[];
  unreadBoardCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar user={user} calendars={calendars} unreadBoardCount={unreadBoardCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} calendars={calendars} unreadBoardCount={unreadBoardCount} />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
      </div>
      <MobileTabbar />
      <RealtimeEventsListener />
    </div>
  );
}
```

- [ ] **Step 3: Header → SidebarBody 에 prop 전달**

`Header.tsx` 에 `unreadBoardCount: number` prop 추가, SidebarBody 에 전달.

- [ ] **Step 4: Sidebar 와 SidebarBody 가 prop 받아 nav 의 /board 항목에 badge**

`sidebar.tsx` 의 SidebarBody — `unreadBoardCount` prop. nav 렌더 시:

```tsx
{navItems.map((item) => {
  const showBadge = item.href === "/board" && unreadBoardCount > 0;
  // ... Link 안에 badge 추가
  return (
    <Link ...>
      <Icon />
      <span>{item.label}</span>
      {showBadge && (
        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
          {unreadBoardCount > 99 ? "99+" : unreadBoardCount}
        </span>
      )}
    </Link>
  );
})}
```

- [ ] **Step 5: tsc + commit**

```bash
pnpm tsc --noEmit
git add app/\(app\)/layout.tsx components/layout/
git commit -m "feat(board): 사이드바 nav 에 unread badge"
```

---

### Task 13: types/database.ts 수동 추가

**Files:**
- Modify: `types/database.ts`

- [ ] **Step 1: 4 테이블 추가** (profiles 다음 위치)

`board_posts`, `board_comments`, `board_likes`, `board_reads` 각각의 Row / Insert / Update 타입. spec 의 컬럼 명세 그대로 (id: string, calendar_id: string, ... created_at: string 등). Relationships 는 빈 배열.

`Json` 타입 import 는 기존에 있음.

- [ ] **Step 2: tsc 통과 확인**

```bash
pnpm tsc --noEmit
```
Expected: EXIT 0

---

### Task 14: 한 묶음 commit + 사용자 시각 확인

- [ ] **Step 1: 통합 tsc + dev probe**

```bash
pnpm tsc --noEmit
curl -s -o /dev/null -w "STATUS:%{http_code}\n" http://localhost:3000/login
```

- [ ] **Step 2: 마지막 commit (남은 변경)**

```bash
git add features/board/components/ app/\(app\)/board/page.tsx lib/nav.ts
git commit -m "feat(board): /board 페이지 + 컴포넌트 + nav 항목"
```

- [ ] **Step 3: 사용자에게 시각 확인 가이드 + 마이그레이션 적용 안내**

체크리스트:
- 사용자가 마이그레이션 SQL 적용 (대시보드 SQL editor)
- http://localhost:3000/board 진입 → 캘린더 탭 + 글 목록
- 새 글 작성 → 목록에 표시
- 글 클릭 → 본문 + 댓글 폼 + 좋아요
- 다른 멤버 계정으로 글 쓴 후 내 계정 사이드바 → "게시판" 옆에 badge
- /board 진입하면 badge 사라짐 (markBoardRead)

---

## Self-Review

**Spec coverage:** 모든 spec 결정 task 매핑됨 (DB=Task 1, queries=Task 2, actions=Task 3, 컴포넌트 6개=Task 4-9, 페이지=Task 10, nav=Task 11, badge=Task 12, types=Task 13).

**Placeholder scan:** 컴포넌트 6개 (Task 4-9) 의 상세 코드는 spec 의 "컴포넌트 개요" + outline 참조. 정확한 props/signature 는 outline 에 명시. 일반적인 React 패턴 (useState/useTransition/Dialog wrapper) 라 작성 자명.

**Type consistency:** `PostListItem`/`CommentItem` 타입 — queries.ts 에서 정의, 컴포넌트들이 import. `ActionResult` — actions.ts 단일 정의. `toggleLike` 의 `{liked: boolean}` 반환 — LikeButton 의 optimistic update 와 일치.

**한 번에 진행 흐름:** 사용자 "마지막 확인" 요청 → commit 분리:
1. migration (Task 1)
2. server (Task 2-3)
3. layout/nav 변경 (Task 12 분리하면 사이드바 badge)
4. UI 전체 (Task 4-11, 13, 14)

→ 위젯 plan 과 같은 패턴으로 3~4 commit 으로 압축. 사용자 시각 확인은 Task 14 한 번.
