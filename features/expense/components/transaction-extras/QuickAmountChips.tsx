// features/expense/components/transaction-extras/QuickAmountChips.tsx
"use client";

const QUICK_AMOUNTS = [1000, 5000, 10000, 30000, 50000];

type Props = {
  onPick: (amount: number) => void;
};

export function QuickAmountChips({ onPick }: Props) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {QUICK_AMOUNTS.map((amt) => (
        <button
          key={amt}
          type="button"
          onClick={() => onPick(amt)}
          className="px-2.5 py-1 text-xs rounded-full border border-border/60 hover:bg-muted/40 active:scale-95 transition-all"
        >
          ₩{amt.toLocaleString("ko-KR")}
        </button>
      ))}
    </div>
  );
}
