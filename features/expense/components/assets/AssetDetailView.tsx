// features/expense/components/assets/AssetDetailView.tsx
"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetBalanceAdjustDialog } from "./AssetBalanceAdjustDialog";
import { ASSET_TYPE_LABELS, type AssetType } from "../../lib/asset-types";
import type { AssetRow, AssetTransaction } from "../../server/asset-queries";
import { isoToLocalDateKey } from "@/lib/datetime";

type Props = {
  asset: AssetRow;
  allAssets: AssetRow[];
  onBack: () => void;
};

function formatKrw(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₩${Math.abs(n).toLocaleString("ko-KR")}`;
}

function formatMonthDay(iso: string): string {
  const k = isoToLocalDateKey(iso);
  const [, mm, dd] = k.split("-");
  return `${parseInt(mm, 10)}/${parseInt(dd, 10)}`;
}

export function AssetDetailView({ asset, allAssets, onBack }: Props) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [txns, setTxns] = useState<AssetTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const url = `/api/expense/asset-transactions?asset_id=${asset.id}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        setTxns(data.items ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [asset.id]);

  const type = asset.type as AssetType;
  const linkedBank =
    type === "debit_card" && asset.linked_asset_id
      ? allAssets.find((a) => a.id === asset.linked_asset_id)
      : null;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="p-1 -ml-1 rounded hover:bg-muted/60 active:scale-95 transition-transform"
          aria-label="뒤로"
        >
          <ArrowLeft size={20} strokeWidth={1.8} />
        </button>
        <h2 className="text-base font-semibold">자산 상세</h2>
      </header>

      <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: asset.color }}
            aria-hidden
          />
          <div className="text-base font-medium">{asset.name}</div>
        </div>
        <div className="text-2xl font-bold tabular-nums">
          {type === "debit_card"
            ? linkedBank
              ? formatKrw(linkedBank.balance)
              : "₩0"
            : formatKrw(
                type === "credit_card" ? -asset.balance : asset.balance,
              )}
        </div>
        <div className="text-xs text-muted-foreground">
          {ASSET_TYPE_LABELS[type]}
          {linkedBank ? ` · ${linkedBank.name}` : ""}
          {type === "credit_card" && asset.payment_day != null
            ? ` · ${asset.payment_day}일 결제`
            : ""}
        </div>
        {type !== "debit_card" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAdjustOpen(true)}
            className="text-xs"
          >
            <Settings size={14} strokeWidth={1.8} className="mr-1" />
            잔액 보정
          </Button>
        )}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold px-1">최근 거래</h3>
        {loading ? (
          <div className="text-sm text-muted-foreground px-1">불러오는 중...</div>
        ) : txns.length === 0 ? (
          <div className="text-sm text-muted-foreground px-1">
            이 자산의 거래가 없습니다.
          </div>
        ) : (
          <ul className="space-y-1">
            {txns.map((t) => (
              <li
                key={`${t.kind}-${t.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card p-2.5"
              >
                <div className="text-xs text-muted-foreground tabular-nums w-10">
                  {formatMonthDay(
                    t.kind === "expense" ? t.paid_at : t.received_at,
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {t.memo || t.category}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.category}
                  </div>
                </div>
                <div
                  className={`text-sm font-semibold tabular-nums ${
                    t.kind === "income"
                      ? "text-[#16A34A] dark:text-[#4ADE80]"
                      : "text-[#DC2626] dark:text-[#F87171]"
                  }`}
                >
                  {t.kind === "income" ? "+" : "-"}
                  {formatKrw(t.amount).replace("-", "")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AssetBalanceAdjustDialog
        asset={asset}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />
    </div>
  );
}
