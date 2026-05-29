// features/expense/components/assets/AssetsTab.tsx
"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetsSummaryHeader } from "./AssetsSummaryHeader";
import { AssetGroup } from "./AssetGroup";
import { AssetModal } from "./AssetModal";
import { AssetDetailView } from "./AssetDetailView";
import { CreditCardSettleButton } from "./CreditCardSettleButton";
import { ASSET_TYPES, type AssetType } from "../../lib/asset-types";
import type { AssetRow } from "../../server/asset-queries";

type Props = {
  assets: AssetRow[];
  /** 결제일 도래 신용카드 ID 셋 (서버에서 계산). */
  settlementCardIds: string[];
};

export function AssetsTab({ assets, settlementCardIds }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AssetRow | null>(null);
  const [detailAsset, setDetailAsset] = useState<AssetRow | null>(null);

  const banks = useMemo(
    () => assets.filter((a) => a.type === "bank"),
    [assets],
  );
  const bankOptions = useMemo(
    () => assets.filter((a) => a.type === "bank" || a.type === "cash"),
    [assets],
  );
  const settlementSet = useMemo(
    () => new Set(settlementCardIds),
    [settlementCardIds],
  );

  const grouped = useMemo(() => {
    const g: Record<AssetType, AssetRow[]> = {
      cash: [],
      bank: [],
      debit_card: [],
      credit_card: [],
      savings_investment: [],
    };
    for (const a of assets) {
      g[a.type as AssetType].push(a);
    }
    return g;
  }, [assets]);

  if (detailAsset) {
    return (
      <AssetDetailView
        asset={detailAsset}
        allAssets={assets}
        onBack={() => setDetailAsset(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <AssetsSummaryHeader assets={assets} />

      <div className="space-y-5">
        {ASSET_TYPES.map((t) => (
          <AssetGroup
            key={t}
            type={t}
            assets={grouped[t]}
            allAssets={assets}
            onCardClick={(a) => setDetailAsset(a)}
            onEditAsset={(a) => setEditing(a)}
            settlementCardIds={settlementSet}
            renderSettleButton={(a) => (
              <CreditCardSettleButton card={a} bankOptions={bankOptions} />
            )}
          />
        ))}
      </div>

      <Button
        variant="outline"
        onClick={() => setShowAdd(true)}
        className="w-full justify-center"
      >
        <Plus size={16} strokeWidth={1.8} className="mr-2" />
        자산 추가
      </Button>

      {showAdd && (
        <AssetModal
          mode="create"
          open={showAdd}
          onOpenChange={setShowAdd}
          banks={banks}
        />
      )}
      {editing && (
        <AssetModal
          mode="edit"
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          initial={editing}
          banks={banks}
        />
      )}
    </div>
  );
}
