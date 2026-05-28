# 게시판 페이지 폴리시 + 실시간 강화 — Spec

**작성일**: 2026-05-29
**주제**: 게시판 페이지 (`app/(app)/board/page.tsx`) UX 향상 — 헤더 + stagger + 모바일 FAB + Post/Like 마이크로 + Supabase Realtime

## Context

홈 → 캘린더 → 가계부 → 할 일 폴리시 prod 반영 완료. 게시판 페이지 차례.

현재 게시판 (`BoardClient`):
- ✅ EmptyState 사용 중 (캘린더 없음 / 글 없음)
- ✅ 캘린더 탭 (색 점 + 이름)
- ✅ `+ 새 글` 버튼 우측
- ❌ 페이지 헤더 없음 (h1 부재 — 다른 페이지 톤과 불일치)
- ❌ 진입 애니메이션 없음
- ❌ 모바일 FAB 없음
- ⚠️ PostCard hover 피드백 약함
- ⚠️ LikeButton 클릭 마이크로 없음
- ❌ 실시간 업데이트 없음 (다른 사용자의 새 글/댓글/좋아요 보려면 페이지 새로고침)

사용자가 4가지 옵션 중 **🅒 최대치 (폴리시 + 실시간)** 선택.

## Scope (in)

### 페이지 헤더
- h1 "게시판" (text-2xl bold)
- 부제: 현재 선택된 캘린더명 (with color dot)
- 데스크탑 `+ 새 글` 버튼 헤더 안에

### Stagger 진입 애니메이션
- 페이지 진입 시 60ms 간격 fade-in + slide-up:
  - PageHeader (0ms)
  - 캘린더 탭 (60ms)
  - 글 목록 또는 빈 상태 (120ms)
- framer-motion 활용

### 모바일 FAB
- 우측 하단 `+` 버튼 (캘린더/가계부/할일 패턴 재사용)
- 탭 시 NewPostDialog 오픈
- 캘린더 미선택 시 비활성

### PostCard 마이크로 인터랙션
- hover lift: `-translate-y-0.5 + shadow-md` (이미 일부 적용 — 강화)
- 클릭 시 짧은 scale 피드백 (`active:scale-[0.99]`)
- 진입 시 fade-in (stagger 안에서)

### LikeButton heart pulse
- 좋아요 클릭 시 heart 아이콘 짧은 scale pulse + 색 변화 부드럽게
- 좋아요 카운트 AnimatedNumber

### Supabase Realtime
- BoardClient: `board_posts` 테이블 INSERT/UPDATE/DELETE 구독
  - 새 글 INSERT (다른 사용자) → 상단에 토스트 "새 글이 도착했어요" + 자동 router.refresh()
  - 내가 새로고침 후 보이게
- PostDetailDialog 열려있을 때: 해당 글의 `board_comments` + `board_likes` 구독
  - 댓글/좋아요 변경 → router.refresh() 또는 다이얼로그 데이터 재조회
- Realtime channel 은 컴포넌트 unmount 시 정리

## Scope (out)

- 알림 시스템 자체 변경 (notifications 테이블 그대로)
- 글 검색/필터 기능
- 글 알림 push (브라우저 알림)
- WYSIWYG 에디터 (현재 plain text 유지)

## 디자인

### 1. 페이지 헤더 (BoardPageHeader 신규)

신규 `features/board/components/BoardPageHeader.tsx`:

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

