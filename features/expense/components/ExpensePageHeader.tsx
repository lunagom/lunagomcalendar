"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionModal } from "./TransactionModal";

type Props = {
  monthLabel: string;
  currentMonth: string;
  usedCategories: string[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isThisMonth: boolean;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 가계부 페이지 헤더 — h1 + 월 네비 + 데스크탑 (+ 거래) 버튼.
 * 모바일 (+ 거래) 는 FloatingActionButton 으로 별도.
 */
export function ExpensePageHeader({
  monthLabel,
  usedCategories,
  onPrev,
  onNext,
  onToday,
  isThisMonth,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="space-y-2 mb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">가계부</h1>
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className="hidden md:inline-flex gap-1.5 active:scale-[0.98] transition-transform"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            거래
          </Button>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <h2 className="text-lg font-semibold tabular-nums">{monthLabel}</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onPrev}
            aria-label="이전 달"
            className="h-7 w-7"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onNext}
            aria-label="다음 달"
            className="h-7 w-7"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onToday}
            disabled={isThisMonth}
            className="h-7"
          >
            오늘
          </Button>
        </div>
      </header>

      <TransactionModal
        mode="create"
        open={open}
        onOpenChange={setOpen}
        defaultType="expense"
        defaultDate={todayIso()}
        usedCategories={usedCategories}
      />
    </>
  );
}
