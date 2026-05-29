// features/expense/components/assets/AssetBalanceAdjustDialog.tsx
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { adjustAssetBalance } from "../../server/asset-actions";
import type { AssetRow } from "../../server/asset-queries";

type Props = {
  asset: AssetRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

function formatThousands(n: string): string {
  const digits = n.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export function AssetBalanceAdjustDialog({ asset, open, onOpenChange }: Props) {
  const [pending, startTransition] = useTransition();
  const [input, setInput] = useState<string>(String(asset.balance));

  const handleSubmit = () => {
    const n = parseInt(input.replace(/\D/g, ""), 10);
    if (isNaN(n) || n < 0) {
      toast.error("0 이상의 금액을 입력하세요");
      return;
    }
    startTransition(async () => {
      const r = await adjustAssetBalance(asset.id, n);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("잔액이 보정되었습니다");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>잔액 보정</DialogTitle>
          <DialogDescription>
            실제 통장 잔액과 맞춰 직접 입력합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="adjust-balance">새 잔액</Label>
          <div className="flex items-center gap-2">
            <Input
              id="adjust-balance"
              inputMode="numeric"
              value={formatThousands(input)}
              onChange={(e) => setInput(e.target.value)}
            />
            <span className="text-sm text-muted-foreground">원</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
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
