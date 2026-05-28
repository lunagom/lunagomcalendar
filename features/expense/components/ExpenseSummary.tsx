"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { AnimatedNumber } from "@/features/widgets/components/AnimatedNumber";

type Props = {
  totalIncome: number;
  totalExpense: number;
};

/**
 * 가계부 페이지 요약 카드 그룹.
 * - 순수익을 큰 카드로 (좌측 또는 상단)
 * - 수입/지출을 작은 보조 카드 (우측 또는 하단 좌우)
 * - 색: 수입 green, 지출 red, 순수익 상태 기반
 * - 모든 숫자 AnimatedNumber (0 → 실제 부드럽게)
 */
export function ExpenseSummary({ totalIncome, totalExpense }: Props) {
  const net = totalIncome - totalExpense;
  const isPositive = net > 0;
  const isNeutral = net === 0;

  const netColorCls = isNeutral
    ? "text-muted-foreground"
    : isPositive
      ? "text-[#16A34A] dark:text-[#4ADE80]"
      : "text-[#DC2626] dark:text-[#F87171]";
  const NetIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* 순수익 — 데스크탑 2 컬럼 폭 */}
      <div className="rounded-lg border bg-card p-4 sm:col-span-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">순수익</p>
          {!isNeutral && (
            <NetIcon className={`h-4 w-4 ${netColorCls}`} strokeWidth={1.8} />
          )}
        </div>
        <p className={`mt-1 text-3xl font-bold tabular-nums ${netColorCls}`}>
          {isPositive ? "+" : isNeutral ? "" : "-"}
          <AnimatedNumber value={Math.abs(net)} unit="원" />
        </p>
      </div>

      {/* 수입 + 지출 — 모바일 가로 2개, 데스크탑 세로 stack */}
      <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">수입</p>
          <p className="text-lg font-semibold tabular-nums text-[#16A34A] dark:text-[#4ADE80]">
            +<AnimatedNumber value={totalIncome} unit="원" />
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">지출</p>
          <p className="text-lg font-semibold tabular-nums text-[#DC2626] dark:text-[#F87171]">
            -<AnimatedNumber value={totalExpense} unit="원" />
          </p>
        </div>
      </div>
    </div>
  );
}
