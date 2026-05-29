// features/expense/components/assets/AssetCard.tsx
"use client";

import { MoreHorizontal, ArrowRight } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  archiveAsset,
  deleteAsset,
} from "../../server/asset-actions";
import type { AssetRow } from "../../server/asset-queries";
import type { AssetType } from "../../lib/asset-types";

type Props = {
  asset: AssetRow;
  /** linked_asset_id 해석용 — 체크카드 → 은행명. */
  linkedBankName?: string;
  onClick?: () => void;
  onEdit?: () => void;
};

function formatKrw(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₩${Math.abs(n).toLocaleString("ko-KR")}`;
}

export function AssetCard({ asset, linkedBankName, onClick, onEdit }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);

  const type = asset.type as AssetType;
  const showBalance = type !== "debit_card";

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPending(true);
    const r = await archiveAsset(asset.id);
    setPending(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("보관됨");
  };

  const handleDelete = async () => {
    setPending(true);
    const r = await deleteAsset(asset.id);
    setPending(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("삭제됨");
    setConfirmDelete(false);
  };

  return (
    <>
      <div
        onClick={onClick}
        className="flex items-center gap-3 rounded-lg border border-border/40 bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:border-border/80 cursor-pointer"
      >
        {/* 색 도트 */}
        <span
          className="h-3 w-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: asset.color }}
          aria-hidden
        />

        {/* 이름 + 연결 표시 */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{asset.name}</div>
          {type === "debit_card" && linkedBankName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowRight size={12} strokeWidth={1.8} />
              <span className="truncate">{linkedBankName}</span>
            </div>
          )}
          {type === "credit_card" && asset.payment_day != null && (
            <div className="text-xs text-muted-foreground">
              {asset.payment_day}일 결제
            </div>
          )}
        </div>

        {/* 잔액 */}
        {showBalance && (
          <div
            className={`text-sm font-semibold tabular-nums ${
              type === "credit_card" && asset.balance > 0
                ? "text-[#DC2626] dark:text-[#F87171]"
                : ""
            }`}
          >
            {formatKrw(asset.balance)}
          </div>
        )}

        {/* 더보기 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1 rounded hover:bg-muted/60 active:scale-95 transition-transform"
              onClick={(e) => e.stopPropagation()}
              aria-label="자산 메뉴"
            >
              <MoreHorizontal size={16} strokeWidth={1.8} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
              편집
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive} disabled={pending}>
              보관
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              className="text-destructive focus:text-destructive"
            >
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>자산 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{asset.name}" 을 삭제합니다. 이 자산을 사용한 거래는 "미지정" 으로 바뀝니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={pending}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
