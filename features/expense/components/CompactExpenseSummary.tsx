"use client";

import { useState, useTransition } from "react";
import { Plus, CreditCard, PiggyBank } from "lucide-react";
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
import { addCardName } from "../server/card-actions";
import { formatKrwCompact, formatKrwCompactWithSign } from "../lib/format-compact";
import type { MonthlyTargetRow } from "../server/queries";

type Props = {
  totalIncome: number;
  totalExpense: number;
  target: MonthlyTargetRow | null;
  actual: number;
  cardNames: string[];
  cardTotals: Record<string, number>;
  savingsTotal: number;
  onWithdrawSavings: () => void;
};

export function CompactExpenseSummary({
  totalIncome,
  totalExpense,
  target,
  actual,
  cardNames,
  cardTotals,
  savingsTotal,
  onWithdrawSavings,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [pending, startTransition] = useTransition();

  const net = totalIncome - totalExpense;
  const netColor =
    net > 0
      ? "text-[#16A34A] dark:text-[#4ADE80]"
      : net < 0
        ? "text-[#DC2626] dark:text-[#F87171]"
        : "";

  const targetAmt = target?.amount ?? 0;
  const progress = targetAmt > 0 ? Math.min((actual / targetAmt) * 100, 999) : 0;
  const overTarget = targetAmt > 0 && actual > targetAmt;

  const handleAdd = () => {
    const name = nameInput.trim();
    if (!name) {
      toast.error("카드명을 입력해주세요");
      return;
    }
    startTransition(async () => {
      const r = await addCardName(name);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("추가되었습니다");
      setAddOpen(false);
      setNameInput("");
    });
  };

  return (
    <section className="rounded-xl border border-border/40 bg-card p-3 space-y-2.5">
      {/* Row 1: 순수익 + 수입/지출 */}
      <div className="space-y-0.5">
        <div className={`text-xl font-bold tabular-nums ${netColor}`}>
          {formatKrwCompactWithSign(net)}
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          <span>수입 {formatKrwCompact(totalIncome)}</span>
          <span className="mx-2">·</span>
          <span>지출 {formatKrwCompact(totalExpense)}</span>
        </div>
      </div>

      {/* Row 2: 월 목표 진행률 (target 없으면 숨김) */}
      {targetAmt > 0 && (
        <div className="border-t border-border/30 pt-2 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="tabular-nums text-muted-foreground">
              {formatKrwCompact(actual)} / {formatKrwCompact(targetAmt)}
            </span>
            <span
              className={`tabular-nums font-medium ${
                overTarget ? "text-[#DC2626] dark:text-[#F87171]" : "text-muted-foreground"
              }`}
            >
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overTarget ? "bg-[#DC2626] dark:bg-[#F87171]" : "bg-primary"
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Row 3: 카드 결제 */}
      <div className="border-t border-border/30 pt-2 flex items-center gap-2">
        <CreditCard size={14} strokeWidth={1.8} className="text-muted-foreground flex-shrink-0" />
        <div className="flex-1 flex gap-1.5 items-center overflow-x-auto text-xs">
          {cardNames.length === 0 ? (
            <span className="text-muted-foreground">등록된 카드 없음</span>
          ) : (
            cardNames.map((name, idx) => {
              const total = cardTotals[name] ?? 0;
              return (
                <span key={name} className="flex items-center gap-1 whitespace-nowrap">
                  {idx > 0 && <span className="text-muted-foreground/60">·</span>}
                  <span className="text-muted-foreground">{name}</span>
                  <span className={`tabular-nums font-medium ${total > 0 ? "" : "text-muted-foreground/60"}`}>
                    {formatKrwCompact(total)}
                  </span>
                </span>
              );
            })
          )}
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex-shrink-0 p-1 rounded hover:bg-muted/60 active:scale-95 transition-transform text-muted-foreground"
          aria-label="카드 추가"
        >
          <Plus size={14} strokeWidth={1.8} />
        </button>
      </div>

      {/* Row 4: 저축 누적 */}
      <div className="border-t border-border/30 pt-2 flex items-center gap-2 text-xs">
        <PiggyBank size={14} strokeWidth={1.8} className="text-muted-foreground flex-shrink-0" />
        <span className="text-muted-foreground">저축</span>
        <span className="flex-1 tabular-nums font-medium">
          {formatKrwCompact(savingsTotal)}
        </span>
        <button
          type="button"
          onClick={onWithdrawSavings}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded hover:bg-muted/40 active:scale-95"
        >
          − 출금
        </button>
      </div>

      {/* 카드 추가 다이얼로그 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>카드 추가</DialogTitle>
            <DialogDescription>카드명을 입력하세요 (예: 삼성카드).</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="card-name-input">카드명</Label>
            <Input
              id="card-name-input"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="예: 삼성카드"
              maxLength={30}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={pending}>
              취소
            </Button>
            <Button onClick={handleAdd} disabled={pending}>
              {pending ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
