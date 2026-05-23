// features/expense/components/CategoryTotalsBar.tsx
import { getCategoryColor } from "@/lib/colors";

type Props = {
  /** { 식비: 250000, 교통: 120000, ... } — 0원은 표시 안 됨. */
  totals: Record<string, number>;
};

/**
 * 이번 달 카테고리별 지출을 칩 한 줄로 표시.
 * 정보형 톤 — 잔소리 없이 한눈에 분포 확인.
 */
export function CategoryTotalsBar({ totals }: Props) {
  const entries = Object.entries(totals)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]); // 큰 금액 순

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        이번 달 지출이 아직 없어요.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([category, amount]) => (
        <div
          key={category}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 text-xs"
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: getCategoryColor(category) }}
          />
          <span>{category}</span>
          <span className="font-medium tabular-nums">
            {amount.toLocaleString("ko-KR")}원
          </span>
        </div>
      ))}
    </div>
  );
}
