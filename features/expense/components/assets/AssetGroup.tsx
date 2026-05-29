// features/expense/components/assets/AssetGroup.tsx
"use client";

import { AssetCard } from "./AssetCard";
import {
  ASSET_TYPE_LABELS,
  ASSET_TYPE_ICONS,
  type AssetType,
} from "../../lib/asset-types";
import type { AssetRow } from "../../server/asset-queries";

type Props = {
  type: AssetType;
  assets: AssetRow[];
  /** 전체 자산 (linked 이름 해석용). */
  allAssets: AssetRow[];
  onCardClick?: (asset: AssetRow) => void;
  onEditAsset?: (asset: AssetRow) => void;
  /** 신용카드 그룹에서 정산 가능한 카드 ID 들 — CreditCardSettleButton 표시용. */
  settlementCardIds?: Set<string>;
  renderSettleButton?: (asset: AssetRow) => React.ReactNode;
};

function formatKrw(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₩${Math.abs(n).toLocaleString("ko-KR")}`;
}

export function AssetGroup({
  type,
  assets,
  allAssets,
  onCardClick,
  onEditAsset,
  settlementCardIds,
  renderSettleButton,
}: Props) {
  if (assets.length === 0) return null;

  const Icon = ASSET_TYPE_ICONS[type];
  const groupSum = assets.reduce((s, a) => s + a.balance, 0);
  const showGroupSum = type !== "debit_card";

  const linkedNameOf = (a: AssetRow): string | undefined => {
    if (!a.linked_asset_id) return undefined;
    return allAssets.find((x) => x.id === a.linked_asset_id)?.name;
  };

  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Icon size={16} strokeWidth={1.8} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold">{ASSET_TYPE_LABELS[type]}</h3>
        </div>
        {showGroupSum && (
          <div className="text-sm font-medium tabular-nums text-muted-foreground">
            {formatKrw(type === "credit_card" ? -groupSum : groupSum)}
          </div>
        )}
      </header>

      <div className="space-y-1.5">
        {assets.map((a) => (
          <div key={a.id} className="space-y-1.5">
            <AssetCard
              asset={a}
              linkedBankName={linkedNameOf(a)}
              onClick={() => onCardClick?.(a)}
              onEdit={() => onEditAsset?.(a)}
            />
            {type === "credit_card" &&
              settlementCardIds?.has(a.id) &&
              renderSettleButton?.(a)}
          </div>
        ))}
      </div>
    </section>
  );
}
