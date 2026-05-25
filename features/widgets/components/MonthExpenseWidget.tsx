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
      <WidgetCard icon={Wallet} title="이번 달 지출" href="/expense">
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
    <WidgetCard icon={Wallet} title="이번 달 지출" href="/expense">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p
            className={`text-3xl font-bold tabular-nums ${over ? "text-red-600" : ""}`}
          >
            {fmt(actual)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {target != null ? `목표 ${fmt(target)}` : "월 목표 미설정"}
          </p>
        </div>
        {target != null && (
          <p
            className={`text-sm font-medium tabular-nums ${over ? "text-red-600" : "text-muted-foreground"}`}
          >
            {over ? `+${fmt(actual - target)}` : `-${fmt(target - actual)}`}
          </p>
        )}
      </div>
      {target != null && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${over ? "bg-red-600" : "bg-primary"} transition-[width]`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </WidgetCard>
  );
}
