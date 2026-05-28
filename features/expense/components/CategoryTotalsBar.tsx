// features/expense/components/CategoryTotalsBar.tsx
import { getCategoryColor, getIncomeCategoryColor } from "@/lib/colors";

type Props = {
  /** 지출 카테고리 합계. 0 원은 표시 안 됨. */
  expenseTotals: Record<string, number>;
  /** 수입 카테고리 합계. 0 원은 표시 안 됨. */
  incomeTotals: Record<string, number>;
};

/**
 * 카테고리 합계 칩 영역.
 * 위 줄 = 수입 (초록 톤 5색), 아래 줄 = 지출 (기존 카테고리 색).
 */
export function CategoryTotalsBar({ expenseTotals, incomeTotals }: Props) {
  const incomeEntries = Object.entries(incomeTotals)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const expenseEntries = Object.entries(expenseTotals)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  if (incomeEntries.length === 0 && expenseEntries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        이번 달 거래가 아직 없어요.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {incomeEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {incomeEntries.map(([category, amount]) => (
            <div
              key={"i-" + category}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/40 text-xs"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getIncomeCategoryColor(category) }}
              />
              <span>{category}</span>
              <span className="font-medium tabular-nums">
                +{amount.toLocaleString("ko-KR")}원
              </span>
            </div>
          ))}
        </div>
      )}
      {expenseEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {expenseEntries.map(([category, amount]) => (
            <div
              key={"e-" + category}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/40 text-xs"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getCategoryColor(category) }}
              />
              <span>{category}</span>
              <span className="font-medium tabular-nums">
                -{amount.toLocaleString("ko-KR")}원
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
