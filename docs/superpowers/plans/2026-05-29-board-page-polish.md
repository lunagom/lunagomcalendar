# 게시판 페이지 폴리시 + 실시간 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 게시판 페이지에 페이지 헤더 + stagger 진입 + 모바일 FAB + Post/Like 마이크로 인터랙션 + Supabase Realtime 추가.

**Architecture:** 4개 신규 (BoardPageHeader, BoardFloatingActionButton, useBoardRealtime, usePostDetailRealtime) + 4개 수정 (BoardClient, PostCard, LikeButton, PostDetailDialog). framer-motion + supabase realtime.

**Tech Stack:** Next.js 14, React 18, framer-motion, @supabase/ssr (Realtime channel), shadcn/ui.

**Spec 출처:** `docs/superpowers/specs/2026-05-29-board-page-polish-design.md`

---

## File Structure

### Create
- `features/board/components/BoardPageHeader.tsx`
- `features/board/components/BoardFloatingActionButton.tsx`
- `features/board/hooks/use-board-realtime.ts`
- `features/board/hooks/use-post-detail-realtime.ts`

### Modify
- `features/board/components/BoardClient.tsx`
- `features/board/components/PostCard.tsx`
- `features/board/components/LikeButton.tsx`
- `features/board/components/PostDetailDialog.tsx`

---

## Task 1: BoardPageHeader

**Files:**
- Create: `features/board/components/BoardPageHeader.tsx`

- [ ] **Step 1: 작성**

```tsx
"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalendarRow } from "@/features/calendar/server/queries";

type Props = {
  currentCalendar: CalendarRow | null;
  canCreate: boolean;
  onNewPost: () => void;
};

/**
 * 게시판 페이지 헤더 — h1 + 현재 캘린더 부제 + 데스크탑 새 글 버튼.
 * 모바일 새 글은 BoardFloatingActionButton 으로 별도.
 */
export function BoardPageHeader({
  currentCalendar,
  canCreate,
  onNewPost,
}: Props) {
  return (
    <header className="space-y-2 mb-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">게시판</h1>
        <Button
          size="sm"
          onClick={onNewPost}
          disabled={!canCreate}
          className="hidden md:inline-flex gap-1.5 active:scale-[0.98] transition-transform"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          새 글
        </Button>
      </div>
      {currentCalendar && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: currentCalendar.color }}
          />
          {currentCalendar.name}
        </p>
      )}
    </header>
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add features/board/components/BoardPageHeader.tsx
git commit -m "$(cat <<'EOF'
feat(board): BoardPageHeader — h1 + 캘린더명 부제 + 데스크탑 새 글 버튼

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: BoardFloatingActionButton

**Files:**
- Create: `features/board/components/BoardFloatingActionButton.tsx`

- [ ] **Step 1: 작성**

```tsx
"use client";

import { Plus } from "lucide-react";

type Props = {
  onClick: () => void;
  disabled: boolean;
};

/**
 * 모바일 전용 + 새 글 FAB. 데스크탑은 헤더 안 버튼 사용.
 */
