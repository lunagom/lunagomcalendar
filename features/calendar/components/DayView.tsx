// features/calendar/components/DayView.tsx
"use client";
import { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import type { default as FullCalendarInst } from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput, EventDropArg } from "@fullcalendar/core";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FC_COMMON } from "@/lib/fullcalendar/locale-ko";
import { moveEvent } from "../server/actions";
import { getTextColor } from "@/lib/colors";
import { EventDetailDialog } from "./EventDetailDialog";
import { useState } from "react";
import type { CalendarRow, EventRow } from "../server/queries";

type Props = {
  calendars: CalendarRow[];
  events: EventRow[];
  initialDate: string; // YYYY-MM-DD
};

export function DayView({ calendars, events, initialDate }: Props) {
  const router = useRouter();
  const fcRef = useRef<FullCalendarInst | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventRow | null>(null);

  const calColor = (id: string) =>
    calendars.find((c) => c.id === id)?.color ?? "#888";

  const fcEvents: EventInput[] = events.map((e) => {
    const bg = e.color ?? calColor(e.calendar_id);
    return {
      id: e.id,
      title: e.emoji ? `${e.emoji} ${e.title}` : e.title,
      start: e.start_at,
      end: e.end_at,
      allDay: e.is_all_day,
      backgroundColor: bg,
      borderColor: bg,
      textColor: getTextColor(bg),
      extendedProps: { rawEvent: e },
    };
  });

  const navigate = (delta: -1 | 1 | 0) => {
    const api = fcRef.current?.getApi();
    if (!api) return;
    if (delta === 0) api.today();
    else if (delta < 0) api.prev();
    else api.next();
    const d = api.getDate();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    router.push(`/day?date=${iso}`);
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
    }
  };

  return (
    <div className="h-full">
      <FullCalendar
        ref={fcRef}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridDay"
        initialDate={initialDate}
        editable
        events={fcEvents}
        eventClick={(info: EventClickArg) => {
          setDetailEvent(info.event.extendedProps.rawEvent as EventRow);
        }}
        eventDrop={handleEventDrop}
        slotMinTime="06:00:00"
        slotMaxTime="24:00:00"
        scrollTime="08:00:00"
        nowIndicator
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        {...FC_COMMON}
      />
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
