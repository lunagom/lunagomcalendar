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
