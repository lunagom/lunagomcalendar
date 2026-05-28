// features/expense/components/SubscriptionTabContent.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SubscriptionList } from "./SubscriptionList";
import { SubscriptionModal } from "./SubscriptionModal";
import { daysUntilNextBilling } from "@/lib/subscription";
import type { SubscriptionRow } from "../server/queries";

type Props = {
  subscriptions: SubscriptionRow[];
  usedCategories: string[];
};

export function SubscriptionTabContent({
  subscriptions,
  usedCategories,
}: Props) {
  const [creating, setCreating] = useState(false);
  const toastedRef = useRef(false);

  const activeMonthlyTotal = useMemo(
    () =>
      subscriptions
        .filter((s) => s.is_active)
        .reduce((sum, s) => sum + s.amount, 0),
    [subscriptions],
  );

  // 진입 시 1회 — 3일 이내 결제 예정 구독이 있으면 토스트
  useEffect(() => {
    if (toastedRef.current) return;
    toastedRef.current = true;
    const urgent = subscriptions.filter(
      (s) => s.is_active && daysUntilNextBilling(s.billing_day) <= 3,
    );
    if (urgent.length === 0) return;
    const total = urgent.reduce((s, sub) => s + sub.amount, 0);
    toast.info(
      `3일 이내 결제 ${urgent.length}건 (합계 ${total.toLocaleString("ko-KR")}원)`,
      { duration: 5000 },
    );
  }, [subscriptions]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground">이번 달 구독료 합계</p>
          <p className="text-lg font-semibold tabular-nums">
            {activeMonthlyTotal.toLocaleString("ko-KR")}원
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" strokeWidth={1.8} />
          구독 추가
        </Button>
      </div>

      <SubscriptionList
        subscriptions={subscriptions}
        usedCategories={usedCategories}
      />

      {creating && (
        <SubscriptionModal
          open
          onOpenChange={(v) => !v && setCreating(false)}
          usedCategories={usedCategories}
        />
      )}
    </div>
  );
}
