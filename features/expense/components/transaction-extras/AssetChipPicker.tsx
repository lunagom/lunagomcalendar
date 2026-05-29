// features/expense/components/transaction-extras/AssetChipPicker.tsx
"use client";

import { Check } from "lucide-react";
import { canReceiveIncome, type AssetType } from "../../lib/asset-types";
import type { AssetRow } from "../../server/asset-queries";

type Props = {
  assets: AssetRow[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** "income" 이면 카드 자산 비활성화. */
  kind: "expense" | "income";
};

export function AssetChipPicker({ assets, value, onChange, kind }: Props) {
  if (assets.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1.5 text-xs rounded-full border transition-all ${
          value === null
            ? "bg-muted border-foreground/30"
            : "border-border/60 hover:bg-muted/40"
        }`}
      >
        미지정
      </button>
      {assets.map((a) => {
        const disabled = kind === "income" && !canReceiveIncome(a.type as AssetType);
        const selected = value === a.id;
        return (
          <button
            key={a.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(a.id)}
            className={`flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1.5 text-xs rounded-full border transition-all ${
              selected
                ? "border-foreground/40 bg-muted"
                : "border-border/60 hover:bg-muted/40"
            } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
            title={disabled ? "이 자산엔 수입을 기록할 수 없습니다" : undefined}
          >
            <span
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: a.color }}
              aria-hidden
            />
            <span className="whitespace-nowrap">{a.name}</span>
            {selected && <Check size={12} strokeWidth={2.5} />}
          </button>
        );
      })}
    </div>
  );
}
