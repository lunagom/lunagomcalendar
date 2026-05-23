// features/calendar/components/DayDetailPopup.tsx
"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HolidayBadge } from "./HolidayBadge";
import { EventBar } from "./EventBar";
import { EventModal } from "./EventModal";
import { EventDetailDialog } from "./EventDetailDialog";
import { TodoItem } from "@/features/todos/components/TodoItem";
import { QuickAddInput } from "@/features/todos/components/QuickAddInput";
import { isLunarFirstDay, toLunar } from "@/lib/lunar";
import { isPublicHoliday } from "@/lib/holidays";
import type { CalendarRow, EventRow } from "../server/queries";
import type { TaskRow } from "@/features/todos/server/queries";

type Props = {
  date: Date | null;
  events: EventRow[];
  todos: TaskRow[];
  calendars: CalendarRow[];
  onClose: () => void;
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export function DayDetailPopup({
  date,
  events,
  todos,
  calendars,
  onClose,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);

  if (!date) return null;

  const isoDate = date.toISOString().slice(0, 10);
  const day = date.getDay();
  const lunar = isLunarFirstDay(date) ? toLunar(date) : null;
  const isPublic = isPublicHoliday(isoDate);

  const dayHeader = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  const dateColor =
    isPublic || day === 0
      ? "text-red-600 dark:text-red-400"
      : day === 6
        ? "text-[#5b6cff]"
        : "";

  const popupOpen = !creating && !editing;
  const calColor = (id: string) =>
    calendars.find((c) => c.id === id)?.color ?? "#888";

  return (
    <>
      <Dialog open={popupOpen} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap text-base">
              <span className={dateColor}>
                {dayHeader} ({WEEKDAY[day]})
              </span>
              {lunar && (
                <span className="text-xs text-muted-foreground font-normal">
                  음 {lunar.month}/1
                </span>
              )}
              <HolidayBadge isoDate={isoDate} />
            </DialogTitle>
          </DialogHeader>

          {/* 일정 섹션 */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                일정 · {events.length}개
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreating(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                일정 추가
              </Button>
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 px-1">
                일정 없음
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {events.map((ev) => (
                  <EventBar
                    key={ev.id}
                    title={ev.title}
                    emoji={ev.emoji}
                    color={ev.color ?? calColor(ev.calendar_id)}
                    onClick={() => setEditing(ev)}
                    fullText
                  />
                ))}
              </div>
            )}
          </section>

          {/* 할 일 섹션 */}
          <section className="space-y-1 pt-3 border-t">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              할 일 · {todos.length}개
            </h3>
            {todos.map((t) => (
              <TodoItem key={t.id} todo={t} todayIso={isoDate} />
            ))}
            <QuickAddInput date={isoDate} />
          </section>
        </DialogContent>
      </Dialog>

      {creating && (
        <EventModal
          open
          onOpenChange={(v) => !v && setCreating(false)}
          calendars={calendars}
          defaultDate={isoDate}
        />
      )}

      {editing && (
        <EventDetailDialog
          event={editing}
          calendars={calendars}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
