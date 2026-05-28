"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, CheckSquare, Wallet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventModal } from "@/features/calendar/components/EventModal";
import type { CalendarRow } from "@/features/calendar/server/queries";

type Props = {
  calendars: CalendarRow[];
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 홈 페이지 상단 빠른 액션 — 일정 / 할 일 / 지출 빠르게 추가.
 * 일정: 모달 오픈. 할 일/지출: 해당 페이지로 이동.
 */
export function QuickActions({ calendars }: Props) {
  const [eventOpen, setEventOpen] = useState(false);
  const canCreate = calendars.length > 0;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setEventOpen(true)}
        disabled={!canCreate}
        className="gap-1.5 active:scale-[0.98] transition-transform"
      >
        <Calendar className="h-3.5 w-3.5" strokeWidth={1.8} />
        <Plus className="h-3 w-3 -ml-1" strokeWidth={2} />
        일정
      </Button>
      <Button
        variant="outline"
        size="sm"
        asChild
        className="gap-1.5 active:scale-[0.98] transition-transform"
      >
        <Link href="/todos">
          <CheckSquare className="h-3.5 w-3.5" strokeWidth={1.8} />
          <Plus className="h-3 w-3 -ml-1" strokeWidth={2} />
          할 일
        </Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        asChild
        className="gap-1.5 active:scale-[0.98] transition-transform"
      >
        <Link href="/expense">
          <Wallet className="h-3.5 w-3.5" strokeWidth={1.8} />
          <Plus className="h-3 w-3 -ml-1" strokeWidth={2} />
          지출
        </Link>
      </Button>

      {canCreate && (
        <EventModal
          open={eventOpen}
          onOpenChange={setEventOpen}
          calendars={calendars}
          defaultDate={todayIso()}
        />
      )}
    </div>
  );
}
