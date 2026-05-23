// features/expense/components/SubscriptionList.tsx
"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SubscriptionItem } from "./SubscriptionItem";
import { daysUntilNextBilling } from "@/lib/subscription";
import type { SubscriptionRow } from "../server/queries";

type Props = {
  subscriptions: SubscriptionRow[];
  usedCategories: string[];
};

export function SubscriptionList({ subscriptions, usedCategories }: Props) {
  const [showInactive, setShowInactive] = useState(false);

  const { active, inactive } = useMemo(() => {
    const act: SubscriptionRow[] = [];
    const inact: SubscriptionRow[] = [];
    for (const s of subscriptions) {
      if (s.is_active) act.push(s);
      else inact.push(s);
    }
    // 활성: 결제일 가까운 순 (D-day 오름차순)
    act.sort(
      (a, b) =>
        daysUntilNextBilling(a.billing_day) -
        daysUntilNextBilling(b.billing_day),
    );
    // 비활성: 이름 순
    inact.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    return { active: act, inactive: inact };
  }, [subscriptions]);

  if (subscriptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        아직 등록된 구독이 없어요.
      </p>
    );
  }

  return (
    <div>
      {/* 활성 구독 */}
      {active.length > 0 ? (
        <div className="flex flex-col divide-y">
          {active.map((s) => (
            <SubscriptionItem
              key={s.id}
              subscription={s}
              usedCategories={usedCategories}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4">
          활성 구독이 없어요.
        </p>
      )}

      {/* 비활성 토글 */}
      {inactive.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <button
            type="button"
            onClick={() => setShowInactive((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showInactive ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            비활성 구독 {inactive.length}개
          </button>
          {showInactive && (
            <div className="flex flex-col divide-y mt-2">
              {inactive.map((s) => (
                <SubscriptionItem
                  key={s.id}
                  subscription={s}
                  usedCategories={usedCategories}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
