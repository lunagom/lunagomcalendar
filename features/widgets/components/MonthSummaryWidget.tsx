// features/widgets/components/MonthSummaryWidget.tsx
import { TrendingUp } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { formatDelta } from "@/lib/colors";
import { getMonthSummary } from "../server/queries";

/**
 * 이번 달 월 요약 — 일회성 + 활성 정기 모두 포함.
 * 순수익 (큰 글씨) + 수입/지출 (작은 보조 줄).
 */
export async function MonthSummaryWidget() {
  let s: Awaited<ReturnType<typeof getMonthSummary>>;
  try {
    s = await getMonthSummary();
  } catch {
    return (
      <WidgetCard icon={TrendingUp} title="이번 달 월 요약" href="/expense">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  const net = s.totalIncome - s.totalExpense;
  const netClass =
    net > 0
      ? "text-[#16A34A] dark:text-[#4ADE80]"
      : net < 0
        ? "text-[#DC2626] dark:text-[#F87171]"
        : "text-muted-foreground";

  return (
    <WidgetCard icon={TrendingUp} title="이번 달 월 요약" href="/expense">
      <div>
        <p className="text-xs text-muted-foreground">순수익</p>
        <p className={`text-3xl font-bold tabular-nums ${netClass}`}>
          {formatDelta(net)}
        </p>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground tabular-nums">
        <span>
          수입{" "}
          <span className="font-medium text-[#16A34A] dark:text-[#4ADE80]">
            {formatDelta(s.totalIncome)}
          </span>
        </span>
        <span>
          지출{" "}
          <span className="font-medium text-[#DC2626] dark:text-[#F87171]">
            {formatDelta(-s.totalExpense)}
          </span>
        </span>
      </div>
    </WidgetCard>
  );
}
