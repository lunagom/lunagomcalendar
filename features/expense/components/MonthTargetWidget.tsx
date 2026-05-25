// features/expense/components/MonthTargetWidget.tsx
"use client";

import { useState, useTransition } from "react";
import { Heart, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { setMonthlyTarget } from "../server/actions";
import type { MonthlyTargetRow } from "../server/queries";

type Props = {
  month: string; // "YYYY-MM"
  target: MonthlyTargetRow | null;
  actual: number;
};

function formatThousands(n: string): string {
  const digits = n.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export function MonthTargetWidget({ month, target, actual }: Props) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState<string>(
    target ? String(target.amount) : "",
  );
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    const digits = input.replace(/\D/g, "");
    const amt = digits ? parseInt(digits, 10) : NaN;
    if (isNaN(amt) || amt < 0) {
      toast.error("금액을 올바르게 입력하세요");
      return;
    }
    startTransition(async () => {
      const r = await setMonthlyTarget({ month, amount: amt });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("저장되었습니다");
      setEditing(false);
    });
  };

  const handleCancel = () => {
    setInput(target ? String(target.amount) : "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          inputMode="numeric"
          value={formatThousands(input)}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          placeholder="0"
          className="w-32 h-8 text-sm text-right"
          autoFocus
          disabled={pending}
        />
        <span className="text-xs text-muted-foreground">원</span>
        <Button
          size="sm"
          variant="default"
          onClick={handleSave}
          disabled={pending}
          className="h-8"
        >
          저장
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={pending}
          className="h-8"
        >
          취소
        </Button>
      </div>
    );
  }

  const targetAmount = target?.amount;
  const overBudget = targetAmount != null && actual > targetAmount;
  const remaining = targetAmount != null ? targetAmount - actual : null;

  return (
    <div className="flex flex-col items-end gap-0.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">월 목표</span>
        {target?.partner_id && (
          <Heart
            className="h-3 w-3 shrink-0 fill-pink-500 text-pink-500"
            aria-label="부부 공유"
          />
        )}
        <span className="font-medium tabular-nums">
          {targetAmount != null
            ? `${targetAmount.toLocaleString("ko-KR")}원`
            : "미설정"}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="월 목표 수정"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">실제</span>
        <span
          className={`font-medium tabular-nums ${
            overBudget ? "text-red-600" : ""
          }`}
        >
          {actual.toLocaleString("ko-KR")}원
        </span>
        {remaining != null && (
          <span className="text-xs text-muted-foreground">
            {remaining >= 0
              ? `(잔여 ${remaining.toLocaleString("ko-KR")}원)`
              : `(초과 ${Math.abs(remaining).toLocaleString("ko-KR")}원)`}
          </span>
        )}
      </div>
    </div>
  );
}
