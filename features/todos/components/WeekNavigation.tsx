// features/todos/components/WeekNavigation.tsx
"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatWeekRange, shiftWeek, getWeekStart } from "../lib/week";

type Props = {
  weekStartIso: string;
  /** 현재 이번 주를 보고 있나? "오늘" 버튼 노출 기준. */
  isCurrentWeek: boolean;
  onOpenRecurring: () => void;
};

export function WeekNavigation({
  weekStartIso,
  isCurrentWeek,
  onOpenRecurring,
}: Props) {
  const router = useRouter();

  const go = (deltaWeeks: number) => {
    const target = deltaWeeks === 0
      ? getWeekStart(new Date())
      : shiftWeek(weekStartIso, deltaWeeks);
    router.push(`/todos?week=${target}`);
  };

  // 키보드 좌우/T 단축키
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        go(0);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  // go uses weekStartIso via closure; recompute on change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartIso]);

  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <h1 className="text-2xl font-bold">주간 할 일</h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          {formatWeekRange(weekStartIso)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenRecurring}
          className="gap-1.5"
        >
          <Repeat className="h-3.5 w-3.5" />
          반복 추가
        </Button>
        {!isCurrentWeek && (
          <Button size="sm" variant="ghost" onClick={() => go(0)}>
            이번 주
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => go(-1)}
          aria-label="이전 주"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => go(1)}
          aria-label="다음 주"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
