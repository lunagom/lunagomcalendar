// features/widgets/components/CategoryExpenseWidget.tsx
import { BarChart3 } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { getCategoryTotals } from "../server/queries";
import { getCategoryColor } from "@/lib/colors";

export async function CategoryExpenseWidget() {
  let totals: Awaited<ReturnType<typeof getCategoryTotals>> = [];
  try {
    totals = await getCategoryTotals();
  } catch {
    return (
      <WidgetCard icon={BarChart3} title="카테고리별 지출">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  if (totals.length === 0) {
    return (
      <WidgetCard icon={BarChart3} title="카테고리별 지출">
        <p className="text-muted-foreground">이번 달 지출 없음</p>
      </WidgetCard>
    );
  }

  const max = totals[0].amount;
  const top5 = totals.slice(0, 5);

  return (
    <WidgetCard icon={BarChart3} title="카테고리별 지출">
      <ul className="space-y-1.5">
        {top5.map((t) => (
          <li key={t.category}>
            <div className="flex justify-between text-xs">
              <span>{t.category}</span>
              <span className="tabular-nums text-muted-foreground">
                {t.amount.toLocaleString("ko-KR")}원
              </span>
            </div>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(t.amount / max) * 100}%`,
                  backgroundColor: getCategoryColor(t.category),
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
