// features/expense/components/RecurringIncomeList.tsx
"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getIncomeCategoryColor, getTextColor, formatDelta } from "@/lib/colors";
import { EmptyState } from "@/components/ui/empty-state";
import { RecurringIncomeModal } from "./RecurringIncomeModal";
import { DeleteConfirmDialog } from "@/features/calendar/components/DeleteConfirmDialog";
import {
  deleteRecurringIncome,
  toggleRecurringIncomeActive,
} from "../server/actions";
import type { RecurringIncomeRow } from "../server/queries";

type Props = {
  items: RecurringIncomeRow[];
  usedCategories: string[];
};

export function RecurringIncomeList({ items, usedCategories }: Props) {
  const [editing, setEditing] = useState<RecurringIncomeRow | null>(null);
  const [confirming, setConfirming] = useState<RecurringIncomeRow | null>(null);

  if (items.length === 0) {
    return <EmptyState message="등록된 정기 수입이 없어요." />;
  }

  const handleToggle = async (row: RecurringIncomeRow, v: boolean) => {
    const r = await toggleRecurringIncomeActive(row.id, v);
    if (!r.ok) toast.error(r.error);
  };

  const handleDelete = async () => {
    if (!confirming) return;
    const r = await deleteRecurringIncome(confirming.id);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("삭제되었습니다");
    setConfirming(null);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        {items.map((row) => {
          const bg = getIncomeCategoryColor(row.category);
          const fg = getTextColor(bg);
          return (
            <div
              key={row.id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <Checkbox
                checked={row.is_active}
                onCheckedChange={(v) => handleToggle(row, Boolean(v))}
                aria-label="활성"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: bg, color: fg }}
                  >
                    {row.category}
                  </span>
                  <span className="font-medium truncate">{row.name}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  매월 {row.receive_day}일 ·{" "}
                  <span className="text-[#16A34A] dark:text-[#4ADE80] tabular-nums">
                    {formatDelta(row.amount)}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(row)}
                aria-label="수정"
              >
                <Pencil className="h-4 w-4" strokeWidth={1.8} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirming(row)}
                aria-label="삭제"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.8} />
              </Button>
            </div>
          );
        })}
      </div>

      {editing && (
        <RecurringIncomeModal
          open
          onOpenChange={(v) => !v && setEditing(null)}
          initial={editing}
          usedCategories={usedCategories}
        />
      )}

      <DeleteConfirmDialog
        open={!!confirming}
        onOpenChange={(v) => !v && setConfirming(null)}
        onConfirm={handleDelete}
        title="정기 수입을 삭제할까요?"
        description={
          confirming ? `"${confirming.name}" 이 영구 삭제됩니다.` : undefined
        }
      />
    </>
  );
}
