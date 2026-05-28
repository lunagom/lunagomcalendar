"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { EventModal } from "./EventModal";
import type { CalendarRow } from "../server/queries";

type Props = {
  calendars: CalendarRow[];
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 모바일 전용 floating action button — 어디서든 + 일정 추가.
 * bottom-20 으로 모바일 탭바(h-14) 위에 배치.
 */
export function FloatingActionButton({ calendars }: Props) {
  const [open, setOpen] = useState(false);
  const canCreate = calendars.length > 0;
  if (!canCreate) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform flex items-center justify-center"
        aria-label="일정 추가"
      >
        <Plus className="h-6 w-6" strokeWidth={2.2} />
      </button>
      <EventModal
        open={open}
        onOpenChange={setOpen}
        calendars={calendars}
        defaultDate={todayIso()}
      />
    </>
  );
}
