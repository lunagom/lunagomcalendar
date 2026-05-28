"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  todayDisabled?: boolean;
};

/**
 * 캘린더(월간/일간) 공통 헤더.
 * FullCalendar 자체 toolbar 를 끄고 이걸로 대체 — 모바일에서 prev/title/next 가
 * 한 줄로 안전하게 들어가고 데스크탑 가운데 정렬도 유지.
 */
export function CalendarHeaderBar({
  label,
  onPrev,
  onNext,
  onToday,
  todayDisabled,
}: Props) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b">
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrev}
          aria-label="이전"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
        </Button>
        <h2 className="text-base font-semibold px-1 whitespace-nowrap sm:text-lg">
          {label}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          aria-label="다음"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
        </Button>
      </div>
      <div className="flex-1 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          disabled={todayDisabled}
        >
          오늘
        </Button>
      </div>
    </div>
  );
}
