"use client";

import { Calendar, CheckSquare, TrendingUp, TrendingDown } from "lucide-react";
import { AnimatedNumber } from "@/features/widgets/components/AnimatedNumber";
import type { MonthlyStats } from "../lib/monthly-stats";

type Props = {
  stats: MonthlyStats;
  /** 모바일 컴팩트 모드 (작게). */
  compact?: boolean;
};

/**
 * 캘린더 헤더의 월간 통계 칩 3개 — 일정 / 할 일 / 순수익.
 * 데스크탑: text-sm, 모바일(compact): text-xs.
 */
export function CalendarMonthlyStatsChips({ stats, compact = false }: Props) {
  const sizeCls = compact ? "text-xs" : "text-sm";
  const iconCls = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  const isPositive = stats.net > 0;
  const isNeutral = stats.net === 0;
  const NetIcon = isPositive ? TrendingUp : TrendingDown;
  const netColor = isNeutral
    ? "text-muted-foreground"
    : isPositive
      ? "text-[#16A34A] dark:text-[#4ADE80]"
      : "text-[#DC2626] dark:text-[#F87171]";

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${sizeCls}`}>
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Calendar className={iconCls} strokeWidth={1.8} />
        <AnimatedNumber
          value={stats.eventCount}
          className="font-medium text-foreground tabular-nums"
        />
        <span>건</span>
      </span>
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <CheckSquare className={iconCls} strokeWidth={1.8} />
        <span className="font-medium text-foreground tabular-nums">
          {stats.todoDone}/{stats.todoTotal}
        </span>
      </span>
      {!isNeutral && (
        <span className={`inline-flex items-center gap-1 ${netColor}`}>
          <NetIcon className={iconCls} strokeWidth={1.8} />
          <span className="font-medium tabular-nums">
            {isPositive ? "+" : "-"}
            <AnimatedNumber value={Math.abs(stats.net)} />원
          </span>
        </span>
      )}
    </div>
  );
}
