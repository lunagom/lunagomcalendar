// features/expense/components/SubscriptionModal.tsx
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
  EXPENSE_CATEGORY_PRESETS,
  INCOME_CATEGORY_PRESETS,
  getCategoryColor,
  getTextColor,
} from "@/lib/colors";
import {
  createSubscription,
  updateSubscription,
} from "../server/actions";
import type { SubscriptionRow } from "../server/queries";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: SubscriptionRow | null;
  usedCategories?: string[];
};

function formatThousands(n: string): string {
  const digits = n.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export function SubscriptionModal({
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
  const [billingDay, setBillingDay] = useState<string>(
    initial?.billing_day != null ? String(initial.billing_day) : "1",
  );
  // 기본 카테고리는 "구독"
  const [category, setCategory] = useState<string>(initial?.category ?? "구독");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  // 자기 preset (지출) 에도 반대편 (수입) preset 에도 없는 것만 custom 으로
  const expensePresetSet = new Set<string>(EXPENSE_CATEGORY_PRESETS);
  const incomePresetSet = new Set<string>(INCOME_CATEGORY_PRESETS);
  const allCategories = [
    ...EXPENSE_CATEGORY_PRESETS,
    ...usedCategories.filter(
      (c) => !expensePresetSet.has(c) && !incomePresetSet.has(c),
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
    const day = parseInt(billingDay, 10);
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      toast.error("결제일은 1~31 사이여야 합니다");
      return;
    }
    if (!category.trim()) {
      toast.error("카테고리를 선택하세요");
      return;
    }

    const payload = {
      name: name.trim(),
      amount: amt,
      billing_day: day,
      category: category.trim(),
      is_active: isActive,
    };

    startTransition(async () => {
      const result = initial
        ? await updateSubscription(initial.id, payload)
        : await createSubscription(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(initial ? "수정되었습니다" : "구독이 추가되었습니다");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "구독 수정" : "구독 추가"}</DialogTitle>
          <DialogDescription className="sr-only">
            정기 구독의 이름·금액·결제일·카테고리를 입력합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label htmlFor="sub-name">이름 *</Label>
            <Input
              id="sub-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 넷플릭스"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sub-amount">월 금액 *</Label>
              <Input
                id="sub-amount"
                inputMode="numeric"
                value={formatThousands(amount)}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/\D/g, ""))
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="sub-day">결제일 *</Label>
              <Input
                id="sub-day"
                type="number"
                min={1}
                max={31}
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                매월 N일 (31일은 짧은 달엔 말일로 적용)
              </p>
            </div>
          </div>

          <div>
            <Label>카테고리 *</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {allCategories.map((cat) => {
                const bg = getCategoryColor(cat);
                const fg = getTextColor(bg);
                const selected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm ${
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

          <div className="flex items-center gap-2">
            <Checkbox
              id="sub-active"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(Boolean(v))}
            />
            <Label htmlFor="sub-active">활성 (이 구독을 합계에 포함)</Label>
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
