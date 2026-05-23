// features/calendar/components/MonthGrid.tsx
"use client";
import { useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import type { default as FullCalendarInst } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  EventInput,
  EventDropArg,
  EventClickArg,
} from "@fullcalendar/core";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { FC_COMMON } from "@/lib/fullcalendar/locale-ko";
import { DayCell } from "./DayCell";
import { MonthNavigation } from "./MonthNavigation";
import { EventDetailDialog } from "./EventDetailDialog";
import { DayDetailPopup } from "./DayDetailPopup";
import { moveEvent } from "../server/actions";
import { useCalendarUIStore } from "../store/calendar-ui";
import type { CalendarRow, EventRow } from "../server/queries";
import type { TaskRow } from "@/features/todos/server/queries";

type Props = {
  calendars: CalendarRow[];
  events: EventRow[];
  todos: TaskRow[];
  initialMonth: string; // YYYY-MM
};

export function MonthGrid({ calendars, events, todos, initialMonth }: Props) {
  const router = useRouter();
  const fcRef = useRef<FullCalendarInst | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenIds = useCalendarUIStore((s) => s.hiddenCalendarIds);

  const [dayDetailDate, setDayDetailDate] = useState<Date | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventRow | null>(null);

  const visibleEvents = useMemo(
    () => events.filter((e) => !hiddenIds.includes(e.calendar_id)),
    [events, hiddenIds],
  );

  const fcEvents: EventInput[] = useMemo(
    () =>
      visibleEvents.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start_at,
        end: e.end_at,
        allDay: e.is_all_day,
        extendedProps: { rawEvent: e },
      })),
    [visibleEvents],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of visibleEvents) {
      const key = e.start_at.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [visibleEvents]);

  const todosByDate = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const t of todos) {
      const arr = map.get(t.scheduled_date) ?? [];
      arr.push(t);
      map.set(t.scheduled_date, arr);
    }
    return map;
  }, [todos]);

  const navigate = (delta: -1 | 1 | 0) => {
    const api = fcRef.current?.getApi();
    if (!api) return;
    if (delta === 0) api.today();
    else if (delta < 0) api.prev();
    else api.next();
    const d = api.getDate();
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/calendar?month=${m}`);
  };

  const handleEventClick = (info: EventClickArg) => {
    const ev = info.event.extendedProps.rawEvent as EventRow;
    setDetailEvent(ev);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const ev = info.event.extendedProps.rawEvent as EventRow;
    const newStart = info.event.start?.toISOString();
    const newEnd = (info.event.end ?? info.event.start)?.toISOString();
    if (!newStart || !newEnd) {
      info.revert();
      return;
    }
    const r = await moveEvent(ev.id, newStart, newEnd);
    if (!r.ok) {
      toast.error(r.error);
      info.revert();
    } else {
      toast.success("이동되었습니다");
    }
  };

  const popupIsoDate = dayDetailDate
    ? dayDetailDate.toISOString().slice(0, 10)
    : null;

  return (
    <div ref={containerRef} className="h-full">
      <MonthNavigation
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onToday={() => navigate(0)}
        targetRef={containerRef}
      />
      <FullCalendar
        ref={fcRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={`${initialMonth}-01`}
        editable
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        events={fcEvents}
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        dayCellContent={(arg) => (
          <DayCellPortalSlot id={arg.date.toISOString().slice(0, 10)} />
        )}
        {...FC_COMMON}
      />
      {/* DayCell 들을 portal 로 그린다 (각 셀의 .fc-daygrid-day-frame 안) */}
      <DayCellRenderer
        calendars={calendars}
        eventsByDate={eventsByDate}
        todosByDate={todosByDate}
        onEventClick={setDetailEvent}
        onDayClick={(isoDate) => setDayDetailDate(new Date(isoDate))}
      />

      {popupIsoDate && (
        <DayDetailPopup
          date={dayDetailDate}
          events={eventsByDate.get(popupIsoDate) ?? []}
          todos={todosByDate.get(popupIsoDate) ?? []}
          calendars={calendars}
          onClose={() => setDayDetailDate(null)}
        />
      )}
      {detailEvent && (
        <EventDetailDialog
          event={detailEvent}
          calendars={calendars}
          onClose={() => setDetailEvent(null)}
        />
      )}
    </div>
  );
}

function DayCellPortalSlot({ id }: { id: string }) {
  return <div data-cell-id={id} className="absolute inset-0" />;
}

function DayCellRenderer({
  calendars,
  eventsByDate,
  todosByDate,
  onEventClick,
  onDayClick,
}: {
  calendars: CalendarRow[];
  eventsByDate: Map<string, EventRow[]>;
  todosByDate: Map<string, TaskRow[]>;
  onEventClick: (e: EventRow) => void;
  onDayClick: (date: string) => void;
}) {
  // SSR 호환을 위해 클라이언트 마운트 후 portal
  if (typeof document === "undefined") return null;
  const slots = Array.from(
    document.querySelectorAll<HTMLElement>("[data-cell-id]"),
  );
  return (
    <>
      {slots.map((el) => {
        const isoDate = el.dataset.cellId!;
        const date = new Date(isoDate);
        const cellMonth = date.getMonth();
        // currentMonth 판정: 부모 FullCalendar 의 viewed month 와 비교 — 간단화: title 에서 추출
        const titleEl = document.querySelector(".fc-toolbar-title");
        const titleStr = titleEl?.textContent ?? "";
        const viewedMonth =
          parseInt(titleStr.match(/(\d{1,2})월/)?.[1] ?? "0", 10) - 1;
        const isCurrentMonth = viewedMonth === cellMonth;
        return createPortal(
          <DayCell
            date={date}
            isCurrentMonth={isCurrentMonth}
            events={eventsByDate.get(isoDate) ?? []}
            todos={todosByDate.get(isoDate) ?? []}
            calendars={calendars}
            onEventClick={onEventClick}
            onDayClick={() => onDayClick(isoDate)}
          />,
          el,
        );
      })}
    </>
  );
}