export function BoardFloatingActionButton({ onClick, disabled }: Props) {
  if (disabled) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="md:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform flex items-center justify-center"
      aria-label="새 글 작성"
    >
      <Plus className="h-6 w-6" strokeWidth={2.2} />
    </button>
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add features/board/components/BoardFloatingActionButton.tsx
git commit -m "$(cat <<'EOF'
feat(board): BoardFloatingActionButton — 모바일 + 새 글 FAB

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: PostCard 마이크로 인터랙션

**Files:**
- Modify: `features/board/components/PostCard.tsx`

- [ ] **Step 1: Read 현재 파일**

- [ ] **Step 2: hover lift + active scale 추가**

기존 className 에서 hover 효과 강화. 카드 wrapper className 에 다음 추가:
- `transition-all duration-200`
- `hover:-translate-y-0.5`
- `hover:shadow-md`
- `active:scale-[0.99]`

기존 `hover:border-primary/60` 등은 유지. 통합 형태:

```tsx
className="... rounded-lg border bg-card p-4 transition-all duration-200 hover:border-primary/60 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] cursor-pointer"
```

(기존 className 패턴에 맞춰서 통합 — 기존 hover/border 클래스 보존)

- [ ] **Step 3: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 4: Commit**

```bash
git add features/board/components/PostCard.tsx
git commit -m "$(cat <<'EOF'
feat(board): PostCard hover lift + shadow + active scale 피드백

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: LikeButton heart pulse + AnimatedNumber

**Files:**
- Modify: `features/board/components/LikeButton.tsx`

- [ ] **Step 1: 전체 파일 교체**

`features/board/components/LikeButton.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { AnimatedNumber } from "@/features/widgets/components/AnimatedNumber";
import { toggleLike } from "../server/actions";

type Props = {
  targetType: "post" | "comment";
  targetId: string;
  count: number;
  liked: boolean;
};

export function LikeButton({ targetType, targetId, count, liked }: Props) {
  const [optimistic, setOptimistic] = useState({ count, liked });
  const [pending, startTransition] = useTransition();
  const [pulseKey, setPulseKey] = useState(0);

  const handle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLiked = !optimistic.liked;
    const nextCount = optimistic.count + (nextLiked ? 1 : -1);
    setOptimistic({ count: nextCount, liked: nextLiked });
    setPulseKey((k) => k + 1);
    startTransition(async () => {
      const r = await toggleLike({ target_type: targetType, target_id: targetId });
      if (!r.ok) {
        toast.error(r.error);
        setOptimistic({ count, liked });
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className={`inline-flex items-center gap-1 text-xs transition-colors ${
        optimistic.liked
          ? "text-red-600"
          : "text-muted-foreground hover:text-foreground"
      }`}
      aria-label={optimistic.liked ? "좋아요 취소" : "좋아요"}
    >
      <motion.span
        key={pulseKey}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <Heart
          className="h-3.5 w-3.5"
          fill={optimistic.liked ? "currentColor" : "none"}
          strokeWidth={1.8}
        />
      </motion.span>
      {optimistic.count > 0 && (
        <AnimatedNumber value={optimistic.count} className="tabular-nums" />
      )}
    </button>
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add features/board/components/LikeButton.tsx
git commit -m "$(cat <<'EOF'
feat(board): LikeButton heart scale pulse + 카운트 AnimatedNumber

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: useBoardRealtime hook

**Files:**
- Create: `features/board/hooks/use-board-realtime.ts`

- [ ] **Step 1: 작성**

`features/board/hooks/use-board-realtime.ts` 생성:

```ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Props = {
  calendarId: string;
  currentUserId: string;
};

/**
 * 현재 캘린더의 board_posts 변경을 구독.
 * - INSERT (다른 사용자): 토스트 + router.refresh()
 * - UPDATE / DELETE: 조용히 refresh
 *
 * Supabase Dashboard 에서 board_posts 테이블의 Realtime 활성화 필요.
 */
export function useBoardRealtime({ calendarId, currentUserId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`board:${calendarId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "board_posts",
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          const newPost = payload.new as { author_id?: string };
          if (newPost.author_id && newPost.author_id !== currentUserId) {
            toast.info("새 글이 도착했어요");
          }
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "board_posts",
          filter: `calendar_id=eq.${calendarId}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "board_posts",
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [calendarId, currentUserId, router]);
}
```

- [ ] **Step 2: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add features/board/hooks/use-board-realtime.ts
git commit -m "$(cat <<'EOF'
feat(board): useBoardRealtime — board_posts INSERT/UPDATE/DELETE 구독

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: usePostDetailRealtime hook

**Files:**
- Create: `features/board/hooks/use-post-detail-realtime.ts`

- [ ] **Step 1: 작성**

`features/board/hooks/use-post-detail-realtime.ts` 생성:

```ts
"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  postId: string | null;
  /** 변경 감지 시 호출 (예: PostDetailDialog 의 load 함수). */
  onChange: () => void;
};

/**
 * 열린 글의 댓글/좋아요 변경 구독.
 * Supabase Dashboard 에서 board_comments + board_likes Realtime 활성화 필요.
 */
export function usePostDetailRealtime({ postId, onChange }: Props) {
  useEffect(() => {
    if (!postId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`post:${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "board_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => onChange(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "board_likes",
          filter: `target_id=eq.${postId}`,
        },
        () => onChange(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [postId, onChange]);
}
```

- [ ] **Step 2: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add features/board/hooks/use-post-detail-realtime.ts
git commit -m "$(cat <<'EOF'
feat(board): usePostDetailRealtime — board_comments + board_likes 구독

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: BoardClient 통합 (헤더 + stagger + FAB + realtime)

**Files:**
- Modify: `features/board/components/BoardClient.tsx`

- [ ] **Step 1: 전체 교체**

`features/board/components/BoardClient.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { EmptyState } from "@/components/ui/empty-state";
import { BoardPageHeader } from "./BoardPageHeader";
import { BoardFloatingActionButton } from "./BoardFloatingActionButton";
import { PostCard } from "./PostCard";
import { PostDetailDialog } from "./PostDetailDialog";
import { NewPostDialog } from "./NewPostDialog";
import { markBoardRead } from "../server/actions";
import { useBoardRealtime } from "../hooks/use-board-realtime";
import type { PostListItem } from "../server/queries";
import type { CalendarRow } from "@/features/calendar/server/queries";

type Props = {
  calendars: CalendarRow[];
  currentCalendarId: string | null;
  posts: PostListItem[];
  currentUserId: string;
};

const stagger = (idx: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: idx * 0.06, ease: "easeOut" as const },
});

export function BoardClient({
  calendars,
  currentCalendarId,
  posts,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [openPostId, setOpenPostId] = useState<string | null>(null);

  // 페이지/캘린더 진입 시 마지막 본 시각 갱신
  useEffect(() => {
    if (currentCalendarId) void markBoardRead(currentCalendarId);
  }, [currentCalendarId]);

  // Supabase Realtime — currentCalendarId 가 있을 때만
  useBoardRealtime({
    calendarId: currentCalendarId ?? "",
    currentUserId,
  });

  const currentCalendar = useMemo(
    () => calendars.find((c) => c.id === currentCalendarId) ?? null,
    [calendars, currentCalendarId],
  );

  // 캘린더 없음 — 빈 상태
  if (calendars.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <EmptyState message="공유 캘린더가 없어요. 캘린더 설정에서 멤버를 초대하면 게시판이 열려요." />
      </div>
    );
  }

  const handleSwitchCalendar = (id: string) => {
    router.push(`/board?cal=${id}`);
  };

  return (
    <>
      <div className="container mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8 space-y-4">
        <motion.div {...stagger(0)}>
          <BoardPageHeader
            currentCalendar={currentCalendar}
            canCreate={currentCalendarId != null}
            onNewPost={() => setNewPostOpen(true)}
          />
        </motion.div>

        <motion.div {...stagger(1)}>
          <div className="flex items-center gap-2 overflow-x-auto">
            {calendars.map((cal) => {
              const active = cal.id === currentCalendarId;
              return (
                <button
                  key={cal.id}
                  type="button"
                  onClick={() => handleSwitchCalendar(cal.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
                    active
                      ? "border-primary bg-primary/10 font-medium"
                      : "hover:bg-muted/60"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: cal.color }}
                    aria-hidden
                  />
                  {cal.name}
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div {...stagger(2)}>
          {posts.length === 0 ? (
            <EmptyState
              message="아직 글이 없어요. 새 글로 멤버와 대화를 시작해보세요."
              action={{ label: "새 글 작성", onClick: () => setNewPostOpen(true) }}
            />
          ) : (
            <ul className="space-y-3">
              {posts.map((p) => (
                <li key={p.id}>
                  <PostCard post={p} onClick={() => setOpenPostId(p.id)} />
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>

      <BoardFloatingActionButton
        onClick={() => setNewPostOpen(true)}
        disabled={!currentCalendarId}
      />

      {currentCalendarId && (
        <NewPostDialog
          open={newPostOpen}
          onOpenChange={setNewPostOpen}
          calendarId={currentCalendarId}
        />
      )}

      {currentCalendarId && (
        <PostDetailDialog
          postId={openPostId}
          onClose={() => setOpenPostId(null)}
          currentUserId={currentUserId}
          calendarId={currentCalendarId}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: 타입체크 + 페이지 200**

```bash
pnpm tsc --noEmit
curl -s -o /dev/null -w "/board: %{http_code}\n" http://localhost:3000/board
```
Expected: tsc 0, curl 307

- [ ] **Step 3: Commit**

```bash
git add features/board/components/BoardClient.tsx
git commit -m "$(cat <<'EOF'
feat(board): BoardClient 통합 — 신규 헤더 + stagger + FAB + Realtime

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: PostDetailDialog 에 Realtime 적용

**Files:**
- Modify: `features/board/components/PostDetailDialog.tsx`

- [ ] **Step 1: Read + import 추가**

`PostDetailDialog.tsx` 의 상단 import 영역에:
```tsx
import { useCallback } from "react";
import { usePostDetailRealtime } from "../hooks/use-post-detail-realtime";
```

(useCallback 은 onChange 안정화용)

- [ ] **Step 2: load 호출을 useCallback 으로 래핑**

기존 `load` 함수를 useCallback 으로:

```tsx
const load = useCallback(async (id: string) => {
  setLoading(true);
  const r = await fetchPostDetail(id);
  setLoading(false);
  if (r.ok) {
    setPost(r.data.post);
    setComments(r.data.comments);
  } else {
    toast.error(r.error);
  }
}, []);
```

기존 useEffect 의 dependency 도 [postId, load] 로.

- [ ] **Step 3: usePostDetailRealtime 호출**

기존 useEffect 다음에 추가:

```tsx
const handleRealtimeChange = useCallback(() => {
  if (postId) void load(postId);
}, [postId, load]);

usePostDetailRealtime({ postId, onChange: handleRealtimeChange });
```

- [ ] **Step 4: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 5: Commit**

```bash
git add features/board/components/PostDetailDialog.tsx
git commit -m "$(cat <<'EOF'
feat(board): PostDetailDialog 에 usePostDetailRealtime 적용 — 댓글/좋아요 실시간

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Supabase Dashboard Realtime 활성화 안내

**사용자 수동 작업 (코드 변경 없음).**

- [ ] **Step 1: 사용자 안내**

Supabase Dashboard 에서 다음 작업 안내:
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (prod: rhtnszvdeqmacwawnznj)
3. Database → Publications → `supabase_realtime`
4. `board_posts`, `board_comments`, `board_likes` 테이블 활성화
5. dev (rkqtcuaifhwyyzbavhio) 에도 동일 적용

(코드는 이미 채널 구독 시도 — 활성화 안 하면 이벤트 안 옴, 에러는 안 남)

---

## Task 10: 최종 회귀 + push

- [ ] **Step 1: 전체 검증**

```bash
cd /c/dev/lunabear-calendar
pnpm tsc --noEmit
pnpm lint
curl -s -o /dev/null -w "/board: %{http_code}\n" http://localhost:3000/board
```
Expected: tsc 0, lint clean, curl 307

- [ ] **Step 2: 시각 회귀 (playwright)**

`/board` 진입:
- 헤더 "게시판" h1 + 캘린더명 부제
- 데스크탑: `+ 새 글` 헤더 우측
- 모바일: FAB 우측 하단
- 진입 시 헤더 → 탭 → 목록 stagger
- 캘린더 탭 클릭 시 전환 정상
- 글 있으면 PostCard hover 시 lift + shadow
- 글 클릭 → PostDetailDialog
- LikeButton 클릭 시 heart pulse + 카운트 변경

### Realtime 검증 (Supabase 활성화 후)
- 두 브라우저 (시크릿창) 로그인
- A 에서 새 글 작성 → B 에서 토스트 + 자동 갱신
- A 에서 댓글 → B 의 PostDetailDialog 갱신

- [ ] **Step 3: Push**

```bash
git push origin main
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 페이지 헤더 → Task 1
- ✅ 모바일 FAB → Task 2
- ✅ PostCard 마이크로 → Task 3
- ✅ LikeButton heart pulse + AnimatedNumber → Task 4
- ✅ useBoardRealtime → Task 5
- ✅ usePostDetailRealtime → Task 6
- ✅ BoardClient 통합 → Task 7
- ✅ PostDetailDialog 적용 → Task 8
- ✅ Supabase Dashboard 안내 → Task 9
- ✅ 회귀 → Task 10

**2. Placeholder scan:** Task 3, 8 에 "Read 현재 파일" 안내 있음 — 패턴 확인 위해 의도적.

**3. Type consistency:** CalendarRow, PostListItem 등 기존 타입 활용. 신규 hook props 가 BoardClient 와 일관.

**4. 의존성 순서:**
- Task 1-6 — 모두 독립
- Task 7 — Task 1, 2, 5 후 (import)
- Task 8 — Task 6 후 (import)
- Task 9 — 사용자 수동
- Task 10 — 모두 후

권장 순서: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
