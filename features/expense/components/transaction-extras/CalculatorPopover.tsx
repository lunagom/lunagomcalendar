// features/expense/components/transaction-extras/CalculatorPopover.tsx
"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Props = {
  onResult: (n: number) => void;
};

const KEYS: Array<{ label: string; value: string; col?: number }> = [
  { label: "C", value: "C" }, { label: "÷", value: "/" }, { label: "×", value: "*" }, { label: "←", value: "BS" },
  { label: "7", value: "7" }, { label: "8", value: "8" }, { label: "9", value: "9" }, { label: "−", value: "-" },
  { label: "4", value: "4" }, { label: "5", value: "5" }, { label: "6", value: "6" }, { label: "+", value: "+" },
  { label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" }, { label: "=", value: "=" },
  { label: "0", value: "0", col: 2 }, { label: "00", value: "00" }, { label: "↵", value: "OK" },
];

function evalSafe(expr: string): number | null {
  if (!/^[\d+\-*/.\s]+$/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const v = new Function(`return (${expr})`)();
    if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
    return null;
  } catch {
    return null;
  }
}

export function CalculatorPopover({ onResult }: Props) {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState("");

  const handleKey = (v: string) => {
    if (v === "C") {
      setExpr("");
      return;
    }
    if (v === "BS") {
      setExpr((s) => s.slice(0, -1));
      return;
    }
    if (v === "=") {
      const result = evalSafe(expr);
      if (result !== null) setExpr(String(result));
      return;
    }
    if (v === "OK") {
      const result = evalSafe(expr) ?? parseFloat(expr);
      if (Number.isFinite(result)) {
        onResult(Math.round(result));
        setOpen(false);
        setExpr("");
      }
      return;
    }
    setExpr((s) => s + v);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-2 rounded-md border border-border/60 hover:bg-muted/40 active:scale-95 transition-transform"
          aria-label="계산기"
        >
          <Calculator size={16} strokeWidth={1.8} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="mb-2 h-10 px-3 flex items-center justify-end text-base font-medium rounded bg-muted/40 tabular-nums overflow-hidden">
          {expr || "0"}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {KEYS.map((k) => (
            <button
              key={k.label}
              type="button"
              onClick={() => handleKey(k.value)}
              className={`h-9 text-sm rounded border border-border/40 hover:bg-muted/40 active:scale-95 transition-transform ${
                k.col === 2 ? "col-span-2" : ""
              } ${
                k.value === "OK"
                  ? "bg-primary text-primary-foreground border-primary"
                  : ""
              } ${
                k.value === "C" ? "text-destructive" : ""
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
