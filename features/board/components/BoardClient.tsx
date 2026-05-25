"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PostCard } from "./PostCard";
import { PostDetailDialog } from "./PostDetailDialog";
import { NewPostDialog } from "./NewPostDialog";
import { markBoardRead } from "../server/actions";
import type { PostListItem } from "../server/queries";
import type { CalendarRow } from "@/features/calendar/server/queries";

type Props = {
  calendars: CalendarRow[];
  currentCalendarId: string | null;
  posts: PostListItem[];
  currentUserId: string;
};

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

  // 캘린더 없음 — 빈 상태
  if (calendars.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-6 text-center">
        <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-25" />
        <p className="mt-3 text-muted-foreground">
          공유 캘린더가 없어요.{" "}
          <Link href="/settings" className="text-primary hover:underline">
            캘린더 설정
          </Link>{" "}
          에서 멤버를 초대하면 게시판이 열려요.
        </p>
      </div>
    );
  }

  const handleSwitchCalendar = (id: string) => {
    router.push(`/board?cal=${id}`);
  };

  return (
    <>
      <div className="container mx-auto max-w-3xl px-4 py-4">
        {/* 캘린더 탭 */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto">
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
          <Button
            size="sm"
            onClick={() => setNewPostOpen(true)}
            disabled={!currentCalendarId}
            className="ml-auto shrink-0 gap-1"
          >
            <Plus className="h-4 w-4" />
            새 글
          </Button>
        </div>

        {/* 글 목록 */}
        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 opacity-25" />
            <p className="text-sm">아직 글이 없어요</p>
            <p className="text-xs">새 글로 멤버와 대화를 시작해보세요</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.id}>
                <PostCard post={p} onClick={() => setOpenPostId(p.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>

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
