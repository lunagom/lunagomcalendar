// features/expense/components/BudgetEditor.tsx
"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  EXPENSE_CATEGORY_PRESETS,
  getCategoryColor,
  getTextColor,
} from "@/lib/colors";
import { setBudget, deleteBudget } from "../server/actions";
import type { BudgetRow } from "../server/queries";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  month: string; // "YYYY-MM"
  /** 수정 모드: 기존 budget. 신규 모드: null. */
  initial?: BudgetRow | null;
  /** 이미 예산이 잡힌 카테고리 — 신규 모드에선 칩에서 제외 (중복 방지). */
  existingCategories?: string[];
  usedCategories?: string[];
};

function formatThousands(n: string): string {
  const digits = n.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export function BudgetEditor({
  open,
  onOpenChange,
  month,
  initial,
  existingCategories = [],
  usedCategories = [],
}: Props) {
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<string>(initial?.category ?? "");
  const [amount, setAmount] = useState<string>(
    initial?.limit_amount != null ? String(initial.limit_amount) : "",
  );

  const isEdit = !!initial;

  const allCategories = [
    ...EXPENSE_CATEGORY_PRESETS,
    ...usedCategories.filter(
      (c) => !EXPENSE_CATEGORY_PRESETS.includes(c as never),
    ),
  ];
  // 신규 모드에선 이미 예산 잡힌 카테고리는 비활성
  const disabledSet = new Set(isEdit ? [] : existingCategories);

  const handleSubmit = () => {
    if (!category.trim()) {
      toast.error("카테고리를 선택하세요");
      return;
    }
    const amt = parseInt(amount.replace(/\D/g, ""), 10);
    if (!Number.isFinite(amt) || amt < 0) {
      toast.error("금액을 입력하세요");
      return;
    }
    startTransition(async () => {
      const r = await setBudget({ category: category.trim(), month, limit_amount: amt });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(isEdit ? "수정되었습니다" : "예산이 추가되었습니다");
      onOpenChange(false);
    });
  };

  const handleDelete = () => {
    if (!initial) return;
    startTransition(async () => {
      const r = await deleteBudget(initial.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("삭제되었습니다");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "예산 수정" : "예산 추가"}</DialogTitle>
          <DialogDescription className="sr-only">
            카테고리와 월 예산 금액을 설정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label>카테고리 *</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {allCategories.map((cat) => {
                const bg = getCategoryColor(cat);
                const fg = getTextColor(bg);
                const selected = category === cat;
                const disabled = disabledSet.has(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => !disabled && setCategory(cat)}
                    disabled={disabled || (isEdit && cat !== category)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selected
                        ? "ring-2 ring-foreground ring-offset-1 ring-offset-background"
                        : ""
                    } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    style={{ backgroundColor: bg, color: fg }}
                    title={disabled ? "이미 예산이 잡힌 카테고리" : ""}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            {isEdit && (
              <p className="text-[11px] text-muted-foreground mt-1.5">
                카테고리는 수정 모드에선 변경 불가. (삭제 후 다시 추가)
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="budget-amount">월 한도 *</Label>
            <Input
              id="budget-amount"
              inputMode="numeric"
              value={formatThousands(amount)}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
            />
          </div>
        </div>

        <DialogFooter className="justify-between">
          {isEdit ? (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              삭제
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
