// features/expense/components/assets/CreditCardSettleButton.tsx
"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { settleCreditCard } from "../../server/asset-actions";
import type { AssetRow } from "../../server/asset-queries";

type Props = {
  card: AssetRow;
  /** 결제 가능한 은행/현금 자산. */
  bankOptions: AssetRow[];
};

function formatKrw(n: number): string {
  return `₩${n.toLocaleString("ko-KR")}`;
}

function formatThousands(n: string): string {
  const digits = n.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export function CreditCardSettleButton({ card, bankOptions }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [fromAssetId, setFromAssetId] = useState<string | undefined>(
    card.linked_asset_id ?? bankOptions[0]?.id ?? undefined,
  );
  const [amountInput, setAmountInput] = useState<string>(String(card.balance));

  const handleSettle = () => {
    const amount = parseInt(amountInput.replace(/\D/g, ""), 10);
    if (!amount || amount < 1) {
      toast.error("정산 금액을 입력하세요");
      return;
    }
    if (amount > card.balance) {
      toast.error("정산 금액이 누적액보다 큽니다");
      return;
    }
    if (!fromAssetId) {
      toast.error("출처 은행/현금을 선택하세요");
      return;
    }

    startTransition(async () => {
      const r = await settleCreditCard({
        credit_card_asset_id: card.id,
        from_bank_asset_id: fromAssetId,
        amount,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("정산되었습니다");
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 active:scale-[0.98] transition-all"
      >
        <CreditCard size={14} strokeWidth={1.8} />
        {formatKrw(card.balance)} 정산하기
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{card.name} 정산</DialogTitle>
            <DialogDescription>
              누적된 카드 금액을 은행/현금에서 차감합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>정산 금액</Label>
              <div className="flex items-center gap-2">
                <Input
                  inputMode="numeric"
                  value={formatThousands(amountInput)}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">원</span>
              </div>
              <p className="text-xs text-muted-foreground">
                현재 누적: {formatKrw(card.balance)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>출처 (은행/현금)</Label>
              <Select value={fromAssetId} onValueChange={setFromAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {bankOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({formatKrw(b.balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              취소
            </Button>
            <Button onClick={handleSettle} disabled={pending}>
              {pending ? "정산 중..." : "정산"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
