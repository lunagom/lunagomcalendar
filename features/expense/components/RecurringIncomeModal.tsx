// features/expense/components/RecurringIncomeModal.tsx
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  INCOME_CATEGORY_PRESETS,
  getIncomeCategoryColor,
  getTextColor,
} from "@/lib/colors";
import {
  createRecurringIncome,
  updateRecurringIncome,
} from "../server/actions";
import type { RecurringIncomeRow } from "../server/queries";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: RecurringIncomeRow | null;
  usedCategories?: string[];
};

function formatThousands(n: string): string {
  const digits = n.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export function RecurringIncomeModal({
  open,
  onOpenChange,
  initial,
  usedCategories = [],
}: Props) {
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState<string>(
    initial?.amount != null ? String(initial.amount) : "",
  );
  const [receiveDay, setReceiveDay] = useState<string>(
    initial?.receive_day != null ? String(initial.receive_day) : "25",
  );
  const [category, setCategory] = useState<string>(initial?.category ?? "월급");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const allCategories = [
    ...INCOME_CATEGORY_PRESETS,
    ...usedCategories.filter(
      (c) => !INCOME_CATEGORY_PRESETS.includes(c as never),
    ),
  ];

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("이름을 입력하세요");
      return;
    }
    const amt = parseInt(amount.replace(/\D/g, ""), 10);
    if (!Number.isFinite(amt) || amt < 0) {
      toast.error("금액을 입력하세요");
      return;
    }
    const day = parseInt(receiveDay, 10);
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      toast.error("수령일은 1~31 사이여야 합니다");
      return;
    }
    if (!category.trim()) {
      toast.error("카테고리를 선택하세요");
      return;
    }

    const payload = {
      name: name.trim(),
      amount: amt,
      receive_day: day,
      category: category.trim(),
      is_active: isActive,
    };

    startTransition(async () => {
      const result = initial
        ? await updateRecurringIncome(initial.id, payload)
        : await createRecurringIncome(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(initial ? "수정되었습니다" : "정기 수입이 추가되었습니다");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "정기 수입 수정" : "정기 수입 추가"}</DialogTitle>
          <DialogDescription className="sr-only">
            정기적으로 들어오는 수입을 등록합니다 (예: 월급, 임대료).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="ri-name">이름 *</Label>
            <Input
              id="ri-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 회사 월급"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="ri-amount">금액 *</Label>
            <Input
              id="ri-amount"
              inputMode="numeric"
              value={formatThousands(amount)}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              style={{ color: "#16A34A" }}
            />
          </div>

          <div>
            <Label htmlFor="ri-day">수령일 (매월) *</Label>
            <Input
              id="ri-day"
              inputMode="numeric"
              value={receiveDay}
              onChange={(e) =>
                setReceiveDay(e.target.value.replace(/\D/g, "").slice(0, 2))
              }
              placeholder="25"
            />
          </div>

          <div>
            <Label>카테고리 *</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {allCategories.map((cat) => {
                const bg = getIncomeCategoryColor(cat);
                const fg = getTextColor(bg);
                const selected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm transition-shadow ${
                      selected
                        ? "ring-2 ring-foreground ring-offset-1 ring-offset-background"
                        : ""
                    }`}
                    style={{ backgroundColor: bg, color: fg }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="ri-active"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(Boolean(v))}
            />
            <Label htmlFor="ri-active">활성</Label>
          </div>
        </div>

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
