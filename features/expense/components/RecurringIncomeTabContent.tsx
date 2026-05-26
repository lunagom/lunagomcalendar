// features/expense/components/RecurringIncomeTabContent.tsx
"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDelta } from "@/lib/colors";
import { RecurringIncomeModal } from "./RecurringIncomeModal";
import { RecurringIncomeList } from "./RecurringIncomeList";
import type { RecurringIncomeRow } from "../server/queries";

type Props = {
  items: RecurringIncomeRow[];
  usedCategories: string[];
};

export function RecurringIncomeTabContent({ items, usedCategories }: Props) {
  const [creating, setCreating] = useState(false);

  const activeMonthlyTotal = useMemo(
    () => items.filter((r) => r.is_active).reduce((s, r) => s + r.amount, 0),
    [items],
  );

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-muted-foreground">월 총 수입 (활성)</p>
          <p className="text-lg font-semibold text-[#16A34A] dark:text-[#4ADE80] tabular-nums">
            {formatDelta(activeMonthlyTotal)}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          정기 수입 추가
        </Button>
      </div>

      <RecurringIncomeList items={items} usedCategories={usedCategories} />

      {creating && (
        <RecurringIncomeModal
          open
          onOpenChange={(v) => !v && setCreating(false)}
          usedCategories={usedCategories}
        />
      )}
    </>
  );
}
