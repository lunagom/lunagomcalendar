"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { QuickAddInput } from "./QuickAddInput";

type Props = {
  todayIso: string;
};

/**
 * 모바일 전용 + 할 일 FAB. 탭 시 하단 시트가 슬라이드 업 → 오늘 날짜로 quick add.
 */
export function TodoFloatingActionButton({ todayIso }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform flex items-center justify-center"
        aria-label="할 일 추가"
      >
        <Plus className="h-6 w-6" strokeWidth={2.2} />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetTitle className="text-base mb-3">오늘 할 일 추가</SheetTitle>
          <SheetDescription className="sr-only">
            오늘 날짜로 새 할 일을 빠르게 추가합니다.
          </SheetDescription>
          <QuickAddInput date={todayIso} />
        </SheetContent>
      </Sheet>
    </>
  );
}
