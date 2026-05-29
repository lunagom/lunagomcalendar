// features/expense/components/assets/AssetColorPicker.tsx
"use client";

import { Check } from "lucide-react";
import { ASSET_COLOR_PALETTE } from "../../lib/asset-colors";

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function AssetColorPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {ASSET_COLOR_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`색 ${c}`}
          onClick={() => onChange(c)}
          className="relative h-8 w-8 rounded-full transition-transform active:scale-90 hover:scale-105"
          style={{ backgroundColor: c }}
        >
          {value.toLowerCase() === c.toLowerCase() && (
            <Check
              size={16}
              className="absolute inset-0 m-auto text-white drop-shadow"
              strokeWidth={3}
            />
          )}
        </button>
      ))}
    </div>
  );
}
