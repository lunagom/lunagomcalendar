// features/expense/components/ExpenseModal.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
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
  type ExpenseCategoryPreset,
} from "@/lib/colors";
import { parseExpense } from "@/lib/expense-parser";
import { createExpense, updateExpense } from "../server/actions";
import type { ExpenseRow } from "../server/queries";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 수정 모드일 때 채워짐. */
  initial?: ExpenseRow | null;
  /** 새 지출 생성 시 기본 일자 (YYYY-MM-DD). */
  defaultDate?: string;
  /** 사용자가 이전에 쓴 카테고리 — 칩 영역에 함께 노출. */
  usedCategories?: string[];
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatThousands(n: string): string {
  if (!n) return "";
  const digits = n.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export function ExpenseModal({
  open,
  onOpenChange,
  initial,
  defaultDate,
  usedCategories = [],
}: Props) {
  const [pending, startTransition] = useTransition();

  // 자연어 입력 (생성 모드에서만 의미 있음)
  const [naturalInput, setNaturalInput] = useState("");

  const [amount, setAmount] = useState<string>(
    initial?.amount != null ? String(initial.amount) : "",
  );
  const [category, setCategory] = useState<string>(initial?.category ?? "");
  const [paidAt, setPaidAt] = useState<string>(
    initial?.paid_at?.slice(0, 10) ?? defaultDate ?? todayIso(),
  );
  const [memo, setMemo] = useState<string>(initial?.memo ?? "");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");

  /** preset + 사용자 정의 (중복 제거). 매 렌더마다 안정성을 위해 memo. */
  const allCategories = useMemo<string[]>(() => {
    const presetSet = new Set<string>(EXPENSE_CATEGORY_PRESETS);
    const custom = usedCategories.filter((c) => !presetSet.has(c));
    return [...EXPENSE_CATEGORY_PRESETS, ...custom];
  }, [usedCategories]);

  const handleNaturalInputChange = (v: string) => {
    setNaturalInput(v);
    if (!v.trim()) return;
    const parsed = parseExpense(v);
    if (parsed.amount !== null) setAmount(String(parsed.amount));
    if (parsed.category !== null) setCategory(parsed.category);
    if (parsed.memo !== null) setMemo(parsed.memo);
  };

  const handleAddNewCategory = () => {
    const v = newCategoryInput.trim();
    if (!v) {
      setShowNewCategory(false);
      return;
    }
    setCategory(v);
    setNewCategoryInput("");
    setShowNewCategory(false);
  };

  const handleSubmit = () => {
    const amt = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amt || amt < 0) {
      toast.error("금액을 입력하세요");
      return;
    }
    if (!category.trim()) {
      toast.error("카테고리를 선택하세요");
      return;
    }
    if (!paidAt) {
      toast.error("일자를 입력하세요");
      return;
    }

    // 'YYYY-MM-DD' 를 그날 정오 (로컬) 의 ISO 로 — timezone 안정성
    const paidAtIso = new Date(paidAt + "T12:00:00").toISOString();

    const payload = {
      amount: amt,
      category: category.trim(),
      paid_at: paidAtIso,
      memo: memo.trim() || null,
    };

    startTransition(async () => {
      const result = initial
        ? await updateExpense(initial.id, payload)
        : await createExpense(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(initial ? "수정되었습니다" : "지출이 추가되었습니다");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "지출 수정" : "지출 추가"}</DialogTitle>
          <DialogDescription className="sr-only">
            {initial
              ? "기존 지출의 금액·카테고리·일자·메모를 수정합니다."
              : "지출의 금액·카테고리·일자·메모를 입력합니다. 자연어로 한 번에 적어도 됩니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* 자연어 입력 — 생성 모드에서만 */}
          {!initial && (
            <div>
              <Label htmlFor="natural">
                자연어로 빠르게{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  (예: "커피 3500", "넷플릭스 17000")
                </span>
              </Label>
              <Input
                id="natural"
                value={naturalInput}
                onChange={(e) => handleNaturalInputChange(e.target.value)}
                placeholder="한 줄로 적으면 아래 칸에 자동으로 채워져요"
                autoFocus
              />
            </div>
          )}

          {/* 금액 */}
          <div>
            <Label htmlFor="amount">금액 *</Label>
            <Input
              id="amount"
              inputMode="numeric"
              value={formatThousands(amount)}
              onChange={(e) =>
                setAmount(e.target.value.replace(/\D/g, ""))
              }
              placeholder="0"
            />
          </div>

          {/* 카테고리 칩 */}
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

              {!showNewCategory ? (
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="px-3 py-1 rounded-full text-sm border border-dashed text-muted-foreground hover:text-foreground"
                >
                  + 새 카테고리
                </button>
              ) : (
                <input
                  autoFocus
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onBlur={handleAddNewCategory}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNewCategory();
                    } else if (e.key === "Escape") {
                      setShowNewCategory(false);
                      setNewCategoryInput("");
                    }
                  }}
                  placeholder="카테고리 이름"
                  className="px-3 py-1 rounded-full text-sm border bg-background"
                />
              )}
            </div>
          </div>

          {/* 일자 */}
          <div>
            <Label htmlFor="paid-at">일자 *</Label>
            <Input
              id="paid-at"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>

          {/* 메모 */}
          <div>
            <Label htmlFor="memo">메모</Label>
            <Input
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="선택사항"
            />
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
