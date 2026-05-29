// features/expense/components/assets/AssetModal.tsx
"use client";

import { useState, useTransition, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  type AssetType,
} from "../../lib/asset-types";
import { ASSET_DEFAULT_COLOR_BY_TYPE } from "../../lib/asset-colors";
import { AssetColorPicker } from "./AssetColorPicker";
import {
  createAsset,
  updateAsset,
} from "../../server/asset-actions";
import type { AssetRow } from "../../server/asset-queries";

type CreateProps = {
  mode: "create";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 연결 은행 후보 (체크/신용카드용) — type=bank 만. */
  banks: AssetRow[];
};

type EditProps = {
  mode: "edit";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: AssetRow;
  banks: AssetRow[];
};

type Props = CreateProps | EditProps;

function formatThousands(n: string): string {
  if (!n) return "";
  const digits = n.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export function AssetModal(props: Props) {
  const { open, onOpenChange, banks } = props;
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.initial : null;

  const [pending, startTransition] = useTransition();

  const [type, setType] = useState<AssetType>(
    (initial?.type as AssetType) ?? "cash",
  );
  const [name, setName] = useState<string>(initial?.name ?? "");
  const [balance, setBalance] = useState<string>(
    initial?.balance != null ? String(initial.balance) : "0",
  );
  const [linkedAssetId, setLinkedAssetId] = useState<string | undefined>(
    initial?.linked_asset_id ?? undefined,
  );
  const [paymentDay, setPaymentDay] = useState<string>(
    initial?.payment_day != null ? String(initial.payment_day) : "",
  );
  const [color, setColor] = useState<string>(
    initial?.color ?? ASSET_DEFAULT_COLOR_BY_TYPE[type],
  );

  // type 바뀔 때 default color 도 따라 변경 (생성 모드만)
  const handleTypeChange = (next: AssetType) => {
    setType(next);
    if (!isEdit) {
      setColor(ASSET_DEFAULT_COLOR_BY_TYPE[next]);
    }
  };

  const showBalance = useMemo(
    () => type === "cash" || type === "bank" || type === "savings_investment" || type === "credit_card",
    [type],
  );
  const balanceLabel = type === "credit_card" ? "현재 누적" : "현재 잔액";
  const showLinkedBank = type === "debit_card" || type === "credit_card";
  const linkedBankRequired = type === "debit_card";
  const showPaymentDay = type === "credit_card";

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("이름을 입력하세요");
      return;
    }
    if (linkedBankRequired && !linkedAssetId) {
      toast.error("체크카드는 연결 은행이 필요합니다");
      return;
    }
    if (showPaymentDay) {
      const day = parseInt(paymentDay, 10);
      if (!day || day < 1 || day > 31) {
        toast.error("결제일은 1-31 사이여야 합니다");
        return;
      }
    }

    const balanceNum = parseInt(balance.replace(/\D/g, ""), 10) || 0;

    startTransition(async () => {
      let result: { ok: true; data: unknown } | { ok: false; error: string };
      if (props.mode === "edit") {
        result = await updateAsset(props.initial.id, {
          name: name.trim(),
          linked_asset_id: showLinkedBank ? (linkedAssetId ?? null) : null,
          payment_day: showPaymentDay ? parseInt(paymentDay, 10) : null,
          color,
        });
      } else {
        result = await createAsset({
          name: name.trim(),
          type,
          balance: showBalance ? balanceNum : 0,
          linked_asset_id: showLinkedBank ? (linkedAssetId ?? null) : null,
          payment_day: showPaymentDay ? parseInt(paymentDay, 10) : null,
          color,
        });
      }
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "수정되었습니다" : "추가되었습니다");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "자산 수정" : "자산 추가"}</DialogTitle>
          <DialogDescription className="sr-only">
            자산의 이름, 종류, 잔액, 색을 입력합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 종류 (생성 모드만 변경 가능) */}
          <div className="space-y-2">
            <Label>종류</Label>
            <div className="flex gap-2 flex-wrap">
              {ASSET_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={isEdit}
                  onClick={() => handleTypeChange(t)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    type === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/60 hover:bg-muted/40"
                  } ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {ASSET_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset-name">이름</Label>
            <Input
              id="asset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 신한은행"
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <Label>색</Label>
            <AssetColorPicker value={color} onChange={setColor} />
          </div>

          {showBalance && (
            <div className="space-y-2">
              <Label htmlFor="asset-balance">{balanceLabel}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="asset-balance"
                  inputMode="numeric"
                  value={formatThousands(balance)}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">원</span>
              </div>
            </div>
          )}

          {showLinkedBank && (
            <div className="space-y-2">
              <Label htmlFor="asset-linked">
                연결 은행 {linkedBankRequired ? "" : "(선택 — 자동 차감용)"}
              </Label>
              <Select value={linkedAssetId} onValueChange={setLinkedAssetId}>
                <SelectTrigger id="asset-linked">
                  <SelectValue placeholder="은행 선택" />
                </SelectTrigger>
                <SelectContent>
                  {banks.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      먼저 은행 자산을 추가해주세요
                    </div>
                  ) : (
                    banks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {showPaymentDay && (
            <div className="space-y-2">
              <Label htmlFor="asset-payment-day">결제일</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="asset-payment-day"
                  inputMode="numeric"
                  value={paymentDay}
                  onChange={(e) =>
                    setPaymentDay(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="15"
                  maxLength={2}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">일</span>
              </div>
            </div>
          )}
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
