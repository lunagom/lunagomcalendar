"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TransactionModal } from "./TransactionModal";

type Props = {
  usedCategories: string[];
  recentMemos?: string[];
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 모바일 전용 + 거래 floating action button.
 * 캘린더 페이지의 FAB 와 동일 패턴 (h-14 w-14 rounded-full fixed bottom-20 right-4).
 */
export function ExpenseFloatingActionButton({ usedCategories, recentMemos = [] }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform flex items-center justify-center"
        aria-label="거래 추가"
      >
        <Plus className="h-6 w-6" strokeWidth={2.2} />
      </button>
      <TransactionModal
        mode="create"
        open={open}
        onOpenChange={setOpen}
        defaultType="expense"
        defaultDate={todayIso()}
        usedCategories={usedCategories}
        recentMemos={recentMemos}
      />
    </>
  );
}
