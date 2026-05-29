// features/expense/components/assets/AssetsSummaryHeader.tsx
"use client";

import { ASSET_TYPE_SIGN, type AssetType } from "../../lib/asset-types";
import type { AssetRow } from "../../server/asset-queries";

type Props = {
  assets: AssetRow[];
};

function formatKrw(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₩${Math.abs(n).toLocaleString("ko-KR")}`;
}

export function AssetsSummaryHeader({ assets }: Props) {
  let total = 0;
  let bankSum = 0;
  let cardDebt = 0;
  for (const a of assets) {
    const type = a.type as AssetType;
    total += ASSET_TYPE_SIGN[type] * a.balance;
    if (type === "bank" || type === "cash") bankSum += a.balance;
    if (type === "credit_card") cardDebt += a.balance;
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">총 자산 (순자산)</div>
        <div className="text-2xl font-bold tabular-nums">{formatKrw(total)}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">현금+은행</div>
          <div className="font-semibold tabular-nums">{formatKrw(bankSum)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">카드 누적</div>
          <div
            className={`font-semibold tabular-nums ${
              cardDebt > 0 ? "text-[#DC2626] dark:text-[#F87171]" : ""
            }`}
          >
            {cardDebt > 0 ? `-${formatKrw(cardDebt).replace("-", "")}` : "₩0"}
          </div>
        </div>
      </div>
    </div>
  );
}
