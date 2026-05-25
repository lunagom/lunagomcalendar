// features/widgets/components/MonthExpenseWidget.tsx
import { Wallet } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { getMonthExpenseSummary } from "../server/queries";

export async function MonthExpenseWidget() {
  let s: Awaited<ReturnType<typeof getMonthExpenseSummary>>;
  try {
    s = await getMonthExpenseSummary();
  } catch {
    return (
      <WidgetCard icon={Wallet} title="이번 달 지출">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  const { actual, target } = s;
  const fmt = (n: number) => `${n.toLocaleString("ko-KR")}원`;
  const pct =
    target != null && target > 0 ? Math.min(100, (actual / target) * 100) : 0;
  const over = target != null && actual > target;

  return (
    <WidgetCard icon={Wallet} title="이번 달 지출">
      <div className="flex items-baseline justify-between">
        <span
          className={`text-lg font-semibold tabular-nums ${over ? "text-red-600" : ""}`}
        >
          {fmt(actual)}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {target != null ? `목표 ${fmt(target)}` : "월 목표 미설정"}
        </span>
      </div>
      {target != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${over ? "bg-red-600" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {target != null && (
        <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
          {over
            ? `초과 ${fmt(actual - target)}`
            : `잔여 ${fmt(target - actual)}`}
        </p>
      )}
    </WidgetCard>
  );
}
