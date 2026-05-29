// features/expense/components/assets/AssetDetailView.tsx
// NOTE: This is a stub. Task 12 replaces this with the full implementation.
"use client";

import { ArrowLeft } from "lucide-react";
import type { AssetRow } from "../../server/asset-queries";

type Props = {
  asset: AssetRow;
  allAssets: AssetRow[];
  onBack: () => void;
};

export function AssetDetailView({ asset, onBack }: Props) {
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="p-1 -ml-1 rounded hover:bg-muted/60 active:scale-95 transition-transform"
          aria-label="뒤로"
        >
          <ArrowLeft size={20} strokeWidth={1.8} />
        </button>
        <h2 className="text-base font-semibold">자산 상세</h2>
      </header>
      <div className="rounded-xl border border-border/40 bg-card p-4">
        <div className="text-base font-medium">{asset.name}</div>
        <div className="text-xs text-muted-foreground mt-1">준비 중 (Task 12)</div>
      </div>
    </div>
  );
}
