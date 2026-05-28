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