export function BoardPageHeader({ currentCalendar, canCreate, onNewPost }: Props) {
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

### 2. Stagger 진입

`BoardClient.tsx` 의 메인 영역을 framer-motion stagger 로 감쌈:

```tsx
import { motion } from "framer-motion";

const stagger = (idx: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: idx * 0.06, ease: "easeOut" as const },
});

<motion.div {...stagger(0)}><BoardPageHeader ... /></motion.div>
<motion.div {...stagger(1)}>{캘린더 탭}</motion.div>
<motion.div {...stagger(2)}>{글 목록 또는 EmptyState}</motion.div>
```

### 3. 모바일 FAB (BoardFloatingActionButton)

신규 `features/board/components/BoardFloatingActionButton.tsx`:

```tsx
"use client";

import { Plus } from "lucide-react";

type Props = {
  onClick: () => void;
  disabled: boolean;
};

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

BoardClient 에서 newPostOpen state 와 함께 마운트.

### 4. PostCard 마이크로 인터랙션

`PostCard.tsx` 수정:
- 기존 hover 효과 강화: `hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`
- 클릭 피드백: `active:scale-[0.99]`
- 진입 fade-in 은 부모 stagger 가 처리

### 5. LikeButton heart pulse

`LikeButton.tsx` 수정:
- 좋아요 클릭 시 heart 아이콘 scale pulse `[1, 1.3, 1]` 200ms
- 좋아요 카운트는 AnimatedNumber 적용

framer-motion `motion.span` 또는 `useAnimate`.

### 6. Supabase Realtime — board_posts

신규 lib `features/board/hooks/use-board-realtime.ts`:

```tsx
"use client";

import { useEffect, useRef } from "react";
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
 * - UPDATE / DELETE: 조용히 refresh (해당 글 카드/목록 갱신)
 */
export function useBoardRealtime({ calendarId, currentUserId }: Props) {
  const router = useRouter();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

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
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [calendarId, currentUserId, router]);
}
```

BoardClient 에서 `useBoardRealtime({ calendarId: currentCalendarId, currentUserId })` 호출 (currentCalendarId 가 있을 때만).

### 7. Supabase Realtime — comments + likes (PostDetailDialog)

신규 hook `features/board/hooks/use-post-detail-realtime.ts`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  postId: string | null;
};

/**
 * 열린 글의 댓글/좋아요 변경 구독.
 * 모든 이벤트 → router.refresh() (PostDetailDialog 는 fetchPostDetail action 으로 재조회).
 */
export function usePostDetailRealtime({ postId }: Props) {
  const router = useRouter();

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
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "board_likes",
          filter: `target_id=eq.${postId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, router]);
}
```

PostDetailDialog 에서 활용.

### Supabase Dashboard 설정 (수동)

코드만으로는 안 됨 — Supabase Dashboard 에서:
1. Database → Replication → "Sources" 에 `board_posts`, `board_comments`, `board_likes` 추가
2. 또는 Settings → API → Realtime 에서 해당 테이블 활성화

본 spec 의 구현 단계에서 dashboard 작업 안내 + 검증 단계 포함.

## 구현 전략

### 파일 구조

#### Create
- `features/board/components/BoardPageHeader.tsx`
- `features/board/components/BoardFloatingActionButton.tsx`
- `features/board/hooks/use-board-realtime.ts`
- `features/board/hooks/use-post-detail-realtime.ts`

#### Modify
- `features/board/components/BoardClient.tsx` — 헤더, stagger, FAB 마운트, useBoardRealtime 호출
- `features/board/components/PostCard.tsx` — hover lift 강화, active scale
- `features/board/components/LikeButton.tsx` — heart pulse + AnimatedNumber
- `features/board/components/PostDetailDialog.tsx` — usePostDetailRealtime 호출

### 작업 순서

1. BoardPageHeader
2. BoardFloatingActionButton
3. PostCard 마이크로 인터랙션
4. LikeButton heart pulse + AnimatedNumber
5. useBoardRealtime hook
6. usePostDetailRealtime hook
7. BoardClient 통합 (헤더 + stagger + FAB + realtime)
8. PostDetailDialog realtime 마운트
9. Supabase Dashboard Realtime 활성화 (사용자 수동)
10. 최종 회귀 + push

### 작업 분량

| 단계 | 시간 |
|---|---|
| 1. BoardPageHeader | 30분 |
| 2. BoardFloatingActionButton | 20분 |
| 3. PostCard 마이크로 | 30분 |
| 4. LikeButton pulse + AnimatedNumber | 40분 |
| 5. useBoardRealtime hook | 1시간 |
| 6. usePostDetailRealtime hook | 30분 |
| 7. BoardClient 통합 | 1시간 |
| 8. PostDetailDialog 적용 | 30분 |
| 9. Supabase Dashboard | 사용자 수동 ~10분 |
| 10. 최종 회귀 + 모바일 + 다른 계정 테스트 | 1.5시간 |
| **합계** | **6.5~8시간** |

## 검증

### 단계마다
- `pnpm tsc --noEmit` 통과
- `pnpm lint` 통과
- `/board` 200 응답

### Realtime 검증
- 두 사용자 (or 시크릿 창) 동시 접속
- 한쪽에서 새 글 작성 → 다른쪽 토스트 + 글 목록 갱신
- 한쪽에서 좋아요 → 다른쪽 카운트 갱신

### 최종 체크리스트
- [ ] 페이지 헤더 "게시판" h1 + 캘린더명 부제
- [ ] 데스크탑: `+ 새 글` 헤더 우측
- [ ] 모바일: FAB 우측 하단 보임
- [ ] 진입 시 헤더 → 탭 → 목록 stagger fade-in
- [ ] PostCard hover lift + shadow
- [ ] LikeButton 클릭 시 heart pulse
- [ ] 좋아요 카운트 AnimatedNumber
- [ ] Realtime: 새 글 작성 시 다른 클라이언트 토스트 + 자동 새로고침
- [ ] Realtime: 댓글/좋아요 변경 시 PostDetailDialog 자동 갱신
- [ ] 다크모드 정상

### 회귀
- 글 작성 / 수정 / 삭제 정상
- 댓글 작성 / 삭제 정상
- 좋아요 토글 정상
- 캘린더 탭 전환 정상
- markBoardRead 동작 정상

## 위험 (Known unknowns)

- Supabase Dashboard Realtime 활성화 안 하면 채널 구독은 되지만 이벤트 안 옴 → 사용자 안내 필수
- Realtime 채널이 너무 자주 firing 하면 router.refresh() 폭주 가능 → debounce 안 함 (게시판은 트래픽 낮음 가정)
- RLS 가 realtime 이벤트 필터링 제대로 안 하면 다른 캘린더 멤버가 아닌 사용자에게 이벤트 도착 가능 (Supabase realtime + RLS 호환 확인 필요)
- 모바일 키보드 + 시트 충돌 (NewPostDialog 가 dialog 라 동일하지 않음 — OK)

## 미정 (별도 결정 필요)

- 실시간 알림 push (브라우저 알림 API) — 별도 작업
- 글 검색 기능 — 별도
- WYSIWYG / 마크다운 에디터 — 별도
