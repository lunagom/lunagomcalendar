"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventModal } from "./EventModal";
import { CalendarMonthlyStatsChips } from "./CalendarMonthlyStatsChips";
import type { CalendarRow } from "../server/queries";
import type { MonthlyStats } from "../lib/monthly-stats";

type Props = {
  monthLabel: string; // "2026년 5월"
  stats: MonthlyStats;
  calendars: CalendarRow[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 캘린더 페이지 헤더 — 월 라벨 + 네비/오늘 + 통계 칩 + 빠른 일정 추가.
 * 데스크탑: 가로 한 줄. 모바일: 2줄 (라벨/네비 / 통계).
 */
export function CalendarMonthHeader({
  monthLabel,
  stats,
  calendars,
  onPrev,
  onNext,
  onToday,
}: Props) {
  const [eventOpen, setEventOpen] = useState(false);
  const canCreate = calendars.length > 0;

  return (
    <>
      <header className="space-y-2 mb-4">
        {/* 라인 1: 월 라벨 + 네비 + 오늘 + (데스크탑) 통계 + 액션 */}
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tabular-nums">
            {monthLabel}
          </h1>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={onPrev}
              aria-label="이전 달"
              className="h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onNext}
              aria-label="다음 달"
              className="h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onToday}
              className="h-7"
            >
              오늘
            </Button>
          </div>

          {/* 데스크탑 통계 + 액션 */}
          <div className="ml-auto hidden md:flex items-center gap-3">
            <CalendarMonthlyStatsChips stats={stats} />
            <Button
              size="sm"
              onClick={() => setEventOpen(true)}
              disabled={!canCreate}
              className="gap-1.5 active:scale-[0.98] transition-transform"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              일정
            </Button>
          </div>
        </div>

        {/* 라인 2: 모바일 통계 (한 줄) */}
        <div className="md:hidden">
          <CalendarMonthlyStatsChips stats={stats} compact />
        </div>
      </header>

      {canCreate && (
        <EventModal
          open={eventOpen}
          onOpenChange={setEventOpen}
          calendars={calendars}
          defaultDate={todayIso()}
        />
      )}
    </>
  );
}
