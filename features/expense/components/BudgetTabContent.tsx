// features/expense/components/BudgetTabContent.tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BudgetEditor } from "./BudgetEditor";
import { getCategoryColor } from "@/lib/colors";
import type { BudgetRow } from "../server/queries";

type Props = {
  month: string; // "YYYY-MM"
  budgets: BudgetRow[];
  /** 카테고리별 이번 달 실제 사용액 (지출 + 활성 구독). */
  totalsByCategory: Record<string, number>;
  usedCategories: string[];
};

export function BudgetTabContent({
  month,
  budgets,
  totalsByCategory,
  usedCategories,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BudgetRow | null>(null);

  // 진행률 큰 순으로 정렬 (사용자가 가장 걱정스러운 카테고리 먼저)
  const sorted = [...budgets].sort((a, b) => {
    const aUsed = totalsByCategory[a.category] ?? 0;
    const bUsed = totalsByCategory[b.category] ?? 0;
    const aPct = a.limit_amount > 0 ? aUsed / a.limit_amount : 0;
    const bPct = b.limit_amount > 0 ? bUsed / b.limit_amount : 0;
    return bPct - aPct;
  });

  const existingCategories = budgets.map((b) => b.category);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground">
            카테고리별 월 예산
          </p>
          <p className="text-sm">
            {budgets.length === 0
              ? "아직 설정된 예산이 없어요"
              : `${budgets.length}개 카테고리`}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          예산 추가
        </Button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          [+ 예산 추가] 로 카테고리별 한도를 설정해보세요.
        </p>
      ) : (
        <div className="flex flex-col divide-y">
          {sorted.map((b) => {
            const used = totalsByCategory[b.category] ?? 0;
            const limit = b.limit_amount;
            const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
            const over = used > limit;
            const remaining = limit - used;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setEditing(b)}
                className="text-left py-3 hover:bg-accent/40 transition-colors px-2 -mx-2 rounded"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(b.category) }}
                  />
                  <span className="font-medium flex-1">{b.category}</span>
                  <span
                    className={`text-sm tabular-nums font-medium ${
                      over ? "text-red-600" : ""
                    }`}
                  >
                    {used.toLocaleString("ko-KR")} /{" "}
                    {limit.toLocaleString("ko-KR")}원
                  </span>
                </div>
                {/* 진행률 막대 */}
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      over
                        ? "bg-red-500"
                        : pct >= 80
                          ? "bg-orange-500"
                          : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span
                    className={`tabular-nums ${
                      over ? "text-red-600 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {over
                      ? `${Math.abs(remaining).toLocaleString("ko-KR")}원 초과`
                      : `${remaining.toLocaleString("ko-KR")}원 남음`}
                  </span>
                  <span
                    className={`tabular-nums ${
                      over ? "text-red-600" : "text-muted-foreground"
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {creating && (
        <BudgetEditor
          open
          onOpenChange={(v) => !v && setCreating(false)}
          month={month}
          existingCategories={existingCategories}
          usedCategories={usedCategories}
        />
      )}

      {editing && (
        <BudgetEditor
          open
          onOpenChange={(v) => !v && setEditing(null)}
          month={month}
          initial={editing}
          usedCategories={usedCategories}
        />
      )}
    </div>
  );
}
