// features/expense/components/MonthSummaryWidget.tsx
import { Card } from "@/components/ui/card";
import { formatDelta } from "@/lib/colors";

type Props = {
  totalIncome: number;
  totalExpense: number;
};

/**
 * 월 요약 위젯 — 데스크톱은 카드 3개 가로, 모바일은 카드 1개 압축.
 * 순수익 = totalIncome - totalExpense. 양수 초록, 음수 빨강.
 */
export function MonthSummaryWidget({ totalIncome, totalExpense }: Props) {
  const net = totalIncome - totalExpense;
  const netClass =
    net > 0
      ? "text-[#16A34A] dark:text-[#4ADE80]"
      : net < 0
        ? "text-[#DC2626] dark:text-[#F87171]"
        : "text-muted-foreground";

  return (
    <>
      {/* 데스크톱: 카드 3 개 가로 */}
      <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr] sm:gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">순수익</p>
          <p className={`text-2xl font-bold tabular-nums ${netClass}`}>
            {formatDelta(net)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">수입</p>
          <p className="text-lg font-semibold tabular-nums text-[#16A34A] dark:text-[#4ADE80]">
            {formatDelta(totalIncome)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">지출</p>
          <p className="text-lg font-semibold tabular-nums text-[#DC2626] dark:text-[#F87171]">
            {formatDelta(-totalExpense)}
          </p>
        </Card>
      </div>

      {/* 모바일: 카드 1 개 압축 */}
      <Card className="p-3 sm:hidden">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground">순수익</span>
          <span className={`text-xl font-bold tabular-nums ${netClass}`}>
            {formatDelta(net)}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground tabular-nums">
          수입{" "}
          <span className="text-[#16A34A] dark:text-[#4ADE80]">
            {formatDelta(totalIncome)}
          </span>
          {" · "}
          지출{" "}
          <span className="text-[#DC2626] dark:text-[#F87171]">
            {formatDelta(-totalExpense)}
          </span>
        </div>
      </Card>
    </>
  );
}
